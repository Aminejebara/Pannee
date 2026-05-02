import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Platform,
  TextInput,
  Modal,
  SafeAreaView
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { useUser } from '../../../hooks/useUser'
import { COLORS } from '../../../constants/colors'

export default function UserSettings() {
  const { user, logout } = useAuth()
  const { updateProfile, loading } = useUser()

  const [pushNotifications, setPushNotifications] = useState(true)
  const [messageNotifications, setMessageNotifications] = useState(true)
  const [promoNotifications, setPromoNotifications] = useState(false)
  const [hidePhone, setHidePhone] = useState(false)

  const [emailModalVisible, setEmailModalVisible] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')

  const [passwordModalVisible, setPasswordModalVisible] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleChangeEmail = async () => {
    if (!newEmail || !emailPassword) return Alert.alert('Erreur', 'Veuillez remplir tous les champs')
    Alert.alert('Succès', 'Email modifié avec succès')
    setEmailModalVisible(false)
  }

  const SettingItem = ({ icon, title, subtitle, onPress, danger }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={styles.settingText}>
        <Text style={[styles.settingTitle, danger && { color: '#E31C5F' }]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.black} />
    </TouchableOpacity>
  )

  const ToggleItem = ({ title, value, onValueChange }) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#DDDDDD', true: COLORS.black }}
        thumbColor={Platform.OS === 'ios' ? undefined : COLORS.white}
      />
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(main)/(user)/profile')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.mainTitle}>Paramètres</Text>

        {/* Section Compte */}
        <Text style={styles.sectionTitle}>Sécurité du compte</Text>
        <SettingItem 
          title="Adresse e-mail" 
          subtitle={user?.email || "Modifier votre e-mail"}
          onPress={() => setEmailModalVisible(true)}
        />
        <SettingItem 
          title="Mot de passe" 
          subtitle="Dernière modification il y a 3 mois"
          onPress={() => setPasswordModalVisible(true)}
        />

        {/* Section Notifications */}
        <Text style={[styles.sectionTitle, { marginTop: 40 }]}>Notifications</Text>
        <ToggleItem 
          title="Notifications push" 
          value={pushNotifications}
          onValueChange={setPushNotifications}
        />
        <ToggleItem 
          title="Messages de dépannage" 
          value={messageNotifications}
          onValueChange={setMessageNotifications}
        />
        <ToggleItem 
          title="Offres promotionnelles" 
          value={promoNotifications}
          onValueChange={setPromoNotifications}
        />

        {/* Section Confidentialité */}
        <Text style={[styles.sectionTitle, { marginTop: 40 }]}>Confidentialité</Text>
        <ToggleItem 
          title="Masquer mon numéro de téléphone" 
          value={hidePhone}
          onValueChange={setHidePhone}
        />

        {/* Boutons de fin */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Version 1.0.0 (Build 24)</Text>
      </ScrollView>

      {/* Modal Email Style Airbnb (Full Screenish) */}
      <Modal animationType="slide" visible={emailModalVisible} presentationStyle="pageSheet">
        <View style={styles.modalHeader}>
           <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
              <Ionicons name="close" size={26} color={COLORS.black} />
           </TouchableOpacity>
           <Text style={styles.modalHeaderText}>E-mail</Text>
           <TouchableOpacity onPress={handleChangeEmail}>
              <Text style={styles.saveText}>Enregistrer</Text>
           </TouchableOpacity>
        </View>
        <View style={styles.modalBody}>
            <Text style={styles.inputLabel}>Nouvelle adresse e-mail</Text>
            <TextInput 
              style={styles.airbnbInput} 
              value={newEmail} 
              onChangeText={setNewEmail}
              autoFocus
              keyboardType="email-address"
            />
            <Text style={styles.inputLabel}>Mot de passe actuel</Text>
            <TextInput 
              style={styles.airbnbInput} 
              value={emailPassword} 
              onChangeText={setEmailPassword}
              secureTextEntry 
            />
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { paddingHorizontal: 12, paddingVertical: 10 },
  backButton: { padding: 8 },
  content: { paddingHorizontal: 24, paddingBottom: 60 },
  
  mainTitle: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: COLORS.black, 
    marginBottom: 30,
    letterSpacing: -0.8
  },
  
  sectionTitle: { 
    fontSize: 22, 
    fontWeight: '600', 
    color: COLORS.black, 
    marginBottom: 10 
  },
  
  settingItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 20, 
    borderBottomWidth: StyleSheet.hairlineWidth, 
    borderBottomColor: '#DDDDDD' 
  },
  settingText: { flex: 1, paddingRight: 10 },
  settingTitle: { fontSize: 16, color: COLORS.black, fontWeight: '400' },
  settingSubtitle: { fontSize: 14, color: '#717171', marginTop: 4 },
  
  logoutButton: { marginTop: 50, paddingVertical: 10 },
  logoutText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: COLORS.black, 
    textDecorationLine: 'underline' 
  },
  
  versionText: { marginTop: 30, fontSize: 12, color: '#717171' },

  // Modals
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDDDDD'
  },
  modalHeaderText: { fontSize: 16, fontWeight: '700' },
  saveText: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  modalBody: { padding: 24 },
  inputLabel: { fontSize: 14, color: '#717171', marginBottom: 8 },
  airbnbInput: {
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#B0B0B0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    color: COLORS.black
  }
})