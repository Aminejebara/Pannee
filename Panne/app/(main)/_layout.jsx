// app/(main)/_layout.jsx

import { useEffect, useState } from 'react'
import { Redirect, Stack, useSegments } from 'expo-router'
import useAuthStore from '../../store/useAuthStore'
import { ActivityIndicator, View } from 'react-native'
import { COLORS } from '../../constants/colors'

export default function MainLayout() {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const segments = useSegments()
  
  // Ajouter un timeout de sécurité
  const [forceReady, setForceReady] = useState(false)

  useEffect(() => {
    // Timeout de sécurité : après 3 secondes, on force l'affichage
    const timer = setTimeout(() => {
      if (!forceReady) {
        setForceReady(true)
      }
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [])

  // Afficher le loading seulement si isLoading est true ET qu'on n'a pas forcé le ready
  if ((isLoading && !forceReady) || (!forceReady && isLoading)) {
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

  if (currentPath !== expectedPath && currentPath !== 'conversation') {
    return <Redirect href={`/(main)/${expectedPath}`} />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name={expectedPath} />
      <Stack.Screen name="conversation" />
    </Stack>
  )
}