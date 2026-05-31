import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Platform
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { usePro } from '../../../hooks/usePro'
import { COLORS } from '../../../constants/colors'

export default function ProDashboard() {
  const { user, professional } = useAuth()
  const { getStats, getReviews, loading } = usePro()
  
  const [stats, setStats] = useState(null)
  const [reviewStats, setReviewStats] = useState({
    average: 0,
    total: 0
  })
  const [refreshing, setRefreshing] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  const loadData = async () => {
    // Charger les stats
    const statsRes = await getStats()
    if (statsRes.success) setStats(statsRes.stats)
    
    // Charger les avis pour avoir la vraie note
    if (professional?.id) {
      const reviewsRes = await getReviews(professional.id, 1, 10)
      if (reviewsRes.success) {
        const total = reviewsRes.pagination?.total || 0
        const sum = reviewsRes.reviews?.reduce((acc, r) => acc + r.rating, 0) || 0
        const avg = total > 0 ? (sum / total).toFixed(1) : 0
        setReviewStats({
          average: avg,
          total: total
        })
      }
    }
    
    if (isFirstLoad) setIsFirstLoad(false)
  }

  useFocusEffect(useCallback(() => { loadData() }, [professional?.id]))

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const unreadCount = stats?.unread_messages || 0
  const ratingValue = reviewStats.average || '0.0'
  const ratingCount = reviewStats.total || 0

  // Afficher le loader uniquement au premier chargement
  if (isFirstLoad && loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.blumine[600]} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={COLORS.blumine[600]} 
          />
        }
      >
        {/* HEADER ÉPURÉ */}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>VOTRE ACTIVITÉ</Text>
          <Text style={styles.headerTitle}>Bonjour, {user?.username}</Text>
          <View style={styles.headerSeparator} />
        </View>

        {/* PERFORMANCE ROW */}
        <View style={styles.performanceRow}>
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>{stats?.total_conversations || 0}</Text>
            <Text style={styles.perfLabel}>Demandes</Text>
          </View>
          <View style={styles.perfDivider} />
          <View style={styles.perfItem}>
            <Text style={[styles.perfValue, unreadCount > 0 && { color: COLORS.blumine[600] }]}>
              {unreadCount}
            </Text>
            <Text style={styles.perfLabel}>Messages</Text>
          </View>
          <View style={styles.perfDivider} />
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>{stats?.response_rate || 0}%</Text>
            <Text style={styles.perfLabel}>Réponse</Text>
          </View>
        </View>

        {/* SECTION : MESSAGES RÉCENTS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Messages récents</Text>
            <TouchableOpacity onPress={() => router.push('/(main)/(pro)/conversations')}>
              <Text style={styles.viewAll}>Tout voir</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={32} color={COLORS.gray[300]} />
            <Text style={styles.emptyText}>Aucun nouveau message</Text>
          </View>
        </View>

        {/* SECTION : OUTILS GRID */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outils & Gestion</Text>
          <View style={styles.grid}>
            <ActionCard 
              title="Conversations" 
              subtitle={`${unreadCount} non lus`}
              icon="chatbubbles-outline"
              onPress={() => router.push('/(main)/(pro)/conversations')}
            />
            <ActionCard 
              title="Mon Profil" 
              subtitle="Modifier"
              icon="person-outline"
              onPress={() => router.push('/(main)/(pro)/profile')}
            />
          
            <ActionCard 
              title="Mes Avis" 
              subtitle={`${ratingValue} (${ratingCount} avis)`}
              icon="star-outline"
              onPress={() => router.push('/(main)/(pro)/reviews')}
            />
          </View>
        </View>

        {/* BANNIÈRE DE SCORE */}
        <TouchableOpacity style={styles.ratingBanner} onPress={() => router.push('/(main)/(pro)/reviews')}>
          <View>
            <Text style={styles.ratingBannerTitle}>Score de fiabilité</Text>
            <Text style={styles.ratingBannerSub}>Basé sur vos derniers échanges</Text>
          </View>
          <View style={styles.ratingBadge}>
             <Text style={styles.ratingBadgeText}>{ratingValue}</Text>
             <Ionicons name="star" size={14} color={COLORS.blumine[600]} style={{ marginLeft: 4 }} />
          </View>
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}

const ActionCard = ({ title, subtitle, icon, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.iconContainer}>
      <Ionicons name={icon} size={24} color={COLORS.blumine[700]} />
    </View>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardSubtitle}>{subtitle}</Text>
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingBottom: 40 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  
  header: {
    paddingHorizontal: 24,
    paddingTop: 70,
    paddingBottom: 20,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.gray[400],
    letterSpacing: 1.2,
    marginBottom: 6
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: -0.5
  },
  headerSeparator: {
    width: 35,
    height: 4,
    backgroundColor: COLORS.blumine[600],
    marginTop: 15,
    borderRadius: 2
  },

  performanceRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    marginBottom: 30
  },
  perfItem: { flex: 1, alignItems: 'center' },
  perfValue: { fontSize: 22, fontWeight: '700', color: COLORS.black },
  perfLabel: { fontSize: 12, color: COLORS.gray[500], marginTop: 4, fontWeight: '500' },
  perfDivider: { width: 1, height: '70%', backgroundColor: COLORS.gray[100], alignSelf: 'center' },

  section: { paddingHorizontal: 24, marginBottom: 30 },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 16 
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.black },
  viewAll: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: COLORS.blumine[700],
    textDecorationLine: 'underline' 
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  card: {
    width: '48%',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: { elevation: 2 }
    })
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.black },
  cardSubtitle: { fontSize: 11, color: COLORS.gray[400], marginTop: 2 },

  ratingBanner: {
    marginHorizontal: 24,
    padding: 22,
    backgroundColor: COLORS.blumine[900],
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  ratingBannerTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  ratingBannerSub: { color: COLORS.gray[400], fontSize: 12, marginTop: 2 },
  ratingBadge: { 
    backgroundColor: COLORS.white, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  ratingBadgeText: { fontWeight: '800', fontSize: 16, color: COLORS.black },

  emptyState: { 
    padding: 30, 
    backgroundColor: COLORS.gray[50], 
    borderRadius: 20, 
    alignItems: 'center',
    gap: 8
  },
  emptyText: { color: COLORS.gray[400], fontSize: 14, fontWeight: '500' }
})