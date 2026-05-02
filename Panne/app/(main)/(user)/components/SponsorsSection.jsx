import React from 'react'
import { View, Text, TouchableOpacity, Image, FlatList, StyleSheet, Platform, Linking, Alert } from 'react-native'
import { COLORS } from '../../../../constants/colors'

export default function SponsorsSection({ sponsors, title = "Sponsors" }) {
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
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: item.banner_url }} 
        style={styles.sponsorImage}
        resizeMode="cover"
      />
      <Text style={styles.sponsorName}>{item.name}</Text>
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
      />
    </View>
  )
}

const styles = StyleSheet.create({
  sponsorSection: { marginTop: 16, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black, marginBottom: 12 },
  sponsorList: { gap: 12 },
  sponsorCard: {
    width: 280,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.gray[100],
    ...Platform.select({
      ios: { shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  sponsorImage: { width: 280, height: 140, backgroundColor: COLORS.gray[50] },
  sponsorName: { fontSize: 14, fontWeight: '600', color: COLORS.black, textAlign: 'center', padding: 12 },
})