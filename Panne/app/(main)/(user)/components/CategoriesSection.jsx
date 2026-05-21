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
          name={item.icon || 'business-outline'}  // ← Utilise l'icône de la BASE !
          size={24} 
          color={COLORS.blumine[600]} 
        />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Catégories</Text>
        <TouchableOpacity><Text style={styles.viewAllText}>Voir tout</Text></TouchableOpacity>
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
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  viewAllText: { fontSize: 13, color: COLORS.blumine[600], fontWeight: '500' },
  categoriesList: { gap: 12 },
  categoryCard: { alignItems: 'center', marginRight: 16, width: 70 },
  categoryIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.gray[50], alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: COLORS.gray[100] },
  categoryName: { fontSize: 12, color: COLORS.gray[700], textAlign: 'center' },
})