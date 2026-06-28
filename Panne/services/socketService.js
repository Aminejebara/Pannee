import io from 'socket.io-client'
import useAuthStore from '../store/useAuthStore'

//const API_URL = "https://pannebackend.duckdns.org" // ✅ Sans /api


const API_URL = "https://pannebackend.duckdns.org" // ✅ Sans /api
let socket = null

export const connectSocket = () => {
  const { accessToken } = useAuthStore.getState()

  if (!accessToken) {
    console.log('⚠️ Pas de token, socket non connecté')
    return null
  }

  if (socket?.connected) {
    console.log('🔌 Socket déjà connecté')
    return socket
  }

  // ✅ Nettoyage si socket existe mais déconnecté
  if (socket) {
    socket.disconnect()
    socket = null
  }

  socket = io(API_URL, {
    auth: { token: accessToken },
    transports: ['websocket'], // ✅ websocket uniquement — pas de polling sur mobile
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })

  socket.on('connect', () => {
    console.log('✅ Socket connecté, id:', socket.id)
    // ✅ Rien à émettre — le backend gère les rooms automatiquement à la connexion
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

  // ============================================================
  // ÉMETTRE
  // ============================================================

  joinConversation: (conversationId) =>
    socket?.emit('join_conversation', { conversationId }),

  sendMessage: (data) => {
    console.log('📤 Émission send_message:', data)
    socket?.emit('send_message', data)
  },

  markRead: (data) => socket?.emit('mark_read', data),
  markConversationRead: (data) => socket?.emit('mark_conversation_read', data),
  typing: (data) => socket?.emit('typing', data),
  getConversation: (data) => socket?.emit('get_conversation', data),

  unsendMessage: (data) => {
    console.log('📤 Émission unsend_message:', data)
    socket?.emit('unsend_message', data)
  },

  unsendAllMessages: (data) => {
    console.log('📤 Émission unsend_all_messages:', data)
    socket?.emit('unsend_all_messages', data)
  },

  // ============================================================
  // ÉCOUTER
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

  onMessageUnsentConfirmed: (callback) => socket?.on('message_unsent_confirmed', (data) => {
    console.log('✅ message_unsent_confirmed reçu:', data)
    callback(data)
  }),

  onMessageUnsent: (callback) => socket?.on('message_unsent', (data) => {
    console.log('🔴 message_unsent reçu:', data)
    callback(data)
  }),

  onUnsendAllConfirmed: (callback) => socket?.on('unsend_all_confirmed', (data) => {
    console.log('✅ unsend_all_confirmed reçu:', data)
    callback(data)
  }),

  onMessagesUnsentAll: (callback) => socket?.on('messages_unsent_all', (data) => {
    console.log('🔴 messages_unsent_all reçu:', data)
    callback(data)
  }),

  onUnsendError: (callback) => socket?.on('unsend_error', (data) => {
    console.log('❌ unsend_error reçu:', data)
    callback(data)
  }),

  onUnsendAllError: (callback) => socket?.on('unsend_all_error', (data) => {
    console.log('❌ unsend_all_error reçu:', data)
    callback(data)
  }),

  // ============================================================
  // NETTOYER
  // ============================================================

  offReceiveMessage: () => socket?.off('receive_message'),
  offUserTyping: () => socket?.off('user_typing'),
  offMessageSent: () => socket?.off('message_sent'),
  offReadConfirmed: () => socket?.off('read_confirmed'),
  offConversationReadConfirmed: () => socket?.off('conversation_read_confirmed'),
  offConversationHistory: () => socket?.off('conversation_history'),
  offError: () => socket?.off('error'),

  offMessageUnsentConfirmed: () => socket?.off('message_unsent_confirmed'),
  offMessageUnsent: () => socket?.off('message_unsent'),
  offUnsendAllConfirmed: () => socket?.off('unsend_all_confirmed'),
  offMessagesUnsentAll: () => socket?.off('messages_unsent_all'),
  offUnsendError: () => socket?.off('unsend_error'),
  offUnsendAllError: () => socket?.off('unsend_all_error'),
}