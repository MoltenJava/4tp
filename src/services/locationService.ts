import * as Location from 'expo-location';
import { Alert } from 'react-native';

/**
 * Requests foreground location permissions from the user.
 * Returns true if permission granted, false otherwise.
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  console.log('Requesting location permission...');
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Denied',
      'Location permission is needed to find representatives based on your location. Please enable it in settings.'
    );
    console.log('Location permission denied.');
    return false;
  }
  console.log('Location permission granted.');
  return true;
};

/**
 * Gets the current device location coordinates.
 * Returns Location.LocationObject | null.
 */
export const getCurrentLocation = async (): Promise<Location.LocationObject | null> => {
  console.log('Getting current location...');
  const hasPermission = await Location.getForegroundPermissionsAsync();
  if (!hasPermission.granted) {
    console.log('Permission not granted, requesting...');
    const granted = await requestLocationPermission();
    if (!granted) {
      console.log('Permission denied after request.');
      return null;
    }
  }

  try {
    // Using getLastKnownPositionAsync first for speed, fallback to getCurrentPositionAsync
    let location = await Location.getLastKnownPositionAsync({});

    if (!location) {
      console.log('No last known location, fetching current position...');
      // getCurrentPositionAsync can take a bit longer
      location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    }

    console.log('Location obtained:', location);
    return location;
  } catch (error) {
    console.error('Error getting location:', error);
    Alert.alert('Location Error', 'Could not retrieve your location. Please try again later or enter your ZIP code manually.');
    return null;
  }
};

/**
 * Performs reverse geocoding to get address details from coordinates.
 * Returns the first address found or null.
 */
export const reverseGeocode = async (latitude: number, longitude: number): Promise<Location.LocationGeocodedAddress | null> => {
  console.log(`Reverse geocoding for ${latitude}, ${longitude}...`);
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results.length > 0) {
      console.log('Reverse geocode result:', results[0]);
      return results[0]; // Return the first result
    }
    console.log('No reverse geocode results found.');
    return null;
  } catch (error) {
    console.error('Error during reverse geocoding:', error);
    return null;
  }
}; 