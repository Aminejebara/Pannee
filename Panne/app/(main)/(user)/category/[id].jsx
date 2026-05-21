import React, { useState, useEffect } from 'react'
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, 
  TouchableOpacity, Image, RefreshControl 
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useUser } from '../../../../hooks/useUser'
import { COLORS } from '../../../../constants/colors'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'

export default function CategoryProsScreen() {
  // 📌 Récupère l'id de la catégorie et son nom depuis l'URL
  const { id, name } = useLocalSearchParams()
  const { getNearbyProfessionals } = useUser()
  
  const [professionals, setProfessionals] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [location, setLocation] = useState(null)

  // 1. Récupère la position GPS
  useEffect(() => {
    getLocation()
  }, [])

  // 2. Charge les pros quand position ET catégorie sont dispo
  useEffect(() => {
    if (location && id) {
      fetchProfessionals(1, true)
    }
  }, [location, id])

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({})
        setLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude
        })
      } else {
        // Position par défaut (Tunis)
        setLocation({ lat: 36.8065, lng: 10.1815 })
      }
    } catch (error) {
      setLocation({ lat: 36.8065, lng: 10.1815 })
    }
  }

  const fetchProfessionals = async (pageNum = 1, refresh = false) => {
    if (!location) return
    
    if (refresh) {
      setRefreshing(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const result = await getNearbyProfessionals(
        location.lat,     // latitude
        location.lng,     // longitude
        50,               // radius (km)
        pageNum,          // page
        20,               // limit
        parseInt(id)      // category_id ✅ FILTRE PAR CATÉGORIE
      )

      if (result.success) {
        if (refresh) {
          setProfessionals(result.data)
        } else {
          setProfessionals(prev => [...prev, ...result.data])
        }
        setHasMore(result.pagination.page < result.pagination.pages)
        setPage(pageNum)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setRefreshing(false)
      setLoadingMore(false)
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loadingMore && hasMore && !refreshing) {
      fetchProfessionals(page + 1)
    }
  }

  const onRefresh = () => {
    fetchProfessionals(1, true)
  }

  const renderProfessional = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => router.push(`/(main)/(user)/professionals/${item.id}`)}
    >
      <View style={styles.avatarContainer}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="business-outline" size={28} color={COLORS.blumine[600]} />
          </View>
        )}
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name}>{item.business_name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description || "Aucune description"}
        </Text>
        
        <View style={styles.meta}>
          {item.rating_avg > 0 && (
            <View style={styles.rating}>
              <Ionicons name="star" size={14} color={COLORS.warning[500]} />
              <Text style={styles.ratingText}>{Number(item.rating_avg).toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({item.rating_count || 0})</Text>
            </View>
          )}
          
          {item.distance_km && (
            <View style={styles.distance}>
              <Ionicons name="location-outline" size={14} color={COLORS.gray[500]} />
              <Text style={styles.distanceText}>{item.distance_km} km</Text>
            </View>
          )}
        </View>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.blumine[600]} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header avec retour */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name ? decodeURIComponent(name) : "Professionnels"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={professionals}
        renderItem={renderProfessional}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && !refreshing && (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>
                Aucun professionnel trouvé dans cette catégorie
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore && (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={COLORS.blumine[600]} />
            </View>
          )
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  centerContainer: {
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
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: COLORS.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: COLORS.gray[600],
    marginBottom: 6,
    lineHeight: 18,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.black,
  },
  reviewCount: {
    fontSize: 11,
    color: COLORS.gray[500],
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: COLORS.gray[600],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
})