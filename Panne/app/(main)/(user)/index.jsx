import React, { useState, useCallback } from 'react'
import { ScrollView, RefreshControl, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { router } from 'expo-router'
import { useAuth } from '../../../hooks/useAuth'
import { useUser } from '../../../hooks/useUser'
import { useLocation } from '../../../hooks/useLocation'
import { COLORS } from '../../../constants/colors'
import HomeHeader from './components/HomeHeader'
import SponsorsSection from './components/SponsorsSection'
import CategoriesSection from './components/CategoriesSection'
import ProfessionalsSection from './components/ProfessionalsSection'

export default function UserHome() {
  const { user } = useAuth()
  const { getHomeData, createConversation, loading } = useUser()
  const { location, address, getCurrentLocation } = useLocation()
  
  const [homeData, setHomeData] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  const loadData = async () => {
    const homeResult = await getHomeData(location?.lat, location?.lng)
    if (homeResult.success) {
      console.log('🔵 homeData reçu:', homeResult.data)
      console.log('🔵 top_rated:', homeResult.data?.professionals?.top_rated?.length)
      console.log('🔵 nearby:', homeResult.data?.professionals?.nearby?.length)
      setHomeData(homeResult.data)
    }
    if (isFirstLoad) setIsFirstLoad(false)
  }

  useFocusEffect(useCallback(() => { loadData() }, [location?.lat, location?.lng]))

  const onRefresh = async () => {
    setRefreshing(true)
    await getCurrentLocation()
    await loadData()
    setRefreshing(false)
  }

  const handleContactPro = async (professionalId, professionalName ,professionalAvatar) => {
    const result = await createConversation(professionalId)
    if (result.success) {
      router.push({
        pathname: '/(main)/conversation/[id]',
        params: { id: result.conversationId, contactName: professionalName, professionalId: professionalId ,  contactAvatar: professionalAvatar}
      })
    } else {
      Alert.alert('Erreur', 'Impossible de contacter le professionnel')
    }
  }

  if (isFirstLoad && loading) {
    return <ActivityIndicator size="large" color={COLORS.blumine[600]} style={styles.loaderContainer} />
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blumine[600]} />}
    >
      <HomeHeader userName={user?.username} address={address} onRefreshLocation={getCurrentLocation} />

      {/* Sponsors TOP */}
      <SponsorsSection sponsors={homeData?.sponsors?.top} title="Sponsors" />

      {/* Catégories */}
      <CategoriesSection categories={homeData?.categories} />

      {/* Pros à proximité (si dispo) */}
      {homeData?.professionals?.nearby?.length > 0 && (
        <ProfessionalsSection 
          title="À proximité" 
          professionals={homeData.professionals.nearby} 
          onContact={handleContactPro}
          seeAllRoute={() => router.push('/(main)/(user)/nearby')}
        />
      )}

      {/* Les mieux notés (TOP 10) */}
      {homeData?.professionals?.top_rated?.length > 0 && (
        <ProfessionalsSection 
          title="Les mieux notés" 
          professionals={homeData.professionals.top_rated} 
          onContact={handleContactPro}
        />
      )}

      {/* Les plus récents 
      {homeData?.professionals?.recent?.length > 0 && (
        <ProfessionalsSection 
          title="Nouveaux professionnels" 
          professionals={homeData.professionals.recent} 
          onContact={handleContactPro}
        />
        
      )}*/}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { paddingBottom: 40 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
})