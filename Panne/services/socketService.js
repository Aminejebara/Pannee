import io from 'socket.io-client'
import useAuthStore from '../store/useAuthStore'

let socket = null

export const connectSocket = () => {
  const { accessToken } = useAuthStore.getState()
  if (!accessToken) {
    console.log('⚠️ Pas de token, socket non connecté')
    return null
  }

  const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://172.20.10.4:5000'

  if (socket) {
    console.log('🔌 Socket déjà connecté')
    return socket
  }

  socket = io(API_URL, {
    auth: { token: accessToken },
    transports: ['websocket'],
  })

  socket.on('connect', () => {
    console.log('🔌 Socket connecté')
  })

  socket.on('disconnect', () => {
    console.log('🔌 Socket déconnecté')
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
  sendMessage: (data) => socket?.emit('send_message', data),
  markRead: (data) => socket?.emit('mark_read', data),
  markConversationRead: (data) => socket?.emit('mark_conversation_read', data),
  typing: (data) => socket?.emit('typing', data),
  getConversation: (data) => socket?.emit('get_conversation', data),
  
  onReceiveMessage: (callback) => socket?.on('receive_message', callback),
  onMessageSent: (callback) => socket?.on('message_sent', callback),
  onUserTyping: (callback) => socket?.on('user_typing', callback),
  onReadConfirmed: (callback) => socket?.on('read_confirmed', callback),
  onConversationReadConfirmed: (callback) => socket?.on('conversation_read_confirmed', callback),
  onConversationHistory: (callback) => socket?.on('conversation_history', callback),
  onError: (callback) => socket?.on('error', callback),
  
  offReceiveMessage: () => socket?.off('receive_message'),
  offUserTyping: () => socket?.off('user_typing'),
  offMessageSent: () => socket?.off('message_sent'),
}