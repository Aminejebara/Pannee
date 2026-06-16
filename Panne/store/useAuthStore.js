// store/useAuthStore.js

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Détecter si on est sur web
const isWeb = typeof window !== 'undefined' && window.localStorage

// Choisir le bon stockage selon la plateforme
const getStorage = () => {
  if (isWeb) {
    // Sur web : utiliser localStorage
    return {
      getItem: (name) => {
        const value = localStorage.getItem(name)
        return Promise.resolve(value)
      },
      setItem: (name, value) => {
        localStorage.setItem(name, value)
        return Promise.resolve()
      },
      removeItem: (name) => {
        localStorage.removeItem(name)
        return Promise.resolve()
      },
    }
  } else {
    // Sur mobile : utiliser AsyncStorage (importé en haut)
    return AsyncStorage
  }
}

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      professional: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      setAuth: (user, professional, accessToken, refreshToken) => {
        console.log('🔐 setAuth appelé:', { 
          user: user?.username || user?.email, 
          professional: professional?.business_name || null,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        })
        set({
          user, 
          professional: professional || null, 
          accessToken, 
          refreshToken, 
          isAuthenticated: true, 
          isLoading: false,
          error: null
        })
      },
      
      setTokens: (accessToken, refreshToken) => set({ 
        accessToken, 
        refreshToken, 
        isAuthenticated: true,
        isLoading: false
      }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),
      
      logout: () => {
        console.log('🔴 logout appelé - nettoyage du store')
        set({ 
          user: null, 
          professional: null, 
          accessToken: null, 
          refreshToken: null, 
          isAuthenticated: false, 
          isLoading: false,
          error: null 
        })
      },
      
      clearAuth: () => set({ 
        user: null, 
        professional: null, 
        accessToken: null, 
        refreshToken: null, 
        isAuthenticated: false, 
        isLoading: false,
        error: null 
      }),
      
      isProfessional: () => get().user?.role === 'professional',
      isUser: () => get().user?.role === 'user',
      getAccessToken: () => get().accessToken,
      getRefreshToken: () => get().refreshToken,
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => getStorage()),
      partialize: (state) => ({
        user: state.user, 
        professional: state.professional,
        accessToken: state.accessToken, 
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Forcer la fin du chargement après réhydratation
        setTimeout(() => {
          state?.setLoading(false)
        }, 100)
      },
    }
  )
)

export default useAuthStore