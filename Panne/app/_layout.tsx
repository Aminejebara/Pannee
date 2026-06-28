import { Stack, Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import { View } from 'react-native'

export default function RootLayout() {
  // ✅ Configurer les listeners de notifications


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