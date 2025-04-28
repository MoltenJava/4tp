import { Alert } from 'react-native';

const BASE_URL = 'https://geocoding.geo.census.gov/geocoder';

/**
 * Contains parsed geographic information from Census API.
 */
export interface CensusGeocodeResult {
  stateCode: string | null; // e.g., 'CA'
  congressionalDistrict: string | null; // e.g., '11'
  stateLegislativeDistrictUpper: string | null; // e.g., '09'
  stateLegislativeDistrictLower: string | null; // e.g., '17'
  county: string | null;
  // Add other fields as needed (e.g., county subdivision, tract)
}

/**
 * Fetches geographic boundaries (districts, state, county) for given coordinates.
 * Ref: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.pdf (Geographies by Coordinates)
 * @param latitude
 * @param longitude
 * @returns Parsed CensusGeocodeResult or null.
 */
export const getGeographiesByCoords = async (
  latitude: number | null,
  longitude: number | null
): Promise<CensusGeocodeResult | null> => {
  if (latitude === null || longitude === null) {
    console.error('Cannot call Census Geocoder: Latitude or Longitude is missing.');
     Alert.alert('Input Error', 'Cannot find districts without coordinates.');
    return null;
  }

  // Parameters for current benchmark and vintage
  const params = new URLSearchParams({
    x: longitude.toString(),
    y: latitude.toString(),
    benchmark: 'Public_AR_Current',
    vintage: 'Current_Current',
    format: 'json',
  });

  const endpoint = `${BASE_URL}/geographies/coordinates?${params.toString()}`;
  console.log(`Fetching from Census Geocoder for location: ${latitude}, ${longitude}`);

  try {
    const response = await fetch(endpoint);
    const data = await response.json();

    if (!response.ok || !data?.result?.geographies) {
      console.error('Census Geocoder API Error or unexpected response:', data);
      Alert.alert('API Error', 'Could not fetch geographic district data.');
      return null;
    }

    console.log('Census Geocoder Response OK');
    // console.log(JSON.stringify(data.result.geographies, null, 2)); // Log full data for debugging

    // Extract the relevant information
    const geographies = data.result.geographies;
    const states = geographies['States']?.[0];
    const cds = geographies['Congressional Districts']?.[0];
    const sldu = geographies['State Legislative Districts - Upper']?.[0];
    const sldl = geographies['State Legislative Districts - Lower']?.[0];
    const counties = geographies['Counties']?.[0];

    const result: CensusGeocodeResult = {
      stateCode: states?.STUSAB || null,
      congressionalDistrict: cds?.DISTRICT || null,
      stateLegislativeDistrictUpper: sldu?.DISTRICT || null,
      stateLegislativeDistrictLower: sldl?.DISTRICT || null,
      county: counties?.NAME || null,
    };

    console.log('Parsed Census Geographies:', result);
    return result;

  } catch (error) {
    console.error('Network or fetch error calling Census Geocoder API:', error);
    Alert.alert('Network Error', 'Could not connect to the geographic information service.');
    return null;
  }
}; 