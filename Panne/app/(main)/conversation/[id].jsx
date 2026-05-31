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
  SafeAreaView,
  Linking,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  ActionSheetIOS,
} from 'react-native'
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

export default function ConversationDetail() {
  const params = useLocalSearchParams()
  const { user } = useAuth()
  const isPro = user?.role === 'professional'

  const conversationId = params.id
  const contactName = params.contactName
  const contactAvatar = params.contactAvatar
  const contactPhone = params.contactPhone || params.phone || null
  const otherPartyId = isPro ? params.contactId : params.professionalId

  const userHook = useUser()
  const proHook = usePro()
  const hook = isPro ? proHook : userHook
  const { getMessages, markConversationAsRead, uploadMessageImage, sendMessage: sendMessageHttp, loading } = hook

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendingLocation, setSendingLocation] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const scrollViewRef = useRef()
  const typingTimeoutRef = useRef(null)

  const loadMessages = async () => {
    const result = await getMessages(conversationId)
    if (result.success) {
      setMessages(result.messages || [])
      scrollToBottom()
    }
  }

  const markAsRead = async () => {
    await markConversationAsRead(conversationId)
    const socket = getSocket()
    if (socket) socketEvents.markConversationRead({ conversationId })
  }

  useFocusEffect(
    useCallback(() => {
      const socket = getSocket()
      if (!socket || !socket.connected) connectSocket()
      loadMessages()
      markAsRead()
    }, [conversationId])
  )

  useEffect(() => {
    let socket = getSocket()
    if (!socket) {
      connectSocket()
      socket = getSocket()
    }
    if (!socket) return

    const handleReceiveMessage = (data) => {
      if (String(data.conversationId) === String(conversationId)) {
        setMessages(prev => {
          const exists = prev.some(m => String(m.id) === String(data.message.id))
          if (!exists) return [...prev, data.message]
          return prev
        })
        scrollToBottom()
        setTimeout(() => {
          markConversationAsRead(conversationId)
          socketEvents.markConversationRead({ conversationId })
        }, 500)
      }
    }

    const handleMessageSent = (data) => {
      if (String(data.conversationId) === String(conversationId)) {
        setMessages(prev => {
          const hasTemp = prev.some(m => m.is_temp)
          if (!hasTemp) return prev
          return prev.map(m => m.is_temp ? { ...data.message, is_temp: false } : m)
        })
        scrollToBottom()
      }
    }

    const handleUserTyping = (data) => {
      if (String(data.conversationId) === String(conversationId) && String(data.userId) !== String(user?.id)) {
        setOtherUserTyping(data.isTyping)
        if (data.isTyping) setTimeout(() => setOtherUserTyping(false), 3000)
      }
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('message_sent', handleMessageSent)
    socket.on('user_typing', handleUserTyping)

    return () => {
      socket.off('receive_message', handleReceiveMessage)
      socket.off('message_sent', handleMessageSent)
      socket.off('user_typing', handleUserTyping)
    }
  }, [conversationId, user?.id])

  const scrollToBottom = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200)
  }

  // ─── Appel téléphonique ──────────────────────────────────
  const handleCall = () => {
    if (!contactPhone) {
      Alert.alert('Numéro indisponible', 'Le numéro de téléphone de ce contact n\'est pas disponible.')
      return
    }
    const phoneUrl = `tel:${contactPhone}`
    Linking.canOpenURL(phoneUrl).then(supported => {
      if (supported) Linking.openURL(phoneUrl)
      else Alert.alert('Erreur', 'Impossible d\'effectuer l\'appel')
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
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 })
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
      allowsEditing: true,
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

  // ─── Localisation → ouvre Google Maps ───────────────────
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

  const handleTyping = (typing) => {
    if (typing !== isTyping) {
      setIsTyping(typing)
      const socket = getSocket()
      if (socket && otherPartyId) {
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

  const formatTime = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const renderMessage = (item, index) => {
    const isOwnMessage = isPro ? item.sender_type === 'professional' : item.sender_type === 'user'
    const isImage = item.type === 'image'
    const isLocation = item.content?.includes('maps?q=') || item.content?.includes('maps.google.com')
    const isTemp = item.is_temp

    return (
      <View key={item.id || index} style={[
        styles.messageRow,
        isOwnMessage ? styles.messageRowRight : styles.messageRowLeft
      ]}>
        {!isOwnMessage && (
          <View style={styles.avatarMessage}>
            {contactAvatar
              ? <Image source={{ uri: contactAvatar }} style={styles.avatarImageSmall} />
              : <View style={styles.avatarSmall}>
                  <Text style={styles.avatarSmallText}>{contactName?.charAt(0)?.toUpperCase() || 'C'}</Text>
                </View>
            }
          </View>
        )}

        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther,
          isTemp && styles.tempBubble,
          isImage && styles.imageBubble
        ]}>
          {isImage ? (
            // ─── Image cliquable → plein écran ───────────
            <TouchableOpacity onPress={() => !isTemp && setSelectedImage(item.content)} activeOpacity={0.9}>
              <Image source={{ uri: item.content }} style={styles.messageImage} />
              {isTemp && (
                <View style={styles.imageUploadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ) : isLocation ? (
            // ─── Position → ouvre Google Maps ────────────
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
    )
  }

  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="small" color={COLORS.blumine[600]} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* ─── Header ──────────────────────────────────────── */}
      <View style={styles.header}>
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
            <Text style={styles.headerName} numberOfLines={1}>{contactName || (isPro ? 'Client' : 'Professionnel')}</Text>
            {otherUserTyping
              ? <Text style={styles.typingIndicator}>en train d'écrire...</Text>
              : contactPhone
                ? <Text style={styles.headerPhone}>{contactPhone}</Text>
                : null
            }
          </View>
        </View>

        {/* Bouton appel */}
        <TouchableOpacity onPress={handleCall} style={styles.callButton} activeOpacity={0.7}>
          <Ionicons name="call" size={20} color={COLORS.dixie[50]} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
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

        {/* ─── Input ───────────────────────────────────────── */}
        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            {/* Caméra + Galerie */}
            <TouchableOpacity style={styles.iconButton} onPress={handleCameraPress} disabled={sending} activeOpacity={0.6}>
              <Ionicons name="camera-outline" size={22} color={sending ? COLORS.gray[300] : COLORS.gray[500]} />
            </TouchableOpacity>

            {/* Localisation */}
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

            {/* Bouton fermer */}
            <TouchableOpacity style={styles.imageModalClose} onPress={() => setSelectedImage(null)} activeOpacity={0.8}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEBEB' },
  backButton: { padding: 6 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerAvatarPlaceholder: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.blumine[50], alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  headerInfo: { flex: 1, marginLeft: 10 },
  headerName: { fontSize: 16, fontWeight: '600', color: '#000' },
  headerPhone: { fontSize: 12, color: COLORS.gray[400], marginTop: 1 },
  typingIndicator: { fontSize: 12, color: COLORS.blumine[500], marginTop: 1, fontStyle: 'italic' },
  callButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.blumine[50] },

  // Messages
  messagesContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  avatarMessage: { marginRight: 8, marginBottom: 2 },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.blumine[50], alignItems: 'center', justifyContent: 'center' },
  avatarImageSmall: { width: 28, height: 28, borderRadius: 14 },
  avatarSmallText: { fontSize: 11, fontWeight: '700', color: COLORS.blumine[600] },

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

  // Image message
  messageImage: { width: 220, height: 160, borderRadius: 12 },
  imageUploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Location message
  locationMessage: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 2 },
  locationIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.blumine[50], alignItems: 'center', justifyContent: 'center' },
  locationIconOwn: { backgroundColor: 'rgba(255,255,255,0.2)' },
  locationSubtext: { fontSize: 11, marginTop: 1 },

  // Input
  inputSection: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EBEBEB' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 26, paddingHorizontal: 8, paddingVertical: 4 },
  iconButton: { padding: 7 },
  input: { flex: 1, marginHorizontal: 6, maxHeight: 100, fontSize: 15, color: '#000', paddingVertical: 8 },
  sendButton: { backgroundColor: COLORS.blumine[600], width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },

  // Empty
  emptyMessages: { alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#000' },
  emptySubtext: { fontSize: 14, color: '#AAA', marginTop: 4 },

  // Modal image
  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  imageModalContent: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.85 },
  imageModalFull: { width: '100%', height: '100%' },
  imageModalClose: { position: 'absolute', top: 50, right: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
})