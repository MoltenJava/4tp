import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Linking, TouchableOpacity, Platform, Alert } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Representative } from '../models/Representative'; // Import the Representative model

// Define the expected route params
type RepresentativeProfileRouteParams = {
  RepresentativeProfile: {
    representative: Representative;
  };
};

// Define the type for the route prop
type RepresentativeProfileScreenRouteProp = RouteProp<
  RepresentativeProfileRouteParams,
  'RepresentativeProfile'
>;

// Define party colors and helper function
const partyColors = {
  Democrat: '#007bff', // Blue
  Democratic: '#007bff', // Allow for variations
  Republican: '#dc3545', // Red
  Independent: '#6c757d', // Gray
  Libertarian: '#ffc107', // Yellow/Gold
  // Add more parties as needed
};
const defaultPartyColor = '#6c757d'; // Default gray

const handleLinkPress = async (url: string) => {
  // Add basic validation for common schemes
  const isWebUrl = url.startsWith('http://') || url.startsWith('https://');
  const isMailto = url.startsWith('mailto:');
  const isTel = url.startsWith('tel:');

  if (!isWebUrl && !isMailto && !isTel) {
    Alert.alert('Invalid Link', 'Cannot open this type of link.');
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

const RepresentativeProfileScreen: React.FC = () => {
  const route = useRoute<RepresentativeProfileScreenRouteProp>();
  const { representative } = route.params;

  // Placeholder image if photoUrl is missing
  const placeholderImage = 'https://via.placeholder.com/100?text=Rep+Photo';

  // Get party color or default
  const partyColor = partyColors[representative.party as keyof typeof partyColors] || defaultPartyColor;

  // Helper to check if contact info exists and has any value
  const hasContactInfo = (
      representative.contactInfo &&
      (representative.contactInfo.email ||
       representative.contactInfo.phone ||
       representative.contactInfo.website ||
       (representative.contactInfo.socialMedia && (representative.contactInfo.socialMedia.twitter || representative.contactInfo.socialMedia.facebook)))
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Image
          source={{ uri: representative.photoUrl || placeholderImage }}
          style={styles.profileImage}
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.nameText}>{representative.fullName}</Text>
          <Text style={styles.titleText}>
            {representative.chamber === 'House'
              ? `Representative for ${representative.stateCode}-${representative.district}`
              : `Senator for ${representative.stateCode}`}
          </Text>
          <View style={styles.partyContainer}>
            <View style={[styles.partyIndicator, { backgroundColor: partyColor }]} />
            <Text style={styles.partyText}>{representative.party}</Text>
          </View>
        </View>
      </View>

      {/* Details Section (Task 5.2 & 5.3) */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Details</Text>

        {/* Contact Info */}
        {hasContactInfo && (
          <View style={styles.detailBlock}>
            <Text style={styles.detailTitle}>Contact</Text>
            {/* Email */}
            {representative.contactInfo?.email && (
              <TouchableOpacity onPress={() => representative.contactInfo?.email && handleLinkPress(`mailto:${representative.contactInfo.email}`)}>
                 <Text style={styles.linkItem}>Email: {representative.contactInfo.email}</Text>
              </TouchableOpacity>
            )}
            {/* Phone */}
            {representative.contactInfo?.phone && (
              <TouchableOpacity onPress={() => representative.contactInfo?.phone && handleLinkPress(`tel:${representative.contactInfo.phone}`)}>
                 <Text style={styles.linkItem}>Phone: {representative.contactInfo.phone}</Text>
              </TouchableOpacity>
            )}
            {/* Website */}
            {representative.contactInfo?.website && (
              <TouchableOpacity onPress={() => representative.contactInfo?.website && handleLinkPress(representative.contactInfo.website)}>
                 <Text style={styles.linkItem}>Website: {representative.contactInfo.website}</Text>
              </TouchableOpacity>
            )}
            {/* Social Media - Text links for now */}
            {representative.contactInfo?.socialMedia?.twitter && (
               <TouchableOpacity onPress={() => representative.contactInfo?.socialMedia?.twitter && handleLinkPress(representative.contactInfo.socialMedia.twitter)}>
                 <Text style={styles.linkItem}>Twitter</Text>
               </TouchableOpacity>
            )}
             {representative.contactInfo?.socialMedia?.facebook && (
               <TouchableOpacity onPress={() => representative.contactInfo?.socialMedia?.facebook && handleLinkPress(representative.contactInfo.socialMedia.facebook)}>
                 <Text style={styles.linkItem}>Facebook</Text>
               </TouchableOpacity>
            )}
          </View>
        )}

        {/* Bio */}
        {representative.bio && (
          <View style={styles.detailBlock}>
            <Text style={styles.detailTitle}>Biography</Text>
            <Text style={styles.bioText}>{representative.bio}</Text>
          </View>
        )}

        {/* Committees */}
        {representative.committeeMemberships && representative.committeeMemberships.length > 0 && (
          <View style={styles.detailBlock}>
            <Text style={styles.detailTitle}>Committee Assignments</Text>
            {representative.committeeMemberships.map((committee) => (
              <View key={committee.id} style={styles.committeeItem}>
                  <Text style={styles.committeeName}>{committee.name}</Text>
                  {committee.role && <Text style={styles.committeeRole}> ({committee.role})</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Fallback if no details are available */}
        {!hasContactInfo && !representative.bio && (!representative.committeeMemberships || representative.committeeMemberships.length === 0) && (
            <Text style={styles.placeholderText}>Detailed information not currently available.</Text>
        )}

      </View>

      {/* Placeholder Section for Recent Votes */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Recent Votes</Text>
        {/* Add Vote list component here later */}
        <Text style={styles.placeholderText}>Recent vote history coming soon...</Text>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
    backgroundColor: '#e0e0e0', // Background for placeholder
  },
  headerTextContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  titleText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  partyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  partyIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  partyText: {
    fontSize: 14,
    color: '#777',
    // fontStyle: 'italic', // Removing italic for cleaner look with indicator
  },
  sectionContainer: {
    marginTop: 15,
    marginHorizontal: 15,
    padding: 15,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, // for Android
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#444',
  },
  placeholderText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Styles for Details section
  detailBlock: {
    marginBottom: 15,
  },
  detailTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#555',
      marginBottom: 8, // Increased margin
  },
  detailItem: {
      fontSize: 14,
      color: '#333',
      marginBottom: 3,
      lineHeight: 20, // Improve readability
  },
  linkItem: { // Style for tappable links
      fontSize: 14,
      color: Platform.OS === 'ios' ? '#007aff' : '#007bff', // Use system blue
      marginBottom: 8, // Increased margin
      lineHeight: 20,
      textDecorationLine: 'underline',
  },
  bioText: {
      fontSize: 14,
      color: '#333',
      lineHeight: 20,
  },
  committeeItem: {
      flexDirection: 'row',
      marginBottom: 5, // Increased margin
      alignItems: 'flex-start'
  },
  committeeName: {
      fontSize: 14,
      color: '#333',
      flexShrink: 1, // Allow name to wrap if long
      lineHeight: 18,
  },
  committeeRole: {
      fontSize: 14,
      color: '#666',
      marginLeft: 4,
      lineHeight: 18,
  },
});

export default RepresentativeProfileScreen; 