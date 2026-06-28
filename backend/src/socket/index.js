import { Server } from "socket.io"
import { verifyAccessToken } from "../utils/jwt.js"
import { pool } from "../config/db.js"

let io = null

// ============================================================
// RATE LIMITER SIMPLE (évite le flood)
// ============================================================
const rateLimitMap = new Map()

const isRateLimited = (userId, event, maxPerSecond = 5) => {
  const key = `${userId}:${event}`
  const now = Date.now()
  const timestamps = rateLimitMap.get(key) || []
  const recent = timestamps.filter(t => now - t < 1000)
  if (recent.length >= maxPerSecond) return true
  recent.push(now)
  rateLimitMap.set(key, recent)
  return false
}

// Nettoyer la map toutes les 60 secondes pour éviter les fuites mémoire
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const recent = timestamps.filter(t => now - t < 2000)
    if (recent.length === 0) rateLimitMap.delete(key)
    else rateLimitMap.set(key, recent)
  }
}, 60_000)

// ============================================================
// CACHE SIMPLE pour professional_id (évite queries répétées)
// ============================================================
const proIdCache = new Map()

const getProfessionalId = async (userId) => {
  if (proIdCache.has(userId)) return proIdCache.get(userId)
  const [rows] = await pool.query(
    `SELECT id FROM professionals WHERE user_id = ? LIMIT 1`,
    [userId]
  )
  const proId = rows[0]?.id || null
  if (proId) proIdCache.set(userId, proId)
  return proId
}

// Vider le cache toutes les 10 minutes
setInterval(() => proIdCache.clear(), 10 * 60_000)

// ============================================================
// INIT SOCKET
// ============================================================
export function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      credentials: true,
      methods: ["GET", "POST"]
    },
    // ✅ Optimisations serveur léger
    pingTimeout: 30000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6,       // 1MB max par message
    connectTimeout: 10000,
    transports: ["websocket"],    // ✅ Websocket uniquement, pas de polling
    allowUpgrades: false,
  })

  // ============================================================
  // MIDDLEWARE AUTH
  // ============================================================
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) return next(new Error("token_missing"))

      const decoded = verifyAccessToken(token)
      socket.userId = decoded.id
      socket.userRole = decoded.role

      if (decoded.role === 'professional') {
        socket.professionalId = await getProfessionalId(decoded.id)
        if (!socket.professionalId) {
          return next(new Error("professional_not_found"))
        }
      }

      next()
    } catch (err) {
      next(new Error("invalid_token"))
    }
  })

  // ============================================================
  // CONNEXION
  // ============================================================
  io.on("connection", (socket) => {
    const { userId, userRole, professionalId } = socket

    // Rejoindre les rooms
    socket.join(`user_${userId}`)
    if (userRole === 'professional' && professionalId) {
      socket.join(`professional_${professionalId}`)
    }

    // ──────────────────────────────────────────────────────────
    // SEND MESSAGE
    // ──────────────────────────────────────────────────────────
    socket.on("send_message", async (data) => {
      // Rate limit : max 10 messages/seconde
      if (isRateLimited(userId, 'send_message', 10)) {
        return socket.emit("error", { message: "Trop de messages, ralentissez" })
      }

      try {
        const {
          conversationId,
          receiverId,
          receiverType,
          content,
          type = "text",
          media_url = null
        } = data

        if (!content && !media_url) return
        if (!receiverId || !receiverType) return

        const senderType = userRole === "professional" ? "professional" : "user"
        let convId = conversationId

        // Trouver ou créer la conversation
        if (!convId) {
          const userIdVal   = senderType === "user" ? userId : receiverId
          const proIdVal    = senderType === "professional" ? userId : receiverId

          const [rows] = await pool.query(
            `SELECT id FROM conversations WHERE user_id = ? AND professional_id = ? LIMIT 1`,
            [userIdVal, proIdVal]
          )

          if (rows[0]) {
            convId = rows[0].id
          } else {
            const [result] = await pool.query(
              `INSERT INTO conversations (user_id, professional_id) VALUES (?, ?)`,
              [userIdVal, proIdVal]
            )
            convId = result.insertId
          }
        }

        // Insérer le message
        const [msgResult] = await pool.query(
          `INSERT INTO messages (conversation_id, sender_id, sender_type, content, type, media_url)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [convId, userId, senderType, content, type, media_url]
        )

        // Update conversation (sans attendre)
        pool.query(
          `UPDATE conversations SET last_message_at = NOW() WHERE id = ?`,
          [convId]
        ).catch(() => {})

        // Récupérer le message inséré
        const [newMessage] = await pool.query(
          `SELECT * FROM messages WHERE id = ? LIMIT 1`,
          [msgResult.insertId]
        )

        const msg = newMessage[0]

        // Trouver la room du destinataire
        let receiverRoom = null
        if (receiverType === 'user') {
          receiverRoom = `user_${receiverId}`
        } else if (receiverType === 'professional') {
          const proId = await getProfessionalId(receiverId) // ✅ Cache
          if (proId) receiverRoom = `professional_${proId}`
        }

        // Émettre au destinataire
        if (receiverRoom) {
          io.to(receiverRoom).emit("receive_message", {
            message: msg,
            conversationId: convId
          })
        }

        // Confirmer à l'expéditeur
        socket.emit("message_sent", {
          message: msg,
          conversationId: convId
        })

      } catch (err) {
        console.error("send_message error:", err.message)
        socket.emit("error", { message: "Erreur lors de l'envoi" })
      }
    })

    // ──────────────────────────────────────────────────────────
    // TYPING (rate limit strict)
    // ──────────────────────────────────────────────────────────
    socket.on("typing", async (data) => {
      if (isRateLimited(userId, 'typing', 3)) return

      try {
        const { conversationId, receiverId, receiverType, isTyping } = data
        if (!receiverId) return

        let receiverRoom = null
        if (receiverType === 'user') {
          receiverRoom = `user_${receiverId}`
        } else if (receiverType === 'professional') {
          const proId = await getProfessionalId(receiverId)
          if (proId) receiverRoom = `professional_${proId}`
        }

        if (receiverRoom) {
          io.to(receiverRoom).emit("user_typing", {
            conversationId,
            userId,
            userRole,
            isTyping
          })
        }
      } catch (err) {
        // Silencieux — typing non critique
      }
    })

    // ──────────────────────────────────────────────────────────
    // MARK READ
    // ──────────────────────────────────────────────────────────
    socket.on("mark_read", async (data) => {
      if (isRateLimited(userId, 'mark_read', 5)) return
      try {
        const { messageId, conversationId } = data
        const otherPartyType = userRole === "user" ? "professional" : "user"
        const [result] = await pool.query(
          `UPDATE messages SET is_read = 1
           WHERE conversation_id = ? AND sender_type = ? AND is_read = 0 AND is_unsent = FALSE`,
          [conversationId, otherPartyType]
        )
        socket.emit("read_confirmed", { messageId, conversationId, updatedCount: result.affectedRows })
      } catch (err) {
        console.error("mark_read error:", err.message)
      }
    })

    socket.on("mark_conversation_read", async (data) => {
      if (isRateLimited(userId, 'mark_conversation_read', 5)) return
      try {
        const { conversationId } = data
        const otherPartyType = userRole === "user" ? "professional" : "user"
        const [result] = await pool.query(
          `UPDATE messages SET is_read = 1
           WHERE conversation_id = ? AND sender_type = ? AND is_read = 0 AND is_unsent = FALSE`,
          [conversationId, otherPartyType]
        )
        socket.emit("conversation_read_confirmed", { conversationId, updatedCount: result.affectedRows })
      } catch (err) {
        console.error("mark_conversation_read error:", err.message)
      }
    })

    // ──────────────────────────────────────────────────────────
    // GET CONVERSATION HISTORY
    // ──────────────────────────────────────────────────────────
    socket.on("get_conversation", async (data) => {
      if (isRateLimited(userId, 'get_conversation', 3)) return
      try {
        const { conversationId, limit = 50, offset = 0 } = data
        const [messages] = await pool.query(
          `SELECT * FROM messages
           WHERE conversation_id = ? AND is_unsent = FALSE
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
        console.error("get_conversation error:", err.message)
        socket.emit("error", { message: "Erreur lors de la récupération" })
      }
    })

    // ──────────────────────────────────────────────────────────
    // UNSEND MESSAGE
    // ──────────────────────────────────────────────────────────
    socket.on("unsend_message", async (data) => {
      if (isRateLimited(userId, 'unsend_message', 5)) return
      try {
        const { messageId, conversationId } = data

        const [messages] = await pool.query(
          `SELECT id, is_unsent FROM messages WHERE id = ? AND sender_id = ? LIMIT 1`,
          [messageId, userId]
        )

        if (messages.length === 0) {
          return socket.emit("unsend_error", { success: false, message: "Message introuvable" })
        }
        if (messages[0].is_unsent) {
          return socket.emit("unsend_error", { success: false, message: "Déjà supprimé" })
        }

        await pool.query(
          `UPDATE messages SET is_unsent = TRUE, unsent_at = NOW(), unsent_by = ? WHERE id = ?`,
          [userId, messageId]
        )

        // Confirmer à l'expéditeur
        socket.emit("message_unsent_confirmed", {
          success: true,
          messageId: parseInt(messageId),
          conversationId: parseInt(conversationId),
          unsentBy: userId,
          unsentAt: new Date()
        })

        // Notifier le destinataire
        const receiverRoom = await getReceiverRoom(conversationId, userRole, professionalId)
        if (receiverRoom) {
          io.to(receiverRoom).emit("message_unsent", {
            messageId: parseInt(messageId),
            conversationId: parseInt(conversationId),
            unsentBy: userId,
            unsentAt: new Date()
          })
        }

      } catch (err) {
        console.error("unsend_message error:", err.message)
        socket.emit("unsend_error", { success: false, message: "Erreur lors de la suppression" })
      }
    })

    // ──────────────────────────────────────────────────────────
    // UNSEND ALL MESSAGES
    // ──────────────────────────────────────────────────────────
    socket.on("unsend_all_messages", async (data) => {
      if (isRateLimited(userId, 'unsend_all', 2)) return
      try {
        const { conversationId } = data

        // Vérifier accès
        const accessQuery = userRole === 'user'
          ? `SELECT id FROM conversations WHERE id = ? AND user_id = ? LIMIT 1`
          : `SELECT c.id FROM conversations c JOIN professionals p ON c.professional_id = p.id WHERE c.id = ? AND p.user_id = ? LIMIT 1`

        const [convCheck] = await pool.query(accessQuery, [conversationId, userId])
        if (convCheck.length === 0) {
          return socket.emit("unsend_all_error", { success: false, message: "Accès refusé" })
        }

        const [result] = await pool.query(
          `UPDATE messages SET is_unsent = TRUE, unsent_at = NOW(), unsent_by = ?
           WHERE conversation_id = ? AND sender_id = ? AND is_unsent = FALSE`,
          [userId, conversationId, userId]
        )

        socket.emit("unsend_all_confirmed", {
          success: true,
          conversationId: parseInt(conversationId),
          affectedCount: result.affectedRows,
          unsentBy: userId,
          unsentAt: new Date()
        })

        const receiverRoom = await getReceiverRoom(conversationId, userRole, professionalId)
        if (receiverRoom) {
          io.to(receiverRoom).emit("messages_unsent_all", {
            conversationId: parseInt(conversationId),
            unsentBy: userId,
            count: result.affectedRows,
            unsentAt: new Date()
          })
        }

      } catch (err) {
        console.error("unsend_all_messages error:", err.message)
        socket.emit("unsend_all_error", { success: false, message: "Erreur lors de la suppression" })
      }
    })

    // ──────────────────────────────────────────────────────────
    // DISCONNECT
    // ──────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      // Nettoyer le rate limiter pour cet utilisateur
      for (const key of rateLimitMap.keys()) {
        if (key.startsWith(`${userId}:`)) rateLimitMap.delete(key)
      }
    })
  })

  return io
}

// ============================================================
// HELPER — trouver la room du destinataire
// ============================================================
async function getReceiverRoom(conversationId, senderRole, senderProfessionalId) {
  try {
    if (senderRole === 'user') {
      // L'expéditeur est un user → destinataire est le pro
      const [conv] = await pool.query(
        `SELECT professional_id FROM conversations WHERE id = ? LIMIT 1`,
        [conversationId]
      )
      if (conv[0]) return `professional_${conv[0].professional_id}`
    } else {
      // L'expéditeur est un pro → destinataire est le user
      const [conv] = await pool.query(
        `SELECT user_id FROM conversations WHERE id = ? LIMIT 1`,
        [conversationId]
      )
      if (conv[0]) return `user_${conv[0].user_id}`
    }
  } catch (err) {
    console.error("getReceiverRoom error:", err.message)
  }
  return null
}

export { io }