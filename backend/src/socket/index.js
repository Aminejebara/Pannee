import { Server } from "socket.io"
import { verifyAccessToken } from "../utils/jwt.js"
import { pool } from "../config/db.js"

let io = null

export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true,
      methods: ["GET", "POST"]
    }
  })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error("Authentication error: token missing"))
      }

      const decoded = verifyAccessToken(token)
      socket.userId = decoded.id
      socket.userRole = decoded.role

      if (decoded.role === 'professional') {
        const [pro] = await pool.query(
          `SELECT id FROM professionals WHERE user_id = ?`,
          [decoded.id]
        )
        if (pro[0]) {
          socket.professionalId = pro[0].id
          console.log(`🔑 Pro ${decoded.id} → professional_id: ${socket.professionalId}`)
        } else {
          console.log(`❌ ERREUR: Aucun professional_id trouvé pour user_id: ${decoded.id}`)
        }
      }

      next()
    } catch (err) {
      console.error("Socket auth error:", err.message)
      next(new Error("Authentication error: invalid token"))
    }
  })

  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.userRole})`)

    socket.join(`user_${socket.userId}`)
    socket.join(`role_${socket.userRole}`)

    if (socket.professionalId) {
      socket.join(`professional_${socket.professionalId}`)
      console.log(`📌 Pro rejoint room professional_${socket.professionalId}`)
    }

    console.log(`🔍 Rooms du socket ${socket.userId}:`, Array.from(socket.rooms))

    socket.data = {
      userId: socket.userId,
      userRole: socket.userRole,
      professionalId: socket.professionalId
    }

    socket.on("send_message", async (data) => {
      try {
        const { conversationId, receiverId, receiverType, content, type = "text", media_url = null } = data

        console.log(`📨 send_message reçu - receiverType: ${receiverType}, receiverId: ${receiverId}`)

        const senderType = socket.userRole === "professional" ? "professional" : "user"

        let convId = conversationId

        if (!convId) {
          let existingConv = null

          if (senderType === "user") {
            const [rows] = await pool.query(
              `SELECT id FROM conversations WHERE user_id = ? AND professional_id = ?`,
              [socket.userId, receiverId]
            )
            existingConv = rows[0]
          } else {
            const [rows] = await pool.query(
              `SELECT id FROM conversations WHERE user_id = ? AND professional_id = ?`,
              [receiverId, socket.userId]
            )
            existingConv = rows[0]
          }

          if (existingConv) {
            convId = existingConv.id
          } else {
            if (senderType === "user") {
              const [result] = await pool.query(
                `INSERT INTO conversations (user_id, professional_id) VALUES (?, ?)`,
                [socket.userId, receiverId]
              )
              convId = result.insertId
            } else {
              const [result] = await pool.query(
                `INSERT INTO conversations (user_id, professional_id) VALUES (?, ?)`,
                [receiverId, socket.userId]
              )
              convId = result.insertId
            }
          }
        }

        const [msgResult] = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, sender_type, content, type, media_url)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [convId, socket.userId, senderType, content, type, media_url]
        )

        await pool.query(
          `UPDATE conversations SET last_message_at = NOW() WHERE id = ?`,
          [convId]
        )

        const [newMessage] = await pool.query(
          `SELECT * FROM messages WHERE id = ?`,
          [msgResult.insertId]
        )

        let receiverRoom = null
        if (receiverType === 'user') {
          receiverRoom = `user_${receiverId}`
        } else if (receiverType === 'professional') {
          const [proRow] = await pool.query(
            `SELECT id FROM professionals WHERE user_id = ?`,
            [receiverId]
          )
          if (proRow[0]) {
            receiverRoom = `professional_${proRow[0].id}`
            console.log(`✅ Room pro correcte: ${receiverRoom}`)
          } else {
            console.log(`❌ Aucun pro trouvé pour user_id: ${receiverId}`)
          }
        }

        console.log(`📤 Émission vers room: ${receiverRoom}`)

        const roomSockets = await io.in(receiverRoom).fetchSockets()
        console.log(`📊 Nombre de clients dans ${receiverRoom}: ${roomSockets.length}`)

        if (receiverRoom && roomSockets.length > 0) {
          io.to(receiverRoom).emit("receive_message", {
            message: newMessage[0],
            conversationId: convId
          })
          console.log(`✅ Message émis vers ${receiverRoom}`)
        } else {
          console.log(`⚠️ Room ${receiverRoom} vide ou inexistante!`)
        }

        socket.emit("message_sent", {
          message: newMessage[0],
          conversationId: convId
        })

      } catch (err) {
        console.error("send_message error:", err)
        socket.emit("error", { message: "Erreur lors de l'envoi" })
      }
    })

    socket.on("mark_read", async (data) => {
      try {
        const { messageId, conversationId } = data

        const otherPartyType = socket.userRole === "user" ? "professional" : "user"

        const [result] = await pool.query(
          `UPDATE messages 
           SET is_read = 1 
           WHERE conversation_id = ? 
           AND sender_type = ? 
           AND is_read = 0
           AND is_unsent = FALSE`,  // ✅ AJOUT FILTRE UNSEND
          [conversationId, otherPartyType]
        )

        socket.emit("read_confirmed", {
          messageId,
          conversationId,
          updatedCount: result.affectedRows
        })
      } catch (err) {
        console.error("mark_read error:", err)
      }
    })

    socket.on("get_conversation", async (data) => {
      try {
        const { conversationId, limit = 50, offset = 0 } = data

        const [messages] = await pool.query(
          `SELECT * FROM messages 
           WHERE conversation_id = ? 
             AND is_unsent = FALSE  -- ✅ FILTRER UNSEND
           ORDER BY created_at DESC 
           LIMIT ? OFFSET ?`,
          [conversationId, parseInt(limit), parseInt(offset)]
        )

        socket.emit("conversation_history", {
          success: true,
          conversationId,
          messages: messages.reverse(),
          hasMore: messages.length === parseInt(limit)
        })
      } catch (err) {
        console.error("get_conversation error:", err)
        socket.emit("error", { message: "Erreur lors de la récupération" })
      }
    })

    socket.on("typing", async (data) => {
      try {
        const { conversationId, receiverId, receiverType, isTyping } = data

        let receiverRoom = null
        if (receiverType === 'user') {
          receiverRoom = `user_${receiverId}`
        } else if (receiverType === 'professional') {
          const [proRow] = await pool.query(
            `SELECT id FROM professionals WHERE user_id = ?`,
            [receiverId]
          )
          if (proRow[0]) {
            receiverRoom = `professional_${proRow[0].id}`
          }
        } else {
          receiverRoom = `user_${receiverId}`
        }

        console.log(`⌨️ Typing - room: ${receiverRoom}, isTyping: ${isTyping}`)

        if (receiverRoom) {
          io.to(receiverRoom).emit("user_typing", {
            conversationId,
            userId: socket.userId,
            userRole: socket.userRole,
            isTyping
          })
        }
      } catch (err) {
        console.error("typing error:", err)
      }
    })

    socket.on("mark_conversation_read", async (data) => {
      try {
        const { conversationId } = data

        const otherPartyType = socket.userRole === "user" ? "professional" : "user"

        const [result] = await pool.query(
          `UPDATE messages 
           SET is_read = 1 
           WHERE conversation_id = ? 
           AND sender_type = ? 
           AND is_read = 0
           AND is_unsent = FALSE`,  // ✅ AJOUT FILTRE UNSEND
          [conversationId, otherPartyType]
        )

        socket.emit("conversation_read_confirmed", {
          conversationId,
          updatedCount: result.affectedRows
        })
      } catch (err) {
        console.error("mark_conversation_read error:", err)
      }
    })

    // ============================================================
    // 🆕 EVENEMENTS UNSEND (SOCKET.IO)
    // ============================================================

    /**
     * UNSEND un message (le sender supprime pour tout le monde)
     * Emis par le sender quand il fait UNSEND
     */
    socket.on("unsend_message", async (data) => {
      try {
        const { messageId, conversationId } = data
        const userId = socket.userId
        const userRole = socket.userRole

        console.log(`🔴 UNSEND - messageId: ${messageId}, userId: ${userId}`)

        // 1. Verifier que le message existe et que l'utilisateur est l'expediteur
        const [messages] = await pool.query(
          `SELECT * FROM messages WHERE id = ? AND sender_id = ?`,
          [messageId, userId]
        )

        if (messages.length === 0) {
          socket.emit("unsend_error", {
            success: false,
            message: "Message non trouve ou vous n'etes pas l'expediteur"
          })
          return
        }

        const message = messages[0]

        // 2. Verifier que le message n'est pas deja unsend
        if (message.is_unsent) {
          socket.emit("unsend_error", {
            success: false,
            message: "Ce message a deja ete unsend"
          })
          return
        }

        // 3. Marquer le message comme unsend
        await pool.query(
          `UPDATE messages 
           SET is_unsent = TRUE, 
               unsent_at = NOW(),
               unsent_by = ?
           WHERE id = ?`,
          [userId, messageId]
        )

        // 4. Recuperer le message mis a jour
        const [updatedMessage] = await pool.query(
          `SELECT * FROM messages WHERE id = ?`,
          [messageId]
        )

        // 5. Notifier les deux parties
        const senderRoom = userRole === 'user' ? `user_${userId}` : `professional_${socket.professionalId || conversationId}`
        
        // Notifier le sender
        socket.emit("message_unsent_confirmed", {
          success: true,
          messageId: parseInt(messageId),
          conversationId: parseInt(conversationId),
          unsentBy: userId,
          unsentAt: new Date()
        })

        // Notifier le destinataire
        const receiverType = userRole === 'user' ? 'professional' : 'user'
        let receiverRoom = null
        
        if (receiverType === 'user') {
          const [conv] = await pool.query(
            `SELECT user_id FROM conversations WHERE id = ?`,
            [conversationId]
          )
          if (conv.length > 0) {
            receiverRoom = `user_${conv[0].user_id}`
          }
        } else {
          const [conv] = await pool.query(
            `SELECT professional_id FROM conversations WHERE id = ?`,
            [conversationId]
          )
          if (conv.length > 0) {
            receiverRoom = `professional_${conv[0].professional_id}`
          }
        }

        if (receiverRoom) {
          io.to(receiverRoom).emit("message_unsent", {
            messageId: parseInt(messageId),
            conversationId: parseInt(conversationId),
            unsentBy: userId,
            unsentAt: new Date()
          })
          console.log(`📤 UNSEND - Notification envoyee a ${receiverRoom}`)
        }

        console.log(`✅ UNSEND - Message ${messageId} unsend avec succes`)

      } catch (err) {
        console.error("unsend_message error:", err)
        socket.emit("unsend_error", {
          success: false,
          message: "Erreur lors de l'unsend du message"
        })
      }
    })

    /**
     * UNSEND tous les messages d'une conversation
     * Emis par le sender quand il fait UNSEND ALL
     */
    socket.on("unsend_all_messages", async (data) => {
      try {
        const { conversationId } = data
        const userId = socket.userId
        const userRole = socket.userRole

        console.log(`🔴 UNSEND ALL - conversationId: ${conversationId}, userId: ${userId}`)

        // 1. Verifier que l'utilisateur a acces a la conversation
        let hasAccess = false
        if (userRole === 'user') {
          const [convCheck] = await pool.query(
            `SELECT id FROM conversations WHERE id = ? AND user_id = ?`,
            [conversationId, userId]
          )
          hasAccess = convCheck.length > 0
        } else {
          const [convCheck] = await pool.query(
            `SELECT c.id FROM conversations c
             JOIN professionals p ON c.professional_id = p.id
             WHERE c.id = ? AND p.user_id = ?`,
            [conversationId, userId]
          )
          hasAccess = convCheck.length > 0
        }

        if (!hasAccess) {
          socket.emit("unsend_all_error", {
            success: false,
            message: "Acces non autorise a cette conversation"
          })
          return
        }

        // 2. Compter les messages a unsend
        const [countResult] = await pool.query(
          `SELECT COUNT(*) as count FROM messages 
           WHERE conversation_id = ? 
           AND sender_id = ? 
           AND is_unsent = FALSE`,
          [conversationId, userId]
        )

        if (countResult[0].count === 0) {
          socket.emit("unsend_all_confirmed", {
            success: true,
            conversationId: parseInt(conversationId),
            affectedCount: 0,
            message: "Aucun message a unsend"
          })
          return
        }

        // 3. Marquer tous les messages comme unsend
        const [result] = await pool.query(
          `UPDATE messages 
           SET is_unsent = TRUE, 
               unsent_at = NOW(),
               unsent_by = ?
           WHERE conversation_id = ? 
           AND sender_id = ? 
           AND is_unsent = FALSE`,
          [userId, conversationId, userId]
        )

        // 4. Notifier les deux parties
        const senderRoom = userRole === 'user' ? `user_${userId}` : `professional_${socket.professionalId || conversationId}`
        
        // Notifier le sender
        socket.emit("unsend_all_confirmed", {
          success: true,
          conversationId: parseInt(conversationId),
          affectedCount: result.affectedRows,
          unsentBy: userId,
          unsentAt: new Date()
        })

        // Notifier le destinataire
        const receiverType = userRole === 'user' ? 'professional' : 'user'
        let receiverRoom = null
        
        if (receiverType === 'user') {
          const [conv] = await pool.query(
            `SELECT user_id FROM conversations WHERE id = ?`,
            [conversationId]
          )
          if (conv.length > 0) {
            receiverRoom = `user_${conv[0].user_id}`
          }
        } else {
          const [conv] = await pool.query(
            `SELECT professional_id FROM conversations WHERE id = ?`,
            [conversationId]
          )
          if (conv.length > 0) {
            receiverRoom = `professional_${conv[0].professional_id}`
          }
        }

        if (receiverRoom) {
          io.to(receiverRoom).emit("messages_unsent_all", {
            conversationId: parseInt(conversationId),
            unsentBy: userId,
            count: result.affectedRows,
            unsentAt: new Date()
          })
          console.log(`📤 UNSEND ALL - Notification envoyee a ${receiverRoom}`)
        }

        console.log(`✅ UNSEND ALL - ${result.affectedRows} messages unsend dans la conversation ${conversationId}`)

      } catch (err) {
        console.error("unsend_all_messages error:", err)
        socket.emit("unsend_all_error", {
          success: false,
          message: "Erreur lors de l'unsend des messages"
        })
      }
    })

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.userId}`)
    })
  })

  return io
}

export { io }