import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      professional: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,           // ← AJOUTÉ
      error: null,

      setAuth: (user, professional, accessToken, refreshToken) => set({
        user, 
        professional: professional || null, 
        accessToken, 
        refreshToken, 
        isAuthenticated: true, 
        isLoading: false,        // ← AJOUTÉ
        error: null
      }),
      
      setTokens: (accessToken, refreshToken) => set({ 
        accessToken, 
        refreshToken, 
        isAuthenticated: true,
        isLoading: false         // ← AJOUTÉ
      }),
      
      setLoading: (isLoading) => set({ isLoading }),  // ← AJOUTÉ
      
      setError: (error) => set({ error }),
      
      logout: () => set({ 
        user: null, 
        professional: null, 
        accessToken: null, 
        refreshToken: null, 
        isAuthenticated: false, 
        isLoading: false,        // ← AJOUTÉ
        error: null 
      }),
      
      clearAuth: () => set({ 
        user: null, 
        professional: null, 
        accessToken: null, 
        refreshToken: null, 
        isAuthenticated: false, 
        isLoading: false,        // ← AJOUTÉ
        error: null 
      }),
      
      isProfessional: () => get().user?.role === 'professional',
      isUser: () => get().user?.role === 'user',
      getAccessToken: () => get().accessToken,
      getRefreshToken: () => get().refreshToken,
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user, 
        professional: state.professional,
        accessToken: state.accessToken, 
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Quand les données sont chargées, isLoading passe à false
        state?.setLoading(false)
      },
    }
  )
)

export default useAuthStore