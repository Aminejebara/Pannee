import * as Notifications from 'expo-notifications'
import { Platform, Alert } from 'react-native'
import Constants from 'expo-constants'
import api from './axios'
import useAuthStore from '../store/useAuthStore'
import { router } from 'expo-router'

// ✅ Détecter si on est dans Expo Go
const isExpoGo = Constants.appOwnership === 'expo'

// Configurer le handler des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// Demander les permissions
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Permission de notification refusée')
      return false
    }
    
    return true
  } catch (error) {
    console.error('❌ Erreur permission notifications:', error)
    return false
  }
}

// Enregistrer le token push sur le serveur
export const registerPushToken = async () => {
  try {
    const user = useAuthStore.getState().user
    const isProfessional = user?.role === 'professional'
    
    // ✅ Si on est dans Expo Go, on simule (pas de vrai token)
    if (isExpoGo) {
      console.log('⚠️ Expo Go - les notifications push ne fonctionnent pas')
      console.log('ℹ️ Utilise un development build pour tester les notifications push')
      
      // ✅ Simuler un token pour le développement (optionnel)
      const mockToken = `ExponentPushToken[mock_${Date.now()}]`
      
      if (user?.id) {
        try {
          // ✅ LE BON CHEMIN : /user/ ou /pro/
          const basePath = isProfessional ? '/pro' : '/user'
          
          const response = await api.post(`${basePath}/notifications/register-token`, {
            userId: user.id,
            pushToken: mockToken,
            deviceType: Platform.OS
          })
          console.log('✅ Token mock enregistré (Expo Go):', response.data)
        } catch (e) {
          console.log('⚠️ Impossible d\'enregistrer le token mock:', e.response?.data || e.message)
        }
      }
      
      return mockToken
    }

    // ✅ Vrai device (development build ou build production)
    // Vérifier les permissions
    const hasPermission = await requestNotificationPermissions()
    if (!hasPermission) {
      console.log('❌ Permission refusée, impossible d\'enregistrer le token')
      return null
    }

    // 🔥 CRITIQUE: Obtenir le token avec gestion d'erreur
    let token
    try {
      token = await Notifications.getExpoPushTokenAsync({
        experienceId: '@badboiismad/panne'
      })
    } catch (tokenError) {
      console.error('❌ Erreur lors de la génération du token:', tokenError)
      
      // ⚠️ Erreur spécifique Firebase
      if (tokenError.message && tokenError.message.includes('FirebaseApp')) {
        console.error('❌ Firebase n\'est pas configuré!')
        console.error('ℹ️ Assure-toi d\'avoir:')
        console.error('   1. google-services.json à la racine du projet')
        console.error('   2. "googleServicesFile": "./google-services.json" dans app.json')
        console.error('   3. Un build avec eas build')
        return null
      }
      
      return null
    }

    console.log('✅ Push token:', token.data)

    // Envoyer le token au backend
    if (user?.id) {
      try {
        // ✅ LE BON CHEMIN : /user/ ou /pro/
        const basePath = isProfessional ? '/pro' : '/user'
        
        const response = await api.post(`${basePath}/notifications/register-token`, {
          userId: user.id,
          pushToken: token.data,
          deviceType: Platform.OS
        })
        console.log('✅ Token enregistré sur le serveur:', response.data)
      } catch (apiError) {
        console.error('❌ Erreur lors de l\'enregistrement du token sur le serveur:', apiError.response?.data || apiError.message)
        return null
      }
    }

    return token.data
  } catch (error) {
    console.error('❌ Erreur registerPushToken:', error)
    return null
  }
}

// Configurer les listeners de notifications
export const setupNotificationListeners = () => {
  // ✅ Dans Expo Go, on ne peut pas recevoir de notifications push
  if (isExpoGo) {
    console.log('⚠️ Expo Go - les notifications push ne fonctionnent pas')
    console.log('ℹ️ Les notifications in-app (Toast) fonctionnent toujours')
    return () => {}
  }

  // ✅ Vrai device - écouter les notifications
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('📩 Notification reçue (app ouverte):', notification)
  })

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const { data } = response.notification.request.content
    
    console.log('🔵 Click sur notification:', data)

    // ✅ Naviguer vers la conversation si les données sont présentes
    if (data?.conversationId) {
      router.push({
        pathname: '/conversation/[id]',
        params: { 
          id: data.conversationId,
          contactName: data.senderName || 'Nouveau message'
        }
      })
    } else {
      console.log('⚠️ Click sur notification sans conversationId')
    }
  })

  return () => {
    subscription.remove()
    responseSubscription.remove()
  }
}

// Désactiver le token (logout)
export const deactivatePushToken = async () => {
  try {
    const user = useAuthStore.getState().user
    if (user?.id) {
      // ✅ LE BON CHEMIN : /user/ ou /pro/
      const isProfessional = user?.role === 'professional'
      const basePath = isProfessional ? '/pro' : '/user'
      
      const response = await api.post(`${basePath}/notifications/deactivate-token`, {
        userId: user.id
      })
      console.log('✅ Token désactivé:', response.data)
    }
  } catch (error) {
    console.error('❌ deactivatePushToken error:', error.response?.data || error.message)
  }
}