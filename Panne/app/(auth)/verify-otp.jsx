import { useState, useRef, useEffect } from 'react'
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

export default function VerifyOTPScreen() {
  const { email } = useLocalSearchParams()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [timer, setTimer] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const { verifyOTP, forgetPassword, loading } = useAuth()
  const inputRefs = useRef([])

  useEffect(() => {
    if (timer > 0 && !canResend) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [timer, canResend])

  const handleCodeChange = (text, index) => {
    const newCode = [...code]
    newCode[index] = text.slice(-1) // Garde seulement le dernier caractère
    setCode(newCode)
    
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    const otpCode = code.join('')
    if (otpCode.length !== 6) {
      Alert.alert('Erreur', 'Veuillez entrer le code à 6 chiffres')
      return
    }
    const result = await verifyOTP(email, otpCode)
    if (result.success) {
      Alert.alert('Succès', 'Compte vérifié !', [
        { text: 'OK', onPress: () => router.replace('/(main)/(user)') }
      ])
    } else {
      Alert.alert('Erreur', result.error)
    }
  }

  const handleResend = async () => {
    if (!canResend) return
    const result = await forgetPassword(email)
    if (result.success) {
      setTimer(60)
      setCanResend(false)
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      Alert.alert('Succès', 'Un nouveau code a été envoyé')
    } else {
      Alert.alert('Erreur', result.error)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Navigation */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vérification</Text>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Vérifiez vos e-mails</Text>
          <Text style={styles.subtitle}>
            Nous avons envoyé un code de confirmation à l'adresse :{"\n"}
            <Text style={styles.emailText}>{email}</Text>
          </Text>
        </View>

        {/* OTP INPUTS */}
        <View style={styles.otpContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => inputRefs.current[index] = ref}
              style={[
                styles.otpInput, 
                digit ? styles.otpInputFilled : styles.otpInputEmpty
              ]}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectionColor={COLORS.blumine[600]}
              autoFocus={index === 0}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.verifyButton, loading && { opacity: 0.7 }]} 
          onPress={handleVerify} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.verifyButtonText}>Vérifier le code</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendSection}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Renvoyer un code</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Renvoyer un code dans <Text style={styles.timerNumber}>{timer}s</Text>
            </Text>
          )}
        </View>

        <TouchableOpacity 
          onPress={() => router.push('/(auth)/login')} 
          style={styles.changeEmailButton}
        >
          <Text style={styles.changeEmailText}>Modifier l'adresse e-mail</Text>
        </TouchableOpacity>

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

  titleContainer: { marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.black, marginBottom: 12, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: COLORS.gray[600], lineHeight: 22 },
  emailText: { color: COLORS.black, fontWeight: '700' },

  otpContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 40 
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 1.5,
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
    backgroundColor: COLORS.white,
    // Ombre légère
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  otpInputEmpty: { borderColor: COLORS.gray[200] },
  otpInputFilled: { borderColor: COLORS.blumine[600], backgroundColor: COLORS.white },

  verifyButton: {
    backgroundColor: COLORS.blumine[600],
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '600' },

  resendSection: { alignItems: 'center', marginBottom: 30 },
  resendLink: { fontSize: 15, fontWeight: '700', color: COLORS.black, textDecorationLine: 'underline' },
  timerText: { fontSize: 14, color: COLORS.gray[500] },
  timerNumber: { fontWeight: '700', color: COLORS.black },

  changeEmailButton: { alignItems: 'center' },
  changeEmailText: { fontSize: 14, color: COLORS.gray[500], fontWeight: '600' },
})