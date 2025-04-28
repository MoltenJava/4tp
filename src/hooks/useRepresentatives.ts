import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { Representative } from '../models/Representative';
import { getGeographiesByCoords, CensusGeocodeResult } from '../services/censusGeocodingService';
import { getStateLegislatorsByLocation } from '../services/openStatesService';
import { getHouseRepByDistrict, getSenatorsByState } from '../services/congressGovService';

interface UseRepresentativesResult {
  representatives: Representative[];
  loading: boolean;
  error: string | null;
  fetchRepresentatives: (latitude: number | null, longitude: number | null) => Promise<void>;
}

export const useRepresentatives = (): UseRepresentativesResult => {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepresentatives = useCallback(async (latitude: number | null, longitude: number | null) => {
    if (latitude === null || longitude === null) {
      setError('Location coordinates are required.');
      return;
    }

    setLoading(true);
    setError(null);
    setRepresentatives([]); // Clear previous results

    try {
      // 1. Get Geographies from Census
      console.log('useRepresentatives: Fetching geographies...');
      const geoInfo: CensusGeocodeResult | null = await getGeographiesByCoords(latitude, longitude);
      if (!geoInfo || !geoInfo.stateCode) {
        throw new Error('Could not determine geographic districts for your location.');
      }
      console.log('useRepresentatives: Geographies found:', geoInfo);

      // 2. Fetch State Legislators from OpenStates
      console.log('useRepresentatives: Fetching state legislators...');
      const stateRepsPromise = getStateLegislatorsByLocation(latitude, longitude);

      // 3. Fetch Federal House Rep from Congress.gov
      let houseRepPromise: Promise<Representative[] | null> = Promise.resolve(null);
      if (geoInfo.congressionalDistrict) {
        console.log('useRepresentatives: Fetching federal house rep...');
        houseRepPromise = getHouseRepByDistrict(geoInfo.stateCode, geoInfo.congressionalDistrict);
      } else {
         console.warn('useRepresentatives: Congressional District not found by Census Geocoder.');
      }

      // 4. Fetch Federal Senators from Congress.gov
      console.log('useRepresentatives: Fetching federal senators...');
      const senatorsPromise = getSenatorsByState(geoInfo.stateCode);

      // 5. Wait for all API calls
      const [stateReps, houseRepData, senators] = await Promise.all([
        stateRepsPromise,
        houseRepPromise,
        senatorsPromise,
      ]);

      // 6. Combine results (filtering out nulls/empty arrays)
      const allReps = [
        ...(stateReps || []),
        ...(houseRepData || []),
        ...(senators || []),
      ];

      console.log(`useRepresentatives: Found ${allReps.length} total representatives.`);
      setRepresentatives(allReps);

      // TODO: Implement Caching - Store `allReps` associated with lat/lon or ZIP

    } catch (err: any) {
      console.error('useRepresentatives: Error fetching representatives:', err);
      const message = err.message || 'An unexpected error occurred while fetching representatives.';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, []); // useCallback dependency array is empty for now

  return { representatives, loading, error, fetchRepresentatives };
}; 