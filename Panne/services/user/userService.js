import api from '../axios'

export const userService = {
  async getProfile() {
    const response = await api.get('/user/profile')
    return response.data
  },
  async updateProfile(data) {
    const response = await api.put('/user/profile', data)
    return response.data
  },
  async getHomeData(lat = null, lng = null, radius = 10) {
    let url = '/user/home'
    if (lat && lng) url += `?lat=${lat}&lng=${lng}&radius=${radius}`
    const response = await api.get(url)
    return response.data
  },
  async getConversations() {
    const response = await api.get('/user/conversations')
    return response.data
  },
  async sendMessage(conversationId, content, type = 'text') {
    const response = await api.post(`/user/conversations/${conversationId}/messages`, { content, type })
    return response.data
  },
  async createConversation(professionalId) {
    const response = await api.post('/user/conversations', { professionalId })
    return response.data
  },
}