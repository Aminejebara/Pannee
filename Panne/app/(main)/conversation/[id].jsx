// FICHIER: app/(main)/conversation/[id].jsx

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
  SafeAreaView
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

export default function ConversationDetail() {
  const params = useLocalSearchParams()
  const { user } = useAuth()
  const isPro = user?.role === 'professional'
  
  const conversationId = params.id
  const contactName = params.contactName
  const contactAvatar = params.contactAvatar
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
    if (socket) {
      socketEvents.markConversationRead({ conversationId: conversationId })
    }
  }

  // ✅ FIX 1: Ne reconnecte pas si déjà connecté
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
      console.log('📩 [FRONT] Message reçu:', data)
      if (String(data.conversationId) === String(conversationId)) {
        setMessages(prev => {
          const exists = prev.some(m => String(m.id) === String(data.message.id))
          if (!exists) {
            return [...prev, data.message]
          }
          return prev
        })
        scrollToBottom()
        setTimeout(() => {
          markConversationAsRead(conversationId)
          socketEvents.markConversationRead({ conversationId: conversationId })
        }, 500)
      }
    }

    // ✅ FIX 2: handleMessageSent ne duplique plus - remplace seulement un temp
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
        if (data.isTyping) {
          setTimeout(() => setOtherUserTyping(false), 3000)
        }
      }
    }

    // ✅ FIX 3: UN SEUL enregistrement par event - les socketEvents.on() supprimés
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
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 200)
  }

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
      console.log('📤 [FRONT] Résultat sendMessageHttp:', result)
      if (result.success) {
        // ✅ FIX 4: Remplace le temp par le vrai message
        setMessages(prev => prev.map(m => m.id === tempId ? { ...result.message, is_temp: false } : m))
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        Alert.alert('Erreur', result.error || 'Message non envoyé')
      }
    } catch (error) {
      console.error('❌ [FRONT] Erreur sendMessageHttp:', error)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      Alert.alert('Erreur', error.message || 'Message non envoyé')
    }
    setSending(false)
  }

  const pickAndSendImage = async () => {
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

    if (!result.canceled) {
      const tempId = `temp_${Date.now()}_${Math.random()}`
      const optimisticMessage = {
        id: tempId,
        content: '📷 Envoi en cours...',
        type: 'image',
        sender_type: isPro ? 'professional' : 'user',
        created_at: new Date().toISOString(),
        is_temp: true
      }
      setMessages(prev => [...prev, optimisticMessage])
      scrollToBottom()
      setSending(true)
      
      const uploadResult = await uploadMessageImage(result.assets[0].uri)
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
  }

  const sendLocation = async () => {
    setSendingLocation(true)
    const tempId = `temp_${Date.now()}_${Math.random()}`
    const optimisticMessage = {
      id: tempId,
      content: '📍 Envoi de position...',
      type: 'text',
      sender_type: isPro ? 'professional' : 'user',
      created_at: new Date().toISOString(),
      is_temp: true
    }
    setMessages(prev => [...prev, optimisticMessage])
    scrollToBottom()
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        Alert.alert('Permission', 'Accès à la localisation nécessaire')
        setSendingLocation(false)
        return
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const { latitude, longitude } = position.coords
      // ✅ FIX 5: locationMessage au lieu de textToSend (bug dans ta version)
      const locationMessage = `📍 Position : https://www.google.com/maps?q=${latitude},${longitude}`
      
      const result = await sendMessageHttp(conversationId, locationMessage, 'text', null)
      if (result.success) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...result.message, is_temp: false } : m))
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId))
        Alert.alert('Erreur', "Impossible d'envoyer la position")
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      Alert.alert('Erreur', "Impossible d'envoyer la position")
    } finally {
      setSendingLocation(false)
    }
  }

  const handleTyping = (typing) => {
    if (typing !== isTyping) {
      setIsTyping(typing)
      const socket = getSocket()
      if (socket && otherPartyId) {
        socket.emit('typing', {
          conversationId: conversationId,
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
    if (text.length === 0) {
      handleTyping(false)
    } else {
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 1500)
    }
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const renderMessage = (item, index) => {
    const isOwnMessage = isPro 
      ? item.sender_type === 'professional'
      : item.sender_type === 'user'
    const isImage = item.type === 'image'
    const isLocation = item.content?.includes('maps.google.com') || item.content?.includes('maps?q=')
    const isTemp = item.is_temp

    return (
      <View key={item.id || index} style={[
        styles.messageRow,
        isOwnMessage ? styles.messageRowRight : styles.messageRowLeft
      ]}>
        {!isOwnMessage && (
          <View style={styles.avatarMessage}>
            {contactAvatar ? (
              <Image source={{ uri: contactAvatar }} style={styles.avatarImageSmall} />
            ) : (
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarSmallText}>
                  {contactName?.charAt(0)?.toUpperCase() || 'C'}
                </Text>
              </View>
            )}
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther,
          isTemp && styles.tempBubble
        ]}>
          {isImage ? (
            <Image source={{ uri: item.content }} style={styles.messageImage} />
          ) : isLocation ? (
            <View style={styles.locationMessage}>
              <Ionicons name="location-outline" size={18} color={isOwnMessage ? COLORS.white : COLORS.blumine[600]} />
              <Text style={[styles.messageText, isOwnMessage ? styles.messageTextOwn : styles.messageTextOther]}>
                Position envoyée
              </Text>
            </View>
          ) : (
            <Text style={[styles.messageText, isOwnMessage ? styles.messageTextOwn : styles.messageTextOther]}>
              {item.content}
            </Text>
          )}
          <Text style={[styles.messageTime, isOwnMessage ? styles.timeOwn : styles.timeOther]}>
            {isTemp ? 'Envoi...' : formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    )
  }

  if (loading && messages.length === 0) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.blumine[600]} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.black} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{contactName || (isPro ? 'Client' : 'Professionnel')}</Text>
          {otherUserTyping && (
            <Text style={styles.typingIndicator}>En train d'écrire...</Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
                <Ionicons name="chatbubble-ellipses-outline" size={40} color={COLORS.gray[300]} />
              </View>
              <Text style={styles.emptyText}>Aucun message</Text>
              <Text style={styles.emptySubtext}>Commencez la discussion</Text>
            </View>
          ) : (
            messages.map((msg, index) => renderMessage(msg, index))
          )}
        </ScrollView>

        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton} onPress={pickAndSendImage} disabled={sending}>
              <Ionicons name="camera-outline" size={24} color={sending ? COLORS.gray[400] : COLORS.gray[500]} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.locationButton} onPress={sendLocation} disabled={sendingLocation}>
              {sendingLocation ? (
                <ActivityIndicator size="small" color={COLORS.blumine[600]} />
              ) : (
                <Ionicons name="location-outline" size={24} color={COLORS.gray[500]} />
              )}
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="Écrivez ici..."
              placeholderTextColor={COLORS.gray[400]}
              value={newMessage}
              onChangeText={onTextChange}
              multiline
              editable={!sending}
            />
            
            {newMessage.trim().length > 0 && (
              <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage} disabled={sending}>
                {sending ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="arrow-up" size={22} color={COLORS.white} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { padding: 4 },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerName: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  typingIndicator: { fontSize: 10, color: COLORS.blumine[600], marginTop: 2 },
  messagesContainer: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  avatarMessage: { marginRight: 8 },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.blumine[50], alignItems: 'center', justifyContent: 'center' },
  avatarImageSmall: { width: 28, height: 28, borderRadius: 14 },
  avatarSmallText: { fontSize: 12, fontWeight: '700', color: COLORS.blumine[600] },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22 },
  messageBubbleOwn: { backgroundColor: COLORS.blumine[600], borderBottomRightRadius: 4 },
  messageBubbleOther: { backgroundColor: COLORS.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F0F0F0' },
  tempBubble: { opacity: 0.7 },
  messageText: { fontSize: 16, lineHeight: 22 },
  messageTextOwn: { color: COLORS.white },
  messageTextOther: { color: COLORS.black },
  messageImage: { width: 220, height: 180, borderRadius: 14, marginBottom: 4 },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timeOwn: { color: 'rgba(255,255,255,0.7)' },
  timeOther: { color: COLORS.gray[400] },
  locationMessage: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  inputSection: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 28, paddingHorizontal: 12, paddingVertical: 6 },
  attachButton: { padding: 8, marginRight: 4 },
  locationButton: { padding: 8, marginRight: 4 },
  input: { flex: 1, marginHorizontal: 8, maxHeight: 100, fontSize: 16, color: COLORS.black, paddingVertical: 8 },
  sendButton: { backgroundColor: COLORS.blumine[600], width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  emptyMessages: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyText: { fontSize: 20, fontWeight: '700', color: COLORS.black, marginTop: 12 },
  emptySubtext: { fontSize: 15, color: COLORS.gray[400], marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }
})