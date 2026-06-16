import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LOCATION_TASK_NAME = 'BACKGROUND_LOCATION_UPDATE';
const LOCATION_STORAGE_KEY = '@location_updates';

// Service pour les appels API en background
const updateLocationApi = async (professionalId, lat, lng, address, city, country) => {
  try {
    const baseUrl = 'http://192.168.1.48:5000';
    const response = await fetch(`${baseUrl}/api/professionals/${professionalId}/location`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lat, lng, address, city, country })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update location');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating location in background:', error);
    throw error;
  }
};

// Definition de la tache background
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data;
    
    if (locations && locations.length > 0) {
      const lastLocation = locations[locations.length - 1];
      const { latitude, longitude } = lastLocation.coords;
      
      try {
        const storedData = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (!storedData) return;
        
        const { professionalId, lastUpdate } = JSON.parse(storedData);
        
        const now = Date.now();
        const tenMinutesInMs = 10 * 60 * 1000;
        
        if (now - lastUpdate < tenMinutesInMs) {
          return;
        }
        
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude
        });
        
        const addressData = reverseGeocode[0] || {};
        const address = addressData.street || '';
        const city = addressData.city || addressData.region || '';
        const country = addressData.country || '';
        
        await updateLocationApi(
          professionalId,
          latitude,
          longitude,
          address,
          city,
          country
        );
        
        await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
          professionalId,
          lastUpdate: now
        }));
        
        console.log('Background location updated successfully');
      } catch (error) {
        console.error('Error in background location update:', error);
      }
    }
  }
});

// Fonctions exportees pour le composant
export const startBackgroundLocation = async (professionalId) => {
  try {
    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
      professionalId,
      lastUpdate: Date.now()
    }));
    
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Permission de localisation au premier plan refusee');
    }
    
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      throw new Error('Permission de localisation en arriere-plan refusee');
    }
    
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    
    if (!isStarted) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000,
        distanceInterval: 100,
        foregroundService: {
          notificationTitle: 'Localisation active',
          notificationBody: 'Mise a jour de votre position pour les clients',
          notificationColor: '#FFD200',
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        ...Platform.select({
          ios: {
            activityType: Location.ActivityType.OtherNavigation,
          },
        }),
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error starting background location:', error);
    throw error;
  }
};

export const stopBackgroundLocation = async () => {
  try {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }
    await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error stopping background location:', error);
    throw error;
  }
};

export const isBackgroundLocationActive = async () => {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch {
    return false;
  }
};