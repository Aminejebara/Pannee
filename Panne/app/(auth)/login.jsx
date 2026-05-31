import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Image 
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { useAuth } from '../../hooks/useAuth'
import { COLORS } from '../../constants/colors'
import { GOOGLE_OAUTH } from '../../constants/config'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { login, googleAuth, loading, isAuthenticated, user } = useAuth()

  // ✅ Plus besoin de redirectUri, les clients Android/iOS gèrent tout seuls
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_OAUTH.androidClientId,
    iosClientId: GOOGLE_OAUTH.iosClientId,
  });

  const handleGoogleLogin = async () => {
    console.log('🔍 Redirect URI utilisée:', request?.redirectUri)
    await promptAsync()
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      setTimeout(() => {
        if (user.role === 'professional') {
          router.replace('/(main)/(pro)')
        } else {
          router.replace('/(main)/(user)')
        }
      }, 100)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type === 'success') {
        setGoogleLoading(true)
        const { id_token } = response.params
        const result = await googleAuth(id_token)
        setGoogleLoading(false)
        if (!result.success) Alert.alert('Erreur', result.error)
      }
    }
    handleGoogleResponse()
  }, [response])

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs')
      return
    }
    const result = await login(email, password)
    if (!result.success) Alert.alert('Erreur', result.error)
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header} />

        <View style={styles.logoWrapper}>
          <Image 
            source={require('../../assets/icons/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>Panne<Text style={{color: COLORS.dixie[500]}}>.</Text></Text>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Content de vous revoir</Text>
          <Text style={styles.welcomeSubtitle}>Connectez-vous pour gérer vos demandes d'assistance automobile.</Text>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
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

          <View style={[styles.inputWrapper, styles.noBorder]}>
            <Text style={styles.label}>MOT DE PASSE</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.inputPassword}
                placeholder="Entrez votre mot de passe"
                placeholderTextColor={COLORS.gray[400]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showText}>{showPassword ? "Masquer" : "Afficher"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.loginButton, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.loginButtonText}>Continuer</Text>}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.googleButton, googleLoading && { opacity: 0.7 }]}
          onPress={handleGoogleLogin}
          disabled={googleLoading || !request}
        >
          {googleLoading ? (
            <ActivityIndicator color={COLORS.gray[700]} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color={COLORS.gray[700]} />
              <Text style={styles.googleButtonText}>Continuer avec Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.secondaryButtonText}>Créer un compte client</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.proLink} 
            onPress={() => router.push('/(auth)/register-pro')}
          >
            <Text style={styles.proText}>
              Vous êtes un dépanneur ? <Text style={styles.proTextBold}>Inscrivez-vous ici</Text>
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40 },
  header: { height: 40, justifyContent: 'center', marginBottom: 20 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  
  logoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12
  },
  logoIconBg: {
    width: 50,
    height: 50,
    backgroundColor: COLORS.blumine[950],
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.blumine[950],
    letterSpacing: -1,
  },
  logoImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: COLORS.blumine[950],
    padding: 8,
  },

  welcomeSection: { marginBottom: 32 },
  welcomeTitle: { fontSize: 26, fontWeight: '700', color: COLORS.black, marginBottom: 8 },
  welcomeSubtitle: { fontSize: 15, color: COLORS.gray[600], lineHeight: 22 },
  
  inputContainer: {
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    borderRadius: 12,
    marginBottom: 20,
  },
  inputWrapper: { padding: 12, borderBottomWidth: 1.5, borderBottomColor: COLORS.gray[300] },
  noBorder: { borderBottomWidth: 0 },
  label: { fontSize: 10, fontWeight: '800', color: COLORS.black, marginBottom: 4 },
  input: { fontSize: 16, color: COLORS.gray[900], paddingVertical: 4 },
  passwordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputPassword: { flex: 1, fontSize: 16, color: COLORS.gray[900], paddingVertical: 4 },
  showText: { fontSize: 14, fontWeight: '600', color: COLORS.black, textDecorationLine: 'underline' },
  
  loginButton: {
    backgroundColor: COLORS.blumine[600],
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.gray[300],
    marginTop: 12,
  },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.gray[700] },
  
  footer: { marginTop: 24, alignItems: 'center' },
  forgotText: { fontSize: 14, fontWeight: '600', color: COLORS.black, textDecorationLine: 'underline', marginBottom: 24 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 24 },
  divider: { flex: 1, height: 1, backgroundColor: COLORS.gray[200] },
  dividerText: { marginHorizontal: 16, color: COLORS.gray[500], fontSize: 12, fontWeight: '600' },
  secondaryButton: { width: '100%', paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.black, alignItems: 'center', marginBottom: 24 },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.black },
  proText: { fontSize: 14, color: COLORS.gray[600], textAlign: 'center' },
  proTextBold: { color: COLORS.blumine[600], fontWeight: '700' },
})