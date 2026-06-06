import io from 'socket.io-client'
import useAuthStore from '../store/useAuthStore'

let socket = null

export const connectSocket = () => {
  const { accessToken, user } = useAuthStore.getState()
  if (!accessToken) {
    console.log('⚠️ Pas de token, socket non connecté')
    return null
  }

  const API_URL = "http://192.168.1.197:5000"
  // Enlever /api de l'URL socket !

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
  
  // Écouter les événements
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
  
  // Nettoyer
  offReceiveMessage: () => socket?.off('receive_message'),
  offUserTyping: () => socket?.off('user_typing'),
  offMessageSent: () => socket?.off('message_sent'),
}