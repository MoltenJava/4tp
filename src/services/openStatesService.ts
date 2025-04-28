import Constants from 'expo-constants';
import { Alert } from 'react-native';
import { Representative, Chamber } from '../models/Representative'; // Import our app model

// --- Interfaces for OpenStates API Response --- (Based on v3 docs)
interface OpenStatesOffice {
  name: string;
  type: string; // e.g., 'capitol', 'district'
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
}

interface OpenStatesPerson {
  id: string; // OpenStates ID (ocd-person/uuid)
  name: string;
  party: string;
  current_role?: {
    org_classification: 'upper' | 'lower' | 'legislature' | string; // Maps to chamber
    district?: string | number | null;
    title?: string; // e.g., 'Representative', 'Senator'
  };
  image?: string;
  email?: string;
  links?: { url: string; note?: string }[];
  offices?: OpenStatesOffice[];
  // other fields available but not mapped currently: gender, birth_date etc.
}

interface OpenStatesGeoResponse {
  results: OpenStatesPerson[];
  // pagination info might be here too
}

// --- Parsing Function --- 
// Mapped OpenStates data to our Representative model.
function parseOpenStatesResponse(apiResponse: OpenStatesGeoResponse): Representative[] {
  if (!apiResponse?.results) {
    return [];
  }

  return apiResponse.results.map((person) => {
    // Determine chamber
    let chamber: Chamber = 'Local'; // Default
    const orgClass = person.current_role?.org_classification;
    if (orgClass === 'upper') chamber = 'Senate';
    else if (orgClass === 'lower') chamber = 'House';
    // Add more checks if needed for bicameral/unicameral legislatures

    // Extract contact info (simple extraction, might need refinement)
    const primaryOffice = person.offices?.[0]; // Take the first office
    const contactInfo = {
        email: person.email || primaryOffice?.email || null,
        phone: primaryOffice?.phone || null,
        website: person.links?.find(link => !link.note || link.note.toLowerCase().includes('website'))?.url || null,
        socialMedia: null // OpenStates links array is generic, harder to map directly
    }

    // District might be number or string, ensure it's string or null
    const district = person.current_role?.district?.toString() ?? null;

    const rep: Representative = {
      id: person.id, // Use OpenStates person ID for now
      fullName: person.name,
      photoUrl: person.image || null,
      chamber: chamber, 
      district: district,
      party: person.party,
      bio: null, // Not directly available in standard response
      contactInfo: contactInfo,
      committeeMemberships: [], // Needs separate API call usually
      // voteIds, upcomingVoteBillIds not available here
    };
    return rep;
  });
}


const API_KEY = Constants.expoConfig?.extra?.openStatesApiKey;
// OpenStates API v3 base URL
const BASE_URL = 'https://v3.openstates.org';

if (!API_KEY) {
  console.error(
    'Error: OpenStates API Key not found. Make sure OPENSTATES_API_KEY is set in .env'
  );
  // Alert.alert('Configuration Error', 'OpenStates API Key is missing.');
}

/**
 * Fetches state legislators based on latitude and longitude.
 * Returns an array of Representative objects or null.
 */
export const getStateLegislatorsByLocation = async (
  latitude: number | null,
  longitude: number | null
): Promise<Representative[] | null> => { // Return type updated
  if (!API_KEY) {
    console.error('Cannot call OpenStates API: API Key is missing.');
    Alert.alert('Configuration Error', 'OpenStates API Key is missing.');
    return null;
  }
  if (latitude === null || longitude === null) {
    console.error('Cannot call OpenStates API: Latitude or Longitude is missing.');
     Alert.alert('Input Error', 'Cannot find state legislators without coordinates.');
    return null;
  }

  const endpoint = `${BASE_URL}/people.geo?lat=${latitude}&lng=${longitude}`;
  console.log(`Fetching from OpenStates API for location: ${latitude}, ${longitude}`);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-KEY': API_KEY,
      },
    });

    const rawData = await response.json();

    if (!response.ok) {
      console.error('OpenStates API Error:', rawData);
      const errorMessage = rawData?.detail || `HTTP error! status: ${response.status}`;
      Alert.alert('API Error', `Could not fetch state legislator data: ${errorMessage}`);
      return null;
    }

    console.log('OpenStates API Response OK');
    return parseOpenStatesResponse(rawData as OpenStatesGeoResponse);

  } catch (error) {
    console.error('Network or fetch error calling OpenStates API:', error);
    Alert.alert('Network Error', 'Could not connect to the state legislator information service.');
    return null;
  }
}; 