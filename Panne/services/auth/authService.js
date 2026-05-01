import api from '../axios'

export const authService = {
  async login(email, password, location = null) {
    const response = await api.post('/auth/login', { 
      email, 
      password, 
      ...location 
    })
    return response.data
  },

  async registerUser(username, email, password, phone) {
    const response = await api.post('/auth/register', {  // ← changé
      username,
      email,
      password,
      phone: phone || null,
    })
    return response.data
  },

  async registerPro(data) {
    const response = await api.post('/auth/register-pro', data)  // ← changé
    return response.data
  },

  async googleAuth(idToken) {
    const response = await api.post('/auth/google-auth', { idToken })  // ← changé
    return response.data
  },

  async verifyOTP(email, code) {
    const response = await api.post('/auth/verify-otp', { email, code })
    return response.data
  },

  async forgetPassword(email) {
    const response = await api.post('/auth/forget-password', { email })
    return response.data
  },

  async resetPassword(email, code, newpassword) {
    const response = await api.post('/auth/reset-password', { email, code, newpassword })
    return response.data
  },

  async refreshToken(refreshToken) {
    const response = await api.post('/auth/refresh', { refreshToken })
    return response.data
  },

  async logout(refreshToken) {
    const response = await api.post('/auth/logout', { refreshToken })
    return response.data
  },

  async getCategories() {
    const response = await api.get('/auth/categories')
    return response.data
  },

  async getProCategories(professionalId) {
    const response = await api.get(`/auth/pro/${professionalId}/categories`)
    return response.data
  },
}