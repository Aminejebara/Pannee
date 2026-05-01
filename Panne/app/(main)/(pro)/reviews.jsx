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
  FlatList,
  Platform
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { usePro } from '../../../hooks/usePro'
import { COLORS } from '../../../constants/colors'

export default function ProReviews() {
  const { professional } = useAuth()
  const { getReviews, loading } = usePro()
  
  const [reviews, setReviews] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  const loadReviews = async (page = 1) => {
    const result = await getReviews(professional?.id, page, 10)
    if (result.success) {
      if (page === 1) {
        setReviews(result.reviews)
      } else {
        setReviews(prev => [...prev, ...result.reviews])
      }
      setPagination(result.pagination)
      
      if (result.reviews.length > 0 && page === 1) {
        const total = result.pagination.total
        const sum = result.reviews.reduce((acc, r) => acc + r.rating, 0)
        const avg = total > 0 ? (sum / total).toFixed(1) : 0
        
        const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        result.reviews.forEach(r => {
          dist[r.rating]++
        })
        
        setStats({
          average: avg,
          total: total,
          distribution: dist
        })
      }
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadReviews()
    }, [professional?.id])
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await loadReviews(1)
    setRefreshing(false)
  }

  const loadMore = () => {
    if (!loading && pagination.page < pagination.pages) {
      loadReviews(pagination.page + 1)
    }
  }

  const renderStars = (rating, size = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <Ionicons
            key={`star-${star}`}
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? COLORS.dixie[500] : COLORS.gray[300]}
          />
        ))}
      </View>
    )
  }

  const renderReviewItem = ({ item }) => (
    <View key={`review-${item.id}`} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.userAvatar}>
          {item.user_avatar ? (
            <Image source={{ uri: item.user_avatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.username?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.reviewInfo}>
          <Text style={styles.userName}>{item.username || 'Client'}</Text>
          <View style={styles.ratingRow}>
            {renderStars(item.rating, 14)}
            <Text style={styles.reviewDate}>
              {new Date(item.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
          </View>
        </View>
      </View>
      {item.comment && (
        <Text style={styles.reviewComment}>{item.comment}</Text>
      )}
    </View>
  )

  // ✅ CORRIGÉ : Ajout des keys
  const renderRatingBar = (stars, count) => {
    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
    return (
      <View key={`rating-bar-${stars}`} style={styles.ratingBarItem}>
        <Text style={styles.ratingBarLabel}>{stars}★</Text>
        <View style={styles.ratingBarTrack}>
          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    )
  }

  if (loading && reviews.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.blumine[600]} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Avis clients</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blumine[600]} />
        }
      >
        {/* Score global */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreValue}>{stats.average}</Text>
            <Text style={styles.scoreMax}>/5</Text>
          </View>
          <View style={styles.scoreRight}>
            {renderStars(Math.round(stats.average), 20)}
            <Text style={styles.scoreTotal}>
              Basé sur {stats.total} avis
            </Text>
          </View>
        </View>

        {/* Distribution des notes */}
        <View style={styles.distributionCard}>
          <Text style={styles.sectionTitle}>Répartition des notes</Text>
          {[5, 4, 3, 2, 1].map(stars => renderRatingBar(stars, stats.distribution[stars]))}
        </View>

        {/* Liste des avis */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>
            Tous les avis ({stats.total})
          </Text>
          
          {reviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyTitle}>Aucun avis pour le moment</Text>
              <Text style={styles.emptyText}>
                Les avis de vos clients apparaîtront ici
              </Text>
            </View>
          ) : (
            <FlatList
              data={reviews}
              renderItem={renderReviewItem}
              keyExtractor={(item) => `review-${item.id}`}
              scrollEnabled={false}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                loading && reviews.length > 0 ? (
                  <ActivityIndicator color={COLORS.blumine[600]} style={styles.loader} />
                ) : null
              }
            />
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
  },
  content: {
    paddingBottom: 40,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 24,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    ...Platform.select({
      ios: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  scoreLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: COLORS.gray[200],
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.black,
  },
  scoreMax: {
    fontSize: 18,
    color: COLORS.gray[400],
    marginLeft: 4,
  },
  scoreRight: {
    flex: 1,
    marginLeft: 20,
  },
  scoreTotal: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 8,
  },
  distributionCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 16,
  },
  ratingBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingBarLabel: {
    width: 35,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.gray[100],
    borderRadius: 3,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: COLORS.dixie[500],
    borderRadius: 3,
  },
  ratingBarCount: {
    width: 35,
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'right',
  },
  reviewsSection: {
    paddingHorizontal: 20,
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.blumine[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.blumine[600],
  },
  reviewInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: COLORS.gray[400],
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[500],
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray[400],
    marginTop: 8,
    textAlign: 'center',
  },
  loader: {
    paddingVertical: 20,
  },
})