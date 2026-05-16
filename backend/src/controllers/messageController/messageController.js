import { pool } from "../../config/db.js"
import { messageUpload } from "../../middlewares/uploadMiddleware.js"

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
                    (
                        SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
                    ) as last_message,
                    (
                        SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
                    ) as last_message_time,
                    (
                        SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = 0 AND sender_type = 'professional'
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
                    u.phone,
                    (
                        SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
                    ) as last_message,
                    (
                        SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
                    ) as last_message_time,
                    (
                        SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = 0 AND sender_type = 'user'
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

export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params
        const { limit = 50, offset = 0 } = req.query
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
            return res.status(403).json({ success: false, message: "Accès non autorisé à cette conversation" })
        }

        const [messages] = await pool.query(`
            SELECT 
                m.id, m.conversation_id, m.sender_id, m.sender_type, m.content, m.type, m.media_url, m.is_read, m.created_at,
                CASE 
                    WHEN m.sender_type = 'user' AND m.sender_id = ? THEN 'moi'
                    WHEN m.sender_type = 'professional' THEN 'professionnel'
                    ELSE m.sender_type
                END as sender_label
            FROM messages m
            WHERE m.conversation_id = ? 
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, conversationId, parseInt(limit), parseInt(offset)])

        const otherPartyType = userRole === 'user' ? 'professional' : 'user'
        await pool.query(`UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_type = ? AND is_read = 0`, [conversationId, otherPartyType])

        res.status(200).json({ success: true, data: messages.reverse(), hasMore: messages.length === parseInt(limit) })
    } catch (err) {
        console.error("getMessages error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }
}

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
        const [result] = await pool.query(`UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_type = ? AND is_read = 0`, [conversationId, otherPartyType])

        res.status(200).json({ success: true, message: `${result.affectedRows} message(s) marqué(s) comme lu(s)` })
    } catch (err) {
        console.error("markConversationAsRead error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }
}

export const createConversation = async (req, res) => {
    try {
        const { professionalId } = req.body
        const userId = req.user.id

        if (!professionalId) {
            return res.status(400).json({ success: false, message: "professionalId est requis" })
        }

        const [proExists] = await pool.query(`SELECT id FROM professionals WHERE id = ? AND status = 'active'`, [professionalId])
        if (proExists.length === 0) {
            return res.status(404).json({ success: false, message: "Professionnel non trouvé" })
        }

        const [existing] = await pool.query(`SELECT id FROM conversations WHERE user_id = ? AND professional_id = ?`, [userId, professionalId])
        if (existing.length > 0) {
            return res.status(200).json({ success: true, conversationId: existing[0].id, exists: true })
        }

        const [result] = await pool.query(`INSERT INTO conversations (user_id, professional_id) VALUES (?, ?)`, [userId, professionalId])
        res.status(201).json({ success: true, conversationId: result.insertId, exists: false })
    } catch (err) {
        console.error("createConversation error:", err)
        res.status(500).json({ message: "Erreur serveur" })
    }
}

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

        if (io && receiverId) {
            let receiverRoom = null

            if (receiverType === 'user') {
                receiverRoom = `user_${receiverId}`
            } else if (receiverType === 'professional') {
                // ✅ On utilise directement receiverProfessionalId = professionals.id (pas user_id)
                receiverRoom = `professional_${receiverProfessionalId}`
            }

            console.log(`📤 HTTP - Émission vers room: ${receiverRoom} (type: ${receiverType})`)

            if (receiverRoom) {
                io.to(receiverRoom).emit("receive_message", {
                    message: messageData,
                    conversationId: parseInt(conversationId)
                })
                console.log(`✅ receive_message émis vers ${receiverRoom}`)
            } else {
                console.log("⚠️ receiverRoom est null")
            }

            // ✅ CORRECTION: suppression de message_sent vers l'expéditeur
            // L'expéditeur reçoit déjà la confirmation via la réponse HTTP (result.message)
            // Émettre message_sent créait des doublons côté front
        } else {
            console.log("⚠️ io non disponible ou receiverId manquant")
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

export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id
        const userRole = req.user.role

        let result = null
        let byConversation = null

        if (userRole === 'user') {
            const [unreadResult] = await pool.query(`
                SELECT COUNT(*) as unread_count
                FROM messages m JOIN conversations c ON m.conversation_id = c.id
                WHERE c.user_id = ? AND m.sender_type = 'professional' AND m.is_read = 0
            `, [userId])
            result = unreadResult

            const [byConvResult] = await pool.query(`
                SELECT c.id as conversation_id, p.business_name, COUNT(*) as unread_count
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN professionals p ON c.professional_id = p.id
                WHERE c.user_id = ? AND m.sender_type = 'professional' AND m.is_read = 0
                GROUP BY c.id, p.business_name
            `, [userId])
            byConversation = byConvResult
        } else {
            const [pros] = await pool.query(`SELECT id FROM professionals WHERE user_id = ?`, [userId])
            if (pros.length === 0) {
                return res.status(404).json({ message: "Profil non trouvé" })
            }
            const professionalId = pros[0].id

            const [unreadResult] = await pool.query(`
                SELECT COUNT(*) as unread_count
                FROM messages m JOIN conversations c ON m.conversation_id = c.id
                WHERE c.professional_id = ? AND m.sender_type = 'user' AND m.is_read = 0
            `, [professionalId])
            result = unreadResult

            const [byConvResult] = await pool.query(`
                SELECT c.id as conversation_id, u.username, COUNT(*) as unread_count
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                JOIN users u ON c.user_id = u.id
                WHERE c.professional_id = ? AND m.sender_type = 'user' AND m.is_read = 0
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

export const uploadMessageImage = [
    messageUpload.single('image'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Aucun fichier uploadé' })
            }

            const baseUrl = `${req.protocol}://${req.get('host')}`
            const imageUrl = `${baseUrl}/uploads/messages/${req.file.filename}`

            res.status(200).json({ success: true, message: 'Image uploadée avec succès', data: { url: imageUrl } })
        } catch (error) {
            console.error('Error uploading message image:', error)
            res.status(500).json({ success: false, message: "Erreur lors de l'upload", error: error.message })
        }
    }
]