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
}