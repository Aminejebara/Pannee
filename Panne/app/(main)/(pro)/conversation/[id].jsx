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
import { usePro } from '../../../../hooks/usePro'
import { useAuth } from '../../../../hooks/useAuth'
import { socketEvents, getSocket } from '../../../../services/socketService'
import { COLORS } from '../../../../constants/colors'

export default function ConversationDetail() {
  const { id, contactName, contactAvatar, contactId } = useLocalSearchParams()
  const { user } = useAuth()
  const { getMessages, markConversationAsRead, uploadMessageImage, loading } = usePro()

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
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
      console.log('⚠️ Socket non connecté dans ConversationDetail pro')
      return
    }

    const handleReceiveMessage = (data) => {
      console.log('📩 Nouveau message reçu (pro):', data)
      if (data.conversationId == id) {
        setMessages(prev => [...prev, data.message])
        scrollToBottom()
      }
    }

    const handleMessageSent = (data) => {
      console.log('✅ Message envoyé confirmé (pro):', data)
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
        receiverId: contactId,
        receiverType: 'user',
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
      aspect: [4, 3],
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
          Alert.alert('Erreur', "Impossible d'envoyer l'image")
        }
      }
      setSending(false)
    }
  }

  const handleTyping = (typing) => {
    if (typing !== isTyping) {
      setIsTyping(typing)
      const socket = getSocket()
      if (socket) {
        socketEvents.typing({
          conversationId: id,
          receiverId: contactId,
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

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateSeparator = (dateString, prevDateString) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const prevDate = prevDateString ? new Date(prevDateString) : null
    if (!prevDate || date.toDateString() !== prevDate.toDateString()) {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })
    }
    return null
  }

  const renderMessage = (item, index) => {
    const isOwnMessage = item.sender_type === 'professional'
    const showDate = formatDateSeparator(item.created_at, index > 0 ? messages[index - 1]?.created_at : null)
    const isImage = item.type === 'image'

    return (
      <View key={item.id || index}>
        {showDate && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateText}>{showDate}</Text>
          </View>
        )}
        
        <View style={[
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
            isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther
          ]}>
            {isImage ? (
              <Image source={{ uri: item.content }} style={styles.messageImage} />
            ) : (
              <Text style={[
                styles.messageText,
                isOwnMessage ? styles.messageTextOwn : styles.messageTextOther
              ]}>
                {item.content}
              </Text>
            )}
            <Text style={[styles.messageTime, isOwnMessage ? styles.timeOwn : styles.timeOther]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={COLORS.black} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{contactName || 'Client'}</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.headerStatus}>Client</Text>
          </View>
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
              <Text style={styles.emptySubtext}>Commencez la discussion avec votre client</Text>
            </View>
          ) : (
            messages.map((msg, index) => renderMessage(msg, index))
          )}
        </ScrollView>

        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton} onPress={pickAndSendImage}>
              <Ionicons name="add-circle-outline" size={28} color={COLORS.gray[500]} />
            </TouchableOpacity>
            
            <TextInput
              style={styles.input}
              placeholder="Écrivez ici..."
              placeholderTextColor={COLORS.gray[400]}
              value={newMessage}
              onChangeText={onTextChange}
              multiline
            />
            
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={sending || !newMessage.trim()}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name="arrow-up" size={22} color={COLORS.white} />
              )}
            </TouchableOpacity>
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
  headerName: { fontSize: 18, fontWeight: '700', color: COLORS.black, letterSpacing: -0.4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 6 },
  headerStatus: { fontSize: 13, color: COLORS.gray[500] },
  typingIndicator: { fontSize: 10, color: COLORS.blumine[600], marginTop: 2 },
  messagesContainer: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 20 },
  dateHeader: { alignItems: 'center', marginVertical: 20 },
  dateText: { fontSize: 12, fontWeight: '600', color: COLORS.gray[400], textTransform: 'uppercase', letterSpacing: 0.5 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageRowLeft: { justifyContent: 'flex-start' },
  messageRowRight: { justifyContent: 'flex-end' },
  avatarMessage: { marginRight: 8 },
  avatarSmall: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.blumine[50], alignItems: 'center', justifyContent: 'center' },
  avatarImageSmall: { width: 28, height: 28, borderRadius: 14 },
  avatarSmallText: { fontSize: 12, fontWeight: '700', color: COLORS.blumine[600] },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 }, android: { elevation: 1 } }) },
  messageBubbleOwn: { backgroundColor: COLORS.blumine[600], borderBottomRightRadius: 4 },
  messageBubbleOther: { backgroundColor: COLORS.white, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F0F0F0' },
  messageText: { fontSize: 16, lineHeight: 22 },
  messageTextOwn: { color: COLORS.white },
  messageTextOther: { color: COLORS.black },
  messageImage: { width: 220, height: 180, borderRadius: 14, marginBottom: 4 },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  timeOwn: { color: 'rgba(255,255,255,0.7)' },
  timeOther: { color: COLORS.gray[400] },
  inputSection: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 28, paddingHorizontal: 12, paddingVertical: 6 },
  attachButton: { padding: 4 },
  input: { flex: 1, marginHorizontal: 8, maxHeight: 100, fontSize: 16, color: COLORS.black, paddingVertical: 8 },
  sendButton: { backgroundColor: COLORS.blumine[600], width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: COLORS.gray[300] },
  emptyMessages: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyText: { fontSize: 20, fontWeight: '700', color: COLORS.black, marginTop: 12 },
  emptySubtext: { fontSize: 15, color: COLORS.gray[400], marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
})