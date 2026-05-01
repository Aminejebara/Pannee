import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setTheme: (theme) => set({ theme }),
      isDark: () => get().theme === 'dark',
    }),
    { name: 'theme-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
)

export default useThemeStore