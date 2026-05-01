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
  ScrollView,
  StyleSheet
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { COLORS } from '../../constants/colors'

export default function RegisterScreen() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { registerUser, loading } = useAuth()

  const handleRegister = async () => {
    if (!username || !email || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas')
      return
    }

    const result = await registerUser(username, email, password, phone)
    
    if (result.success) {
      Alert.alert('Succès', 'Code de vérification envoyé', [
        { text: 'OK', onPress: () => router.push({ pathname: '/(auth)/verify-otp', params: { email } }) }
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
          <Text style={styles.headerTitle}>Créer un compte</Text>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Rejoignez Panne.</Text>
          <Text style={styles.subtitle}>Bénéficiez d'une assistance routière rapide et efficace en quelques clics.</Text>
        </View>

        {/* GROUPE D'ENTRÉES STYLE AIRBNB */}
        <View style={styles.groupCard}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>NOM D'UTILISATEUR *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: Jean Dupont" 
              placeholderTextColor={COLORS.gray[400]} 
              value={username} 
              onChangeText={setUsername} 
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>ADRESSE E-MAIL *</Text>
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

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>TÉLÉPHONE (OPTIONNEL)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="+33 6..." 
              placeholderTextColor={COLORS.gray[400]} 
              value={phone} 
              onChangeText={setPhone} 
              keyboardType="phone-pad" 
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>MOT DE PASSE *</Text>
            <View style={styles.passwordRow}>
              <TextInput 
                style={styles.inputPassword} 
                placeholder="6 caractères minimum" 
                secureTextEntry={!showPassword} 
                value={password} 
                onChangeText={setPassword} 
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showText}>{showPassword ? "Masquer" : "Afficher"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.inputWrapper, styles.noBorder]}>
            <Text style={styles.label}>CONFIRMER LE MOT DE PASSE *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Répétez votre mot de passe" 
              secureTextEntry={!showPassword} 
              value={confirmPassword} 
              onChangeText={setConfirmPassword} 
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.signupButton, loading && { opacity: 0.7 }]} 
          onPress={handleRegister} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.signupButtonText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.termsText}>
          En vous inscrivant, vous acceptez nos <Text style={styles.termsLink}>Conditions d'utilisation</Text> et notre <Text style={styles.termsLink}>Politique de confidentialité</Text>.
        </Text>

        <View style={styles.footer}>
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Se connecter</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity onPress={() => router.push('/(auth)/register-pro')} style={styles.proLink}>
            <Text style={styles.proText}>
              Vous êtes un dépanneur ? <Text style={styles.proTextBold}>Devenir partenaire</Text>
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backButton: { position: 'absolute', left: -8, zIndex: 10, padding: 8 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.black },
  
  titleContainer: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.black, marginBottom: 8, letterSpacing: -0.5 },
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

  signupButton: {
    backgroundColor: COLORS.blumine[600],
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  signupButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },
  
  termsText: { fontSize: 12, color: COLORS.gray[500], textAlign: 'center', lineHeight: 18, marginBottom: 30 },
  termsLink: { textDecorationLine: 'underline', fontWeight: '600' },

  footer: { alignItems: 'center' },
  loginContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  loginText: { fontSize: 14, color: COLORS.gray[600] },
  loginLink: { fontSize: 14, color: COLORS.black, fontWeight: '700', textDecorationLine: 'underline' },
  
  divider: { width: '40%', height: 1, backgroundColor: COLORS.gray[200], marginBottom: 20 },
  
  proText: { fontSize: 14, color: COLORS.gray[600] },
  proTextBold: { color: COLORS.blumine[600], fontWeight: '700' },
})