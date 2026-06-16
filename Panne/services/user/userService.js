import api from '../axios'

export const userService = {
  // ─── Profile ─────────────────────────────────────────────
  async getProfile() {
    const response = await api.get('/user/profile')
    return response.data
  },
  
  
  async updateProfile(data) {
    const response = await api.put('/user/profile', data)
    return response.data
  },
  
  async deleteAccount() {
    const response = await api.delete('/user/profile')
    return response.data
  },
  
  // ─── Upload avatar ───────────────────────────────────────
  async uploadAvatar(imageUri) {
    const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator')
    
    const compressed = await manipulateAsync(
      imageUri,
      [{ resize: { width: 400 } }],
      { compress: 0.5, format: SaveFormat.JPEG }
    )

    const formData = new FormData()
    formData.append('avatar', {
      uri: compressed.uri,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    })

    const response = await api.post('/user/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  
  // ─── Home ────────────────────────────────────────────────
  async getHomeData(lat = null, lng = null, radius = 10) {
    let url = '/user/home'
    if (lat && lng) url += `?lat=${lat}&lng=${lng}&radius=${radius}`
    const response = await api.get(url)
    return response.data
  },
  
  async getNearbyProfessionals(lat, lng, radius = 10, page = 1, limit = 20, category_id = null) {
    const response = await api.get('/user/nearby', {
      params: { lat, lng, radius, page, limit, category_id }
    })
    return response.data
  },
  
  async updateUserLocation(lat, lng, address = null, city = null, country = null) {
    const response = await api.put('/user/location', { lat, lng, address, city, country })
    return response.data
  },
  
  // ─── Messages ────────────────────────────────────────────
  async getConversations() {
    const response = await api.get('/user/conversations')
    return response.data
  },
  
  async getMessages(conversationId, limit = 50, offset = 0) {
    const response = await api.get(`/user/conversations/${conversationId}/messages`, {
      params: { limit, offset }
    })
    return response.data
  },
  
  async markConversationAsRead(conversationId) {
    const response = await api.put(`/user/conversations/${conversationId}/read`)
    return response.data
  },
  
  async createConversation(professionalId) {
    const response = await api.post('/user/conversations', { professionalId })
    return response.data
  },
  
  async sendMessage(conversationId, content, type = 'text', media_url = null) {
    const response = await api.post(`/user/conversations/${conversationId}/messages`, { 
      content, 
      type,
      media_url 
    })
    return response.data
  },
  
  async getUnreadCount() {
    const response = await api.get('/user/messages/unread/count')
    return response.data
  },
  
  // ─── Upload image pour messages ─────────────────────────
  async uploadMessageImage(imageUri) {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: 'image.jpg',
      type: 'image/jpeg',
    });

    const response = await api.post('/user/upload/message-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // ─── Avis ───────────────────────────────────────────────────
  async createReview(professionalId, rating, comment) {
    const response = await api.post('/user/reviews', {
      professional_id: professionalId,
      rating: rating,
      comment: comment
    })
    return response.data
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
    const response = await api.delete(`/user/messages/${messageId}/unsend`)
    return response.data
  },

  /**
   * UNSEND tous les messages d'une conversation
   * @param {number} conversationId - ID de la conversation
   * @returns {Promise} - Reponse du serveur
   */
  async unsendAllMessages(conversationId) {
    const response = await api.delete(`/user/conversations/${conversationId}/unsend-all`)
    return response.data
  },

  /**
   * Recuperer les messages UNSEND d'une conversation (audit)
   * @param {number} conversationId - ID de la conversation
   * @returns {Promise} - Liste des messages unsend
   */
  async getUnsentMessages(conversationId) {
    const response = await api.get(`/user/conversations/${conversationId}/unsent`)
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
    const response = await api.post('/user/notifications/register-token', {
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
    const response = await api.post('/user/notifications/deactivate-token')
    return response.data
  }
}