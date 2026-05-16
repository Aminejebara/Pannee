// FICHIER: app/(main)/(pro)/conversations.jsx
// DESCRIPTION: Liste des conversations pour le professionnel

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
  SafeAreaView
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { usePro } from '../../../hooks/usePro'
import { COLORS } from '../../../constants/colors'

export default function ProConversations() {
  const { getConversations, loading } = usePro()
  const [conversations, setConversations] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  const loadConversations = async () => {
    const result = await getConversations()
    if (result.success) {
      setConversations(result.conversations || [])
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadConversations()
    }, [])
  )

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
        contactId: item.contact_id
      }
    })
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

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.conversationItem} 
      onPress={() => navigateToConversation(item)}
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
        {item.unread_count > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>
              {item.unread_count > 99 ? '99+' : item.unread_count}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.contactName} numberOfLines={1}>
            {item.contact_name || 'Client'}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(item.last_message_time || item.created_at)}
          </Text>
        </View>
        
        <Text style={styles.lastMessage} numberOfLines={2}>
          {item.last_message || 'Nouvelle conversation'}
        </Text>
      </View>
    </TouchableOpacity>
  )

  if (loading && conversations.length === 0) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.blumine[600]} />
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color={COLORS.gray[300]} />
            <Text style={styles.emptyTitle}>Aucun message</Text>
            <Text style={styles.emptyText}>
              Commencez une conversation avec un client
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.black },
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 8 },
  conversationItem: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 8, paddingHorizontal: 12 },
  avatarContainer: { marginRight: 12, position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.blumine[50], alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '600', color: COLORS.blumine[600] },
  unreadBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF3B30', borderRadius: 12, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  unreadText: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  contentContainer: { flex: 1, justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  contactName: { fontSize: 16, fontWeight: '600', color: COLORS.black, flex: 1 },
  timeText: { fontSize: 12, color: COLORS.gray[400], marginLeft: 8 },
  lastMessage: { fontSize: 14, color: COLORS.gray[500], lineHeight: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: COLORS.gray[400], marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.gray[400], textAlign: 'center', marginTop: 8, paddingHorizontal: 40 }
})