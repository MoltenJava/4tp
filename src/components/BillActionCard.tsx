import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bill } from '../models/Bill'; // Import Bill model

interface BillActionCardProps {
  bill: Bill;
  onPress?: (bill: Bill) => void;
}

// Helper to format date (can be moved to a utils file later)
const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Date unknown';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }); // Simpler date format for bill action
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

const BillActionCard: React.FC<BillActionCardProps> = ({ bill, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress(bill);
    }
  };

  // Determine Chamber based on Bill Type (e.g., HR vs S)
  let chamber: string | null = null;
  let chamberColor = '#6c757d'; // Default gray
  if (bill.id) {
      const type = bill.id.split('-')[1]?.toLowerCase();
      if (type?.startsWith('hr')) {
          chamber = 'House';
          chamberColor = '#28a745'; // Green
      } else if (type?.startsWith('s')) {
          chamber = 'Senate';
          chamberColor = '#6f42c1'; // Purple
      }
  }

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
            <Text style={styles.titleText} numberOfLines={2}>{bill.title || 'No title available'}</Text>
            {chamber && (
             <View style={[styles.chamberBadge, { backgroundColor: chamberColor }]}>
                  <Text style={styles.chamberBadgeText}>{chamber}</Text>
             </View>
            )}
        </View>

        <Text style={styles.actionText}>{bill.latestActionText || 'No recent action'}</Text>
        <Text style={styles.dateText}>{formatDate(bill.latestActionDate)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, 
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  contentContainer: {},
  titleText: { // Renamed from summaryText
    fontSize: 15,
    fontWeight: '600', // Slightly bolder for title
    color: '#333',
    flex: 1,
    marginRight: 10,
    lineHeight: 21,
  },
  actionText: { // New style for action text
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    lineHeight: 19,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    // Removed marginBottom
  },
  chamberBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
  },
  chamberBadgeText: {
      color: '#ffffff',
      fontSize: 10,
      fontWeight: 'bold',
      textTransform: 'uppercase',
  },
  // Removed unused styles like billInfoText, positionText
});

export default BillActionCard; 