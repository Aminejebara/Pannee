import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
  Platform
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { usePro } from '../../../hooks/usePro'
import { COLORS } from '../../../constants/colors'

export default function ProConversations() {
  const { getConversations, getUnreadCount, loading } = usePro()
  const [conversations, setConversations] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [unreadTotal, setUnreadTotal] = useState(0)

  const loadConversations = async () => {
    const result = await getConversations()
    if (result.success) {
      setConversations(result.conversations || [])
    }
  }

  const loadUnreadCount = async () => {
    const result = await getUnreadCount()
    if (result.success) {
      setUnreadTotal(result.unread_count || 0)
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadConversations()
      loadUnreadCount()
    }, [])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadConversations(), loadUnreadCount()])
    setRefreshing(false)
  }

  const formatDate = (dateString) => {
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
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
    }
  }

  const openConversation = (conversation) => {
  console.log("🔵 ID de la conversation:", conversation.id)
  console.log("🔵 Conversation complète:", conversation)
  router.push({
    pathname: '/(main)/(pro)/conversation/[id]',
    params: { 
      id: conversation.id,
      contactName: conversation.contact_name,
      contactAvatar: conversation.contact_avatar,
      contactId: conversation.contact_id
    }
  })
}

  if (loading && !refreshing && conversations.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.blumine[600]} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blumine[600]} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.headerRow}>
            <Text style={styles.subtitle}>Gérez vos échanges clients</Text>
            {unreadTotal > 0 && (
                <View style={styles.unreadTag}>
                    <Text style={styles.unreadTagText}>{unreadTotal} nouveau{unreadTotal > 1 ? 'x' : ''}</Text>
                </View>
            )}
        </View>
      </View>

      <View style={styles.listContainer}>
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubbles-outline" size={38} color={COLORS.gray[300]} />
            </View>
            <Text style={styles.emptyStateTitle}>Aucun message pour l'instant</Text>
            <Text style={styles.emptyStateText}>Retrouvez ici les demandes et questions de vos futurs clients.</Text>
          </View>
        ) : (
          conversations.map((conv) => {
            const hasUnread = conv.unread_count > 0;
            return (
              <TouchableOpacity
                key={conv.id}
                style={styles.conversationItem}
                onPress={() => openConversation(conv)}
                activeOpacity={0.6}
              >
                <View style={styles.avatarWrapper}>
                  {conv.contact_avatar ? (
                    <Image source={{ uri: conv.contact_avatar }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitial}>
                        {conv.contact_name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  {hasUnread && <View style={styles.activeIndicator} />}
                </View>

                <View style={styles.messageBody}>
                  <View style={styles.messageHeader}>
                    <Text style={[styles.contactName, hasUnread && styles.unreadName]} numberOfLines={1}>
                        {conv.contact_name || 'Client'}
                    </Text>
                    <Text style={[styles.timeText, hasUnread && styles.unreadTimeText]}>
                        {formatDate(conv.last_message_time || conv.created_at)}
                    </Text>
                  </View>
                  
                  <View style={styles.messageFooter}>
                    <Text style={[styles.lastMessage, hasUnread && styles.unreadLastMessage]} numberOfLines={2}>
                        {conv.last_message || 'Nouvelle conversation ouverte'}
                    </Text>
                    {hasUnread && (
                         <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>{conv.unread_count}</Text>
                         </View>
                    )}
                  </View>
                </View>
                
                <Ionicons name="chevron-forward" size={18} color={COLORS.gray[200]} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            )
          })
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { paddingBottom: 60 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 40,
    paddingBottom: 28,
  },
  title: { fontSize: 34, fontWeight: '800', color: COLORS.black, letterSpacing: -1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  subtitle: { fontSize: 15, color: COLORS.gray[500], fontWeight: '500' },
  unreadTag: { marginLeft: 12, backgroundColor: COLORS.blumine[600], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  unreadTagText: { color: COLORS.white, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  listContainer: { paddingHorizontal: 24 },
  conversationItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.gray[200] },
  avatarWrapper: { position: 'relative', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 3 } }) },
  avatarImage: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.gray[100] },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.blumine[50], alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 24, fontWeight: '700', color: COLORS.blumine[600] },
  activeIndicator: { position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.blumine[600], borderWidth: 3, borderColor: COLORS.white },
  messageBody: { flex: 1, marginLeft: 16 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  contactName: { fontSize: 17, fontWeight: '600', color: COLORS.gray[800], flex: 1 },
  unreadName: { color: COLORS.black, fontWeight: '800' },
  timeText: { fontSize: 12, color: COLORS.gray[400], fontWeight: '400' },
  unreadTimeText: { color: COLORS.blumine[600], fontWeight: '700' },
  messageFooter: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  lastMessage: { fontSize: 14, color: COLORS.gray[500], flex: 1, lineHeight: 18 },
  unreadLastMessage: { color: COLORS.black, fontWeight: '600' },
  unreadBadge: { backgroundColor: COLORS.blumine[600], minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8, marginTop: 2 },
  unreadBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '900' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.gray[50], alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyStateTitle: { fontSize: 22, fontWeight: '700', color: COLORS.black, marginBottom: 10, textAlign: 'center' },
  emptyStateText: { fontSize: 16, color: COLORS.gray[400], textAlign: 'center', lineHeight: 24, paddingHorizontal: 30 },
})