import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Switch,
  Alert
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAuth } from '../../../hooks/useAuth';
import { usePro } from '../../../hooks/usePro';
import { 
  startBackgroundLocation, 
  stopBackgroundLocation, 
  isBackgroundLocationActive 
} from '../../../services/backgroundLocation';

const THEME = {
  yellow: '#FFD200',
  yellowLight: '#FFFDEB',
  black: '#1A1A1A',
  grayText: '#717171',
  border: '#EBEBEB',
  bgLight: '#F7F7F7',
  success: '#34C759',
  danger: '#FF3B30'
};

export default function ProDashboard() {
  const { user, professional } = useAuth();
  const { getStats, getReviews, loading, updateProLocation, getProfile } = usePro();
  
  const [stats, setStats] = useState(null);
  const [reviewStats, setReviewStats] = useState({
    average: 0,
    total: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isAutoUpdateEnabled, setIsAutoUpdateEnabled] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isLoadingBackground, setIsLoadingBackground] = useState(false);

  const loadData = async () => {
    const statsRes = await getStats();
    if (statsRes.success) setStats(statsRes.stats);
    
    if (professional?.id) {
      const reviewsRes = await getReviews(professional.id, 1, 10);
      if (reviewsRes.success) {
        const total = reviewsRes.pagination?.total || 0;
        const sum = reviewsRes.reviews?.reduce((acc, r) => acc + r.rating, 0) || 0;
        const avg = total > 0 ? (sum / total).toFixed(1) : 0;
        setReviewStats({
          average: avg,
          total: total
        });
      }

      // ✅ RECUPERER LA POSITION DEPUIS LA BASE DE DONNEES
      await loadLocationFromDatabase();
    }
    
    if (isFirstLoad) setIsFirstLoad(false);
  };

  // ✅ NOUVELLE FONCTION : Recuperer la position depuis la base de donnees
  const loadLocationFromDatabase = async () => {
    try {
      if (!professional?.id) return;
      
      const result = await getProfile(professional.id);
      if (result.success && result.profile) {
        const profile = result.profile;
        
        // Verifier si la position existe en base
        if (profile.lat && profile.lng) {
          const address = profile.address || '';
          const city = profile.city || '';
          const country = profile.country || '';
          
          setCurrentLocation({
            lat: parseFloat(profile.lat),
            lng: parseFloat(profile.lng),
            address: address,
            city: city,
            country: country,
            formatted: `${address}${address && city ? ', ' : ''}${city}${city && country ? ', ' : ''}${country}`
          });
          
          // Afficher la date de la derniere mise a jour (si disponible)
          // On utilise la date actuelle car on n'a pas de champ updated_at pour la location
          // Mais on peut utiliser l'updated_at du profile
          if (profile.updated_at) {
            const date = new Date(profile.updated_at);
            setLastUpdateTime(date.toLocaleString());
          } else {
            setLastUpdateTime('Position enregistree');
          }
        } else {
          // ✅ Position non disponible en base
          setCurrentLocation(null);
          setLastUpdateTime(null);
        }
      }
    } catch (error) {
      console.error('Error loading location from database:', error);
      setCurrentLocation(null);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, [professional?.id]));

  useEffect(() => {
    const checkBackgroundStatus = async () => {
      if (professional?.id) {
        try {
          const active = await isBackgroundLocationActive();
          setIsAutoUpdateEnabled(active);
          // ✅ NE PAS APPELER getCurrentLocation ici
          // On a deja charge la position depuis la base dans loadData
        } catch (error) {
          console.error('Error checking background status:', error);
        }
      }
    };
    checkBackgroundStatus();
  }, [professional?.id]);

  const getCurrentLocation = async (showToast = true) => {
    if (!professional?.id) {
      Alert.alert('Erreur', 'Votre profil professionnel n\'est pas disponible');
      return false;
    }

    setIsUpdatingLocation(true);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission refusee',
          'Activez la localisation dans les parametres de votre telephone pour utiliser cette fonctionnalite.'
        );
        setIsUpdatingLocation(false);
        return false;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const { latitude, longitude } = location.coords;

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      const addressData = reverseGeocode[0] || {};
      const address = addressData.street || '';
      const city = addressData.city || addressData.region || '';
      const country = addressData.country || '';

      const result = await updateProLocation(
        professional.id,
        latitude,
        longitude,
        address,
        city,
        country
      );

      if (result.success) {
        setCurrentLocation({
          lat: latitude,
          lng: longitude,
          address: address,
          city: city,
          country: country,
          formatted: `${address}${address && city ? ', ' : ''}${city}${city && country ? ', ' : ''}${country}`
        });
        setLastUpdateTime(new Date().toLocaleString());
        
        if (showToast) {
          Alert.alert('Position mise a jour', 'Votre position a ete enregistree avec succes.');
        }
        return true;
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de mettre a jour la position');
        return false;
      }
    } catch (error) {
      console.error('Erreur de localisation:', error);
      Alert.alert('Erreur', 'Impossible de recuperer votre position. Verifiez votre connexion GPS.');
      return false;
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const toggleAutoUpdate = async (value) => {
    if (!professional?.id) {
      Alert.alert('Erreur', 'Profil professionnel non disponible');
      return;
    }

    setIsLoadingBackground(true);
    
    try {
      if (value) {
        const locationSuccess = await getCurrentLocation(true);
        if (!locationSuccess) {
          Alert.alert(
            'Erreur',
            'Impossible de demarrer la mise a jour automatique. Verifiez votre GPS.'
          );
          setIsAutoUpdateEnabled(false);
          setIsLoadingBackground(false);
          return;
        }
        
        await startBackgroundLocation(professional.id);
        setIsAutoUpdateEnabled(true);
        
        Alert.alert(
          'Mise a jour automatique activee',
          'Votre position sera mise a jour automatiquement toutes les 10 minutes, meme lorsque l\'application est en arriere-plan.'
        );
      } else {
        await stopBackgroundLocation();
        setIsAutoUpdateEnabled(false);
        
        Alert.alert(
          'Mise a jour automatique desactivee',
          'Votre position ne sera plus mise a jour automatiquement.'
        );
      }
    } catch (error) {
      console.error('Error toggling auto update:', error);
      Alert.alert('Erreur', error.message || 'Impossible de modifier le parametre.');
      setIsAutoUpdateEnabled(!value);
    } finally {
      setIsLoadingBackground(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    // ✅ NE PAS appeler getCurrentLocation ici
    // On recharge depuis la base
    setRefreshing(false);
  };

  const unreadCount = stats?.unread_messages || 0;
  const ratingValue = reviewStats.average || '0.0';
  const ratingCount = reviewStats.total || 0;

  if (isFirstLoad && loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color={THEME.black} />
      </View>
    );
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
            tintColor={THEME.black} 
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>VOTRE ACTIVITE</Text>
          <Text style={styles.headerTitle}>Bonjour, {user?.username}</Text>
          <View style={styles.headerSeparator} />
        </View>

        <View style={styles.performanceRow}>
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>{stats?.total_conversations || 0}</Text>
            <Text style={styles.perfLabel}>Demandes</Text>
          </View>
          <View style={styles.perfDivider} />
          <View style={styles.perfItem}>
            <Text style={[styles.perfValue, unreadCount > 0 && styles.textHighlight]}>
              {unreadCount}
            </Text>
            <Text style={styles.perfLabel}>Messages</Text>
          </View>
          <View style={styles.perfDivider} />
          <View style={styles.perfItem}>
            <Text style={styles.perfValue}>{stats?.response_rate || 0}%</Text>
            <Text style={styles.perfLabel}>Reponse</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.ratingBanner} onPress={() => router.push('/(main)/(pro)/reviews')} activeOpacity={0.9}>
          <View style={styles.ratingBannerLeft}>
            <View style={styles.ratingCrownContainer}>
              <Ionicons name="trophy" size={20} color={THEME.black} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ratingBannerTitle}>Score et Evaluations</Text>
              <Text style={styles.ratingBannerSub}>Base sur vos retours clients</Text>
            </View>
          </View>
          <View style={styles.ratingBadge}>
             <Text style={styles.ratingBadgeText}>{ratingValue}</Text>
             <Ionicons name="star" size={14} color={THEME.black} style={{ marginLeft: 3 }} />
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="location" size={18} color={THEME.black} /> Localisation
            </Text>
            <TouchableOpacity 
              onPress={() => getCurrentLocation(true)} 
              activeOpacity={0.6}
              disabled={isUpdatingLocation}
            >
              <View style={styles.refreshButton}>
                {isUpdatingLocation ? (
                  <ActivityIndicator size="small" color={THEME.black} />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={16} color={THEME.black} />
                    <Text style={styles.refreshButtonText}>Mettre a jour</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.locationCard}>
            <View style={styles.locationInfo}>
              <Ionicons name="location-outline" size={22} color={THEME.black} style={styles.locationIcon} />
              <View style={styles.locationTextContainer}>
                {currentLocation?.formatted ? (
                  <>
                    <Text style={styles.locationAddress} numberOfLines={2}>
                      {currentLocation.formatted}
                    </Text>
                    {lastUpdateTime && (
                      <Text style={styles.locationTimestamp}>
                        Derniere mise a jour : {lastUpdateTime}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.locationPlaceholder}>
                    Position non disponible. Appuyez sur "Mettre a jour".
                  </Text>
                )}
              </View>
            </View>

            {currentLocation && (
              <View style={styles.coordinatesRow}>
                <Text style={styles.coordinatesText}>
                  Lat: {currentLocation.lat?.toFixed(6)} | Lng: {currentLocation.lng?.toFixed(6)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={THEME.grayText} />
            <Text style={styles.infoText}>
              Mettre a jour votre position permet aux clients de vous localiser plus facilement et d'obtenir des trajets precis vers votre lieu d'intervention.
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <Ionicons name="time-outline" size={20} color={THEME.black} />
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Mise a jour automatique</Text>
                <Text style={styles.toggleSubtitle}>
                  {isLoadingBackground 
                    ? 'Chargement...' 
                    : isAutoUpdateEnabled 
                      ? 'Active - mise a jour toutes les 10 minutes' 
                      : 'Desactivee'
                  }
                </Text>
              </View>
            </View>
            <Switch
              trackColor={{ false: '#E5E5E5', true: THEME.yellow }}
              thumbColor={isAutoUpdateEnabled ? THEME.black : '#FFFFFF'}
              ios_backgroundColor="#E5E5E5"
              onValueChange={toggleAutoUpdate}
              value={isAutoUpdateEnabled}
              disabled={isLoadingBackground}
            />
          </View>

          {isAutoUpdateEnabled && (
            <View style={styles.backgroundInfo}>
              <Ionicons name="checkmark-circle" size={16} color={THEME.success} />
              <Text style={styles.backgroundInfoText}>
                La mise a jour fonctionne meme en arriere-plan
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Messages recents</Text>
            <TouchableOpacity onPress={() => router.push('/(main)/(pro)/conversations')} activeOpacity={0.6}>
              <Text style={styles.viewAll}>Tout voir</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={26} color={THEME.grayText} />
            <Text style={styles.emptyText}>Aucun nouveau message</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outils et Gestion</Text>
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

      </ScrollView>
    </View>
  );
}

const ActionCard = ({ title, subtitle, icon, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconContainer}>
      <Ionicons name={icon} size={22} color={THEME.black} />
    </View>
    <View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  scrollContent: { 
    paddingBottom: 40 
  },
  loaderContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF' 
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 16,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.grayText,
    letterSpacing: 1,
    marginBottom: 4
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.black,
    letterSpacing: -0.5
  },
  headerSeparator: {
    width: 28,
    height: 3,
    backgroundColor: THEME.yellow,
    marginTop: 12,
    borderRadius: 2
  },
  performanceRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: THEME.border,
    marginBottom: 24
  },
  perfItem: { 
    flex: 1, 
    alignItems: 'center' 
  },
  perfValue: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: THEME.black 
  },
  textHighlight: { 
    color: THEME.black,
    fontWeight: '800'
  },
  perfLabel: { 
    fontSize: 12, 
    color: THEME.grayText, 
    marginTop: 3, 
    fontWeight: '400' 
  },
  perfDivider: { 
    width: StyleSheet.hairlineWidth, 
    height: '60%', 
    backgroundColor: THEME.border, 
    alignSelf: 'center' 
  },
  section: { 
    paddingHorizontal: 24, 
    marginBottom: 28 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 14 
  },
  sectionTitle: { 
    fontSize: 19, 
    fontWeight: '700', 
    color: THEME.black,
    letterSpacing: -0.2
  },
  viewAll: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: THEME.black,
    textDecorationLine: 'underline' 
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12,
    marginTop: 6 
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    justifyContent: 'space-between',
    minHeight: 120,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: { elevation: 1 }
    })
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: THEME.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: THEME.black 
  },
  cardSubtitle: { 
    fontSize: 12, 
    color: THEME.grayText, 
    marginTop: 2 
  },
  ratingBanner: {
    marginHorizontal: 24,
    padding: 16,
    backgroundColor: THEME.yellow,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 }
    })
  },
  ratingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  ratingCrownContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ratingBannerTitle: { 
    color: THEME.black, 
    fontSize: 15, 
    fontWeight: '700' 
  },
  ratingBannerSub: { 
    color: 'rgba(0,0,0,0.6)', 
    fontSize: 12, 
    marginTop: 1 
  },
  ratingBadge: { 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  ratingBadgeText: { 
    fontWeight: '700', 
    fontSize: 14, 
    color: THEME.black 
  },
  emptyState: { 
    paddingVertical: 24, 
    backgroundColor: THEME.bgLight, 
    borderRadius: 16, 
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.border,
    borderStyle: 'dashed'
  },
  emptyText: { 
    color: THEME.grayText, 
    fontSize: 13, 
    fontWeight: '400' 
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: THEME.bgLight,
    borderWidth: 1,
    borderColor: THEME.border
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.black
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    marginBottom: 12
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  locationIcon: {
    marginTop: 2
  },
  locationTextContainer: {
    flex: 1
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.black,
    lineHeight: 20
  },
  locationTimestamp: {
    fontSize: 11,
    color: THEME.grayText,
    marginTop: 2
  },
  locationPlaceholder: {
    fontSize: 14,
    color: THEME.grayText,
    fontStyle: 'italic'
  },
  coordinatesRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.border
  },
  coordinatesText: {
    fontSize: 11,
    color: THEME.grayText,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: THEME.yellowLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F5E6A3'
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: THEME.grayText,
    lineHeight: 18
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  toggleTextContainer: {
    flex: 1
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.black
  },
  toggleSubtitle: {
    fontSize: 12,
    color: THEME.grayText
  },
  backgroundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F0FFF4',
    borderRadius: 8
  },
  backgroundInfoText: {
    fontSize: 12,
    color: THEME.grayText
  }
});