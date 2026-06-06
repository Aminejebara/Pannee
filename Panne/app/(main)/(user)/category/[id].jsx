import React, { useState, useEffect, useRef } from 'react'
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, 
  TouchableOpacity, Image, RefreshControl, Dimensions, Modal,
  Platform, BackHandler
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useUser } from '../../../../hooks/useUser'
import { COLORS } from '../../../../constants/colors'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import MapView, { Marker, Callout, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps'

const { width, height } = Dimensions.get('window')

export default function CategoryProsScreen() {
  const { id, name, returnTo, previousScreen } = useLocalSearchParams()
  const { getNearbyProfessionals } = useUser()
  
  const [professionals, setProfessionals] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [location, setLocation] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedProLocation, setSelectedProLocation] = useState(null)
  const [error, setError] = useState(null)
  
  const mapRef = useRef(null)
  const modalMapRef = useRef(null)

  // Gestion du bouton retour Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress)
    return () => backHandler.remove()
  }, [])

  const handleBackPress = () => {
    handleGoBack()
    return true // Empêche le comportement par défaut
  }

  const handleGoBack = () => {
    // Vérifie s'il y a un écran spécifique de retour
    if (returnTo === 'home') {
      router.replace('/(main)/(user)/home')
    } else if (returnTo === 'search') {
      router.replace('/(main)/(user)/search')
    } else if (returnTo === 'favorites') {
      router.replace('/(main)/(user)/favorites')
    } else if (previousScreen === 'professionalDetail') {
      // Retour à l'écran précédent avec les paramètres
      router.back()
    } else {
      // Retour par défaut à la page précédente
      router.back()
    }
  }

  useEffect(() => {
    getLocation()
  }, [])

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
        setLocation({ lat: 36.8065, lng: 10.1815 })
      }
    } catch (error) {
      setLocation({ lat: 36.8065, lng: 10.1815 })
    }
  }

  const fetchProfessionals = async (pageNum = 1, refresh = false) => {
    if (!location) {
      setLoading(false)
      return
    }

    const categoryId = parseInt(id)
    if (isNaN(categoryId)) {
      setLoading(false)
      return
    }

    if (refresh) {
      setRefreshing(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const result = await getNearbyProfessionals(
        location.lat,
        location.lng,
        50,
        pageNum,
        20,
        categoryId
      )

      if (result && result.success) {
        if (refresh) {
          setProfessionals(result.data || [])
        } else {
          setProfessionals(prev => [...prev, ...(result.data || [])])
        }
        setHasMore(
          result.pagination &&
          result.pagination.page < result.pagination.pages
        )
        setPage(pageNum)
        setError(null)
      } else {
        setError("Aucun professionnel trouvé")
      }
    } catch (error) {
      console.error('fetchProfessionals error:', error)
      setError("Erreur de chargement")
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

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?'
  }

  const isValidCoord = (lat, lng) => {
    if (!lat || !lng) return false
    const la = parseFloat(lat)
    const ln = parseFloat(lng)
    return !isNaN(la) && !isNaN(ln) && la !== 0 && ln !== 0
  }

  const validProfessionals = professionals.filter(pro => isValidCoord(pro.lat, pro.lng))

  // Composant Callout qui fonctionne sur les deux plateformes
  const ProfessionalCallout = ({ pro }) => {
    const businessName = pro.business_name || ''
    const distanceKm = pro.distance_km ? `${pro.distance_km} km` : ''
    const ratingAvg = Number(pro.rating_avg) || 0
    
    return (
      <Callout
        tooltip={Platform.OS === 'ios'}
        onPress={() => router.push({
          pathname: `/(main)/(user)/professionals/${pro.id}`,
          params: { 
            returnTo: 'category',
            categoryId: id,
            categoryName: name,
            previousScreen: 'categoryPros'
          }
        })}
      >
        <View style={styles.calloutContainer}>
          <View style={styles.calloutHeader}>
            {pro.avatar_url ? (
              <Image source={{ uri: pro.avatar_url }} style={styles.calloutAvatar} />
            ) : (
              <View style={styles.calloutAvatarPlaceholder}>
                <Text style={styles.calloutAvatarText}>{getInitials(businessName)}</Text>
              </View>
            )}
            <View style={styles.calloutInfo}>
              <Text style={styles.calloutName} numberOfLines={1}>{businessName}</Text>
              {distanceKm ? <Text style={styles.calloutDistance}>{distanceKm}</Text> : null}
              {ratingAvg > 0 ? (
                <View style={styles.calloutRating}>
                  <Ionicons name="star" size={12} color={COLORS.warning[500]} />
                  <Text style={styles.calloutRatingText}>{ratingAvg.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.calloutButton}>
            <Text style={styles.calloutButtonText}>Voir le profil</Text>
          </View>
        </View>
      </Callout>
    )
  }

  // Marqueur pour iOS avec custom view
  const MarkerWithCustomView = ({ pro }) => (
    <Marker
      coordinate={{
        latitude: parseFloat(pro.lat),
        longitude: parseFloat(pro.lng),
      }}
    >
      <View style={styles.markerContainer}>
        {pro.avatar_url ? (
          <Image source={{ uri: pro.avatar_url }} style={styles.markerImage} />
        ) : (
          <View style={styles.markerPlaceholder}>
            <Text style={styles.markerText}>{getInitials(pro.business_name)}</Text>
          </View>
        )}
      </View>
      <ProfessionalCallout pro={pro} />
    </Marker>
  )

  // Marqueur pour Android avec pinColor et navigation améliorée
  const MarkerForAndroid = ({ pro }) => (
    <Marker
      coordinate={{
        latitude: parseFloat(pro.lat),
        longitude: parseFloat(pro.lng),
      }}
      pinColor={COLORS.blumine[600]}
      title={pro.business_name}
      description={pro.distance_km ? `${pro.distance_km} km` : undefined}
      onPress={() => router.push({
        pathname: `/(main)/(user)/professionals/${pro.id}`,
        params: { 
          returnTo: 'category',
          categoryId: id,
          categoryName: name,
          previousScreen: 'categoryPros'
        }
      })}
    />
  )

  const renderMap = () => {
    if (!location) return null
    
    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation={true}
          showsMyLocationButton={Platform.OS === 'android'}
        >
          {/* Marker position utilisateur */}
          <Marker
            coordinate={{ latitude: location.lat, longitude: location.lng }}
            title="Ma position"
            pinColor={COLORS.blumine[600]}
          />

          {/* Markers pros selon la plateforme */}
          {Platform.OS === 'ios' 
            ? validProfessionals.map((pro) => <MarkerWithCustomView key={`marker-${pro.id}`} pro={pro} />)
            : validProfessionals.map((pro) => <MarkerForAndroid key={`marker-${pro.id}`} pro={pro} />)
          }
        </MapView>

        {validProfessionals.length > 0 && (
          <View style={styles.markerCountBadge}>
            <Text style={styles.markerCountText}>
              {validProfessionals.length} professionnel{validProfessionals.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    )
  }

  const renderProfessional = ({ item }) => {
    const safeItem = item || {}
    const businessName = safeItem.business_name ? String(safeItem.business_name) : ''
    const description = safeItem.description ? String(safeItem.description) : 'Aucune description'
    const ratingAvg = Number(safeItem.rating_avg) || 0
    const ratingCount = safeItem.rating_count ? Number(safeItem.rating_count) : 0
    const distance = safeItem.distance_km ? Number(safeItem.distance_km) : null
    const avatarUrl = safeItem.avatar_url || null
    const hasLocation = isValidCoord(safeItem.lat, safeItem.lng)

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push({
          pathname: `/(main)/(user)/professionals/${safeItem.id}`,
          params: { 
            returnTo: 'category',
            categoryId: id,
            categoryName: name,
            previousScreen: 'categoryPros'
          }
        })}
      >
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials(businessName)}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.info}>
          <Text style={styles.name}>{businessName}</Text>
          <Text style={styles.description} numberOfLines={2}>{description}</Text>
          <View style={styles.meta}>
            {ratingAvg > 0 && (
              <View style={styles.rating}>
                <Ionicons name="star" size={14} color={COLORS.warning[500]} />
                <Text style={styles.ratingText}>{ratingAvg.toFixed(1)}</Text>
                <Text style={styles.reviewCount}>{`(${ratingCount})`}</Text>
              </View>
            )}
            {distance !== null && distance > 0 && (
              <View style={styles.distance}>
                <Ionicons name="location-outline" size={14} color={COLORS.gray[500]} />
                <Text style={styles.distanceText}>{`${distance} km`}</Text>
              </View>
            )}
          </View>
        </View>
        
        {hasLocation && (
          <TouchableOpacity 
            style={styles.mapButton}
            onPress={() => {
              setSelectedProLocation({
                lat: parseFloat(safeItem.lat),
                lng: parseFloat(safeItem.lng),
                name: businessName,
                avatar: avatarUrl
              })
              setModalVisible(true)
            }}
          >
            <Ionicons name="map-outline" size={20} color={COLORS.blumine[600]} />
          </TouchableOpacity>
        )}
        
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
      </TouchableOpacity>
    )
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.blumine[600]} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name ? String(decodeURIComponent(name)) : "Professionnels"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {renderMap()}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={professionals}
        renderItem={renderProfessional}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && !refreshing && !error && (
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

      {/* Modal position pro */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.black} />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedProLocation?.name || 'Position'}
            </Text>
            <View style={{ width: 24 }} />
          </View>
          
          {selectedProLocation && isValidCoord(selectedProLocation.lat, selectedProLocation.lng) && (
            <MapView
              ref={modalMapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              style={styles.modalMap}
              initialRegion={{
                latitude: selectedProLocation.lat,
                longitude: selectedProLocation.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{
                  latitude: selectedProLocation.lat,
                  longitude: selectedProLocation.lng,
                }}
                title={selectedProLocation.name}
                pinColor={COLORS.blumine[600]}
              />
            </MapView>
          )}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
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
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black, flex: 1, textAlign: 'center' },
  mapContainer: { 
    height: 280, 
    width: '100%', 
    marginBottom: 12,
    position: 'relative',
  },
  map: { flex: 1 },
  markerContainer: { alignItems: 'center', justifyContent: 'center' },
  markerImage: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: COLORS.white },
  markerPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.blumine[600],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  markerText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  calloutContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  calloutAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.blumine[100],
  },
  calloutAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.blumine[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  calloutAvatarText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  calloutInfo: { flex: 1, marginLeft: 10 },
  calloutName: { fontSize: 14, fontWeight: '700', color: COLORS.black, marginBottom: 2 },
  calloutDistance: { fontSize: 12, color: COLORS.gray[500], marginBottom: 2 },
  calloutRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  calloutRatingText: { fontSize: 12, fontWeight: '600', color: COLORS.black },
  calloutButton: {
    backgroundColor: COLORS.blumine[600],
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  calloutButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },
  markerCountBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: COLORS.blumine[600],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 5,
  },
  markerCountText: { color: COLORS.white, fontSize: 12, fontWeight: 'bold' },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  errorText: { color: '#c62828', textAlign: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
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
  avatarContainer: { marginRight: 12 },
  avatar: { width: 55, height: 55, borderRadius: 28 },
  avatarPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: COLORS.blumine[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 24, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: COLORS.black, marginBottom: 4 },
  description: { fontSize: 13, color: COLORS.gray[600], marginBottom: 6, lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, fontWeight: '600', color: COLORS.black },
  reviewCount: { fontSize: 11, color: COLORS.gray[500] },
  distance: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distanceText: { fontSize: 12, color: COLORS.gray[600] },
  mapButton: { padding: 8, marginRight: 4 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyText: { marginTop: 16, fontSize: 16, color: COLORS.gray[500], textAlign: 'center' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: {
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
  modalTitle: { fontSize: 16, fontWeight: '600', color: COLORS.black, flex: 1, textAlign: 'center' },
  modalMap: { flex: 1 },
})