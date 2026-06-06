import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform } from 'react-native'
import { COLORS } from '../../../constants/colors'

export default function UserLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.blumine[600],
        tabBarInactiveTintColor: COLORS.gray[400],
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          height: Platform.OS === 'ios' ? 88 : 105,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 25 : 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      {/* Onglet 1: Accueil */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explorer',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* Onglet 2: Messages - le dossier existe */}
      <Tabs.Screen
        name="conversation"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* Onglet 3: Profil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* Onglet 4: Settings */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Ne pas générer de lien pour cet onglet
          title: 'Réglages',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* Routes cachées */}
      <Tabs.Screen
        name="conversation/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="professionals/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="help"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="components"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="category/[id]"
        options={{ href: null }}
      />

      
      
    </Tabs>
  )
}