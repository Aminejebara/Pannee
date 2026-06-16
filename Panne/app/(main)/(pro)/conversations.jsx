// FICHIER: app/(main)/(pro)/conversations.jsx
// DESCRIPTION: Liste des conversations pour le professionnel

import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
  SafeAreaView,
  Alert,
  Modal,
  Pressable
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { usePro } from '../../../hooks/usePro'
import { useAuth } from '../../../hooks/useAuth'
import { socketEvents, getSocket, connectSocket } from '../../../services/socketService'
import { COLORS } from '../../../constants/colors'

export default function ProConversations() {
  const { getConversations, unsendAllMessages, loading } = usePro()
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [showOptionsModal, setShowOptionsModal] = useState(false)

  const loadConversations = async () => {
    const result = await getConversations()
    if (result.success) {
      const filtered = result.conversations.filter(item => {
        return item.last_message !== null && item.last_message !== 'Nouvelle conversation'
      })
      setConversations(filtered)
    }
  }

  useFocusEffect(
    useCallback(() => {
      // Connecter le socket si besoin
      const socket = getSocket()
      if (!socket || !socket.connected) connectSocket()
      loadConversations()
    }, [])
  )

  // ✅ Ecouter les evenements socket pour mettre a jour la liste en temps reel
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    // ✅ Quand un nouveau message est recu
    const handleReceiveMessage = (data) => {
      // Recharger la liste pour mettre a jour le dernier message et le compteur
      setTimeout(() => loadConversations(), 300)
    }

    // ✅ Quand un message est envoye
    const handleMessageSent = (data) => {
      setTimeout(() => loadConversations(), 300)
    }

    // ✅ UNSEND
    const handleMessagesUnsentAll = (data) => {
      loadConversations()
    }

    const handleMessageUnsent = (data) => {
      setTimeout(() => loadConversations(), 500)
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('message_sent', handleMessageSent)
    socket.on('messages_unsent_all', handleMessagesUnsentAll)
    socket.on('message_unsent', handleMessageUnsent)

    return () => {
      socket.off('receive_message', handleReceiveMessage)
      socket.off('message_sent', handleMessageSent)
      socket.off('messages_unsent_all', handleMessagesUnsentAll)
      socket.off('message_unsent', handleMessageUnsent)
    }
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await loadConversations()
    setRefreshing(false)
  }

  const navigateToConversation = (item) => {
    router.push({
      pathname: '/(main)/conversation/[id]',
      params: {
        id: item.id,
        contactName: item.contact_name,
        contactAvatar: item.contact_avatar,
        contactPhone: item.contact_phone,
        contactId: item.contact_id,
      }
    })
  }

  // ============================================================
  // FORMATAGE DU DERNIER MESSAGE AVEC ICONES
  // ============================================================

  const formatLastMessage = (message) => {
    if (!message) return 'Nouvelle conversation'

    if (message.includes('/uploads/messages/') || message.includes('uploads/messages')) {
      return 'Photo'
    }

    if (message.includes('google.com/maps') || message.includes('maps?q=') || message.includes('maps.google.com')) {
      return 'Position'
    }

    if (message.includes('http://') || message.includes('https://')) {
      return 'Lien'
    }

    return message
  }

  const getMessageIcon = (message) => {
    if (!message) return 'chatbubble-outline'

    if (message.includes('/uploads/messages/') || message.includes('uploads/messages')) {
      return 'image-outline'
    }

    if (message.includes('google.com/maps') || message.includes('maps?q=') || message.includes('maps.google.com')) {
      return 'location-outline'
    }

    if (message.includes('http://') || message.includes('https://')) {
      return 'link-outline'
    }

    return 'chatbubble-outline'
  }

  const handleLongPress = (item) => {
    setSelectedConversation(item)
    setShowOptionsModal(true)
  }

  const handleUnsendAll = async () => {
    if (!selectedConversation) return

    Alert.alert(
      'Supprimer tous les messages',
      `Voulez-vous vraiment supprimer tous vos messages de la conversation avec "${selectedConversation.contact_name}" ?\n\nCette action est irreversible et les messages seront supprimes pour tout le monde.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer tout', 
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await unsendAllMessages(selectedConversation.id)
              if (result.success) {
                setShowOptionsModal(false)
                setSelectedConversation(null)
                setConversations(prev => prev.filter(item => item.id !== selectedConversation.id))
                Alert.alert(
                  'Succes',
                  `${result.affectedCount} message(s) supprime(s) avec succes`
                )
                await loadConversations()
              } else {
                Alert.alert('Erreur', result.error || 'Impossible de supprimer les messages')
              }
            } catch (error) {
              Alert.alert('Erreur', 'Une erreur est survenue')
            }
          }
        }
      ]
    )
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Hier'
    } else if (days < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    }
  }

  const renderItem = ({ item }) => {
    const hasUnread = item.unread_count > 0
    if (!item.last_message || item.last_message === 'Nouvelle conversation') return null

    const displayMessage = formatLastMessage(item.last_message)
    const messageIcon = getMessageIcon(item.last_message)

    return (
      <TouchableOpacity 
        style={styles.conversationItem} 
        onPress={() => navigateToConversation(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {item.contact_avatar ? (
            <Image source={{ uri: item.contact_avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.contact_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          {hasUnread && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.contactName, hasUnread && styles.unreadTextBold]} numberOfLines={1}>
              {item.contact_name || 'Client'}
            </Text>
            <Text style={[styles.timeText, hasUnread && styles.unreadTimeBold]}>
              {formatTime(item.last_message_time || item.created_at)}
            </Text>
          </View>
          
          <View style={styles.messageRow}>
            <Ionicons 
              name={messageIcon} 
              size={14} 
              color={hasUnread ? COLORS.black : COLORS.gray[500]} 
              style={styles.messageIcon}
            />
            <Text style={[styles.lastMessage, hasUnread && styles.unreadMessageBold]} numberOfLines={2}>
              {displayMessage}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.optionsButton}
          onPress={() => handleLongPress(item)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.gray[400]} />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  if (loading && conversations.length === 0) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="small" color={COLORS.blumine[600]} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.blumine[600]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="chatbubbles-outline" size={32} color={COLORS.black} />
            </View>
            <Text style={styles.emptyTitle}>Aucun message pour l'instant</Text>
            <Text style={styles.emptyText}>
              Lorsqu'un client vous contactera, vos conversations apparaîtront ici.
            </Text>
          </View>
        }
      />

      {/* MODAL OPTIONS UNSEND */}
      <Modal
        transparent={true}
        visible={showOptionsModal}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedConversation?.contact_name || 'Conversation'}
              </Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            <TouchableOpacity 
              style={styles.modalOption}
              onPress={handleUnsendAll}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={22} color="#DC2626" />
              </View>
              <View style={styles.modalOptionTextContainer}>
                <Text style={[styles.modalOptionText, { color: '#DC2626' }]}>
                  Supprimer tous mes messages
                </Text>
                <Text style={styles.modalOptionSubtext}>
                  Supprimera tous vos messages de cette conversation pour tout le monde
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modalOption, styles.modalOptionLast]}
              onPress={() => {
                setShowOptionsModal(false)
                if (selectedConversation) {
                  navigateToConversation(selectedConversation)
                }
              }}
            >
              <View style={[styles.modalOptionIcon, { backgroundColor: '#E5E7EB' }]}>
                <Ionicons name="chatbubble-outline" size={22} color={COLORS.black} />
              </View>
              <View style={styles.modalOptionTextContainer}>
                <Text style={styles.modalOptionText}>
                  Ouvrir la conversation
                </Text>
                <Text style={styles.modalOptionSubtext}>
                  Acceder aux messages
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#FFFFFF'
  },
  header: { 
    paddingHorizontal: 24, 
    paddingTop: 24,
    paddingBottom: 16, 
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { 
    fontSize: 32, 
    fontWeight: '700', 
    color: COLORS.black,
    letterSpacing: -0.5
  },
  listContent: { 
    flexGrow: 1, 
    paddingHorizontal: 24,
    paddingBottom: 24
  },
  conversationItem: { 
    flexDirection: 'row', 
    paddingVertical: 16, 
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EBEBEB',
    alignItems: 'center'
  },
  avatarContainer: { 
    marginRight: 16, 
    position: 'relative' 
  },
  avatar: { 
    width: 52, 
    height: 52, 
    borderRadius: 26,
    backgroundColor: '#F7F7F7'
  },
  avatarPlaceholder: { 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    backgroundColor: '#F7F7F7', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  avatarText: { 
    fontSize: 20, 
    fontWeight: '600', 
    color: COLORS.blumine[600] 
  },
  unreadDot: { 
    position: 'absolute', 
    top: 0, 
    right: 0, 
    backgroundColor: COLORS.blumine[600],
    width: 14, 
    height: 14, 
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },
  contentContainer: { 
    flex: 1, 
    justifyContent: 'center' 
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'baseline', 
    marginBottom: 4 
  },
  contactName: { 
    fontSize: 16, 
    fontWeight: '400', 
    color: COLORS.black, 
    flex: 1 
  },
  unreadTextBold: {
    fontWeight: '600'
  },
  timeText: { 
    fontSize: 12, 
    color: COLORS.gray[500], 
    marginLeft: 8,
    fontWeight: '400'
  },
  unreadTimeBold: {
    fontWeight: '600',
    color: COLORS.black
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  messageIcon: {
    marginRight: 6
  },
  lastMessage: { 
    fontSize: 14, 
    color: COLORS.gray[500], 
    lineHeight: 18,
    fontWeight: '400',
    flex: 1
  },
  unreadMessageBold: {
    fontWeight: '600',
    color: COLORS.black
  },
  optionsButton: {
    padding: 8,
    marginLeft: 8
  },
  emptyContainer: { 
    flex: 1,
    alignItems: 'flex-start', 
    justifyContent: 'center', 
    paddingTop: 60,
    paddingHorizontal: 8
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  emptyTitle: { 
    fontSize: 22, 
    fontWeight: '600', 
    color: COLORS.black, 
    marginBottom: 8
  },
  emptyText: { 
    fontSize: 14, 
    color: COLORS.gray[500], 
    lineHeight: 20,
    textAlign: 'left'
  },
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
    maxHeight: '50%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    flex: 1
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#EBEBEB',
    marginVertical: 12
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  modalOptionLast: {
    borderBottomWidth: 0
  },
  modalOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  modalOptionTextContainer: {
    flex: 1
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.black
  },
  modalOptionSubtext: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginTop: 2
  }
})