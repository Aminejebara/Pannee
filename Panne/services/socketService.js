import io from 'socket.io-client'
import useAuthStore from '../store/useAuthStore'

let socket = null

export const connectSocket = () => {
  const { accessToken, user } = useAuthStore.getState()
  if (!accessToken) {
    console.log('⚠️ Pas de token, socket non connecté')
    return null
  }

    //const API_URL = "https://pannebackend.duckdns.org"
    const API_URL = "http://192.168.1.48:5000" // Remplacez par l'URL de votre serveur Socket.IO

  if (socket && socket.connected) {
    console.log('🔌 Socket déjà connecté')
    return socket
  }

  socket = io(API_URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'], // Ajouter polling fallback
    reconnection: true,
    reconnectionAttempts: 5
  })

  socket.on('connect', () => {
    console.log('✅ Socket connecté, id:', socket.id)
    
    // Rejoindre la room de l'utilisateur après connexion
    if (user) {
      const roomName = user.role === 'professional' 
        ? `professional_${user.id}` 
        : `user_${user.id}`
      socket.emit('join', { 
        userId: user.id, 
        role: user.role,
        room: roomName 
      })
      console.log(`📡 Rejoint la room: ${roomName}`)
    }
  })

  socket.on('disconnect', (reason) => {
    console.log('🔴 Socket déconnecté:', reason)
  })

  socket.on('connect_error', (error) => {
    console.log('🔴 Socket error:', error.message)
  })

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
    console.log('🔌 Socket déconnecté manuellement')
  }
}

export const getSocket = () => socket

export const socketEvents = {
  // Émettre qu'on rejoint une conversation
  joinConversation: (conversationId) => socket?.emit('join_conversation', { conversationId }),
  
  // Émettre un message
  sendMessage: (data) => {
    console.log('📤 Émission send_message:', data)
    socket?.emit('send_message', data)
  },
  
  markRead: (data) => socket?.emit('mark_read', data),
  markConversationRead: (data) => socket?.emit('mark_conversation_read', data),
  typing: (data) => socket?.emit('typing', data),
  getConversation: (data) => socket?.emit('get_conversation', data),
  
  // ============================================================
  // 🆕 EVENEMENTS UNSEND
  // ============================================================
  
  /**
   * UNSEND un message (supprimer pour tout le monde)
   * @param {Object} data - { messageId, conversationId }
   */
  unsendMessage: (data) => {
    console.log('📤 Émission unsend_message:', data)
    socket?.emit('unsend_message', data)
  },
  
  /**
   * UNSEND tous les messages d'une conversation
   * @param {Object} data - { conversationId }
   */
  unsendAllMessages: (data) => {
    console.log('📤 Émission unsend_all_messages:', data)
    socket?.emit('unsend_all_messages', data)
  },
  
  // ============================================================
  // Écouter les événements (existants)
  // ============================================================
  
  onReceiveMessage: (callback) => socket?.on('receive_message', (data) => {
    console.log('📩 receive_message reçu:', data)
    callback(data)
  }),
  onMessageSent: (callback) => socket?.on('message_sent', callback),
  onUserTyping: (callback) => socket?.on('user_typing', callback),
  onReadConfirmed: (callback) => socket?.on('read_confirmed', callback),
  onConversationReadConfirmed: (callback) => socket?.on('conversation_read_confirmed', callback),
  onConversationHistory: (callback) => socket?.on('conversation_history', callback),
  onError: (callback) => socket?.on('error', callback),
  
  // ============================================================
  // 🆕 Écouter les événements UNSEND
  // ============================================================
  
  /**
   * Confirmation que le message a ete unsend (pour l'expediteur)
   */
  onMessageUnsentConfirmed: (callback) => socket?.on('message_unsent_confirmed', (data) => {
    console.log('✅ message_unsent_confirmed reçu:', data)
    callback(data)
  }),
  
  /**
   * Notification que le message a ete unsend (pour le destinataire)
   */
  onMessageUnsent: (callback) => socket?.on('message_unsent', (data) => {
    console.log('🔴 message_unsent reçu:', data)
    callback(data)
  }),
  
  /**
   * Confirmation que tous les messages ont ete unsend (pour l'expediteur)
   */
  onUnsendAllConfirmed: (callback) => socket?.on('unsend_all_confirmed', (data) => {
    console.log('✅ unsend_all_confirmed reçu:', data)
    callback(data)
  }),
  
  /**
   * Notification que tous les messages ont ete unsend (pour le destinataire)
   */
  onMessagesUnsentAll: (callback) => socket?.on('messages_unsent_all', (data) => {
    console.log('🔴 messages_unsent_all reçu:', data)
    callback(data)
  }),
  
  /**
   * Erreur lors de l'unsend (pour l'expediteur)
   */
  onUnsendError: (callback) => socket?.on('unsend_error', (data) => {
    console.log('❌ unsend_error reçu:', data)
    callback(data)
  }),
  
  /**
   * Erreur lors de l'unsend all (pour l'expediteur)
   */
  onUnsendAllError: (callback) => socket?.on('unsend_all_error', (data) => {
    console.log('❌ unsend_all_error reçu:', data)
    callback(data)
  }),
  
  // ============================================================
  // Nettoyer les événements (existants)
  // ============================================================
  
  offReceiveMessage: () => socket?.off('receive_message'),
  offUserTyping: () => socket?.off('user_typing'),
  offMessageSent: () => socket?.off('message_sent'),
  offReadConfirmed: () => socket?.off('read_confirmed'),
  offConversationReadConfirmed: () => socket?.off('conversation_read_confirmed'),
  offConversationHistory: () => socket?.off('conversation_history'),
  offError: () => socket?.off('error'),
  
  // ============================================================
  // 🆕 Nettoyer les événements UNSEND
  // ============================================================
  
  offMessageUnsentConfirmed: () => socket?.off('message_unsent_confirmed'),
  offMessageUnsent: () => socket?.off('message_unsent'),
  offUnsendAllConfirmed: () => socket?.off('unsend_all_confirmed'),
  offMessagesUnsentAll: () => socket?.off('messages_unsent_all'),
  offUnsendError: () => socket?.off('unsend_error'),
  offUnsendAllError: () => socket?.off('unsend_all_error'),
}