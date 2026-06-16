import React, { useRef } from 'react'
import { View, Text, StyleSheet, Platform, Animated, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../../../constants/colors'

export default function HomeHeader({ userName, address, onRefreshLocation }) {
  const animatedValue = useRef(new Animated.Value(0)).current

  const handlePressIn = () => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start()
  }

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.98],
  })

  return (
    <View style={styles.container}>
      {/* Ligne principale : Message d'accueil */}
      <View style={styles.headerTopRow}>
        <View>
          <Text style={styles.welcomeText}>Panne</Text>
          <Text style={styles.userName}>
            Bonjour, {userName || 'Utilisateur'}<Text style={styles.dot}>.</Text>
          </Text>
        </View>
        
        {/* Badge Avatar Minimaliste ou initiales style Airbnb */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {userName ? userName.substring(0, 2).toUpperCase() : 'U'}
          </Text>
        </View>
      </View>

      {/* Barre d'adresse style Barre de Recherche Airbnb Premium */}
      {address?.formattedAddress && (
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onRefreshLocation}
          style={styles.addressPressable}
        >
          <Animated.View style={[styles.addressCard, { transform: [{ scale }] }]}>
            <View style={styles.searchIconCircle}>
              <Ionicons name="location" size={16} color={COLORS.blumine[950]} />
            </View>
            
            <View style={styles.addressInfo}>
              <Text style={styles.locationTitle}>Où vous situez-vous ?</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {address.formattedAddress}
              </Text>
            </View>

            <View style={styles.refreshBadge}>
              <Ionicons name="refresh" size={14} color={COLORS.gray[500]} />
            </View>
          </Animated.View>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[50], // Séparation invisible et propre
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: { 
    fontSize: 12, 
    color: COLORS.gray[400], 
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  userName: { 
    fontSize: 26, 
    fontWeight: '800', 
    color: COLORS.blumine[950],
    letterSpacing: -0.7,
  },
  dot: {
    color: COLORS.dixie[500],
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.blumine[950],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  /* --- BARRE D'ADRESSE AIRBNB LUXE --- */
  addressPressable: {
    width: '100%',
  },
  addressCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.white,
    paddingVertical: 12, 
    paddingHorizontal: 14,
    borderRadius: 100, // Forme capsule parfaite
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    
    // Ombre de carte flottante type Airbnb
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  searchIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.gray[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.blumine[950],
    marginBottom: 1,
  },
  addressText: { 
    fontSize: 12, 
    color: COLORS.gray[500], 
    fontWeight: '500',
  },
  refreshBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    backgroundColor: COLORS.white,
  },
})