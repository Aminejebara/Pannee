import { Server } from "socket.io"
import { verifyAccessToken } from "../utils/jwt.js"
import { pool } from "../config/db.js"

export function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST"]
    }
  })

  // Middleware d'authentification Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error("Authentication error: token missing"))
      }

      const decoded = verifyAccessToken(token)
      socket.userId = decoded.id
      socket.userRole = decoded.role
      
      next()
    } catch (err) {
      console.error("Socket auth error:", err.message)
      next(new Error("Authentication error: invalid token"))
    }
  })

  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.userRole})`)

    // Rejoindre sa propre room
    socket.join(`user_${socket.userId}`)

    // 1️⃣ Envoyer un message
    socket.on("send_message", async (data) => {
      try {
        const { conversationId, receiverId, receiverType, content, type = "text" } = data
        
        const senderType = socket.userRole === "professional" ? "professional" : "user"
        
        let convId = conversationId
        
        if (!convId) {
          // Chercher si une conversation existe déjà
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
            // Créer nouvelle conversation
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

        // Insérer le message
        const [msgResult] = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, sender_type, content, type)
           VALUES (?, ?, ?, ?, ?)`,
          [convId, socket.userId, senderType, content, type]
        )

        // Mettre à jour last_message_at
        await pool.query(
          `UPDATE conversations SET last_message_at = NOW() WHERE id = ?`,
          [convId]
        )

        // Récupérer le message complet
        const [newMessage] = await pool.query(
          `SELECT * FROM messages WHERE id = ?`,
          [msgResult.insertId]
        )

        // Envoyer au destinataire
        const receiverRoom = `user_${receiverId}`
        io.to(receiverRoom).emit("receive_message", {
          message: newMessage[0],
          conversationId: convId
        })

        // Confirmer à l'expéditeur
        socket.emit("message_sent", {
          message: newMessage[0],
          conversationId: convId
        })

      } catch (err) {
        console.error("send_message error:", err)
        socket.emit("error", { message: "Erreur lors de l'envoi" })
      }
    })

    // 2️⃣ Marquer un message comme lu
    socket.on("mark_read", async (data) => {
      try {
        const { messageId, conversationId } = data
        
        // Marquer les messages de l'autre partie comme lus
        const otherPartyType = socket.userRole === "user" ? "professional" : "user"
        
        const [result] = await pool.query(
          `UPDATE messages 
           SET is_read = 1 
           WHERE conversation_id = ? 
           AND sender_type = ? 
           AND is_read = 0`,
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

    // 3️⃣ Récupérer l'historique des messages
    socket.on("get_conversation", async (data) => {
      try {
        const { conversationId, limit = 50, offset = 0 } = data
        
        const [messages] = await pool.query(
          `SELECT * FROM messages 
           WHERE conversation_id = ? 
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

    // 4️⃣ "En train d'écrire"
    socket.on("typing", (data) => {
      const { conversationId, receiverId, isTyping } = data
      const receiverRoom = `user_${receiverId}`
      
      io.to(receiverRoom).emit("user_typing", {
        conversationId,
        userId: socket.userId,
        userRole: socket.userRole,
        isTyping
      })
    })

    // 5️⃣ Marquer toute une conversation comme lue
    socket.on("mark_conversation_read", async (data) => {
      try {
        const { conversationId } = data
        
        const otherPartyType = socket.userRole === "user" ? "professional" : "user"
        
        const [result] = await pool.query(
          `UPDATE messages 
           SET is_read = 1 
           WHERE conversation_id = ? 
           AND sender_type = ? 
           AND is_read = 0`,
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

    // 6️⃣ Déconnexion
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.userId}`)
    })
  })

  return io
}