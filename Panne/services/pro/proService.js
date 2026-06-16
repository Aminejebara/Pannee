import api from '../axios'

export const proService = {

  async getReviews(professionalId, page = 1, limit = 10) {
    const response = await api.get(`/pro/profile/${professionalId}/reviews`, {
      params: { page, limit }
    })
    return response.data
  },

  // ─── Profile ─────────────────────────────────────────────
  async getProfile(professionalId) {
    const response = await api.get(`/pro/profile/${professionalId}`)
    return response.data
  },
  
  async updateProfile(professionalId, data) {
    const response = await api.put(`/pro/profile/${professionalId}`, data)
    return response.data
  },
  
  async uploadAvatar(professionalId, imageUri) {
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    });

    const response = await api.post(`/pro/profile/${professionalId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // ─── Dashboard / Stats ───────────────────────────────────
  async getStats() {
    const response = await api.get('/pro/stats')
    return response.data
  },
  
  // ─── Catégories ─────────────────────────────────────────
  async getAvailableCategories() {
    const response = await api.get('/pro/categories')
    return response.data
  },
  
  async getProCategories(professionalId) {
    const response = await api.get(`/auth/pro/${professionalId}/categories`)
    return response.data
  },
  
  // ─── Messages ───────────────────────────────────────────
  async getConversations() {
    const response = await api.get('/pro/conversations')
    return response.data
  },
  
  async getMessages(conversationId, limit = 50, offset = 0) {
    const response = await api.get(`/pro/conversations/${conversationId}/messages`, {
      params: { limit, offset }
    })
    return response.data
  },
  
  async sendMessage(conversationId, content, type = 'text', media_url = null) {
    const response = await api.post(`/pro/conversations/${conversationId}/messages`, { 
      content, 
      type,
      media_url 
    })
    return response.data
  },

  async updateLocation(professionalId, locationData) {
    const response = await api.put(`/pro/profile/${professionalId}/location`, locationData)
    return response.data
  },
  
  async markConversationAsRead(conversationId) {
    const response = await api.put(`/pro/conversations/${conversationId}/read`)
    return response.data
  },
  
  async getUnreadCount() {
    const response = await api.get('/pro/messages/unread/count')
    return response.data
  },
  
  // ─── Upload image ───────────────────────────────────────
  async uploadMessageImage(imageUri) {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: 'image.jpg',
      type: 'image/jpeg',
    });

    const response = await api.post('/pro/upload/message-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // ============================================================
  // 🆕 UNSEND - SUPPRIMER POUR TOUT LE MONDE
  // ============================================================

  /**
   * UNSEND un message (supprime pour tout le monde)
   * @param {number} messageId - ID du message a unsend
   * @returns {Promise} - Reponse du serveur
   */
  async unsendMessage(messageId) {
    const response = await api.delete(`/pro/messages/${messageId}/unsend`)
    return response.data
  },

  /**
   * UNSEND tous les messages d'une conversation
   * @param {number} conversationId - ID de la conversation
   * @returns {Promise} - Reponse du serveur
   */
  async unsendAllMessages(conversationId) {
    const response = await api.delete(`/pro/conversations/${conversationId}/unsend-all`)
    return response.data
  },

  /**
   * Recuperer les messages UNSEND d'une conversation (audit)
   * @param {number} conversationId - ID de la conversation
   * @returns {Promise} - Liste des messages unsend
   */
  async getUnsentMessages(conversationId) {
    const response = await api.get(`/pro/conversations/${conversationId}/unsent`)
    return response.data
  },

  // ============================================================
  // 🆕 NOTIFICATIONS PUSH
  // ============================================================

  /**
   * Enregistrer le token push
   * @param {string} pushToken - Token Expo Push
   * @param {string} deviceType - 'ios' ou 'android'
   * @returns {Promise} - Reponse du serveur
   */
  async registerPushToken(pushToken, deviceType) {
    const response = await api.post('/pro/notifications/register-token', {
      pushToken,
      deviceType
    })
    return response.data
  },

  /**
   * Désactiver le token push
   * @returns {Promise} - Reponse du serveur
   */
  async deactivatePushToken() {
    const response = await api.post('/pro/notifications/deactivate-token')
    return response.data
  }
}