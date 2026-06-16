import React, { useRef } from 'react'
import { View, Text, Pressable, FlatList, StyleSheet, Animated } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../../../constants/colors'

// 1. Sous-composant isolé pour gérer proprement l'animation par élément
function CategoryItem({ item }) {
  const animatedValue = useRef(new Animated.Value(0)).current

  const handlePressIn = () => {
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 120,
      useNativeDriver: false, // Requis pour l'interpolation des couleurs
    }).start()
  }

  const handlePressOut = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start()
  }

  // Interpolations des styles animés
  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.gray[50], COLORS.dixie[500]]
  })

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.gray[100], COLORS.dixie[500]]
  })

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.94]
  })

  const textColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.blumine[900], COLORS.black]
  })

  return (
    <Pressable 
      style={styles.categoryCard}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => router.push(`/(main)/(user)/category/${item.id}?name=${encodeURIComponent(item.name)}`)}
    >
      <Animated.View style={[
        styles.categoryIcon, 
        { backgroundColor, borderColor, transform: [{ scale }] }
      ]}>
        <Ionicons 
          name={item.icon || 'business-outline'}
          size={24} 
          color={COLORS.blumine[950]} 
        />
      </Animated.View>
      
      <Animated.Text style={[
        styles.categoryName,
        { color: textColor }
      ]} numberOfLines={2}>
        {item.name}
      </Animated.Text>
    </Pressable>
  )
}

// 2. Composant principal
export default function CategoriesSection({ categories }) {
  if (!categories || categories.length === 0) return null

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Catégories</Text>
      </View>
      <FlatList
        data={categories}
        renderItem={({ item }) => <CategoryItem item={item} />}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesList}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  section: { 
    marginTop: 28, 
    paddingHorizontal: 24 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  sectionTitle: { 
    fontSize: 19, 
    fontWeight: '800', 
    color: COLORS.blumine[950], 
    letterSpacing: -0.5 
  },
  
  categoriesList: { 
    paddingRight: 24,
    paddingVertical: 6 
  },
  
  categoryCard: { 
    alignItems: 'center', 
    marginRight: 16,
    width: 76,
  },
  categoryIcon: { 
    width: 60, 
    height: 60, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 10, 
    borderWidth: 1, 
    
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryName: { 
    fontSize: 12, 
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 15,
    height: 30, 
  }
})