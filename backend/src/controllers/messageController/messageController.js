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
            await sendNewMessageNotification(
                receiverId,
                senderName,
                notificationBody,
                conversationId,
                userId
            )
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
export const uploadMessageImage = [
    messageUpload.single('image'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'Aucun fichier uploadé' })
            }

            // ✅ EN LOCAL (développement) - Utilisez votre IP locale
            const baseUrl = 'https://pannebackend.duckdns.org'  // ou le port que vous utilisez
            // OU si vous testez sur le même ordinateur :
            // const baseUrl = 'http://localhost:5000'
            
            // ❌ SUR LE SERVEUR (production) - À commenter en local
            // const baseUrl = 'https://pannebackend.duckdns.org'
            
            const imageUrl = `${baseUrl}/uploads/messages/${req.file.filename}`

            res.status(200).json({ success: true, message: 'Image uploadée avec succès', data: { url: imageUrl } })
        } catch (error) {
            console.error('Error uploading message image:', error)
            res.status(500).json({ success: false, message: "Erreur lors de l'upload", error: error.message })
        }
    }
]



// ============================================================
// UNSEND - SUPPRIMER UN MESSAGE POUR TOUT LE MONDE
// ============================================================

/**
 * UNSEND un message (suppression pour tout le monde)
 * Seul l'expediteur du message peut faire un UNSEND
 * Comportement comme Instagram
 */
export const unsendMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // 1. Verifier que le message existe et que l'utilisateur est l'expediteur
        const [messages] = await pool.query(`
            SELECT m.*, c.user_id as conv_user_id, c.professional_id as conv_pro_id
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE m.id = ?
        `, [messageId]);

        if (messages.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Message non trouve" 
            });
        }

        const message = messages[0];

        // 2. Verifier que l'utilisateur est bien l'expediteur du message
        if (message.sender_id !== userId) {
            return res.status(403).json({ 
                success: false, 
                message: "Vous ne pouvez pas unsend un message que vous n'avez pas envoye" 
            });
        }

        // 3. Verifier que l'utilisateur a acces a la conversation
        let hasAccess = false;
        if (userRole === 'user') {
            const [convCheck] = await pool.query(
                `SELECT id FROM conversations WHERE id = ? AND user_id = ?`,
                [message.conversation_id, userId]
            );
            hasAccess = convCheck.length > 0;
        } else {
            const [convCheck] = await pool.query(`
                SELECT c.id FROM conversations c
                JOIN professionals p ON c.professional_id = p.id
                WHERE c.id = ? AND p.user_id = ?
            `, [message.conversation_id, userId]);
            hasAccess = convCheck.length > 0;
        }

        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "Acces non autorise a cette conversation" 
            });
        }

        // 4. Verifier que le message n'est pas deja unsend
        if (message.is_unsent) {
            return res.status(400).json({ 
                success: false, 
                message: "Ce message a deja ete unsend" 
            });
        }

        // 5. Marquer le message comme unsend
        await pool.query(`
            UPDATE messages 
            SET is_unsent = TRUE, 
                unsent_at = NOW(),
                unsent_by = ?
            WHERE id = ?
        `, [userId, messageId]);

        // 6. Recuperer le message mis a jour
        const [updatedMessage] = await pool.query(`
            SELECT * FROM messages WHERE id = ?
        `, [messageId]);

        // 7. Emettre un evenement socket pour notifier les deux parties
        const io = req.app.locals.io;
        if (io) {
            // Notifier l'expediteur
            const senderRoom = userRole === 'user' ? `user_${userId}` : `professional_${message.conversation_id}`;
            io.to(senderRoom).emit("message_unsent", {
                messageId: parseInt(messageId),
                conversationId: message.conversation_id,
                unsentBy: userId,
                unsentAt: new Date()
            });

            // Notifier le destinataire
            const receiverType = userRole === 'user' ? 'professional' : 'user';
            let receiverRoom = null;
            if (receiverType === 'user') {
                const [conv] = await pool.query(
                    `SELECT user_id FROM conversations WHERE id = ?`,
                    [message.conversation_id]
                );
                if (conv.length > 0) {
                    receiverRoom = `user_${conv[0].user_id}`;
                }
            } else {
                const [conv] = await pool.query(
                    `SELECT professional_id FROM conversations WHERE id = ?`,
                    [message.conversation_id]
                );
                if (conv.length > 0) {
                    receiverRoom = `professional_${conv[0].professional_id}`;
                }
            }

            if (receiverRoom) {
                io.to(receiverRoom).emit("message_unsent", {
                    messageId: parseInt(messageId),
                    conversationId: message.conversation_id,
                    unsentBy: userId,
                    unsentAt: new Date()
                });
                console.log(`📤 UNSEND - Notification envoyee a ${receiverRoom}`);
            }
        }

        res.status(200).json({
            success: true,
            message: "Message unsend avec succes",
            data: updatedMessage[0]
        });

    } catch (err) {
        console.error("unsendMessage error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
};

/**
 * UNSEND tous les messages d'une conversation
 * Supprime tous les messages envoyes par l'utilisateur dans une conversation
 */
export const unsendAllMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // 1. Verifier l'acces a la conversation
        let hasAccess = false;
        let senderType = userRole === 'user' ? 'user' : 'professional';

        if (userRole === 'user') {
            const [convCheck] = await pool.query(
                `SELECT id FROM conversations WHERE id = ? AND user_id = ?`,
                [conversationId, userId]
            );
            hasAccess = convCheck.length > 0;
        } else {
            const [convCheck] = await pool.query(`
                SELECT c.id FROM conversations c
                JOIN professionals p ON c.professional_id = p.id
                WHERE c.id = ? AND p.user_id = ?
            `, [conversationId, userId]);
            hasAccess = convCheck.length > 0;
        }

        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "Acces non autorise a cette conversation" 
            });
        }

        // 2. Verifier qu'il y a des messages a unsend
        const [messages] = await pool.query(`
            SELECT COUNT(*) as count FROM messages 
            WHERE conversation_id = ? 
            AND sender_id = ? 
            AND is_unsent = FALSE
        `, [conversationId, userId]);

        if (messages[0].count === 0) {
            return res.status(200).json({
                success: true,
                message: "Aucun message a unsend",
                affectedCount: 0
            });
        }

        // 3. Marquer tous les messages comme unsend
        const [result] = await pool.query(`
            UPDATE messages 
            SET is_unsent = TRUE, 
                unsent_at = NOW(),
                unsent_by = ?
            WHERE conversation_id = ? 
            AND sender_id = ? 
            AND is_unsent = FALSE
        `, [userId, conversationId, userId]);

        // 4. Emettre un evenement socket pour notifier les deux parties
        const io = req.app.locals.io;
        if (io) {
            // Notifier l'expediteur
            const senderRoom = userRole === 'user' ? `user_${userId}` : `professional_${conversationId}`;
            io.to(senderRoom).emit("messages_unsent_all", {
                conversationId: parseInt(conversationId),
                unsentBy: userId,
                count: result.affectedRows,
                unsentAt: new Date()
            });

            // Notifier le destinataire
            const receiverType = userRole === 'user' ? 'professional' : 'user';
            let receiverRoom = null;
            if (receiverType === 'user') {
                const [conv] = await pool.query(
                    `SELECT user_id FROM conversations WHERE id = ?`,
                    [conversationId]
                );
                if (conv.length > 0) {
                    receiverRoom = `user_${conv[0].user_id}`;
                }
            } else {
                const [conv] = await pool.query(
                    `SELECT professional_id FROM conversations WHERE id = ?`,
                    [conversationId]
                );
                if (conv.length > 0) {
                    receiverRoom = `professional_${conv[0].professional_id}`;
                }
            }

            if (receiverRoom) {
                io.to(receiverRoom).emit("messages_unsent_all", {
                    conversationId: parseInt(conversationId),
                    unsentBy: userId,
                    count: result.affectedRows,
                    unsentAt: new Date()
                });
                console.log(`📤 UNSEND ALL - Notification envoyee a ${receiverRoom}`);
            }
        }

        res.status(200).json({
            success: true,
            message: `${result.affectedRows} message(s) unsend avec succes`,
            affectedCount: result.affectedRows
        });

    } catch (err) {
        console.error("unsendAllMessages error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
};

/**
 * Recuperer les messages UNSEND (pour audit/administration)
 */
export const getUnsentMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Seul un admin ou un participant peut voir les messages unsend
        let hasAccess = false;
        if (userRole === 'admin') {
            hasAccess = true;
        } else if (userRole === 'user') {
            const [convCheck] = await pool.query(
                `SELECT id FROM conversations WHERE id = ? AND user_id = ?`,
                [conversationId, userId]
            );
            hasAccess = convCheck.length > 0;
        } else {
            const [convCheck] = await pool.query(`
                SELECT c.id FROM conversations c
                JOIN professionals p ON c.professional_id = p.id
                WHERE c.id = ? AND p.user_id = ?
            `, [conversationId, userId]);
            hasAccess = convCheck.length > 0;
        }

        if (!hasAccess) {
            return res.status(403).json({ 
                success: false, 
                message: "Acces non autorise" 
            });
        }

        const [messages] = await pool.query(`
            SELECT 
                m.id, m.conversation_id, m.sender_id, m.sender_type, 
                m.content, m.type, m.media_url, m.is_read, m.created_at,
                m.is_unsent, m.unsent_at, m.unsent_by,
                u.username as unsent_by_username
            FROM messages m
            LEFT JOIN users u ON m.unsent_by = u.id
            WHERE m.conversation_id = ? AND m.is_unsent = TRUE
            ORDER BY m.unsent_at DESC
        `, [conversationId]);

        res.status(200).json({
            success: true,
            data: messages,
            count: messages.length
        });

    } catch (err) {
        console.error("getUnsentMessages error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Erreur serveur" 
        });
    }
};