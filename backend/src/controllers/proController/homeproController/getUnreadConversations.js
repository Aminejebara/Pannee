// controllers/proController/homeproController/getUnreadConversations.js
import { pool } from "../../../config/db.js"

export const getUnreadConversations = async (req, res) => {
    try {
        const userId = req.user.id

        const [pros] = await pool.query(
            `SELECT id FROM professionals WHERE user_id = ?`,
            [userId]
        )
        
        if (pros.length === 0) {
            return res.status(404).json({ message: "Profil professionnel non trouvé" })
        }
        
        const professionalId = pros[0].id

        const [conversations] = await pool.query(`
            SELECT 
                c.id,
                c.last_message_at,
                u.id as user_id,
                u.username,
                u.avatar_url,
                u.email,
                u.phone,
                COUNT(m.id) as unread_count,
                (
                    SELECT content 
                    FROM messages 
                    WHERE conversation_id = c.id 
                    AND sender_type = 'user'
                    ORDER BY created_at DESC 
                    LIMIT 1
                ) as last_message
            FROM conversations c
            JOIN users u ON c.user_id = u.id
            JOIN messages m ON c.id = m.conversation_id
            WHERE c.professional_id = ?
            AND m.sender_type = 'user'
            AND m.is_read = 0
            GROUP BY c.id, u.id
            ORDER BY c.last_message_at DESC
        `, [professionalId])

        res.status(200).json({
            success: true,
            data: conversations,
            count: conversations.length
        })

    } catch (err) {
        console.error("getUnreadConversations error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }
}