import { pool } from "../config/db.js"

// ============================================================
// ENVOYER UNE NOTIFICATION PUSH VIA EXPO
// ============================================================
export const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
  try {
    if (!expoPushToken) {
      return null
    }

    const message = {
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: {
        ...data,
        clickAction: 'OPEN_CONVERSATION',
      },
      badge: 1,
      priority: 'high',
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('❌ sendPushNotification error:', error)
    return null
  }
}

// ============================================================
// ENVOYER UNE NOTIFICATION A UN UTILISATEUR
// ============================================================
export const sendPushNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    const [tokens] = await pool.query(
      'SELECT token FROM push_tokens WHERE user_id = ? AND is_active = TRUE',
      [userId]
    )

    if (tokens.length === 0) {
      console.log(`⚠️ Aucun token pour l'utilisateur ${userId}`)
      return { success: false, message: 'Aucun token' }
    }

    const results = []
    for (const token of tokens) {
      const result = await sendPushNotification(token.token, title, body, data)
      results.push(result)
    }

    return { success: true, results }
  } catch (error) {
    console.error('❌ sendPushNotificationToUser error:', error)
    return { success: false, error: error.message }
  }
}

// ============================================================
// ENVOYER UNE NOTIFICATION DE NOUVEAU MESSAGE
// ============================================================
export const sendNewMessageNotification = async (receiverId, senderName, messageContent, conversationId, senderId) => {
  const truncatedMessage = messageContent?.length > 100 
    ? messageContent.substring(0, 100) + '...' 
    : messageContent || '📷 Photo'

  return await sendPushNotificationToUser(
    receiverId,
    `💬 ${senderName}`,
    truncatedMessage,
    {
      type: 'message',
      conversationId: conversationId,
      senderId: senderId,
      senderName: senderName,
    }
  )
}