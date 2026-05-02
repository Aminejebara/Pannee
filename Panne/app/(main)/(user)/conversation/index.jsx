import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
  Platform,
  SafeAreaView
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useUser } from '../../../../hooks/useUser'
import { socketEvents, getSocket } from '../../../../services/socketService'
import { COLORS } from '../../../../constants/colors'

export default function UserConversations() {
  const { getConversations, getUnreadCount, loading } = useUser()
  const [conversations, setConversations] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const isMounted = useRef(true)

  const loadConversations = async () => {
    if (!isMounted.current) return
    const result = await getConversations()
    if (result.success && isMounted.current) {
      setConversations(result.conversations || [])
    }
  }

  const loadUnreadCount = async () => {
    if (!isMounted.current) return
    const result = await getUnreadCount()
    if (result.success && isMounted.current) {
      setUnreadTotal(result.unread_count || 0)
    }
  }

  const refreshData = async () => {
    await Promise.all([loadConversations(), loadUnreadCount()])
  }

  // 👂 Écouter les nouveaux messages en temps réel
  useEffect(() => {
    isMounted.current = true
    const socket = getSocket()
    if (!socket) {
      console.log('⚠️ Socket non connecté dans UserConversations')
      return
    }

    const handleNewMessage = (data) => {
      console.log('📩 Nouveau message reçu dans liste:', data)
      refreshData()
    }

    const handleMessageSent = (data) => {
      console.log('✅ Message envoyé confirmé:', data)
      refreshData()
    }

    socketEvents.onReceiveMessage(handleNewMessage)
    socketEvents.onMessageSent(handleMessageSent)

    return () => {
      isMounted.current = false
      socketEvents.offReceiveMessage()
      socketEvents.offMessageSent()
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      refreshData()
    }, [])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshData()
    setRefreshing(false)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    if (days === 1) return 'Hier'
    if (days < 7) return date.toLocaleDateString('fr-FR', { weekday: 'short' })
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  const openConversation = (conversation) => {
    router.push({
      pathname: '/(main)/(user)/conversation/[id]',
      params: { 
        id: conversation.id,
        contactName: conversation.business_name,
        contactAvatar: conversation.contact_avatar,
        professionalId: conversation.professional_id
      }
    })
  }

  if (loading && !refreshing && conversations.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color={COLORS.black} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.black} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
          {unreadTotal > 0 && (
            <Text style={styles.unreadCountText}>
              Vous avez {unreadTotal} message{unreadTotal > 1 ? 's' : ''} non lu{unreadTotal > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubble-ellipses-outline" size={40} color={COLORS.black} />
            </View>
            <Text style={styles.emptyTitle}>Aucun message pour l'instant</Text>
            <Text style={styles.emptyText}>
              Dès que vous contactez un professionnel pour un dépannage, vos messages apparaîtront ici.
            </Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => router.push('/(main)/(user)')}
            >
              <Text style={styles.exploreButtonText}>Explorer les services</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {conversations.map((conv) => (
              <TouchableOpacity
                key={conv.id}
                style={styles.conversationItem}
                onPress={() => openConversation(conv)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarWrapper}>
                  {conv.contact_avatar ? (
                    <Image source={{ uri: conv.contact_avatar }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {conv.business_name?.charAt(0)?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {conv.unread_count > 0 && <View style={styles.unreadIndicator} />}
                </View>

                <View style={styles.infoContainer}>
                  <View style={styles.topRow}>
                    <Text style={[styles.contactName, conv.unread_count > 0 && styles.unreadText]} numberOfLines={1}>
                        {conv.business_name}
                    </Text>
                    <Text style={[styles.dateText, conv.unread_count > 0 && styles.unreadText]}>
                        {formatDate(conv.last_message_time || conv.created_at)}
                    </Text>
                  </View>
                  
                  <Text 
                    style={[styles.lastMessage, conv.unread_count > 0 && styles.unreadMessage]} 
                    numberOfLines={2}
                  >
                    {conv.last_message || 'Nouvelle conversation'}
                  </Text>
                </View>
                
                <Ionicons name="chevron-forward" size={16} color={COLORS.gray[200]} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: -0.5,
  },
  unreadCountText: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 4,
  },

  listContainer: {
    paddingHorizontal: 24,
    marginTop: 10,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray[200],
  },

  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.gray[100],
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.blumine[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '700',
  },
  unreadIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.blumine[600],
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '500',
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.gray[500],
    lineHeight: 18,
  },

  unreadText: {
    fontWeight: '700',
    color: COLORS.black,
  },
  unreadMessage: {
    color: COLORS.black,
    fontWeight: '600',
  },

  emptyState: {
    paddingHorizontal: 40,
    paddingTop: 60,
    alignItems: 'flex-start',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.gray[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray[500],
    lineHeight: 22,
    marginBottom: 24,
  },
  exploreButton: {
    borderWidth: 1,
    borderColor: COLORS.black,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: COLORS.black,
    fontWeight: '700',
    fontSize: 16,
  },
})