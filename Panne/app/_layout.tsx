import { Stack, Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { setupNotificationListeners } from '../services/notificationService'
import { View } from 'react-native'

export default function RootLayout() {
  // ✅ Configurer les listeners de notifications
  useEffect(() => {
    console.log('🔵 Setup notification listeners')
    const cleanup = setupNotificationListeners()
    
    return () => {
      console.log('🔴 Cleanup notification listeners')
      if (cleanup) cleanup()
    }
  }, [])

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Redirect href="/(auth)/login" />
      </Stack>
    </>
  )
}