import { useState } from 'react'
import { userService } from '../services/user/userService'

export const useUser = () => {
  const [loading, setLoading] = useState(false)

  // ─── Profile ─────────────────────────────────────────────
  const getProfile = async () => {
    setLoading(true)
    try {
      const data = await userService.getProfile()
      return { success: true, user: data.user }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (data) => {
    setLoading(true)
    try {
      const response = await userService.updateProfile(data)
      return { success: true, user: response.user, professional: response.professional }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async () => {
    setLoading(true)
    try {
      await userService.deleteAccount()
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  // ─── Home ────────────────────────────────────────────────
  const getHomeData = async (lat = null, lng = null, radius = 10) => {
    setLoading(true)
    try {
      const data = await userService.getHomeData(lat, lng, radius)
      return { success: true, data: data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const getNearbyProfessionals = async (lat, lng, radius = 10, page = 1, limit = 20) => {
    setLoading(true)
    try {
      const data = await userService.getNearbyProfessionals(lat, lng, radius, page, limit)
      return { success: true, data: data.data, pagination: data.pagination, location: data.location }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  // ─── Messages ────────────────────────────────────────────
  const getConversations = async () => {
    setLoading(true)
    try {
      const data = await userService.getConversations()
      return { success: true, conversations: data.data, count: data.count }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const getMessages = async (conversationId, limit = 50, offset = 0) => {
    setLoading(true)
    try {
      const data = await userService.getMessages(conversationId, limit, offset)
      return { success: true, messages: data.data, hasMore: data.hasMore }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const markConversationAsRead = async (conversationId) => {
    try {
      await userService.markConversationAsRead(conversationId)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  }

  const createConversation = async (professionalId) => {
    setLoading(true)
    try {
      const data = await userService.createConversation(professionalId)
      return { success: true, conversationId: data.conversationId, exists: data.exists }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (conversationId, content, type = 'text', media_url = null) => {
    setLoading(true)
    try {
      const data = await userService.sendMessage(conversationId, content, type, media_url)
      return { success: true, message: data.message, conversation_id: data.conversation_id }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const getUnreadCount = async () => {
    try {
      const data = await userService.getUnreadCount()
      return { success: true, unread_count: data.unread_count, by_conversation: data.by_conversation }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  }

  const uploadMessageImage = async (imageUri) => {
    setLoading(true)
    try {
      const data = await userService.uploadMessageImage(imageUri)
      return { success: true, url: data.data.url }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const uploadAvatar = async (imageUri) => {
  setLoading(true)
  try {
    const data = await userService.uploadAvatar(imageUri)
    return { success: true, avatar_url: data.data.avatar_url }
  } catch (error) {
    return { success: false, error: error.response?.data?.message }
  } finally {
    setLoading(false)
  }
}


const getProfessionalById = async (professionalId) => {
  setLoading(true)
  try {
    // Appel à l'API pro (qui existe déjà)
    const response = await api.get(`/pro/profile/${professionalId}`)
    return { success: true, profile: response.data.data }
  } catch (error) {
    return { success: false, error: error.response?.data?.message }
  } finally {
    setLoading(false)
  }
}




const createReview = async (professionalId, rating, comment) => {
  setLoading(true)
  try {
    const data = await userService.createReview(professionalId, rating, comment)
    return { success: true, message: data.message }
  } catch (error) {
    return { success: false, error: error.response?.data?.message }
  } finally {
    setLoading(false)
  }
}

  return {
    loading,
    // Profile
    getProfile,
    updateProfile,
    deleteAccount,
    // Home
    getHomeData,
    getNearbyProfessionals,
    // Messages
    getConversations,
    getMessages,
    markConversationAsRead,
    createConversation,
    sendMessage,
    getUnreadCount,
    uploadMessageImage,
    uploadAvatar,
    // Professional
    getProfessionalById , 
    createReview,
  }
}