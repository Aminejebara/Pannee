import { pool } from "../../config/db.js"
import { messageUpload } from "../../middlewares/uploadMiddleware.js"
import  { sendNewMessageNotification } from "../../middlewares/pushNotificationService.js"





export const unsendMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // 1. Verifier que le message existe et que l'utilisateur est l'expediteur
        const [messages] = await pool.query(`
            SELECT m.*, c.user_id as conv_user_id, c.professional_id as conv_pro_id
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.id = ?
        `, [messageId]);

        if (messages.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Message non trouve" 
            });
        }

        const message = messages[0];

        // 2. Verifier que l'utilisateur est bien l'expediteur du message
        if (message.sender_id !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous ne pouvez pas unsend un message que vous n'avez pas envoye" 
            });
        }

        // 3. Verifier que l'utilisateur a acces a la conversation
        let hasAccess = false;
        if (userRole === 'user') {
            const [convCheck] = await pool.query(
                `SELECT id FROM conversations WHERE id = ? AND user_id = ?`,
                [message.conversation_id, userId]
            );
            hasAccess = convCheck.length > 0;
        } else {
            const [convCheck] = await pool.query(`
                SELECT c.id FROM conversations c
                JOIN professionals p ON c.professional_id = p.id
                WHERE c.id = ? AND p.user_id = ?
            `, [message.conversation_id, userId]);
            hasAccess = convCheck.length > 0;
        }

        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "Acces non autorise a cette conversation" 
            });
        }

        // 4. Verifier que le message n'est pas deja unsend
        if (message.is_unsent) {
            return res.status(400).json({ 
                success: false, 
                message: "Ce message a deja ete unsend" 
            });
        }

        // 5. Marquer le message comme unsend
        await pool.query(`
            UPDATE messages 
            SET is_unsent = TRUE, 
                unsent_at = NOW(),
                unsent_by = ?
            WHERE id = ?
        `, [userId, messageId]);

        // 6. Recuperer le message mis a jour
        const [updatedMessage] = await pool.query(`
            SELECT * FROM messages WHERE id = ?
        `, [messageId]);

        // 7. Emettre un evenement socket pour notifier les deux parties
        const io = req.app.locals.io;
        if (io) {
            // Notifier l'expediteur
            const senderRoom = userRole === 'user' ? `user_${userId}` : `professional_${message.conversation_id}`;
            io.to(senderRoom).emit("message_unsent", {
                messageId: parseInt(messageId),
                conversationId: message.conversation_id,
                unsentBy: userId,
                unsentAt: new Date()
            });

            // Notifier le destinataire
            const receiverType = userRole === 'user' ? 'professional' : 'user';
            let receiverRoom = null;
            if (receiverType === 'user') {
                const [conv] = await pool.query(
                    `SELECT user_id FROM conversations WHERE id = ?`,
                    [message.conversation_id]
                );
                if (conv.length > 0) {
                    receiverRoom = `user_${conv[0].user_id}`;
                }
            } else {
                const [conv] = await pool.query(
                    `SELECT professional_id FROM conversations WHERE id = ?`,
                    [message.conversation_id]
                );
                if (conv.length > 0) {
                    receiverRoom = `professional_${conv[0].professional_id}`;
                }
            }

            if (receiverRoom) {
                io.to(receiverRoom).emit("message_unsent", {
                    messageId: parseInt(messageId),
                    conversationId: message.conversation_id,
                    unsentBy: userId,
                    unsentAt: new Date()
                });
                console.log(`📤 UNSEND - Notification envoyee a ${receiverRoom}`);
            }
        }

        res.status(200).json({
            success: true,
            message: "Message unsend avec succes",
            data: updatedMessage[0]
        });

    } catch (err) {
        console.error("unsendMessage error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
};
