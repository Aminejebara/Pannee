import { pool } from "../../config/db.js"
import { messageUpload } from "../../middlewares/uploadMiddleware.js"
import  { sendNewMessageNotification } from "../../middlewares/pushNotificationService.js"







export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id
        const userRole = req.user.role

        let result = null
        let byConversation = null

        if (userRole === 'user') {
            // ✅ AJOUT DU FILTRE is_unsent = FALSE
            const [unreadResult] = await pool.query(`
                SELECT COUNT(*) as unread_count
                FROM messages m 
                JOIN conversations c ON m.conversation_id = c.id
                WHERE c.user_id = ? 
                  AND m.sender_type = 'professional' 
                  AND m.is_read = 0
                  AND m.is_unsent = FALSE
            `, [userId])
            result = unreadResult

            const [byConvResult] = await pool.query(`
                SELECT c.id as conversation_id, p.business_name, COUNT(*) as unread_count
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN professionals p ON c.professional_id = p.id
                WHERE c.user_id = ? 
                  AND m.sender_type = 'professional' 
                  AND m.is_read = 0
                  AND m.is_unsent = FALSE
                GROUP BY c.id, p.business_name
            `, [userId])
            byConversation = byConvResult
        } else {
            const [pros] = await pool.query(`SELECT id FROM professionals WHERE user_id = ?`, [userId])
            if (pros.length === 0) {
                return res.status(404).json({ message: "Profil non trouvé" })
            }
            const professionalId = pros[0].id

            // ✅ AJOUT DU FILTRE is_unsent = FALSE
            const [unreadResult] = await pool.query(`
                SELECT COUNT(*) as unread_count
                FROM messages m 
                JOIN conversations c ON m.conversation_id = c.id
                WHERE c.professional_id = ? 
                  AND m.sender_type = 'user' 
                  AND m.is_read = 0
                  AND m.is_unsent = FALSE
            `, [professionalId])
            result = unreadResult

            const [byConvResult] = await pool.query(`
                SELECT c.id as conversation_id, u.username, COUNT(*) as unread_count
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN users u ON c.user_id = u.id
                WHERE c.professional_id = ? 
                  AND m.sender_type = 'user' 
                  AND m.is_read = 0
                  AND m.is_unsent = FALSE
                GROUP BY c.id, u.username
            `, [professionalId])
            byConversation = byConvResult
        }

        res.status(200).json({
            success: true,
            unread_count: result?.[0]?.unread_count || 0,
            by_conversation: byConversation || []
        })
    } catch (err) {
        console.error("getUnreadCount error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }
}