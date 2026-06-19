import React from 'react'
import { View, Text, TouchableOpacity, Image, FlatList, StyleSheet, Platform } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../../../constants/colors'

export default function ProfessionalsSection({ title, professionals, onContact }) {
  if (!professionals || professionals.length === 0) return null

  const renderProfessional = ({ item }) => (
    <View style={styles.proCard}>
      {/* Zone Image / Couverture principale */}
      <TouchableOpacity 
        style={styles.cardImageWrapper}
        onPress={() => router.push(`/(main)/(user)/professionals/${item.id}`)}
        activeOpacity={0.9}
      >
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.proCoverImage} resizeMode="cover" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.business_name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
        )}

        {/* Badge "Favori / En Vedette" Premium en haut à gauche */}
        {item.is_featured && (
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={10} color={COLORS.blumine[950]} />
            <Text style={styles.featuredBadgeText}>Top</Text>
          </View>
        )}

        {/* Bouton Message Flottant (Action Rapide) en haut à droite */}
        <TouchableOpacity 
          style={styles.floatingContactButton} 
          onPress={() => onContact(item.id, item.business_name, item.avatar_url,item.phone || null)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={16} color={COLORS.blumine[950]} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Zone Informations (Style Airbnb épuré) */}
      <TouchableOpacity 
        style={styles.proInfo}
        onPress={() => router.push(`/(main)/(user)/professionals/${item.id}`)}
        activeOpacity={1}
      >
        <View style={styles.titleRow}>
          <Text style={styles.proName} numberOfLines={1}>{item.business_name}</Text>
          
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={13} color={COLORS.dixie[500]} />
            <Text style={styles.ratingText}>
              {parseFloat(item.rating_avg || 0).toFixed(1)}
            </Text>
          </View>
        </View>

        <Text style={styles.proCity}>{item.city || 'À proximité'}</Text>
        <Text style={styles.reviewsText}>
          {parseInt(item.rating_count || 0, 10)} avis vérifiés
        </Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <FlatList
        data={professionals.slice(0, 5)}
        renderItem={renderProfessional}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.prosList}
        snapToInterval={244} // Largeur de carte + gap pour un défilement fluide bloquant
        decelerationRate="fast"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  section: { 
    marginTop: 26, 
  },
  sectionHeader: { 
    paddingHorizontal: 24, 
    marginBottom: 14 
  },
  sectionTitle: { 
    fontSize: 19, 
    fontWeight: '800', 
    color: COLORS.blumine[950],
    letterSpacing: -0.5 
  },
  prosList: { 
    paddingHorizontal: 24,
    paddingBottom: 16, // Espace pour l'ombre
  },
  proCard: {
    width: 230, // Plus large, format carte de voyage Airbnb
    marginRight: 14,
    backgroundColor: COLORS.white,
  },
  cardImageWrapper: {
    width: '100%',
    height: 140, // Grande zone visuelle
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.gray[50],
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  proCoverImage: { 
    width: '100%', 
    height: '100%' 
  },
  avatarPlaceholder: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: COLORS.blumine[950],
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  avatarText: { 
    fontSize: 36, 
    fontWeight: '800', 
    color: COLORS.white,
  },
  
  /* --- BADGES FLOTTANTS SUR IMAGE --- */
  featuredBadge: { 
    position: 'absolute', 
    top: 12, 
    left: 12, 
    backgroundColor: COLORS.dixie[500], 
    flexDirection: 'row',
    alignItems: 'center', 
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100, 
    gap: 4,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.blumine[950],
    textTransform: 'uppercase',
  },
  floatingContactButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  /* --- INFORMATIONS STYLE AIRBNB --- */
  proInfo: { 
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  proName: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: COLORS.blumine[950],
    flex: 1,
  },
  ratingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3 
  },
  ratingText: { 
    fontSize: 13, 
    fontWeight: '700',
    color: COLORS.blumine[950] 
  },
  proCity: { 
    fontSize: 13, 
    color: COLORS.gray[500], 
    marginTop: 2,
    fontWeight: '400' 
  },
  reviewsText: {
    fontSize: 11,
    color: COLORS.gray[400],
    marginTop: 1,
    fontWeight: '500'
  }
})