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

  // Vérifier le chemin actuel
  const currentPath = segments[1]
  const expectedPath = user?.role === 'professional' ? '(pro)' : '(user)'

  // Si pas sur le bon chemin, rediriger
  if (currentPath !== expectedPath) {
    return <Redirect href={`/(main)/${expectedPath}`} />
  }

  // ✅ AFFICHER LE STACK avec le bon groupe
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name={expectedPath} />
    </Stack>
  )
}