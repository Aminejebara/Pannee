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

        // ✅ CORRECTION: receiverId = user_id du pro, mais la room = professional_{professionals.id}
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

    // ✅ CORRECTION: async + requête SQL pour récupérer le bon professional_id
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

    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.userId}`)
    })
  })

  return io
}

export { io }