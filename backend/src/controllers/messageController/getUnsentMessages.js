import { pool } from "../../config/db.js"
import { messageUpload } from "../../middlewares/uploadMiddleware.js"
import  { sendNewMessageNotification } from "../../middlewares/pushNotificationService.js"





export const getUnsentMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Seul un admin ou un participant peut voir les messages unsend
        let hasAccess = false;
        if (userRole === 'admin') {
            hasAccess = true;
        } else if (userRole === 'user') {
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
                message: "Acces non autorise" 
            });
        }

        const [messages] = await pool.query(`
            SELECT 
                m.id, m.conversation_id, m.sender_id, m.sender_type, 
                m.content, m.type, m.media_url, m.is_read, m.created_at,
                m.is_unsent, m.unsent_at, m.unsent_by,
                u.username as unsent_by_username
            FROM messages m
            LEFT JOIN users u ON m.unsent_by = u.id
            WHERE m.conversation_id = ? AND m.is_unsent = TRUE
            ORDER BY m.unsent_at DESC
        `, [conversationId]);

        res.status(200).json({
            success: true,
            data: messages,
            count: messages.length
        });

    } catch (err) {
        console.error("getUnsentMessages error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
};