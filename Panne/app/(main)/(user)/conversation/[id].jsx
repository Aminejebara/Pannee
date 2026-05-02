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
import { useUser } from '../../../../hooks/useUser'
import { useAuth } from '../../../../hooks/useAuth'
import { socketEvents, getSocket } from '../../../../services/socketService'
import { COLORS } from '../../../../constants/colors'

export default function ConversationDetail() {
  const { id, contactName, contactAvatar, professionalId } = useLocalSearchParams()
  const { user } = useAuth()
  const { getMessages, markConversationAsRead, uploadMessageImage, loading } = useUser()

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendingLocation, setSendingLocation] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const scrollViewRef = useRef()
  const typingTimeoutRef = useRef(null)

  const loadMessages = async () => {
    const result = await getMessages(id)
    if (result.success) {
      setMessages(result.messages || [])
      scrollToBottom()
    }
  }

  const markAsRead = async () => {
    await markConversationAsRead(id)
    const socket = getSocket()
    if (socket) {
      socketEvents.markConversationRead({ conversationId: id })
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadMessages()
      markAsRead()
    }, [id])
  )

  useEffect(() => {
    const socket = getSocket()
    if (!socket) {
      console.log('⚠️ Socket non connecté')
      return
    }

    const handleReceiveMessage = (data) => {
      console.log('📩 Nouveau message reçu:', data)
      if (data.conversationId == id) {
        setMessages(prev => [...prev, data.message])
        scrollToBottom()
      }
    }

    const handleMessageSent = (data) => {
      console.log('✅ Message envoyé confirmé:', data)
      if (data.conversationId == id) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === data.message.id)
          if (!exists) {
            return [...prev, data.message]
          }
          return prev
        })
        scrollToBottom()
      }
    }

    const handleUserTyping = (data) => {
      if (data.conversationId == id && data.userId != user?.id) {
        setOtherUserTyping(data.isTyping)
      }
    }

    socketEvents.onReceiveMessage(handleReceiveMessage)
    socketEvents.onMessageSent(handleMessageSent)
    socketEvents.onUserTyping(handleUserTyping)

    return () => {
      socketEvents.offReceiveMessage()
      socketEvents.offMessageSent()
      socketEvents.offUserTyping()
    }
  }, [id, user?.id])

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  const sendMessage = (content, type = 'text', media_url = null) => {
    return new Promise((resolve, reject) => {
      const socket = getSocket()
      if (!socket) {
        reject(new Error('Socket non connecté'))
        return
      }

      const onSent = (data) => {
        if (data.conversationId == id) {
          socket.off('message_sent', onSent)
          resolve(data)
        }
      }
      
      socket.on('message_sent', onSent)

      socketEvents.sendMessage({
        conversationId: id,
        receiverId: professionalId || contactAvatar,
        receiverType: 'professional',
        content: content,
        type: type,
        media_url: media_url
      })

      setTimeout(() => {
        socket.off('message_sent', onSent)
        reject(new Error('Timeout'))
      }, 10000)
    })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    setSending(true)
    const textToSend = newMessage.trim()
    setNewMessage('')
    handleTyping(false)
    
    try {
      await sendMessage(textToSend, 'text')
      await loadMessages()
    } catch (error) {
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
      setSending(true)
      const uploadResult = await uploadMessageImage(result.assets[0].uri)
      if (uploadResult.success) {
        try {
          await sendMessage(uploadResult.url, 'image', uploadResult.url)
          await loadMessages()
        } catch (error) {
          Alert.alert('Erreur', 'Image non envoyée')
        }
      }
      setSending(false)
    }
  }

  const sendLocation = async () => {
    setSendingLocation(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission', 'Accès à la localisation nécessaire')
        return
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const { latitude, longitude } = position.coords
      const locationMessage = `📍 Position : https://www.google.com/maps?q=${latitude},${longitude}`
      
      await sendMessage(locationMessage, 'text')
      await loadMessages()
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la position')
    } finally {
      setSendingLocation(false)
    }
  }

  const handleTyping = (typing) => {
    if (typing !== isTyping) {
      setIsTyping(typing)
      const socket = getSocket()
      if (socket) {
        socketEvents.typing({
          conversationId: id,
          receiverId: professionalId || contactAvatar,
          isTyping: typing
        })
      }
    }
  }

  const onTextChange = (text) => {
    setNewMessage(text)
    
    if (text.length > 0 && !isTyping) {
      handleTyping(true)
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    if (text.length === 0) {
      handleTyping(false)
    } else {
      typingTimeoutRef.current = setTimeout(() => {
        handleTyping(false)
      }, 1500)
    }
  }

  const renderMessage = (item, index) => {
    const isOwnMessage = item.sender_type === 'user'
    const isImage = item.type === 'image'
    const isLocation = item.content?.includes('maps.google.com') || item.content?.includes('maps?q=')

    return (
      <View
        key={item.id || index}
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownContainer : styles.otherContainer,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isOwnMessage ? styles.bubbleOwn : styles.bubbleOther,
            isImage && styles.bubbleImage,
          ]}
        >
          {isImage ? (
            <Image source={{ uri: item.content }} style={styles.imageContent} />
          ) : (
            <Text style={[styles.messageText, isOwnMessage ? styles.textOwn : styles.textOther]}>
              {isLocation ? (
                <View style={styles.locationMessage}>
                  <Ionicons name="location-outline" size={18} color={isOwnMessage ? COLORS.white : COLORS.blumine[600]} />
                  <Text style={[styles.messageText, isOwnMessage ? styles.textOwn : styles.textOther]}>
                    Position envoyée
                  </Text>
                </View>
              ) : (
                item.content
              )}
            </Text>
          )}
        </View>
        <Text style={styles.timeText}>
          {new Date(item.created_at).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    )
  }

  if (loading && messages.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.blumine[600]} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerAction}>
          <Ionicons name="chevron-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerName}>{contactName || 'Professionnel'}</Text>
          <View style={styles.statusRow}>
             <View style={styles.statusDot} />
             <Text style={styles.headerStatus}>En ligne</Text>
          </View>
          {otherUserTyping && (
            <Text style={styles.typingIndicator}>En train d'écrire...</Text>
          )}
        </View>

        <TouchableOpacity style={styles.headerAction}>
           <Ionicons name="information-circle-outline" size={24} color={COLORS.black} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatList}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, index) => renderMessage(msg, index))}
        </ScrollView>

        <View style={styles.inputSection}>
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton} onPress={pickAndSendImage}>
              <Ionicons name="camera-outline" size={24} color={COLORS.black} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.locationButton} onPress={sendLocation} disabled={sendingLocation}>
              {sendingLocation ? (
                <ActivityIndicator size="small" color={COLORS.blumine[600]} />
              ) : (
                <Ionicons name="location-outline" size={24} color={COLORS.black} />
              )}
            </TouchableOpacity>
            
            <TextInput
              style={styles.textInput}
              placeholder="Écrivez ici..."
              placeholderTextColor="#717171"
              value={newMessage}
              onChangeText={onTextChange}
              multiline
            />

            {newMessage.trim().length > 0 && (
              <TouchableOpacity 
                style={styles.sendIconCircle} 
                onPress={handleSendMessage}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="arrow-up" size={20} color={COLORS.white} />
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
  container: { flex: 1, backgroundColor: COLORS.white },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DDDDDD',
  },
  headerAction: { padding: 4 },
  headerContent: { alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: '600', color: COLORS.black },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 4 },
  headerStatus: { fontSize: 12, color: '#717171' },
  typingIndicator: { fontSize: 10, color: COLORS.blumine[600], marginTop: 2 },

  chatList: { flex: 1 },
  chatContent: { paddingHorizontal: 20, paddingVertical: 24 },
  messageContainer: { marginBottom: 20, maxWidth: '85%' },
  ownContainer: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  otherContainer: { alignSelf: 'flex-start', alignItems: 'flex-start' },

  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  bubbleOwn: {
    backgroundColor: COLORS.black,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#F7F7F7',
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#DDDDDD'
  },
  bubbleImage: { padding: 4, borderRadius: 16, backgroundColor: '#F7F7F7' },

  messageText: { fontSize: 16, lineHeight: 22 },
  textOwn: { color: COLORS.white, fontWeight: '400' },
  textOther: { color: COLORS.black, fontWeight: '400' },

  imageContent: { width: 220, height: 160, borderRadius: 12 },
  timeText: { fontSize: 11, color: '#717171', marginTop: 6, marginHorizontal: 4 },
  locationMessage: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  inputSection: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
    paddingTop: 10,
    backgroundColor: COLORS.white,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#B0B0B0',
    borderRadius: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 50,
  },
  attachButton: { padding: 8, marginRight: 4 },
  locationButton: { padding: 8, marginRight: 4 },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.black,
    maxHeight: 100,
  },
  sendIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
})