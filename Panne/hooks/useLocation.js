import { useState, useEffect, useCallback } from 'react'
import * as Location from 'expo-location'
import { Alert, Platform } from 'react-native'

export const useLocation = () => {
  const [location, setLocation] = useState(null)
  const [address, setAddress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [permission, setPermission] = useState(false)
  const [watching, setWatching] = useState(false)
  const [watchSubscription, setWatchSubscription] = useState(null)

  // Demander la permission
  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      const granted = status === 'granted'
      setPermission(granted)
      
      if (!granted) {
        setError('Permission de localisation refusée')
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre position pour vous proposer des services à proximité.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Réessayer', onPress: requestPermission }
          ]
        )
      }
      return granted
    } catch (err) {
      console.error('Permission error:', err)
      setError(err.message)
      return false
    }
  }, [])

  // Récupérer la position actuelle
  const getCurrentPosition = useCallback(async (withAddress = true) => {
    setLoading(true)
    setError(null)
    
    try {
      const hasPermission = await requestPermission()
      if (!hasPermission) {
        setError('Permission refusée')
        setLoading(false)
        return null
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      })

      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        altitude: position.coords.altitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      }
      
      setLocation(newLocation)
      
      if (withAddress) {
        const addressData = await getAddressFromCoords(newLocation.lat, newLocation.lng)
        setAddress(addressData)
      }
      
      return { position: newLocation, address: withAddress ? address : null }
    } catch (err) {
      console.error('Error getting position:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [requestPermission])

  // Récupérer la dernière position connue (plus rapide)
  const getLastKnownPosition = useCallback(async () => {
    try {
      const position = await Location.getLastKnownPositionAsync()
      if (!position) return null
      
      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
      
      setLocation(newLocation)
      const addressData = await getAddressFromCoords(newLocation.lat, newLocation.lng)
      setAddress(addressData)
      
      return newLocation
    } catch (err) {
      console.error('Error getting last position:', err)
      return null
    }
  }, [])

  // Obtenir l'adresse à partir des coordonnées (reverse geocoding)
  const getAddressFromCoords = useCallback(async (lat, lng) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      if (addresses.length > 0) {
        const addr = addresses[0]
        return {
          city: addr.city || addr.subregion || addr.district,
          country: addr.country,
          street: addr.street,
          name: addr.name,
          postalCode: addr.postalCode,
          region: addr.region,
          district: addr.district,
          formattedAddress: [addr.street, addr.city, addr.country].filter(Boolean).join(', ')
        }
      }
      return null
    } catch (err) {
      console.error('Reverse geocoding error:', err)
      return null
    }
  }, [])

  // Obtenir les coordonnées à partir d'une adresse (geocoding)
  const getCoordsFromAddress = useCallback(async (addressText) => {
    try {
      const results = await Location.geocodeAsync(addressText)
      if (results.length > 0) {
        return {
          lat: results[0].latitude,
          lng: results[0].longitude,
        }
      }
      return null
    } catch (err) {
      console.error('Geocoding error:', err)
      return null
    }
  }, [])

  // Démarrer le suivi de position en temps réel
  const startWatching = useCallback(async (options = {}) => {
    if (watchSubscription) {
      await stopWatching()
    }

    const hasPermission = await requestPermission()
    if (!hasPermission) {
      setError('Permission refusée')
      return false
    }

    const watchOptions = {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,      // 5 secondes
      distanceInterval: 10,    // 10 mètres
      ...options
    }

    try {
      const subscription = await Location.watchPositionAsync(watchOptions, async (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        }
        
        setLocation(newLocation)
        
        // Optionnel : mettre à jour l'adresse (désactivé par défaut pour économiser les appels)
        if (options.withAddress) {
          const addressData = await getAddressFromCoords(newLocation.lat, newLocation.lng)
          setAddress(addressData)
        }
      })
      
      setWatchSubscription(subscription)
      setWatching(true)
      return true
    } catch (err) {
      console.error('Error watching position:', err)
      setError(err.message)
      return false
    }
  }, [requestPermission, watchSubscription, getAddressFromCoords])

  // Arrêter le suivi
  const stopWatching = useCallback(async () => {
    if (watchSubscription) {
      await watchSubscription.remove()
      setWatchSubscription(null)
      setWatching(false)
    }
  }, [watchSubscription])

  // Vérifier si le service de localisation est activé
  const isLocationEnabled = useCallback(async () => {
    try {
      return await Location.hasServicesEnabledAsync()
    } catch (err) {
      console.error('Error checking location services:', err)
      return false
    }
  }, [])

  // Initialisation au montage
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await requestPermission()
      
      // Essayer d'abord la dernière position connue (rapide)
      await getLastKnownPosition()
      
      // Puis la position actuelle (plus précise)
      await getCurrentPosition()
      setLoading(false)
    }
    
    init()
    
    // Nettoyage
    return () => {
      if (watchSubscription) {
        watchSubscription.remove()
      }
    }
  }, [])

  return {
    location,           // { lat, lng, accuracy, timestamp }
    address,           // { city, country, street, formattedAddress }
    loading,
    error,
    permission,
    watching,
    // Actions
    getCurrentLocation: getCurrentPosition,
    getLastLocation: getLastKnownPosition,
    getAddressFromCoords,
    getCoordsFromAddress,
    startWatching,
    stopWatching,
    requestPermission,
    isLocationEnabled,
  }
}