// FICHIER: app/(main)/_layout.jsx

import { useEffect, useState } from 'react'
import { Redirect, Stack, useSegments } from 'expo-router'
import useAuthStore from '../../store/useAuthStore'
import { ActivityIndicator, View } from 'react-native'
import { COLORS } from '../../constants/colors'

export default function MainLayout() {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const segments = useSegments()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setIsReady(true)
    }
  }, [isLoading])

  if (!isReady || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
        <ActivityIndicator size="large" color={COLORS.blumine[600]} />
      </View>
    )
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  const currentPath = segments[1]
  const expectedPath = user?.role === 'professional' ? '(pro)' : '(user)'

  // ✅ CORRECTION: Permettre l'accès à conversation sans redirection
  // Si on est dans conversation, ne pas rediriger
  if (currentPath !== expectedPath && currentPath !== 'conversation') {
    return <Redirect href={`/(main)/${expectedPath}`} />
  }

  // ✅ CORRECTION: Afficher le Stack avec TOUS les screens
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name={expectedPath} />
      <Stack.Screen name="conversation" />  {/* ← AJOUTER CETTE LIGNE */}
    </Stack>
  )
}