import { useState } from 'react'
import { proService } from '../services/pro/proService'

export const usePro = () => {
  const [loading, setLoading] = useState(false)

  // ─── Profile ─────────────────────────────────────────────
  const getProfile = async (professionalId) => {
    setLoading(true)
    try {
      const data = await proService.getProfile(professionalId)
      return { success: true, profile: data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (professionalId, data) => {
    setLoading(true)
    try {
      const response = await proService.updateProfile(professionalId, data)
      return { success: true, data: response.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const uploadAvatar = async (professionalId, imageUri) => {
    setLoading(true)
    try {
      const data = await proService.uploadAvatar(professionalId, imageUri)
      return { success: true, avatar_url: data.data.avatar_url }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  // ─── Dashboard / Stats ───────────────────────────────────
  const getStats = async () => {
    setLoading(true)
    try {
      const data = await proService.getStats()
      return { success: true, stats: data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  // ❌ getDashboard supprimé (route n'existe pas)

  // ─── Catégories ─────────────────────────────────────────
  const getAvailableCategories = async () => {
    setLoading(true)
    try {
      const data = await proService.getAvailableCategories()
      return { success: true, categories: data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const getProCategories = async (professionalId) => {
    setLoading(true)
    try {
      const data = await proService.getProCategories(professionalId)
      return { success: true, categories: data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  // ─── Messages ───────────────────────────────────────────
  const getConversations = async () => {
    setLoading(true)
    try {
      const data = await proService.getConversations()
      return { success: true, conversations: data.data }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const getMessages = async (conversationId, limit = 50, offset = 0) => {
    console.log("🔵  red red red getMessages appelé avec conversationId:", conversationId)
    setLoading(true)
    try {
      const data = await proService.getMessages(conversationId, limit, offset)
      return { success: true, messages: data.data, hasMore: data.hasMore }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (conversationId, content, type = 'text', media_url = null) => {
    setLoading(true)
    try {
      const data = await proService.sendMessage(conversationId, content, type, media_url)
      return { success: true, message: data.message }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const markConversationAsRead = async (conversationId) => {
    try {
      const data = await proService.markConversationAsRead(conversationId)
      return { success: true, message: data.message }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  }

  const getUnreadCount = async () => {
    try {
      const data = await proService.getUnreadCount()
      return { success: true, 
        unread_count: data.unread_count, 
        by_conversation: data.by_conversation 
      }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  }

  const uploadMessageImage = async (imageUri) => {
    setLoading(true)
    try {
      const data = await proService.uploadMessageImage(imageUri)
      return { success: true, url: data.data.url }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const getReviews = async (professionalId, page = 1, limit = 10) => {
  setLoading(true)
  try {
    const data = await proService.getReviews(professionalId, page, limit)
    return { success: true, reviews: data.data, pagination: data.pagination }
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
    uploadAvatar,
    // Dashboard
    getStats, 
    // ❌ getDashboard supprimé
    // Catégories
    getAvailableCategories,
    getProCategories,
    // Messages
    getConversations,
    getMessages,
    sendMessage,
    markConversationAsRead,
    getUnreadCount,
    uploadMessageImage,
    getReviews
  }
}