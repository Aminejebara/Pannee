import React from 'react'
import { Tabs , Stack} from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform, View } from 'react-native'
import { COLORS } from '../../../constants/colors'

export default function ProLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // On utilise Blumine pour l'actif et Gray pour l'inactif
        tabBarActiveTintColor: COLORS.blumine[600],
        tabBarInactiveTintColor: COLORS.gray[400],
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.gray[100], 
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 12,
          // Ombre très légère style Airbnb/Premium
          elevation: 0,
          shadowColor: COLORS.black,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.03,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700', // Un peu plus gras pour la lisibilité
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "grid" : "grid-outline"} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />

      <Tabs.Screen
        name="conversations"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons 
                name={focused ? "chatbubbles" : "chatbubbles-outline"} 
                size={23} 
                color={color} 
              />
              {/* Le petit badge Blumine si tu veux indiquer des messages non lus plus tard */}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil Pro',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "briefcase" : "briefcase-outline"} 
              size={23} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
  name="conversation"
  options={{
    href: null  // ← cache la tab
  }}
/>

<Tabs.Screen
  name="reviews"
  options={{
     href: null  , // ← cache la tab
    title: 'Avis',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="star-outline" size={size} color={color} />
    ),
  }}
/>
    </Tabs>
  )
}