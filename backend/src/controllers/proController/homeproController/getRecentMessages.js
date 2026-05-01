// controllers/proController/homeproController/getRecentMessages.js
import { pool } from "../../../config/db.js"

export const getRecentMessages = async (req, res) => {
    try {
        const userId = req.user.id
        const { limit = 20, offset = 0 } = req.query

        const [pros] = await pool.query(
            `SELECT id FROM professionals WHERE user_id = ?`,
            [userId]
        )
        
        if (pros.length === 0) {
            return res.status(404).json({ message: "Profil professionnel non trouvé" })
        }
        
        const professionalId = pros[0].id

        const [messages] = await pool.query(`
            SELECT 
                m.*,
                u.id as user_id,
                u.username,
                u.avatar_url,
                u.email,
                c.id as conversation_id
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE c.professional_id = ?
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [professionalId, parseInt(limit), parseInt(offset)])

        res.status(200).json({
            success: true,
            data: messages,
            count: messages.length
        })

    } catch (err) {
        console.error("getRecentMessages error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }
}