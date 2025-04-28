import Constants from 'expo-constants';
import { Alert } from 'react-native';

const API_KEY = Constants.expoConfig?.extra?.googleCivicApiKey;
const BASE_URL = 'https://www.googleapis.com/civicinfo/v2';

if (!API_KEY) {
  console.error(
    'Error: Google Civic API Key not found. Make sure GOOGLE_CIVIC_API_KEY is set in your .env file and loaded via app.json extra key.'
  );
  // Potentially show an alert or throw error in development
  // Alert.alert('Configuration Error', 'Google Civic API Key is missing.');
}

/**
 * Fetches representative info based on a full address string or ZIP code.
 * @param address - The full address or ZIP code.
 * @returns The raw JSON response from the API or null if an error occurs.
 */
export const getRepresentativeInfoByAddress = async (address: string): Promise<any | null> => {
  if (!API_KEY) {
    console.error('Cannot call Google Civic API: API Key is missing.');
    Alert.alert('Configuration Error', 'Google Civic API Key is missing.');
    return null;
  }
  if (!address?.trim()) {
     console.error('Cannot call Google Civic API: Address is empty.');
     Alert.alert('Input Error', 'Address or ZIP code cannot be empty.');
    return null;
  }

  const endpoint = `${BASE_URL}/representatives?key=${API_KEY}&address=${encodeURIComponent(address)}`;
  console.log(`Fetching from Google Civic API: ${address}`); // Log address, not full URL with key

  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok) {
      console.error('Google Civic API Error:', data);
      const errorMessage = data?.error?.message || `HTTP error! status: ${response.status}`;
      Alert.alert('API Error', `Could not fetch representative data: ${errorMessage}`);
      return null;
    }

    console.log('Google Civic API Response OK for address:', address);
    // console.log('Data:', data); // Optional: Log full data for debugging
    return data;

  } catch (error) {
    console.error('Network or fetch error calling Google Civic API:', error);
    Alert.alert('Network Error', 'Could not connect to the representative information service. Please check your connection and try again.');
    return null;
  }
}; 