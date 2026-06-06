import React from 'react'
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../../../constants/colors'

export default function CategoriesSection({ categories }) {
  if (!categories || categories.length === 0) return null

  const renderCategory = ({ item }) => (
    <TouchableOpacity 
      style={styles.categoryCard}
      onPress={() => router.push(`/(main)/(user)/category/${item.id}?name=${encodeURIComponent(item.name)}`)}
    >
      <View style={styles.categoryIcon}>
        <Ionicons 
          name={item.icon || 'business-outline'}
          size={26} 
          color="#1A1A1A" 
        />
      </View>
      {/* Autorise 2 lignes maximum pour un wrap élégant */}
      <Text style={styles.categoryName} numberOfLines={2}>
        {item.name}
      </Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Catégories</Text>
      </View>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  section: { marginTop: 28, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: '#222222', letterSpacing: -0.3 },
  
  categoriesList: { 
    paddingRight: 20,
    paddingVertical: 4 
  },
  
  categoryCard: { 
    alignItems: 'center', 
    marginRight: 12,
    width: 85, // En fixant la largeur de la carte, TOUTES les icônes sont parfaitement espacées
  },
  categoryIcon: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    backgroundColor: '#FFFBE6', // Fond jaune crème doux
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 8, 
    borderWidth: 2, 
    borderColor: '#FFD700', // Bordure jaune/or
    
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryName: { 
    fontSize: 12, 
    color: '#222222', 
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.1,
    lineHeight: 15, // Rapproche les deux lignes pour que ce soit compact et propre
    height: 32, // Force la zone de texte à faire la taille de 2 lignes (aligne parfaitement les icônes horizontalement)
  },
})