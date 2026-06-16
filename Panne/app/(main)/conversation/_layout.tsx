// FICHIER: app/(main)/conversation/_layout.tsx
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
export default function ConversationLayout() {
  return (
    <Stack>
      <StatusBar style="dark" />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  )
}