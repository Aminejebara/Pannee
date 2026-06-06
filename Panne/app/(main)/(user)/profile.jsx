import React, { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl, StyleSheet,
  Image, Platform, SafeAreaView
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { useAuth } from '../../../hooks/useAuth'
import { useUser } from '../../../hooks/useUser'
import { COLORS } from '../../../constants/colors'

export default function UserProfile() {
  const { user, logout } = useAuth()
  const { getProfile, updateProfile, deleteAccount, uploadAvatar, loading } = useUser()
  
  const [isEditing, setIsEditing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [formData, setFormData] = useState({
    username: '', phone: '', address: '', city: '', country: '',
  })
  const [localAvatar, setLocalAvatar] = useState(null)

  const loadProfile = async () => {
    const result = await getProfile()
    if (result.success) {
      const userData = result.user
      setFormData({
        username: userData.username || '',
        phone: userData.phone || '',
        address: userData.address || '',
        city: userData.city || '',
        country: userData.country || '',
      })
      setLocalAvatar(userData.avatar_url ? userData.avatar_url + '?t=' + Date.now() : null)
    }
  }

  useFocusEffect(useCallback(() => { loadProfile() }, []))

  const onRefresh = async () => {
    setRefreshing(true)
    await loadProfile()
    setRefreshing(false)
  }

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    const result = await updateProfile(formData)
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
      { text: 'Prendre une photo', onPress: takePhoto },
      { text: 'Galerie', onPress: pickImage },
      { text: 'Annuler', style: 'cancel' }
    ])
  }
  

 const pickImage = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') return Alert.alert('Permission', 'Accès nécessaire')
  const result = await ImagePicker.launchImageLibraryAsync({ 
    allowsEditing: false,  // ✅ ici
    aspect: [1, 1], 
    quality: 0.7 
  })
  if (!result.canceled) handleUpload(result.assets[0].uri)
}

const takePhoto = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync()
  if (status !== 'granted') return Alert.alert('Permission', 'Accès nécessaire')
  const result = await ImagePicker.launchCameraAsync({ 
    allowsEditing: false,  // ✅ ici
    aspect: [1, 1], 
    quality: 0.7 
  })
  if (!result.canceled) handleUpload(result.assets[0].uri)
}
const handleUpload = async (uri) => {
  try {
    const fileName = uri.split('/').pop()
    const destUri = FileSystem.documentDirectory + fileName
    await FileSystem.copyAsync({ from: uri, to: destUri })

    const uploadResult = await uploadAvatar(destUri)
    if (uploadResult.success) {
      setLocalAvatar(uploadResult.avatar_url + '?t=' + Date.now())
      loadProfile()
    } else {
      Alert.alert('Erreur', "Échec de l'upload")
    }
  } catch (err) {
    console.error('Upload error:', err)
    Alert.alert('Erreur', "Impossible d'uploader l'image")
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
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blumine[600]} />}
      >
        <View style={styles.header}>
          <View style={styles.profileCard}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={showImagePickerOptions}>
              {localAvatar ? (
                <Image source={{ uri: localAvatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{formData.username?.charAt(0).toUpperCase() || '?'}</Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={16} color={COLORS.white} />
              </View>
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.userNameText}>{formData.username || 'Utilisateur'}</Text>
              <Text style={styles.userLabelText}>Compte Particulier</Text>
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
          <Text style={styles.airTitle}>Informations personnelles</Text>
          <View style={styles.airCard}>
            <AirItem label="Nom d'utilisateur" value={formData.username} isEditing={isEditing} onChangeText={(v) => updateField('username', v)} />
            <AirItem label="Téléphone" value={formData.phone} isEditing={isEditing} onChangeText={(v) => updateField('phone', v)} keyboardType="phone-pad" />
            <AirItem label="Adresse" value={formData.address} isEditing={isEditing} onChangeText={(v) => updateField('address', v)} />
            <View style={styles.splitRow}>
              <View style={{ flex: 1 }}>
                <AirItem label="Ville" value={formData.city} isEditing={isEditing} onChangeText={(v) => updateField('city', v)} noBorder />
              </View>
              <View style={{ flex: 1 }}>
                <AirItem label="Pays" value={formData.country} isEditing={isEditing} onChangeText={(v) => updateField('country', v)} noBorder />
              </View>
            </View>
          </View>

          <Text style={styles.airTitle}>Paramètres du compte</Text>
          <View style={styles.airCard}>
            <MenuAction label="Préférences de l'application" icon="settings-outline" onPress={() => router.push('/(main)/(user)/settings')} />
            <MenuAction label="Besoin d'aide ?" icon="help-circle-outline" onPress={() => router.push('/(main)/(user)/help')} noBorder />
          </View>

          <TouchableOpacity style={styles.airLogout} onPress={handleLogout}>
            <Text style={styles.airLogoutText}>Se déconnecter</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: 20 }} onPress={() => {
            Alert.alert('Attention', 'Cette action est irréversible.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Supprimer', style: 'destructive', onPress: async () => {
                  const result = await deleteAccount()
                  if (result.success) { await logout(); router.replace('/(auth)/login') }
              }}
            ])
          }}>
            <Text style={{ color: COLORS.error, fontSize: 13, textDecorationLine: 'underline' }}>
              Supprimer définitivement le compte
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const AirItem = ({ label, value, isEditing, onChangeText, keyboardType, noBorder }) => (
  <View style={[styles.airItem, noBorder && { borderBottomWidth: 0 }]}>
    <Text style={styles.airLabel}>{label}</Text>
    {isEditing ? (
      <TextInput style={styles.airInput} value={value?.toString() || ''} onChangeText={onChangeText} keyboardType={keyboardType} placeholder="Ajouter..." placeholderTextColor={COLORS.gray[300]} />
    ) : (
      <Text style={styles.airValue}>{value || 'Non renseigné'}</Text>
    )}
  </View>
)

const MenuAction = ({ label, icon, onPress, noBorder }) => (
  <TouchableOpacity style={[styles.airItem, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, noBorder && { borderBottomWidth: 0 }]} onPress={onPress}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name={icon} size={20} color={COLORS.black} style={{ marginRight: 12 }} />
      <Text style={styles.airValue}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.gray[300]} />
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  profileCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatarWrapper: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.gray[100], ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }, android: { elevation: 8 } }) },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.blumine[600], alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontSize: 32, fontWeight: 'bold' },
  cameraBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: COLORS.blumine[600], width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: COLORS.white },
  headerInfo: { marginLeft: 20 },
  userNameText: { fontSize: 26, fontWeight: '700', color: COLORS.black, letterSpacing: -0.5 },
  userLabelText: { fontSize: 14, color: COLORS.gray[500], marginTop: 2 },
  mainEditButton: { borderWidth: 1, borderColor: COLORS.black, borderRadius: 8, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.white },
  mainEditButtonText: { fontWeight: '700', fontSize: 16, color: COLORS.black },
  body: { paddingHorizontal: 24, paddingBottom: 40 },
  airTitle: { fontSize: 22, fontWeight: '700', color: COLORS.black, marginTop: 32, marginBottom: 16 },
  airCard: { borderWidth: 1, borderColor: COLORS.gray[200], borderRadius: 12, paddingHorizontal: 16, backgroundColor: COLORS.white },
  airItem: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  airLabel: { fontSize: 11, color: COLORS.gray[500], textTransform: 'uppercase', fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
  airValue: { fontSize: 17, color: COLORS.black, fontWeight: '400' },
  airInput: { fontSize: 17, color: COLORS.blumine[700], padding: 0 },
  splitRow: { flexDirection: 'row' },
  airLogout: { marginTop: 40, paddingVertical: 12, alignSelf: 'flex-start' },
  airLogoutText: { color: COLORS.black, fontWeight: '700', fontSize: 16, textDecorationLine: 'underline' }
})