import React from 'react'
import { View, Text, Button, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../../hooks/useAuth'
import { COLORS } from '../../../constants/colors'

export default function UserHomeScreen() {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue {user?.username} !</Text>
      <Text style={styles.subtitle}>Espace utilisateur</Text>
      <Text style={styles.email}>Email: {user?.email}</Text>
      <Button title="Déconnexion" onPress={handleLogout} color={COLORS.blumine[600]} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.blumine[600], marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.gray[500], marginBottom: 16 },
  email: { fontSize: 14, color: COLORS.gray[500], marginBottom: 30 },
})