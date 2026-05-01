import { useState } from 'react'
import useAuthStore from '../store/useAuthStore'
import { authService } from '../services/auth/authService'

export const useAuth = () => {
  const [loading, setLoading] = useState(false)
  const { user, professional, accessToken, refreshToken, isAuthenticated, error, setAuth, logout: storeLogout, setError } = useAuthStore()

  const login = async (email, password, location = null) => {
    setLoading(true)
    try {
      const data = await authService.login(email, password, location)
      console.log('Login response:', data) // Pour debug
      setAuth(data.user, data.professional, data.accessToken, data.refreshToken)
      return { success: true, user: data.user, professional: data.professional }
    } catch (error) {
      console.error('Login error full:', error)
      console.error('Login error response:', error.response?.data)
      const message = error.response?.data?.message || 'Erreur de connexion'
      setError(message)
      return { success: false, error: message }
    } finally { setLoading(false) }
  }

  const registerUser = async (username, email, password, phone) => {
    setLoading(true)
    try {
      console.log('Registering user:', { username, email, password, phone })
      const data = await authService.registerUser(username, email, password, phone)
      console.log('Register response:', data)
      return { success: true, message: data.message }
    } catch (error) {
      console.error('Register error full:', error)
      console.error('Register error response:', error.response?.data)
      const message = error.response?.data?.message || "Erreur d'inscription"
      setError(message)
      return { success: false, error: message }
    } finally { setLoading(false) }
  }

  const registerPro = async (formData) => {
    setLoading(true)
    try {
      console.log('Registering pro:', formData)
      const data = await authService.registerPro(formData)
      console.log('Register pro response:', data)
      return { success: true, message: data.message }
    } catch (error) {
      console.error('Register pro error full:', error)
      console.error('Register pro error response:', error.response?.data)
      const message = error.response?.data?.message || "Erreur d'inscription"
      setError(message)
      return { success: false, error: message }
    } finally { setLoading(false) }
  }

  const verifyOTP = async (email, code) => {
    setLoading(true)
    try {
      const data = await authService.verifyOTP(email, code)
      setAuth(data.user, data.professional, data.accessToken, data.refreshToken)
      return { success: true, user: data.user, professional: data.professional }
    } catch (error) {
      console.error('OTP error:', error.response?.data)
      const message = error.response?.data?.message || 'Code invalide'
      setError(message)
      return { success: false, error: message }
    } finally { setLoading(false) }
  }

  const googleAuth = async (idToken) => {
    setLoading(true)
    try {
      const data = await authService.googleAuth(idToken)
      setAuth(data.user, data.professional, data.accessToken, data.refreshToken)
      return { success: true, user: data.user, professional: data.professional }
    } catch (error) {
      console.error('Google auth error:', error.response?.data)
      const message = error.response?.data?.message || 'Erreur Google'
      setError(message)
      return { success: false, error: message }
    } finally { setLoading(false) }
  }

  const logout = async () => {
    setLoading(true)
    try {
      const currentRefreshToken = useAuthStore.getState().refreshToken
      if (currentRefreshToken) await authService.logout(currentRefreshToken)
    } catch (error) { 
      console.error('Logout error:', error)
    } finally { 
      storeLogout(); 
      setLoading(false) 
    }
  }

  const forgetPassword = async (email) => {
    setLoading(true)
    try {
      const data = await authService.forgetPassword(email)
      return { success: true, message: data.message }
    } catch (error) {
      console.error('Forget password error:', error.response?.data)
      return { success: false, error: error.response?.data?.message || 'Email non trouvé' }
    } finally { setLoading(false) }
  }

  const resetPassword = async (email, code, newPassword) => {
    setLoading(true)
    try {
      const data = await authService.resetPassword(email, code, newPassword)
      return { success: true, message: data.message }
    } catch (error) {
      console.error('Reset password error:', error.response?.data)
      return { success: false, error: error.response?.data?.message || 'Erreur de réinitialisation' }
    } finally { setLoading(false) }
  }

  return {
    user, professional, accessToken, refreshToken, isAuthenticated, loading, error,
    isProfessional: user?.role === 'professional',
    isUser: user?.role === 'user',
    login, googleAuth, registerUser, registerPro, verifyOTP, logout, forgetPassword, resetPassword,
  }
}