import { pool } from "../../config/db.js"
import { messageUpload } from "../../middlewares/uploadMiddleware.js"
import  { sendNewMessageNotification } from "../../middlewares/pushNotificationService.js"



export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params
        const { limit = 50, offset = 0 } = req.query
        const userId = req.user.id
        const userRole = req.user.role

        let hasAccess = false

        // Verification d'acces
        if (userRole === 'user') {
            const [result] = await pool.query(
                `SELECT id FROM conversations WHERE id = ? AND user_id = ?`, 
                [conversationId, userId]
            )
            hasAccess = result.length > 0
        } else {
            const [result] = await pool.query(`
                SELECT c.id FROM conversations c
                JOIN professionals p ON c.professional_id = p.id
                WHERE c.id = ? AND p.user_id = ?
            `, [conversationId, userId])
            hasAccess = result.length > 0
        }

        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "Accès non autorisé à cette conversation" 
            })
        }

        // Recuperer les messages (exclure les UNSEND)
        const [messages] = await pool.query(`
            SELECT 
                m.id, 
                m.conversation_id, 
                m.sender_id, 
                m.sender_type, 
                m.content, 
                m.type, 
                m.media_url, 
                m.is_read, 
                m.created_at,
                m.is_unsent,
                m.unsent_at,
                CASE 
                    WHEN m.sender_type = 'user' AND m.sender_id = ? THEN 'moi'
                    WHEN m.sender_type = 'professional' THEN 'professionnel'
                    ELSE m.sender_type
                END as sender_label
            FROM messages m
            WHERE m.conversation_id = ? 
              AND m.is_unsent = FALSE
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, conversationId, parseInt(limit), parseInt(offset)])

        // Marquer les messages comme lus (sauf les UNSEND)
        const otherPartyType = userRole === 'user' ? 'professional' : 'user'
        await pool.query(
            `UPDATE messages 
             SET is_read = 1 
             WHERE conversation_id = ? 
               AND sender_type = ? 
               AND is_read = 0
               AND is_unsent = FALSE`,
            [conversationId, otherPartyType]
        )

        res.status(200).json({ 
            success: true, 
            data: messages.reverse(), 
            hasMore: messages.length === parseInt(limit) 
        })
    } catch (err) {
        console.error("getMessages error:", err)
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        })
    }
}

