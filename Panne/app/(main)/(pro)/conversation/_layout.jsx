import { Stack } from "expo-router";

export default function ProConversationLayout() {
  return (
    <Stack 
      screenOptions={{
        headerShown: false  // ← Désactive complètement le header
      }}
    />
  )
}