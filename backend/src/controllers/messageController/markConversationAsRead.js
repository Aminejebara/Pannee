import { pool } from "../../config/db.js"
import { messageUpload } from "../../middlewares/uploadMiddleware.js"
import  { sendNewMessageNotification } from "../../middlewares/pushNotificationService.js"



export const markConversationAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params
        const userId = req.user.id
        const userRole = req.user.role

        let hasAccess = false
        if (userRole === 'user') {
            const [result] = await pool.query(`SELECT id FROM conversations WHERE id = ? AND user_id = ?`, [conversationId, userId])
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
            return res.status(403).json({ success: false, message: "Accès non autorisé" })
        }

        const otherPartyType = userRole === 'user' ? 'professional' : 'user'
        // ✅ AJOUT DU FILTRE is_unsent = FALSE
        const [result] = await pool.query(
            `UPDATE messages 
             SET is_read = 1 
             WHERE conversation_id = ? 
               AND sender_type = ? 
               AND is_read = 0
               AND is_unsent = FALSE`,  // ← AJOUT
            [conversationId, otherPartyType]
        )

        res.status(200).json({ 
            success: true, 
            message: `${result.affectedRows} message(s) marqué(s) comme lu(s)` 
        })
    } catch (err) {
        console.error("markConversationAsRead error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }
}