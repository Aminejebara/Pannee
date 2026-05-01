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
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { COLORS } from '../../constants/colors'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const { forgetPassword, loading } = useAuth()

  const handleSend = async () => {
    if (!email) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse e-mail')
      return
    }
    const result = await forgetPassword(email)
    if (result.success) {
      Alert.alert('Succès', 'Un code de réinitialisation a été envoyé', [
        { text: 'OK', onPress: () => router.push({ pathname: '/(auth)/reset-password', params: { email } }) }
      ])
    } else {
      Alert.alert('Erreur', result.error)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header simple */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={COLORS.black} />
          </TouchableOpacity>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Mot de passe oublié ?</Text>
          <Text style={styles.subtitle}>
            Pas d'inquiétude. Entrez votre e-mail pour recevoir un code de réinitialisation.
          </Text>
        </View>

        {/* Bloc Input style Airbnb */}
        <View style={styles.groupCard}>
          <View style={[styles.inputWrapper, styles.noBorder]}>
            <Text style={styles.label}>ADRESSE E-MAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor={COLORS.gray[400]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.sendButton, loading && { opacity: 0.7 }]} 
          onPress={handleSend} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.sendButtonText}>Envoyer le code</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.backToLoginText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40 },
  header: { height: 40, justifyContent: 'center', marginBottom: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center', marginLeft: -8 },
  
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
  },
  noBorder: { borderBottomWidth: 0 },
  label: { fontSize: 10, fontWeight: '800', color: COLORS.black, marginBottom: 4 },
  input: { fontSize: 16, color: COLORS.gray[900], paddingVertical: 4 },

  sendButton: {
    backgroundColor: COLORS.blumine[600],
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  sendButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  
  footer: { alignItems: 'center' },
  backToLoginText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: COLORS.black, 
    textDecorationLine: 'underline' 
  },
})