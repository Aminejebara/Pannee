
import { pool } from "../../config/db.js"
import { messageUpload } from "../../middlewares/uploadMiddleware.js"







export const sendMessage = async (req, res) => {
    try {
        const { conversationId } = req.params
        const { content, type = "text", media_url = null } = req.body
        const userId = req.user.id
        const userRole = req.user.role

        const io = req.app.locals.io

        console.log("🔵 sendMessage HTTP - conversationId:", conversationId)
        console.log("🔵 sendMessage HTTP - userRole:", userRole)

        if (!conversationId || !content) {
            return res.status(400).json({ success: false, message: "conversationId et content sont requis" })
        }

        let hasAccess = false
        let receiverId = null
        let receiverType = null
        let receiverProfessionalId = null

        if (userRole === 'user') {
            const [convCheck] = await pool.query(`
                SELECT c.id, c.professional_id, p.user_id as pro_user_id
                FROM conversations c
                JOIN professionals p ON c.professional_id = p.id
                WHERE c.id = ? AND c.user_id = ?
            `, [conversationId, userId])
            hasAccess = convCheck.length > 0
            if (hasAccess) {
                receiverId = convCheck[0].pro_user_id
                receiverType = 'professional'
                receiverProfessionalId = convCheck[0].professional_id
            }
        } else {
            const [convCheck] = await pool.query(`
                SELECT c.id, c.user_id
                FROM conversations c
                JOIN professionals p ON c.professional_id = p.id
                WHERE c.id = ? AND p.user_id = ?
            `, [conversationId, userId])
            hasAccess = convCheck.length > 0
            if (hasAccess) {
                receiverId = convCheck[0].user_id
                receiverType = 'user'
            }
        }

        if (!hasAccess) {
            return res.status(403).json({ success: false, message: "Accès non autorisé" })
        }

        const senderType = userRole === 'user' ? 'user' : 'professional'

        const [result] = await pool.query(`
            INSERT INTO messages (conversation_id, sender_id, sender_type, content, type, media_url)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [conversationId, userId, senderType, content, type, media_url])

        await pool.query(`UPDATE conversations SET last_message_at = NOW() WHERE id = ?`, [conversationId])

        const [newMessage] = await pool.query(`SELECT * FROM messages WHERE id = ?`, [result.insertId])
        const messageData = newMessage[0]

        // ============================================================
        // ✅ ENVOYER LA NOTIFICATION PUSH
        // ============================================================
        if (receiverId) {
            let senderName = ''
            let notificationBody = content || '📷 Photo'

            if (userRole === 'user') {
                const [userInfo] = await pool.query(
                    `SELECT username FROM users WHERE id = ?`,
                    [userId]
                )
                senderName = userInfo[0]?.username || 'Client'
            } else {
                const [proInfo] = await pool.query(
                    `SELECT business_name FROM professionals WHERE user_id = ?`,
                    [userId]
                )
                senderName = proInfo[0]?.business_name || 'Professionnel'
            }

            // Envoyer la notification push
            
        }

        // ============================================================
        // ✅ SOCKET.IO
        // ============================================================
        if (io && receiverId) {
            let receiverRoom = null

            if (receiverType === 'user') {
                receiverRoom = `user_${receiverId}`
            } else if (receiverType === 'professional') {
                receiverRoom = `professional_${receiverProfessionalId}`
            }

            if (receiverRoom) {
                io.to(receiverRoom).emit("receive_message", {
                    message: messageData,
                    conversationId: parseInt(conversationId)
                })
            }
        }

        res.status(201).json({
            success: true,
            message: messageData,
            conversation_id: conversationId
        })
    } catch (err) {
        console.error("sendMessage error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }
}