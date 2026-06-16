import React from 'react'
import { View, Text, TouchableOpacity, Image, FlatList, StyleSheet, Platform, Linking, Alert } from 'react-native'
import { COLORS } from '../../../../constants/colors'

export default function SponsorsSection({ sponsors, title = "Partenaires Officiels" }) {
  if (!sponsors || sponsors.length === 0) {
    return null
  }

  const openSponsorLink = (url) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Erreur', 'Impossible d\'ouvrir le lien')
      })
    }
  }

  const renderSponsor = ({ item }) => (
    <TouchableOpacity 
      style={styles.sponsorCard}
      onPress={() => openSponsorLink(item.website_url)}
      activeOpacity={0.85}
    >
      {/* Conteneur d'image avec overflow caché pour préserver les bords arrondis */}
      <View style={styles.imageWrapper}>
        <Image 
          source={{ uri: item.banner_url }} 
          style={styles.sponsorImage}
          resizeMode="cover" // L'image remplit magnifiquement tout le bloc
        />
        {/* Un léger voile sombre en bas pour que le texte reste parfaitement lisible peu importe la photo */}
        <View style={styles.overlay} />
        
        <View style={styles.cardContent}>
          <Text style={styles.sponsorName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Découvrir</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.sponsorSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        data={sponsors}
        renderItem={renderSponsor}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sponsorList}
        snapToInterval={314} // Largeur carte (300) + gap (14) pour un effet de scroll fluide aimanté
        decelerationRate="fast"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  sponsorSection: { 
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: COLORS.blumine[950], 
    paddingHorizontal: 24,
    marginBottom: 14,
    letterSpacing: -0.5
  },
  sponsorList: { 
    paddingHorizontal: 24,
    paddingBottom: 16, // Espace pour l'ombre
  },
  sponsorCard: {
    width: 300, // Largeur généreuse pour un effet bannière panoramique
    height: 150, // Hauteur parfaite pour garder un ratio élégant
    backgroundColor: COLORS.white,
    borderRadius: 24, // Coins très arrondis style iOS / Premium moderne
    marginRight: 14,
    ...Platform.select({
      ios: { 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 6 }, 
        shadowOpacity: 0.12, 
        shadowRadius: 10 
      },
      android: { 
        elevation: 5 
      },
    }),
  },
  imageWrapper: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  sponsorImage: { 
    width: '100%', 
    height: '100%',
    backgroundColor: COLORS.gray[100]
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Crée un dégradé subtil du transparent vers le noir transparent en bas
    backgroundColor: 'rgba(0, 0, 0, 0.35)', 
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sponsorName: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: COLORS.white,
    flex: 1,
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  }
})