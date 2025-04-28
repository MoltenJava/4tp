import React, { useState } from 'react';
import { View, Text, Button, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import {
  requestLocationPermission,
  getCurrentLocation,
  reverseGeocode,
} from '../services/locationService';
import { LocationObject, LocationGeocodedAddress } from 'expo-location';
import { supabase } from '../utils/supabaseClient';
import * as Location from 'expo-location';

// TODO: Add navigation prop type
const LocationSetupScreen = ({ navigation }: any) => {
  const [zipCode, setZipCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Please grant location access or enter your ZIP code.');

  // Function to handle successful location retrieval (either auto or manual)
  const handleLocationFound = async (locationData: {
    latitude?: number | null;
    longitude?: number | null;
    zip?: string | null;
    city?: string | null;
    state?: string | null;
  }) => {
    setStatusMessage('Saving location...');
    setLoading(true); // Keep loading while saving
    console.log('Location Data to Save:', locationData);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Error', 'User not authenticated. Cannot save location.');
      setLoading(false);
      setStatusMessage('Error: Not logged in.');
      // Potentially navigate back to login
      navigation.navigate('Login');
      return;
    }

    // Prepare data for profiles table
    const profileUpdate = {
      id: user.id,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      zip_code: locationData.zip,
      city: locationData.city,
      state: locationData.state,
      updated_at: new Date().toISOString(),
    };

    // Update the user's profile in Supabase
    const { error } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id); // Ensure we only update the logged-in user's profile

    setLoading(false);

    if (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Could not save location data. Please try again.');
      setStatusMessage('Failed to save location.');
    } else {
      console.log('Profile updated successfully');
      setStatusMessage('Location saved!');
      // Navigate to the main app screen
      navigation.replace('Home'); // Use replace to prevent going back to setup
    }
  };

  const handleUseCurrentLocation = async () => {
    setLoading(true);
    setStatusMessage('Requesting permission...');
    const permissionGranted = await requestLocationPermission();

    if (permissionGranted) {
      setStatusMessage('Getting location...');
      const location: LocationObject | null = await getCurrentLocation();

      if (location) {
        setStatusMessage('Finding address details...');
        // Use the existing reverseGeocode service function
        const address: Location.LocationGeocodedAddress | null = await reverseGeocode(
          location.coords.latitude,
          location.coords.longitude
        );

        // Removed the temporary log here
        if (address) {
          handleLocationFound({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            zip: address?.postalCode,
            city: address?.city,
            state: address?.region,
          });
        } else {
          console.log('Reverse geocoding returned no results.');
          setStatusMessage('Could not get address details. Try ZIP.');
          setLoading(false);
        }
      } else {
        setStatusMessage('Could not get location. Try entering ZIP code.');
        setLoading(false);
      }
    } else {
      setStatusMessage('Permission denied. Please enter ZIP code manually or enable in settings.');
      setLoading(false);
    }
  };

  const handleUseZipCode = () => {
    // Basic validation - check if it looks like a 5-digit US ZIP code
    if (!/^[0-9]{5}$/.test(zipCode)) {
      Alert.alert('Invalid ZIP Code', 'Please enter a valid 5-digit ZIP code.');
      return;
    }
    setLoading(true);
    setStatusMessage('Processing ZIP code...');
    // For ZIP code, we only have the ZIP itself
    // We might need geocoding later if lat/lon is required for APIs
    handleLocationFound({
      zip: zipCode,
      latitude: null,
      longitude: null,
      city: null, // Could potentially geocode ZIP later if needed
      state: null,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Your Location</Text>
      <Text style={styles.instructions}>
        We need your location to find your elected representatives.
      </Text>

      <Button
        title="Use Current Location"
        onPress={handleUseCurrentLocation}
        disabled={loading}
      />

      <Text style={styles.orText}>OR</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter 5-Digit ZIP Code"
        value={zipCode}
        onChangeText={setZipCode}
        keyboardType="numeric"
        maxLength={5}
        editable={!loading}
      />
      <Button
        title="Use ZIP Code"
        onPress={handleUseZipCode}
        disabled={loading || zipCode.length !== 5}
      />

      {loading && <ActivityIndicator size="large" color="#0000ff" style={styles.loadingIndicator}/>}
      <Text style={styles.status}>{statusMessage}</Text>

       {/* TODO: Add navigation to skip/do later if applicable */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 25,
    color: 'gray',
  },
  orText: {
    marginVertical: 20,
    fontSize: 16,
    color: 'gray',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 15,
    borderRadius: 4,
    width: '80%',
    textAlign: 'center',
  },
   loadingIndicator: {
    marginTop: 20,
  },
  status: {
    marginTop: 20,
    textAlign: 'center',
    color: '#333',
  }
});

export default LocationSetupScreen; 