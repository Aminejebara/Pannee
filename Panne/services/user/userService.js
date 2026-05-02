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
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    });

    const response = await api.post('/user/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  // ─── Home ────────────────────────────────────────────────
  async getHomeData(lat = null, lng = null, radius = 10) {
    let url = '/user/home'
    if (lat && lng) url += `?lat=${lat}&lng=${lng}&radius=${radius}`
    const response = await api.get(url)
    return response.data
  },
  
  async getNearbyProfessionals(lat, lng, radius = 10, page = 1, limit = 20) {
    const response = await api.get('/user/nearby', {
      params: { lat, lng, radius, page, limit }
    })
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
}