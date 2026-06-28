import { pool } from "../../config/db.js"
import { messageUpload } from "../../middlewares/uploadMiddleware.js"
import  { sendNewMessageNotification } from "../../middlewares/pushNotificationService.js"




export const unsendAllMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // 1. Verifier l'acces a la conversation
        let hasAccess = false;
        let senderType = userRole === 'user' ? 'user' : 'professional';

        if (userRole === 'user') {
            const [convCheck] = await pool.query(
                `SELECT id FROM conversations WHERE id = ? AND user_id = ?`,
                [conversationId, userId]
            );
            hasAccess = convCheck.length > 0;
        } else {
            const [convCheck] = await pool.query(`
                SELECT c.id FROM conversations c
                JOIN professionals p ON c.professional_id = p.id
                WHERE c.id = ? AND p.user_id = ?
            `, [conversationId, userId]);
            hasAccess = convCheck.length > 0;
        }

        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "Acces non autorise a cette conversation" 
            });
        }

        // 2. Verifier qu'il y a des messages a unsend
        const [messages] = await pool.query(`
            SELECT COUNT(*) as count FROM messages 
            WHERE conversation_id = ? 
            AND sender_id = ? 
            AND is_unsent = FALSE
        `, [conversationId, userId]);

        if (messages[0].count === 0) {
            return res.status(200).json({
                success: true,
                message: "Aucun message a unsend",
                affectedCount: 0
            });
        }

        // 3. Marquer tous les messages comme unsend
        const [result] = await pool.query(`
            UPDATE messages 
            SET is_unsent = TRUE, 
                unsent_at = NOW(),
                unsent_by = ?
            WHERE conversation_id = ? 
            AND sender_id = ? 
            AND is_unsent = FALSE
        `, [userId, conversationId, userId]);

        // 4. Emettre un evenement socket pour notifier les deux parties
        const io = req.app.locals.io;
        if (io) {
            // Notifier l'expediteur
            const senderRoom = userRole === 'user' ? `user_${userId}` : `professional_${conversationId}`;
            io.to(senderRoom).emit("messages_unsent_all", {
                conversationId: parseInt(conversationId),
                unsentBy: userId,
                count: result.affectedRows,
                unsentAt: new Date()
            });

            // Notifier le destinataire
            const receiverType = userRole === 'user' ? 'professional' : 'user';
            let receiverRoom = null;
            if (receiverType === 'user') {
                const [conv] = await pool.query(
                    `SELECT user_id FROM conversations WHERE id = ?`,
                    [conversationId]
                );
                if (conv.length > 0) {
                    receiverRoom = `user_${conv[0].user_id}`;
                }
            } else {
                const [conv] = await pool.query(
                    `SELECT professional_id FROM conversations WHERE id = ?`,
                    [conversationId]
                );
                if (conv.length > 0) {
                    receiverRoom = `professional_${conv[0].professional_id}`;
                }
            }

            if (receiverRoom) {
                io.to(receiverRoom).emit("messages_unsent_all", {
                    conversationId: parseInt(conversationId),
                    unsentBy: userId,
                    count: result.affectedRows,
                    unsentAt: new Date()
                });
                console.log(`📤 UNSEND ALL - Notification envoyee a ${receiverRoom}`);
            }
        }

        res.status(200).json({
            success: true,
            message: `${result.affectedRows} message(s) unsend avec succes`,
            affectedCount: result.affectedRows
        });

    } catch (err) {
        console.error("unsendAllMessages error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
};
