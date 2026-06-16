import { useState } from 'react'
import { userService } from '../services/user/userService'
import api from '../services/axios' // ✅ AJOUT pour getProfessionalById

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

  const getNearbyProfessionals = async (lat, lng, radius = 10, page = 1, limit = 20, category_id = null) => {
    setLoading(true)
    try {
      const data = await userService.getNearbyProfessionals(lat, lng, radius, page, limit, category_id)
      return { success: true, data: data.data, pagination: data.pagination, location: data.location }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  const updateUserLocation = async (lat, lng, address = null, city = null, country = null) => {
    setLoading(true)
    try {
      const data = await userService.updateUserLocation(lat, lng, address, city, country)
      return { success: true, message: data.message }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // 🆕 UNSEND - SUPPRIMER POUR TOUT LE MONDE
  // ============================================================

  /**
   * UNSEND un message (supprime pour tout le monde)
   * @param {number} messageId - ID du message a unsend
   * @returns {Promise} - Reponse du serveur
   */
  const unsendMessage = async (messageId) => {
    setLoading(true)
    try {
      const data = await userService.unsendMessage(messageId)
      return { 
        success: true, 
        message: data.message,
        data: data.data 
      }
    } catch (error) {
      console.error('unsendMessage error:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erreur lors de la suppression du message' 
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * UNSEND tous les messages d'une conversation
   * @param {number} conversationId - ID de la conversation
   * @returns {Promise} - Reponse du serveur
   */
  const unsendAllMessages = async (conversationId) => {
    setLoading(true)
    try {
      const data = await userService.unsendAllMessages(conversationId)
      return { 
        success: true, 
        message: data.message,
        affectedCount: data.affectedCount 
      }
    } catch (error) {
      console.error('unsendAllMessages error:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erreur lors de la suppression des messages' 
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Recuperer les messages UNSEND d'une conversation (audit)
   * @param {number} conversationId - ID de la conversation
   * @returns {Promise} - Liste des messages unsend
   */
  const getUnsentMessages = async (conversationId) => {
    setLoading(true)
    try {
      const data = await userService.getUnsentMessages(conversationId)
      return { 
        success: true, 
        messages: data.data,
        count: data.count 
      }
    } catch (error) {
      console.error('getUnsentMessages error:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erreur lors de la recuperation des messages unsend' 
      }
    } finally {
      setLoading(false)
    }
  }

  // ============================================================
  // 🆕 NOTIFICATIONS PUSH
  // ============================================================

  /**
   * Enregistrer le token push
   * @param {string} pushToken - Token Expo Push
   * @param {string} deviceType - 'ios' ou 'android'
   * @returns {Promise} - Reponse du serveur
   */
  const registerPushToken = async (pushToken, deviceType) => {
    setLoading(true)
    try {
      const data = await userService.registerPushToken(pushToken, deviceType)
      return { 
        success: true, 
        message: data.message 
      }
    } catch (error) {
      console.error('registerPushToken error:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erreur lors de l\'enregistrement du token' 
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Désactiver le token push
   * @returns {Promise} - Reponse du serveur
   */
  const deactivatePushToken = async () => {
    setLoading(true)
    try {
      const data = await userService.deactivatePushToken()
      return { 
        success: true, 
        message: data.message 
      }
    } catch (error) {
      console.error('deactivatePushToken error:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erreur lors de la désactivation du token' 
      }
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
    uploadAvatar,
    // Home
    getHomeData,
    getNearbyProfessionals,
    updateUserLocation,
    // Messages
    getConversations,
    getMessages,
    markConversationAsRead,
    createConversation,
    sendMessage,
    getUnreadCount,
    uploadMessageImage,
    // Professional
    getProfessionalById, 
    createReview,
    // 🆕 UNSEND
    unsendMessage,
    unsendAllMessages,
    getUnsentMessages,
    // 🆕 NOTIFICATIONS PUSH
    registerPushToken,
    deactivatePushToken,
  }
}