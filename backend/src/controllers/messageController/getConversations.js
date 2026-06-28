import { pool } from "../../config/db.js"
import { messageUpload } from "../../middlewares/uploadMiddleware.js"
import  { sendNewMessageNotification } from "../../middlewares/pushNotificationService.js"

export const getConversations = async (req, res) => {
    try {
        const userId = req.user.id
        const userRole = req.user.role
        let conversations = []

        if (userRole === 'user') {
            [conversations] = await pool.query(`
                SELECT 
                    c.id,
                    c.last_message_at,
                    c.created_at,
                    p.id as professional_id,
                    p.business_name,
                    u.username as contact_name,
                    u.avatar_url as contact_avatar,
                    u.phone as contact_phone,
                    (
                        SELECT content FROM messages 
                        WHERE conversation_id = c.id 
                          AND is_unsent = FALSE
                        ORDER BY created_at DESC LIMIT 1
                    ) as last_message,
                    (
                        SELECT created_at FROM messages 
                        WHERE conversation_id = c.id 
                          AND is_unsent = FALSE
                        ORDER BY created_at DESC LIMIT 1
                    ) as last_message_time,
                    (
                        SELECT COUNT(*) FROM messages 
                        WHERE conversation_id = c.id 
                          AND is_read = 0 
                          AND sender_type = 'professional'
                          AND is_unsent = FALSE
                    ) as unread_count
                FROM conversations c
                JOIN professionals p ON c.professional_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE c.user_id = ?
                ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
            `, [userId])
        } else if (userRole === 'professional') {
            const [pros] = await pool.query(`SELECT id FROM professionals WHERE user_id = ?`, [userId])
            if (pros.length === 0) {
                return res.status(404).json({ message: "Profil professionnel non trouvé" })
            }
            const professionalId = pros[0].id

            ;[conversations] = await pool.query(`
                SELECT 
                    c.id,
                    c.last_message_at,
                    c.created_at,
                    u.id as contact_id,
                    u.username as contact_name,
                    u.avatar_url as contact_avatar,
                    u.email,
                    u.phone as contact_phone,
                    (
                        SELECT content FROM messages 
                        WHERE conversation_id = c.id 
                          AND is_unsent = FALSE
                        ORDER BY created_at DESC LIMIT 1
                    ) as last_message,
                    (
                        SELECT created_at FROM messages 
                        WHERE conversation_id = c.id 
                          AND is_unsent = FALSE
                        ORDER BY created_at DESC LIMIT 1
                    ) as last_message_time,
                    (
                        SELECT COUNT(*) FROM messages 
                        WHERE conversation_id = c.id 
                          AND is_read = 0 
                          AND sender_type = 'user'
                          AND is_unsent = FALSE
                    ) as unread_count
                FROM conversations c
                JOIN users u ON c.user_id = u.id
                WHERE c.professional_id = ?
                ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
            `, [professionalId])
        }

        res.status(200).json({ success: true, data: conversations, count: conversations.length })
    } catch (err) {
        console.error("getConversations error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }
}