import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../../../constants/colors'

export default function HomeHeader({ userName, address, onRefreshLocation }) {
  return (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Bonjour 👋</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <TouchableOpacity style={styles.locationButton} onPress={onRefreshLocation}>
          <Ionicons name="location-outline" size={22} color={COLORS.blumine[600]} />
        </TouchableOpacity>
      </View>

      {address?.formattedAddress && (
        <View style={styles.addressContainer}>
          <Ionicons name="navigate-outline" size={16} color={COLORS.gray[500]} />
          <Text style={styles.addressText} numberOfLines={1}>
            {address.formattedAddress}
          </Text>
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 12,
  },
  welcomeText: { fontSize: 14, color: COLORS.gray[500], marginBottom: 4 },
  userName: { fontSize: 24, fontWeight: '700', color: COLORS.black },
  locationButton: { padding: 8 },
  addressContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 6 },
  addressText: { fontSize: 13, color: COLORS.gray[500], flex: 1 },
})