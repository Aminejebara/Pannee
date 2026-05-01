// controllers/proController/homeproController/getProDashboardData.js
import { pool } from "../../../config/db.js"

export const getProDashboardData = async (req, res) => {
    try {
        const userId = req.user.id

        // Récupérer l'ID du professionnel
        const [pros] = await pool.query(
            `SELECT * FROM professionals WHERE user_id = ?`,
            [userId]
        )
        
        if (pros.length === 0) {
            return res.status(404).json({ message: "Profil professionnel non trouvé" })
        }
        
        const professional = pros[0]

        // 1. Statistiques des messages
        const [messageStats] = await pool.query(`
            SELECT 
                COUNT(DISTINCT c.id) as total_conversations,
                SUM(CASE WHEN m.sender_type = 'user' AND m.is_read = 0 THEN 1 ELSE 0 END) as unread_from_users,
                SUM(CASE WHEN m.sender_type = 'user' THEN 1 ELSE 0 END) as received_from_users,
                SUM(CASE WHEN m.sender_type = 'professional' THEN 1 ELSE 0 END) as sent_to_users
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            WHERE c.professional_id = ?
        `, [professional.id])

        // 2. Derniers clients actifs
        const [activeClients] = await pool.query(`
            SELECT 
                u.id,
                u.username,
                u.email,
                u.phone,
                u.avatar_url,
                COUNT(m.id) as message_count,
                MAX(m.created_at) as last_activity
            FROM conversations c
            JOIN users u ON c.user_id = u.id
            JOIN messages m ON c.id = m.conversation_id
            WHERE c.professional_id = ?
            GROUP BY u.id
            ORDER BY last_activity DESC
            LIMIT 10
        `, [professional.id])

        // 3. Aperçu des dernières conversations
        const [recentMessages] = await pool.query(`
            SELECT 
                m.id,
                m.content,
                m.sender_type,
                m.created_at,
                m.is_read,
                u.id as user_id,
                u.username,
                u.avatar_url,
                c.id as conversation_id
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE c.professional_id = ?
            ORDER BY m.created_at DESC
            LIMIT 20
        `, [professional.id])

        res.status(200).json({
            success: true,
            data: {
                professional: {
                    id: professional.id,
                    business_name: professional.business_name,
                    rating_avg: professional.rating_avg,
                    rating_count: professional.rating_count,
                    status: professional.status
                },
                stats: {
                    total_conversations: messageStats[0].total_conversations || 0,
                    unread_messages: messageStats[0].unread_from_users || 0,
                    messages_received: messageStats[0].received_from_users || 0,
                    messages_sent: messageStats[0].sent_to_users || 0
                },
                active_clients: activeClients,
                recent_activity: recentMessages
            }
        })

    } catch (err) {
        console.error("getProDashboardData error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }
}