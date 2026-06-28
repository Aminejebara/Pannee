import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  Linking,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  ActionSheetIOS,
  StatusBar,
  Keyboard,
} from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { useAuth } from '../../../hooks/useAuth'
import { useUser } from '../../../hooks/useUser'
import { usePro } from '../../../hooks/usePro'
import { socketEvents, getSocket, connectSocket } from '../../../services/socketService'
import { COLORS } from '../../../constants/colors'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

function ConversationDetailInner() {
  const params = useLocalSearchParams()
  const { user } = useAuth()
  const isPro = user?.role === 'professional'
  const insets = useSafeAreaInsets()

  const conversationId = params.id
  const contactName = params.contactName
  const contactAvatar = params.contactAvatar
  const contactPhone = params.contactPhone || params.phone || null
  const otherPartyId = isPro ? params.contactId : params.professionalId

  const userHook = useUser()
  const proHook = usePro()
  const hook = isPro ? proHook : userHook
  const {
    getMessages,
    markConversationAsRead,
    uploadMessageImage,
    sendMessage: sendMessageHttp,
    unsendMessage,
    unsendAllMessages,
    loading
  } = hook

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendingLocation, setSendingLocation] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [showMessageOptions, setShowMessageOptions] = useState(false)

  const scrollViewRef = useRef()
  const typingTimeoutRef = useRef(null)
  const messagesCountRef = useRef(0)

  // ─── Clavier Android ────────────────────────────────────
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      scrollViewRef.current?.scrollToEnd({ animated: false })
    })
    return () => sub.remove()
  }, [])

  // ─── Charger les messages ────────────────────────────────
  const loadMessages = useCallback(async () => {
    const result = await getMessages(conversationId)
    if (result.success) {
      setMessages(result.messages || [])
      scrollToBottom(false)
    }
  }, [conversationId])

  const markAsRead = useCallback(async () => {
    await markConversationAsRead(conversationId)
    const socket = getSocket()
    if (socket?.connected) {
      socketEvents.markConversationRead({ conversationId })
    }
  }, [conversationId])

  // ✅ FIX 1 — useFocusEffect : seulement charger les données, ne pas toucher au socket
  useFocusEffect(
    useCallback(() => {
      loadMessages()
      markAsRead()
    }, [conversationId])
  )

  // ✅ FIX 2 — Socket connecté une seule fois au montage du composant
  useEffect(() => {
    let socket = getSocket()
    if (!socket || !socket.connected) {
      connectSocket()
    }
  }, [])

  // ✅ FIX 3 — Tous les listeners dans un seul useEffect, avec cleanup propre
  useEffect(() => {
    // On attend que le socket soit dispo (peut arriver légèrement après le montage)
    const attachListeners = () => {
      const socket = getSocket()
      if (!socket) return false

      const handleReceiveMessage = (data) => {
        if (String(data.conversationId) !== String(conversationId)) return
        setMessages(prev => {
          const exists = prev.some(m => String(m.id) === String(data.message.id))
          if (exists) return prev
          return [...prev, data.message]
        })
        scrollToBottom()
        setTimeout(() => {
          markConversationAsRead(conversationId)
          const s = getSocket()
          if (s?.connected) socketEvents.markConversationRead({ conversationId })
        }, 500)
      }

      const handleMessageSent = (data) => {
        if (String(data.conversationId) !== String(conversationId)) return
        setMessages(prev =>
          prev.some(m => m.is_temp)
            ? prev.map(m => m.is_temp ? { ...data.message, is_temp: false } : m)
            : prev
        )
        scrollToBottom()
      }

      const handleUserTyping = (data) => {
        if (String(data.conversationId) !== String(conversationId)) return
        if (String(data.userId) === String(user?.id)) return
        setOtherUserTyping(data.isTyping)
        if (data.isTyping) setTimeout(() => setOtherUserTyping(false), 3000)
      }

      // ✅ FIX 4 — Comparer en String pour éviter mismatch int/string
      const handleMessageUnsent = (data) => {
        if (String(data.conversationId) !== String(conversationId)) return
        setMessages(prev => prev.filter(m => String(m.id) !== String(data.messageId)))
      }

      const handleMessagesUnsentAll = (data) => {
        if (String(data.conversationId) !== String(conversationId)) return
        setMessages(prev => prev.filter(m => String(m.sender_id) !== String(data.unsentBy)))
      }

      socket.on('receive_message', handleReceiveMessage)
      socket.on('message_sent', handleMessageSent)
      socket.on('user_typing', handleUserTyping)
      socket.on('message_unsent', handleMessageUnsent)
      socket.on('messages_unsent_all', handleMessagesUnsentAll)

      // Retourner la fonction de cleanup avec la même instance socket
      return () => {
        socket.off('receive_message', handleReceiveMessage)
        socket.off('message_sent', handleMessageSent)
        socket.off('user_typing', handleUserTyping)
        socket.off('message_unsent', handleMessageUnsent)
        socket.off('messages_unsent_all', handleMessagesUnsentAll)
      }
    }

    // Tenter immédiatement, sinon attendre 300ms que connectSocket() finisse
    let cleanup = attachListeners()
    let timer = null

    if (!cleanup) {
      timer = setTimeout(() => {
        cleanup = attachListeners()
      }, 300)
    }

    return () => {
      if (timer) clearTimeout(timer)
      if (typeof cleanup === 'function') cleanup()
    }
  }, [conversationId, user?.id])

  // ─── Scroll vers le bas ──────────────────────────────────
  const scrollToBottom = (animated = true) => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated }), 150)
  }

  // Scroll auto quand nouveaux messages
  useEffect(() => {
    if (messages.length > messagesCountRef.current) {
      messagesCountRef.current = messages.length
      scrollToBottom()
    }
  }, [messages.length])

  // ─── Appel téléphonique ──────────────────────────────────
  const handleCall = () => {
    if (!contactPhone) {
      Alert.alert('Numéro indisponible', "Le numéro de téléphone de ce contact n'est pas disponible.")
      return
    }
    const phoneUrl = `tel:${contactPhone}`
    Linking.canOpenURL(phoneUrl).then(supported => {
      if (supported) Linking.openURL(phoneUrl)
      else Alert.alert('Erreur', "Impossible d'effectuer l'appel")
    })
  }

  // ─── Envoi message texte ─────────────────────────────────
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    const textToSend = newMessage.trim()
    const tempId = `temp_${Date.now()}_${Math.random()}`
    const optimisticMessage = {
      id: tempId,
      content: textToSend,
      type: 'text',
      sender_type: isPro ? 'professional' : 'user',
      created_at: new Date().toISOString(),
      is_temp: true
    }
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    handleTyping(false)
    scrollToBottom()
    setSending(true)
    try {
      const result = await sendMessageHttp(conversationId, textToSend, 'text', null)
      if (result.success) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...result.message, is_temp: false } : m))
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        Alert.alert('Erreur', result.error || 'Message non envoyé')
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      Alert.alert('Erreur', error.message || 'Message non envoyé')
    }
    setSending(false)
  }

  // ─── Caméra / Galerie ────────────────────────────────────
  const handleCameraPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Prendre une photo', 'Choisir dans la galerie'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) await openCamera()
          else if (buttonIndex === 2) await openGallery()
        }
      )
    } else {
      Alert.alert(
        'Photo',
        'Choisissez une option',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: '📷 Prendre une photo', onPress: openCamera },
          { text: '🖼 Galerie', onPress: openGallery },
        ]
      )
    }
  }

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission', 'Accès à la caméra nécessaire')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7
    })
    if (!result.canceled) await sendImage(result.assets[0].uri)
  }

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission', 'Accès à la galerie nécessaire')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
    })
    if (!result.canceled) await sendImage(result.assets[0].uri)
  }

  const sendImage = async (uri) => {
    const tempId = `temp_${Date.now()}_${Math.random()}`
    const optimisticMessage = {
      id: tempId,
      content: uri,
      type: 'image',
      sender_type: isPro ? 'professional' : 'user',
      created_at: new Date().toISOString(),
      is_temp: true
    }
    setMessages(prev => [...prev, optimisticMessage])
    scrollToBottom()
    setSending(true)
    const uploadResult = await uploadMessageImage(uri)
    if (uploadResult.success) {
      const sendResult = await sendMessageHttp(conversationId, uploadResult.url, 'image', uploadResult.url)
      if (sendResult.success) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...sendResult.message, is_temp: false } : m))
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        Alert.alert('Erreur', "Impossible d'envoyer l'image")
      }
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      Alert.alert('Erreur', "Impossible d'uploader l'image")
    }
    setSending(false)
  }

  // ─── Localisation ────────────────────────────────────────
  const sendLocation = async () => {
    setSendingLocation(true)
    const tempId = `temp_${Date.now()}_${Math.random()}`
    setMessages(prev => [...prev, {
      id: tempId, content: '📍 Envoi de position...', type: 'text',
      sender_type: isPro ? 'professional' : 'user',
      created_at: new Date().toISOString(), is_temp: true
    }])
    scrollToBottom()
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        Alert.alert('Permission', 'Accès à la localisation nécessaire')
        return
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const { latitude, longitude } = position.coords
      const locationMessage = `📍 Position : https://www.google.com/maps?q=${latitude},${longitude}`
      const result = await sendMessageHttp(conversationId, locationMessage, 'text', null)
      if (result.success) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...result.message, is_temp: false } : m))
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        Alert.alert('Erreur', "Impossible d'envoyer la position")
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      Alert.alert('Erreur', "Impossible d'envoyer la position")
    } finally {
      setSendingLocation(false)
    }
  }

  const openLocationInMaps = (content) => {
    const match = content.match(/https:\/\/www\.google\.com\/maps\?q=([-\d.]+),([-\d.]+)/)
    if (match) {
      const lat = match[1]
      const lng = match[2]
      const url = Platform.OS === 'ios'
        ? `maps://?q=${lat},${lng}`
        : `geo:${lat},${lng}?q=${lat},${lng}`
      Linking.openURL(url).catch(() =>
        Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`)
      )
    }
  }

  // ─── Typing indicator ────────────────────────────────────
  const handleTyping = (typing) => {
    if (typing !== isTyping) {
      setIsTyping(typing)
      const socket = getSocket()
      if (socket?.connected && otherPartyId) {
        socket.emit('typing', {
          conversationId,
          receiverId: otherPartyId,
          receiverType: isPro ? 'user' : 'professional',
          isTyping: typing
        })
      }
    }
  }

  const onTextChange = (text) => {
    setNewMessage(text)
    if (text.length > 0 && !isTyping) handleTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (text.length === 0) handleTyping(false)
    else typingTimeoutRef.current = setTimeout(() => handleTyping(false), 1500)
  }

  // ─── Unsend ──────────────────────────────────────────────
  const handleLongPressMessage = (message) => {
    const isOwnMessage = isPro ? message.sender_type === 'professional' : message.sender_type === 'user'
    if (!isOwnMessage || message.is_temp) return
    setSelectedMessage(message)
    setShowMessageOptions(true)
  }

  const handleUnsendMessage = async () => {
    if (!selectedMessage) return
    Alert.alert(
      'Supprimer ce message',
      'Voulez-vous vraiment supprimer ce message ?\n\nIl sera supprimé pour tout le monde.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const messageId = selectedMessage.id
              setMessages(prev => prev.filter(m => m.id !== messageId))
              setShowMessageOptions(false)
              setSelectedMessage(null)
              const result = await unsendMessage(messageId)
              if (!result.success) {
                setMessages(prev => [...prev, selectedMessage])
                Alert.alert('Erreur', result.error || 'Impossible de supprimer le message')
              }
            } catch {
              setMessages(prev => [...prev, selectedMessage])
              Alert.alert('Erreur', 'Une erreur est survenue')
            }
          }
        }
      ]
    )
  }

  const handleUnsendAllMessages = async () => {
    Alert.alert(
      'Supprimer tous vos messages',
      'Voulez-vous vraiment supprimer tous vos messages de cette conversation ?\n\nCette action est irréversible et les messages seront supprimés pour tout le monde.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer tout',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await unsendAllMessages(conversationId)
              if (result.success) {
                setMessages(prev => prev.filter(m => {
                  const isOwn = isPro ? m.sender_type === 'professional' : m.sender_type === 'user'
                  return !isOwn
                }))
                Alert.alert('Succès', `${result.affectedCount} message(s) supprimé(s)`)
              } else {
                Alert.alert('Erreur', result.error || 'Impossible de supprimer les messages')
              }
            } catch {
              Alert.alert('Erreur', 'Une erreur est survenue')
            }
          }
        }
      ]
    )
  }

  // ─── Format heure ────────────────────────────────────────
  const formatTime = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  // ─── Rendu message ───────────────────────────────────────
  const renderMessage = (item, index) => {
    const isOwnMessage = isPro ? item.sender_type === 'professional' : item.sender_type === 'user'
    const isImage = item.type === 'image'
    const isLocation = item.content?.includes('maps?q=') || item.content?.includes('maps.google.com')
    const isTemp = item.is_temp

    return (
      <TouchableOpacity
        key={item.id || index}
        onLongPress={() => handleLongPressMessage(item)}
        activeOpacity={0.7}
        disabled={!isOwnMessage || isTemp}
      >
        <View style={[
          styles.messageRow,
          isOwnMessage ? styles.messageRowRight : styles.messageRowLeft
        ]}>
          <View style={[
            styles.messageBubble,
            isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther,
            isTemp && styles.tempBubble,
            isImage && styles.imageBubble
          ]}>
            {isImage ? (
              <TouchableOpacity onPress={() => !isTemp && setSelectedImage(item.content)} activeOpacity={0.9}>
                <Image source={{ uri: item.content }} style={styles.messageImage} />
                {isTemp && (
                  <View style={styles.imageUploadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ) : isLocation ? (
              <TouchableOpacity onPress={() => openLocationInMaps(item.content)} activeOpacity={0.7}>
                <View style={styles.locationMessage}>
                  <View style={[styles.locationIcon, isOwnMessage && styles.locationIconOwn]}>
                    <Ionicons name="location" size={18} color={isOwnMessage ? '#fff' : COLORS.blumine[600]} />
                  </View>
                  <View>
                    <Text style={[styles.messageText, isOwnMessage ? styles.messageTextOwn : styles.messageTextOther, { fontWeight: '600' }]}>
                      Position partagée
                    </Text>
                    <Text style={[styles.locationSubtext, isOwnMessage ? { color: 'rgba(255,255,255,0.7)' } : { color: COLORS.blumine[600] }]}>
                      Appuyer pour ouvrir Maps
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.messageText, isOwnMessage ? styles.messageTextOwn : styles.messageTextOther]}>
                {item.content}
              </Text>
            )}

            {!isImage && (
              <Text style={[styles.messageTime, isOwnMessage ? styles.timeOwn : styles.timeOther]}>
                {isTemp ? 'Envoi...' : formatTime(item.created_at)}
              </Text>
            )}
            {isImage && !isTemp && (
              <Text style={[styles.messageTime, styles.timeOwn, { position: 'absolute', bottom: 6, right: 10 }]}>
                {formatTime(item.created_at)}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading && messages.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
        <ActivityIndicator size="small" color={COLORS.blumine[600]} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* ─── Header ─────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 10) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={24} color={COLORS.black} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {contactAvatar
            ? <Image source={{ uri: contactAvatar }} style={styles.headerAvatar} />
            : <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarText}>{contactName?.charAt(0)?.toUpperCase() || 'C'}</Text>
              </View>
          }
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {contactName || (isPro ? 'Client' : 'Professionnel')}
            </Text>
            {otherUserTyping
              ? <Text style={styles.typingIndicator}>en train d'écrire...</Text>
              : contactPhone
                ? <Text style={styles.headerPhone}>{contactPhone}</Text>
                : null
            }
          </View>
        </View>

        <TouchableOpacity
          onPress={handleCall}
          style={[styles.callButton, !contactPhone && styles.callButtonDisabled]}
          disabled={!contactPhone}
          activeOpacity={0.7}
        >
          <Ionicons name="call" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ─── Messages + Input ────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: Math.max(insets.bottom, 8) }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubble-outline" size={28} color={COLORS.gray[400]} />
              </View>
              <Text style={styles.emptyText}>Aucun message</Text>
              <Text style={styles.emptySubtext}>Commencez la discussion</Text>
            </View>
          ) : (
            messages.map((msg, index) => renderMessage(msg, index))
          )}
        </ScrollView>

        <View style={[styles.inputSection, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.iconButton} onPress={handleCameraPress} disabled={sending} activeOpacity={0.6}>
              <Ionicons name="camera-outline" size={22} color={sending ? COLORS.gray[300] : COLORS.gray[500]} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={sendLocation} disabled={sendingLocation} activeOpacity={0.6}>
              {sendingLocation
                ? <ActivityIndicator size="small" color={COLORS.blumine[600]} />
                : <Ionicons name="location-outline" size={22} color={COLORS.gray[500]} />
              }
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Écrivez un message..."
              placeholderTextColor={COLORS.gray[400]}
              value={newMessage}
              onChangeText={onTextChange}
              multiline
              editable={!sending}
              underlineColorAndroid="transparent"
            />

            {newMessage.trim().length > 0 && (
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage} disabled={sending} activeOpacity={0.8}>
                {sending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="arrow-up" size={18} color="#fff" />
                }
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ─── Modal options message ───────────────────────── */}
      <Modal
        transparent={true}
        visible={showMessageOptions}
        animationType="fade"
        onRequestClose={() => setShowMessageOptions(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMessageOptions(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Options du message</Text>
                  <TouchableOpacity onPress={() => setShowMessageOptions(false)}>
                    <Ionicons name="close" size={24} color={COLORS.black} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalDivider} />

                <TouchableOpacity style={styles.modalOption} onPress={handleUnsendMessage}>
                  <View style={[styles.modalOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="trash-outline" size={22} color="#DC2626" />
                  </View>
                  <View style={styles.modalOptionTextContainer}>
                    <Text style={[styles.modalOptionText, { color: '#DC2626' }]}>
                      Supprimer pour tout le monde
                    </Text>
                    <Text style={styles.modalOptionSubtext}>
                      Le message disparaîtra pour vous et le destinataire
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalOption, styles.modalOptionLast]}
                  onPress={() => {
                    setShowMessageOptions(false)
                    setSelectedMessage(null)
                  }}
                >
                  <View style={[styles.modalOptionIcon, { backgroundColor: '#E5E7EB' }]}>
                    <Ionicons name="close-outline" size={22} color={COLORS.black} />
                  </View>
                  <View style={styles.modalOptionTextContainer}>
                    <Text style={styles.modalOptionText}>Annuler</Text>
                    <Text style={styles.modalOptionSubtext}>Fermer les options</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ─── Modal image plein écran ─────────────────────── */}
      <Modal visible={!!selectedImage} transparent animationType="fade" statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => setSelectedImage(null)}>
          <View style={styles.imageModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.imageModalContent}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.imageModalFull}
                  resizeMode="contain"
                />
              </View>
            </TouchableWithoutFeedback>

            <TouchableOpacity
              style={[styles.imageModalClose, { top: insets.top + 10 }]}
              onPress={() => setSelectedImage(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  )
}

export default function ConversationDetail() {
  return (
    <SafeAreaProvider>
      <ConversationDetailInner />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },

  // ─── Header ────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
  },
  backButton: { padding: 6 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerAvatarPlaceholder: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  headerInfo: { flex: 1, marginLeft: 10 },
  headerName: { fontSize: 16, fontWeight: '600', color: '#000' },
  headerPhone: { fontSize: 12, color: COLORS.gray[400], marginTop: 1 },
  typingIndicator: { fontSize: 12, color: COLORS.blumine[500], marginTop: 1, fontStyle: 'italic' },
  callButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.blumine[600],
    marginRight: 8,
  },
  callButtonDisabled: {
    backgroundColor: COLORS.blumine[200],
    opacity: 0.5,
  },
  deleteAllButton: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },

  // ─── Messages ──────────────────────────────────────────────
  messagesContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  messagesContent: { paddingHorizontal: 16, paddingTop: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  messageRowLeft: { justifyContent: 'flex-start', marginLeft: 4 },
  messageRowRight: { justifyContent: 'flex-end' },

  messageBubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  messageBubbleOwn: { backgroundColor: COLORS.blumine[600], borderBottomRightRadius: 4 },
  messageBubbleOther: { backgroundColor: '#F0F0F0', borderBottomLeftRadius: 4 },
  imageBubble: { padding: 0, borderRadius: 14, overflow: 'hidden', backgroundColor: 'transparent' },
  tempBubble: { opacity: 0.6 },

  messageText: { fontSize: 15, lineHeight: 20 },
  messageTextOwn: { color: '#fff' },
  messageTextOther: { color: '#000' },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timeOwn: { color: 'rgba(255,255,255,0.65)' },
  timeOther: { color: '#AAA' },

  // ─── Image message ─────────────────────────────────────────
  messageImage: { width: 220, height: 160, borderRadius: 12 },
  imageUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },

  // ─── Location message ──────────────────────────────────────
  locationMessage: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  locationIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.blumine[50],
    alignItems: 'center', justifyContent: 'center',
  },
  locationIconOwn: { backgroundColor: 'rgba(255,255,255,0.2)' },
  locationSubtext: { fontSize: 11, marginTop: 1 },

  // ─── Input ─────────────────────────────────────────────────
  inputSection: {
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 26,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconButton: { padding: 7 },
  input: {
    flex: 1,
    marginHorizontal: 6,
    maxHeight: 100,
    fontSize: 15,
    color: '#000',
    paddingVertical: 8,
    textAlignVertical: 'center',
  },
  sendButton: {
    backgroundColor: COLORS.blumine[600],
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 4,
  },

  // ─── Empty ─────────────────────────────────────────────────
  emptyMessages: { alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  emptyIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#000' },
  emptySubtext: { fontSize: 14, color: '#AAA', marginTop: 4 },

  // ─── Modal image ───────────────────────────────────────────
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  imageModalContent: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.85 },
  imageModalFull: { width: '100%', height: '100%' },
  imageModalClose: {
    position: 'absolute',
    right: 20,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ─── Modal options message ─────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    flex: 1,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#EBEBEB',
    marginVertical: 12,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionLast: {
    borderBottomWidth: 0,
  },
  modalOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  modalOptionTextContainer: {
    flex: 1,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.black,
  },
  modalOptionSubtext: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginTop: 2,
  },
})