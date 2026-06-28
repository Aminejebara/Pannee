import axios from 'axios'
import useAuthStore from '../store/useAuthStore'

//const API_URL = "https://panneapi.duckdns.org/api" 

const API_URL = "https://panneapi.duckdns.org/api" // URL du backend

console.log('🔵 API_URL:', API_URL)

const api = axios.create({
  baseURL:`${API_URL}`,
  timeout: 30000, // Augmenté à 30 secondes pour debug
  headers: { 'Content-Type': 'application/json' },
})

// Log toutes les requêtes
api.interceptors.request.use(
  (config) => {
    console.log(`🔵 Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
    const accessToken = useAuthStore.getState().accessToken
    if (accessToken) {
      console.log('🔵 Token présent')
      config.headers.Authorization = `Bearer ${accessToken}`
    } else {
      console.log('🔵 Pas de token')
    }
    return config
  },
  (error) => {
    console.error('🔴 Request error:', error)
    return Promise.reject(error)
  }
)

// Log toutes les réponses
api.interceptors.response.use(
  (response) => {
    console.log(`🟢 Response: ${response.status} ${response.config.url}`)
    return response
  },
  async (error) => {
    console.error('🔴 Response error:', error.message)
    console.error('🔴 Error config:', error.config?.url)
    
    if (error.code === 'ECONNABORTED') {
      console.error('🔴 Timeout - Vérifie que le backend est bien lancé sur:', API_URL)
    }
    
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        if (!refreshToken) throw new Error('No refresh token')
        console.log('🔵 Refreshing token...')
        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
        const { accessToken } = response.data
        useAuthStore.getState().setTokens(accessToken, refreshToken)
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        console.error('🔴 Refresh failed:', refreshError)
        useAuthStore.getState().logout()
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

export default api