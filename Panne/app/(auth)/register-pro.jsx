import { useState, useEffect } from 'react'
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
  FlatList
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { COLORS } from '../../constants/colors'
import api from '../../services/axios'

export default function RegisterProScreen() {
  const [formData, setFormData] = useState({
    username: '', email: '', phone: '', password: '', confirmPassword: '',
    business_name: '', description: '', address: '', city: '', country: '',
    categoryIds: []
  })
  const [showPassword, setShowPassword] = useState(false)
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const { registerPro, loading } = useAuth()

  // Charger les catégories disponibles
  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/auth/categories')
      setCategories(response.data.data || [])
    } catch (error) {
      console.error('Erreur chargement catégories:', error)
    } finally {
      setLoadingCategories(false)
    }
  }

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))

  const toggleCategory = (categoryId) => {
    setFormData(prev => {
      const currentIds = prev.categoryIds
      if (currentIds.includes(categoryId)) {
        return { ...prev, categoryIds: currentIds.filter(id => id !== categoryId) }
      } else {
        return { ...prev, categoryIds: [...currentIds, categoryId] }
      }
    })
  }

  const handleRegister = async () => {
    const { username, email, password, confirmPassword, business_name, categoryIds } = formData
    if (!username || !email || !password || !confirmPassword || !business_name) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas')
      return
    }
    if (categoryIds.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins une catégorie de service')
      return
    }

    const result = await registerPro(formData)
    if (result.success) {
      Alert.alert('Succès', 'Code de vérification envoyé', [
        { text: 'OK', onPress: () => router.push({ pathname: '/(auth)/verify-otp', params: { email: formData.email } }) }
      ])
    } else {
      Alert.alert('Erreur', result.error)
    }
  }

  const renderCategory = ({ item }) => {
    const isSelected = formData.categoryIds.includes(item.id)
    return (
      <TouchableOpacity 
        style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
        onPress={() => toggleCategory(item.id)}
      >
        <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={COLORS.black} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inscription Pro</Text>
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>Devenez partenaire</Text>
          <Text style={styles.subtitle}>Rejoignez le réseau Panne. et développez votre activité de dépannage.</Text>
        </View>

        {/* SECTION 1: L'ENTREPRISE */}
        <Text style={styles.sectionLabel}>INFORMATIONS ENTREPRISE</Text>
        <View style={styles.groupCard}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>NOM DE L'ÉTABLISSEMENT *</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Ex: Garage du Centre" 
              placeholderTextColor={COLORS.gray[400]} 
              value={formData.business_name} 
              onChangeText={(v) => updateField('business_name', v)} 
            />
          </View>
          
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput 
              style={[styles.input, { height: 60 }]} 
              placeholder="Services proposés, spécialités..." 
              placeholderTextColor={COLORS.gray[400]} 
              value={formData.description} 
              onChangeText={(v) => updateField('description', v)} 
              multiline 
            />
          </View>

          {/* SÉLECTION DES CATÉGORIES */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>CATÉGORIES DE SERVICES *</Text>
            <Text style={styles.categoryHint}>Sélectionnez les services que vous proposez</Text>
            
            {loadingCategories ? (
              <ActivityIndicator size="small" color={COLORS.blumine[600]} style={{ marginTop: 12 }} />
            ) : (
              <View style={styles.categoriesContainer}>
                <FlatList
                  data={categories}
                  renderItem={renderCategory}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={2}
                  scrollEnabled={false}
                  contentContainerStyle={styles.categoriesList}
                />
              </View>
            )}
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>ADRESSE</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Numéro et rue" 
              placeholderTextColor={COLORS.gray[400]} 
              value={formData.address} 
              onChangeText={(v) => updateField('address', v)} 
            />
          </View>

          <View style={[styles.row, styles.noBorder]}>
            <View style={[styles.inputWrapper, { flex: 1, borderBottomWidth: 0, borderRightWidth: 1.5, borderRightColor: COLORS.gray[300] }]}>
              <Text style={styles.label}>VILLE</Text>
              <TextInput style={styles.input} placeholder="Tunis" placeholderTextColor={COLORS.gray[400]} value={formData.city} onChangeText={(v) => updateField('city', v)} />
            </View>
            <View style={[styles.inputWrapper, { flex: 1, borderBottomWidth: 0 }]}>
              <Text style={styles.label}>PAYS</Text>
              <TextInput style={styles.input} placeholder="Tunisie" placeholderTextColor={COLORS.gray[400]} value={formData.country} onChangeText={(v) => updateField('country', v)} />
            </View>
          </View>
        </View>

        {/* SECTION 2: COMPTE PERSO */}
        <Text style={styles.sectionLabel}>COORDONNÉES DE CONTACT</Text>
        <View style={styles.groupCard}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>NOM D'UTILISATEUR *</Text>
            <TextInput style={styles.input} placeholder="nom_pro" autoCapitalize="none" value={formData.username} onChangeText={(v) => updateField('username', v)} />
          </View>
          
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>E-MAIL PROFESSIONNEL *</Text>
            <TextInput style={styles.input} placeholder="pro@contact.com" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(v) => updateField('email', v)} />
          </View>

          <View style={[styles.inputWrapper, styles.noBorder]}>
            <Text style={styles.label}>NUMÉRO DE TÉLÉPHONE</Text>
            <TextInput style={styles.input} placeholder="+216 XX XXX XXX" keyboardType="phone-pad" value={formData.phone} onChangeText={(v) => updateField('phone', v)} />
          </View>
        </View>

        {/* SECTION 3: SÉCURITÉ */}
        <Text style={styles.sectionLabel}>SÉCURITÉ</Text>
        <View style={styles.groupCard}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>MOT DE PASSE *</Text>
            <View style={styles.passwordRow}>
              <TextInput style={styles.inputPassword} placeholder="••••••••" secureTextEntry={!showPassword} value={formData.password} onChangeText={(v) => updateField('password', v)} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showText}>{showPassword ? "Masquer" : "Afficher"}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={[styles.inputWrapper, styles.noBorder]}>
            <Text style={styles.label}>CONFIRMER LE MOT DE PASSE *</Text>
            <TextInput style={styles.input} placeholder="••••••••" secureTextEntry={!showPassword} value={formData.confirmPassword} onChangeText={(v) => updateField('confirmPassword', v)} />
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
            <Text style={styles.signupButtonText}>Créer mon compte Pro</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Vous avez déjà un compte ? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginLink}>Se connecter</Text>
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
  
  sectionLabel: { fontSize: 11, fontWeight: '800', color: COLORS.gray[500], marginBottom: 8, marginLeft: 4, marginTop: 10 },
  
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
  
  row: { flexDirection: 'row' },
  passwordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputPassword: { flex: 1, fontSize: 16, color: COLORS.gray[900], paddingVertical: 2 },
  showText: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },

  // Styles pour les catégories
  categoryHint: { fontSize: 12, color: COLORS.gray[500], marginBottom: 12 },
  categoriesContainer: { marginTop: 4 },
  categoriesList: { gap: 8 },
  categoryChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  categoryChipSelected: {
    backgroundColor: COLORS.blumine[600],
    borderColor: COLORS.blumine[600],
  },
  categoryChipText: {
    fontSize: 13,
    color: COLORS.gray[700],
  },
  categoryChipTextSelected: {
    color: COLORS.white,
  },

  signupButton: {
    backgroundColor: COLORS.blumine[600],
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  signupButtonText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  loginText: { fontSize: 14, color: COLORS.gray[600] },
  loginLink: { fontSize: 14, color: COLORS.black, fontWeight: '700', textDecorationLine: 'underline' },
})