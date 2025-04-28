import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Bill } from '../models/Bill';
import { getBillDetails } from '../services/congressGovService';

// Define the expected route params
type BillDetailRouteParams = {
  BillDetail: {
    billId: string; // Expecting format like "118-hr-1234"
  };
};

// Define the type for the route prop
type BillDetailScreenRouteProp = RouteProp<BillDetailRouteParams, 'BillDetail'>;

// Helper to parse billId
const parseBillId = (billId: string): { congress: string; type: string; number: string } | null => {
    const parts = billId.split('-');
    if (parts.length === 3) {
        return { congress: parts[0], type: parts[1], number: parts[2] };
    }
    console.error('Invalid billId format:', billId);
    return null;
};

// Reusable Link function from RepresentativeProfileScreen
const handleLinkPress = async (url: string | null) => {
    if (!url) {
        Alert.alert('No Link', 'No web link is available for this item.');
        return;
    }
    const supported = await Linking.canOpenURL(url);
    if (supported) {
        try {
            await Linking.openURL(url);
        } catch (error) {
            console.error("Failed to open URL:", error);
            Alert.alert('Error', 'Could not open the link.');
        }
    } else {
        Alert.alert('Error', `Don't know how to open this URL: ${url}`);
    }
};

const BillDetailScreen: React.FC = () => {
  const route = useRoute<BillDetailScreenRouteProp>();
  const { billId } = route.params;

  const [billDetails, setBillDetails] = useState<Bill | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);
      const parsedId = parseBillId(billId);

      if (!parsedId) {
        setError('Invalid Bill ID format.');
        setIsLoading(false);
        return;
      }

      try {
        const details = await getBillDetails(parsedId.congress, parsedId.type, parsedId.number);
        if (details) {
          setBillDetails(details);
        } else {
          setError('Could not find details for this bill.');
        }
      } catch (err: any) {
        console.error('Error fetching bill details:', err);
        setError(err.message || 'Failed to fetch bill details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [billId]); // Re-fetch if billId changes

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#555" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!billDetails) {
     return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Bill details not available.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.sectionContainer}>
        <Text style={styles.titleText}>{billDetails.title}</Text>
        <Text style={styles.billIdentifierText}>({billDetails.id.toUpperCase()})</Text>
      </View>

      <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Status</Text>
          <Text style={styles.detailText}>{billDetails.status}</Text>
          {billDetails.latestActionDate && (
              <Text style={styles.dateText}>Latest Action Date: {new Date(billDetails.latestActionDate).toLocaleDateString()}</Text>
          )}
      </View>

      {billDetails.summary && (
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.detailText}>{billDetails.summary}</Text>
        </View>
      )}

      <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Details</Text>
          {billDetails.policyArea && (
              <Text style={styles.detailText}>Policy Area: {billDetails.policyArea}</Text>
          )}
          {billDetails.sponsorId && (
              <Text style={styles.detailText}>Sponsor ID: {billDetails.sponsorId}</Text> // TODO: Link to sponsor profile?
          )}
          {billDetails.fullTextUrl ? (
             <TouchableOpacity onPress={() => handleLinkPress(billDetails.fullTextUrl)}>
                 <Text style={styles.linkText}>View Full Text</Text>
             </TouchableOpacity>
           ) : (
               <Text style={styles.detailText}>Full text link not available.</Text> // Handle missing URL
           )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  billIdentifierText: {
      fontSize: 14,
      color: '#777',
      marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  detailText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 5,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    marginTop: 5,
  },
  linkText: {
    fontSize: 15,
    color: '#007bff',
    lineHeight: 22,
    textDecorationLine: 'underline',
    marginTop: 10,
  },
  errorText: {
      fontSize: 16,
      color: '#dc3545',
      textAlign: 'center',
  },
});

export default BillDetailScreen; 