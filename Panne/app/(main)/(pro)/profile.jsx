import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Platform,
  Image
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '../../../hooks/useAuth'
import { usePro } from '../../../hooks/usePro'
import { COLORS } from '../../../constants/colors'

export default function ProProfile() {
  const { user, professional, logout } = useAuth()
  const { getProfile, updateProfile, uploadAvatar, getAvailableCategories, getProCategories, loading } = usePro()
  
  const [isEditing, setIsEditing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [allCategories, setAllCategories] = useState([])
  const [selectedCategories, setSelectedCategories] = useState([])
  const [formData, setFormData] = useState({
    business_name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: ''
  })
  const [localAvatar, setLocalAvatar] = useState(null)

  const loadProfile = async () => {
    if (professional?.id) {
      const result = await getProfile(professional.id)
      if (result.success) {
        const pro = result.profile
        setFormData({
          business_name: pro.business_name || '',
          description: pro.description || '',
          address: pro.address || '',
          city: pro.city || '',
          country: pro.country || '',
          phone: pro.phone || '',
          email: pro.email || ''
        })
        setLocalAvatar(pro.avatar_url)
      }
    }
  }

  const loadCategories = async () => {
    if (!professional?.id) return
    const allResult = await getAvailableCategories()
    if (allResult.success) setAllCategories(allResult.categories)
    const proResult = await getProCategories(professional.id)
    if (proResult.success) setSelectedCategories(proResult.categories)
  }

  useFocusEffect(
    useCallback(() => {
      loadProfile()
      loadCategories()
    }, [professional?.id])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadProfile(), loadCategories()])
    setRefreshing(false)
  }

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => {
      const exists = prev.some(cat => cat.id === categoryId)
      if (exists) return prev.filter(cat => cat.id !== categoryId)
      const newCategory = allCategories.find(cat => cat.id === categoryId)
      return [...prev, newCategory]
    })
  }

  const handleSave = async () => {
    if (!professional?.id) return
    const dataToSend = {
      businessName: formData.business_name,
      description: formData.description || "",
      address: formData.address || "",
      city: formData.city || "",
      country: formData.country || "",
      categoryIds: selectedCategories.map(cat => cat.id)
    }
    const result = await updateProfile(professional.id, dataToSend)
    if (result.success) {
      setIsEditing(false)
      Alert.alert('Succès', 'Profil mis à jour')
      loadProfile()
    } else {
      Alert.alert('Erreur', result.error)
    }
  }

  const showImagePickerOptions = () => {
    Alert.alert('Photo de profil', 'Modifier votre image', [
      { text: 'Prendre une photo', onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync()
          if (status !== 'granted') return
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
          if (!result.canceled) handleUpload(result.assets[0].uri)
      }},
      { text: 'Galerie', onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
          if (status !== 'granted') return
          const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 })
          if (!result.canceled) handleUpload(result.assets[0].uri)
      }},
      { text: 'Annuler', style: 'cancel' }
    ])
  }

  const handleUpload = async (uri) => {
    const uploadResult = await uploadAvatar(professional.id, uri)
    if (uploadResult.success) {
      setLocalAvatar(uploadResult.avatar_url)
      loadProfile()
    }
  }

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment quitter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: async () => {
          await logout()
          router.replace('/(auth)/login')
      }}
    ])
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.blumine[600]} />
      </View>
    )
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blumine[600]} />}
    >
      {/* HEADER AIRBNB STYLE */}
      <View style={styles.header}>
        <View style={styles.profileCard}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={showImagePickerOptions}>
            {localAvatar ? (
              <Image source={{ uri: localAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {formData.business_name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            {/* Gardé le badge caméra comme demandé */}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={16} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerInfo}>
            <Text style={styles.businessName}>{formData.business_name || 'Votre Commerce'}</Text>
            <Text style={styles.proLabel}>Compte Professionnel</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.mainEditButton, isEditing && { backgroundColor: COLORS.black, borderColor: COLORS.black }]}
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
        >
          <Text style={[styles.mainEditButtonText, isEditing && { color: COLORS.white }]}>
            {isEditing ? 'Enregistrer les modifications' : 'Modifier le profil'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* SECTION INFOS */}
        <Text style={styles.airTitle}>Informations générales</Text>
        <View style={styles.airCard}>
          <AirItem 
            label="Nom commercial" 
            value={formData.business_name} 
            isEditing={isEditing}
            onChangeText={(v) => updateField('business_name', v)}
          />
          <AirItem 
            label="Description" 
            value={formData.description} 
            isEditing={isEditing}
            multiline
            onChangeText={(v) => updateField('description', v)}
          />
        </View>

        {/* SECTION CATEGORIES */}
        <Text style={styles.airTitle}>Catégories d'activité</Text>
        <View style={styles.categoriesContainer}>
            {allCategories.length > 0 && (
                isEditing ? (
                    allCategories.map(cat => {
                        const isSelected = selectedCategories.some(c => c.id === cat.id)
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.airChip, isSelected && styles.airChipSelected]}
                                onPress={() => toggleCategory(cat.id)}
                            >
                                <Text style={[styles.airChipText, isSelected && styles.airChipTextSelected]}>{cat.name}</Text>
                            </TouchableOpacity>
                        )
                    })
                ) : (
                    selectedCategories.length > 0 ? (
                        selectedCategories.map(cat => (
                            <View key={cat.id} style={styles.staticChip}>
                                <Text style={styles.staticChipText}>{cat.name}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noCategoriesText}>Aucune catégorie</Text>
                    )
                )
            )}
        </View>

        {/* SECTION CONTACT */}
        <Text style={styles.airTitle}>Contact & Localisation</Text>
        <View style={styles.airCard}>
          <AirItem label="Email professionnel" value={user?.email} isEditing={false} />
          <AirItem 
            label="Téléphone" 
            value={formData.phone} 
            isEditing={isEditing}
            onChangeText={(v) => updateField('phone', v)}
            keyboardType="phone-pad"
          />
          <AirItem 
            label="Adresse complète" 
            value={formData.address} 
            isEditing={isEditing}
            onChangeText={(v) => updateField('address', v)}
          />
          <View style={styles.splitRow}>
             <View style={{ flex: 1 }}>
                <AirItem 
                    label="Ville" 
                    value={formData.city} 
                    isEditing={isEditing}
                    onChangeText={(v) => updateField('city', v)}
                    noBorder
                />
             </View>
             <View style={{ flex: 1 }}>
                <AirItem 
                    label="Pays" 
                    value={formData.country} 
                    isEditing={isEditing}
                    onChangeText={(v) => updateField('country', v)}
                    noBorder
                />
             </View>
          </View>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.airLogout} onPress={handleLogout}>
          <Text style={styles.airLogoutText}>Se déconnecter du compte</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const AirItem = ({ label, value, isEditing, onChangeText, multiline, keyboardType, noBorder }) => (
  <View style={[styles.airItem, noBorder && { borderBottomWidth: 0 }]}>
    <Text style={styles.airLabel}>{label}</Text>
    {isEditing ? (
      <TextInput
        style={[styles.airInput, multiline && { minHeight: 60, textAlignVertical: 'top' }]}
        value={value?.toString() || ''}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholder="Ajouter..."
        placeholderTextColor={COLORS.gray[300]}
      />
    ) : (
      <Text style={styles.airValue}>{value || 'Non renseigné'}</Text>
    )}
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { paddingBottom: 60 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100]
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.gray[100],
    ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
        android: { elevation: 8 }
    })
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { 
    width: 80, height: 80, borderRadius: 40, 
    backgroundColor: COLORS.blumine[600], 
    alignItems: 'center', justifyContent: 'center' 
  },
  avatarText: { color: COLORS.white, fontSize: 32, fontWeight: 'bold' },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: COLORS.blumine[600],
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  headerInfo: { marginLeft: 20 },
  businessName: { fontSize: 26, fontWeight: '700', color: COLORS.black, letterSpacing: -0.5 },
  proLabel: { fontSize: 14, color: COLORS.gray[500], marginTop: 2 },

  mainEditButton: {
    borderWidth: 1,
    borderColor: COLORS.black,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.white
  },
  mainEditButtonText: { fontWeight: '700', fontSize: 16, color: COLORS.black },

  body: { paddingHorizontal: 24 },
  airTitle: { fontSize: 22, fontWeight: '700', color: COLORS.black, marginTop: 32, marginBottom: 16 },
  airCard: {
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  airItem: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  airLabel: { fontSize: 11, color: COLORS.gray[500], textTransform: 'uppercase', fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
  airValue: { fontSize: 17, color: COLORS.black, fontWeight: '400' },
  airInput: { fontSize: 17, color: COLORS.blumine[700], padding: 0 },
  splitRow: { flexDirection: 'row' },

  categoriesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  airChip: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 25, borderWidth: 1, borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white
  },
  airChipSelected: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  airChipText: { color: COLORS.black, fontWeight: '600', fontSize: 14 },
  airChipTextSelected: { color: COLORS.white },
  staticChip: { 
    backgroundColor: COLORS.gray[50], 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: COLORS.gray[200] 
  },
  staticChipText: { color: COLORS.gray[700], fontSize: 14, fontWeight: '500' },
  noCategoriesText: { fontSize: 14, color: COLORS.gray[400], fontStyle: 'italic' },

  airLogout: { marginTop: 48, paddingVertical: 12, alignSelf: 'flex-start' },
  airLogoutText: { color: COLORS.black, fontWeight: '700', fontSize: 16, textDecorationLine: 'underline' }
})