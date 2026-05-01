import React, { useState, useEffect } from 'react'
import { Redirect, Stack } from 'expo-router'
import useAuthStore from '../../store/useAuthStore'
import { ActivityIndicator, View } from 'react-native'
import { COLORS } from '../../constants/colors'

export default function MainLayout() {
  const { isAuthenticated, user } = useAuthStore()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setTimeout(() => setIsReady(true), 500)
  }, [])

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
        <ActivityIndicator size="large" color={COLORS.blumine[600]} />
      </View>
    )
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(user)" />
      <Stack.Screen name="(pro)" />
    </Stack>
  )
}