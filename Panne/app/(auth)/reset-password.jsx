import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { COLORS } from '../../constants/colors'

export default function ResetPasswordScreen() {
  const { email } = useLocalSearchParams()
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { resetPassword, loading } = useAuth()

  const handleReset = async () => {
    if (!code || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    
    const result = await resetPassword(email, code, newPassword)
    if (result.success) {
      Alert.alert('Succès', 'Votre mot de passe a été réinitialisé', [
        { text: 'OK', onPress: () => router.push('/(auth)/login') }
      ])
    } else {
      Alert.alert('Erreur', result.error)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouveau mot de passe</Text>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Réinitialisation</Text>
          <Text style={styles.subtitle}>
            Saisissez le code reçu par e-mail et choisissez votre nouveau mot de passe sécurisé.
          </Text>
        </View>

        {/* Bloc Groupé Style Airbnb */}
        <View style={styles.groupCard}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>CODE DE RÉINITIALISATION</Text>
            <TextInput 
              style={styles.input} 
              placeholder="123456" 
              placeholderTextColor={COLORS.gray[400]} 
              value={code} 
              onChangeText={setCode} 
              keyboardType="number-pad" 
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>NOUVEAU MOT DE PASSE</Text>
            <View style={styles.passwordRow}>
              <TextInput 
                style={styles.inputPassword} 
                placeholder="••••••••" 
                secureTextEntry={!showPassword} 
                value={newPassword} 
                onChangeText={setNewPassword} 
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showText}>{showPassword ? "Masquer" : "Afficher"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.inputWrapper, styles.noBorder]}>
            <Text style={styles.label}>CONFIRMER LE MOT DE PASSE</Text>
            <TextInput 
              style={styles.input} 
              placeholder="••••••••" 
              secureTextEntry={!showPassword} 
              value={confirmPassword} 
              onChangeText={setConfirmPassword} 
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.resetButton, loading && { opacity: 0.7 }]} 
          onPress={handleReset} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.resetButtonText}>Enregistrer le mot de passe</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.backLink}>Annuler et se connecter</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backButton: { position: 'absolute', left: -8, zIndex: 10, padding: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.black },
  
  titleContainer: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.black, marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: COLORS.gray[600], lineHeight: 22 },

  groupCard: {
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    borderRadius: 12,
    backgroundColor: COLORS.white,
    marginBottom: 24,
    overflow: 'hidden'
  },
  inputWrapper: {
    padding: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.gray[300],
  },
  noBorder: { borderBottomWidth: 0 },
  label: { fontSize: 10, fontWeight: '800', color: COLORS.black, marginBottom: 4 },
  input: { fontSize: 16, color: COLORS.gray[900], paddingVertical: 2 },
  
  passwordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputPassword: { flex: 1, fontSize: 16, color: COLORS.gray[900], paddingVertical: 2 },
  showText: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },

  resetButton: {
    backgroundColor: COLORS.blumine[600],
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  resetButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  
  footer: { alignItems: 'center' },
  backLink: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: COLORS.black, 
    textDecorationLine: 'underline' 
  },
})