import React from 'react'
import { View, Text, TouchableOpacity, Image, FlatList, StyleSheet, Platform } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../../../constants/colors'

export default function ProfessionalsSection({ title, professionals, onContact, seeAllRoute }) {
  if (!professionals || professionals.length === 0) return null

  const renderProfessional = ({ item }) => (
    <View style={styles.proCard}>
      <TouchableOpacity 
        style={styles.proCardContent}
        onPress={() => router.push(`/(main)/(user)/professionals/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.proAvatar}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{item.business_name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
          )}
          {item.is_featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={10} color={COLORS.white} />
            </View>
          )}
        </View>
        <View style={styles.proInfo}>
          <Text style={styles.proName}>{item.business_name}</Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={COLORS.dixie[500]} />
            <Text style={styles.ratingText}>{item.rating_avg || 0}</Text>
            <Text style={styles.reviewCount}>({item.rating_count || 0})</Text>
          </View>
          {item.city && <Text style={styles.proCity}>{item.city}</Text>}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.contactButton} onPress={() => onContact(item.id, item.business_name ,item.avatar_url)}>
        <Ionicons name="chatbubble-outline" size={14} color={COLORS.white} />
        <Text style={styles.contactButtonText}>Contacter</Text>
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
      />
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  viewAllText: { fontSize: 13, color: COLORS.blumine[600], fontWeight: '500' },
  prosList: { gap: 12 },
  proCard: {
    width: 180,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  proCardContent: { padding: 12 },
  proAvatar: { position: 'relative', width: 60, height: 60, borderRadius: 30, marginBottom: 8, alignSelf: 'center' },
  avatarImage: { width: 60, height: 60, borderRadius: 30 },
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
  featuredBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: COLORS.dixie[500], width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.white },
  proInfo: { alignItems: 'center' },
  proName: { fontSize: 14, fontWeight: '600', color: COLORS.black, textAlign: 'center', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { fontSize: 12, color: COLORS.gray[600] },
  reviewCount: { fontSize: 11, color: COLORS.gray[400] },
  proCity: { fontSize: 11, color: COLORS.gray[500], marginTop: 4 },
  contactButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.blumine[600], paddingVertical: 10, marginHorizontal: 12, marginBottom: 12, borderRadius: 10, gap: 6 },
  contactButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
})