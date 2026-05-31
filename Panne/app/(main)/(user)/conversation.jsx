// FICHIER: app/(main)/(user)/conversation.jsx
// DESCRIPTION: Liste des conversations pour l'utilisateur (redirige vers le détail)

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
import { useUser } from '../../../hooks/useUser'
import { COLORS } from '../../../constants/colors'

export default function UserConversations() {
  const { getConversations, loading } = useUser()
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
      pathname: '/conversation/[id]',
      params: {
        id: item.id,
        contactName: item.contact_name,
        contactAvatar: item.contact_avatar,
        contactPhone: item.contact_phone,  
        professionalId: item.professional_id
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

  const renderItem = ({ item }) => {
    const hasUnread = item.unread_count > 0

    return (
      <TouchableOpacity 
        style={styles.conversationItem} 
        onPress={() => navigateToConversation(item)}
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
              {item.contact_name || 'Professionnel'}
            </Text>
            <Text style={[styles.timeText, hasUnread && styles.unreadTimeBold]}>
              {formatTime(item.last_message_time || item.created_at)}
            </Text>
          </View>
          
          <Text style={[styles.lastMessage, hasUnread && styles.unreadMessageBold]} numberOfLines={2}>
            {item.last_message || 'Nouvelle conversation'}
          </Text>
        </View>
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
              Lorsque vous contacterez un professionnel, vos discussions s'afficheront ici.
            </Text>
          </View>
        }
      />
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
    backgroundColor: '#FFFFFF'
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
  width: 60, 
  height: 60, 
  borderRadius: 30, 
  backgroundColor: COLORS.blumine[500], // Fond bleu foncé
  alignItems: 'center', 
  justifyContent: 'center' 
},
avatarText: { 
  fontSize: 24, 
  fontWeight: '700', 
  color: COLORS.white, // Texte BLANC - bien visible !
  textTransform: 'uppercase'
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
  lastMessage: { 
    fontSize: 14, 
    color: COLORS.gray[500], 
    lineHeight: 18,
    fontWeight: '400'
  },
  unreadMessageBold: {
    fontWeight: '600',
    color: COLORS.black
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
  }
})