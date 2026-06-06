import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../../../constants/colors'

export default function HomeHeader({ userName, address, onRefreshLocation }) {
  return (
    <View style={styles.container}>
      {/* Ligne principale : Infos Utilisateur + Bouton Action */}
      <View style={styles.headerTopRow}>
        <View>
          <Text style={styles.welcomeText}>Bonjour nigger 👋</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        
        <TouchableOpacity style={styles.locationCircleButton} onPress={onRefreshLocation}>
          <Ionicons name="location-outline" size={20} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Block Adresse Style Airbnb Capsule */}
      {address?.formattedAddress && (
        <View style={styles.addressCapsule}>
          <Ionicons name="navigate-outline" size={14} color="#666666" />
          <Text style={styles.addressText} numberOfLines={1}>
            {address.formattedAddress}
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: { 
    fontSize: 13, 
    color: '#717171', 
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  userName: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#1A1A1A',
    letterSpacing: -0.5 
  },
  
  // --- BOUTON FLOTTANT PREMIUM ---
  locationCircleButton: { 
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    
    // Petite ombre subtile pour le relief
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // --- CAPSULE D'ADRESSE AIRBNB ---
  addressCapsule: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F7F7F7', // Fond gris très doux moderne
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 20, // Style pilule
    marginTop: 16, 
    gap: 8,
    borderWidth: 1,
    borderColor: '#EDEDED',
  },
  addressText: { 
    fontSize: 13, 
    color: '#555555', 
    fontWeight: '500',
    flex: 1 
  },
})