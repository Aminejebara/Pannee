// controllers/proController/homeproController/getProStats.js
import { pool } from "../../../config/db.js"

export const getProStats = async (req, res) => {
    try {
        const userId = req.user.id

        // Récupérer l'ID du professionnel
        const [pros] = await pool.query(
            `SELECT id FROM professionals WHERE user_id = ?`,
            [userId]
        )
        
        if (pros.length === 0) {
            return res.status(404).json({ message: "Profil professionnel non trouvé" })
        }
        
        const professionalId = pros[0].id

        // 1. Nombre total de conversations AVEC au moins un message non unsend
        const [totalConv] = await pool.query(`
            SELECT COUNT(DISTINCT c.id) as total
            FROM conversations c
            WHERE c.professional_id = ?
            AND EXISTS (
                SELECT 1 FROM messages m 
                WHERE m.conversation_id = c.id 
                AND m.is_unsent = FALSE
            )
        `, [professionalId])

        // 2. Messages non lus (messages des USERS non lus) ✅ FILTRE UNSEND
        const [unreadMessages] = await pool.query(`
            SELECT COUNT(*) as unread 
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.professional_id = ? 
            AND m.sender_type = 'user'
            AND m.is_read = 0
            AND m.is_unsent = FALSE
        `, [professionalId])

        // 3. Conversations avec messages non lus ✅ FILTRE UNSEND
        const [conversationsWithUnread] = await pool.query(`
            SELECT COUNT(DISTINCT c.id) as count
            FROM conversations c
            JOIN messages m ON c.id = m.conversation_id
            WHERE c.professional_id = ?
            AND m.sender_type = 'user'
            AND m.is_read = 0
            AND m.is_unsent = FALSE
        `, [professionalId])

        // 4. Nombre total de messages reçus (des users) ✅ FILTRE UNSEND
        const [totalMessagesReceived] = await pool.query(`
            SELECT COUNT(*) as total
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.professional_id = ?
            AND m.sender_type = 'user'
            AND m.is_unsent = FALSE
        `, [professionalId])

        // 5. Nombre total de messages envoyés (par le pro) ✅ FILTRE UNSEND
        const [totalMessagesSent] = await pool.query(`
            SELECT COUNT(*) as total
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.professional_id = ?
            AND m.sender_type = 'professional'
            AND m.is_unsent = FALSE
        `, [professionalId])

        // 6. Dernières conversations actives (7 derniers jours) ✅ FILTRE UNSEND
        const [recentConversations] = await pool.query(`
            SELECT 
                c.id,
                c.last_message_at,
                u.id as user_id,
                u.username,
                u.avatar_url,
                (
                    SELECT content 
                    FROM messages 
                    WHERE conversation_id = c.id 
                    AND is_unsent = FALSE
                    ORDER BY created_at DESC 
                    LIMIT 1
                ) as last_message
            FROM conversations c
            JOIN users u ON c.user_id = u.id
            WHERE c.professional_id = ?
            AND c.last_message_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            AND EXISTS (
                SELECT 1 FROM messages m 
                WHERE m.conversation_id = c.id 
                AND m.is_unsent = FALSE
            )
            ORDER BY c.last_message_at DESC
            LIMIT 5
        `, [professionalId])

        // 7. Taux de réponse (messages répondus / messages reçus)
        const responseRate = totalMessagesReceived[0].total > 0 
            ? Math.round((totalMessagesSent[0].total / totalMessagesReceived[0].total) * 100)
            : 0

        res.status(200).json({
            success: true,
            data: {
                total_conversations: totalConv[0].total,
                unread_messages: unreadMessages[0].unread,
                conversations_with_unread: conversationsWithUnread[0].count,
                total_messages_received: totalMessagesReceived[0].total,
                total_messages_sent: totalMessagesSent[0].total,
                response_rate: responseRate,
                recent_conversations: recentConversations
            }
        })

    } catch (err) {
        console.error("getProStats error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }
}