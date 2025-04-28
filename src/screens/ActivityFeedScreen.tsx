import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useBillActivityFeed } from '../hooks/useBillActivityFeed';
import BillActionCard from '../components/BillActionCard';
import { Bill } from '../models/Bill';
import { Representative } from '../models/Representative';

// --- Remove Placeholder Hook for User Reps - Not currently used for filtering --- 
// const useUserRepresentatives = (): { representatives: Representative[] } => { ... };

// --- Define Navigation Stack Param List (Adjust types based on your actual stack) ---
type RootStackParamList = {
  ActivityFeed: undefined;
  BillDetail: { billId: string };
  RepresentativeProfile: { representative: Representative };
  // Add other screens here
};

type ActivityFeedScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ActivityFeed'
>;
// --- End Navigation Setup ---

// Remove FeedFilter type
// type FeedFilter = 'myReps' | 'all'; 

const ActivityFeedScreen: React.FC = () => {
  const { 
      bills, // Use bills state
      isLoading, 
      error, 
      isFetchingMore,
      refreshActivity, 
      loadMoreActivity // Use renamed loadMore function
  } = useBillActivityFeed(); // Use renamed hook
  
  // Remove user reps hook call and filter state/logic
  // const { representatives: myRepresentatives } = useUserRepresentatives();
  // const [activeFilter, setActiveFilter] = useState<FeedFilter>('myReps');
  // const myRepresentativeChambers = useMemo(() => { ... });
  // const filteredVotes = useMemo(() => { ... });

  const navigation = useNavigation<ActivityFeedScreenNavigationProp>();

  const renderBillItem = ({ item }: { item: Bill }) => (
    <BillActionCard
      bill={item}
      onPress={(bill: Bill) => {
        if (bill.id) {
          console.log('Navigating to BillDetail for:', bill.id);
          navigation.navigate('BillDetail', { billId: bill.id }); // Navigate using bill.id
        } else {
          console.log('Bill card pressed (no ID?):', bill.title);
        }
      }}
    />
  );

  const renderListHeader = () => (
    <Text style={styles.headerTitle}>Recent Bill Activity</Text> // Updated title
    // Removed Filter UI for now
  );

  const renderListFooter = () => {
      if (!isFetchingMore) return null;
      return (
          <View style={styles.footerLoadingContainer}>
              <ActivityIndicator size="small" color="#888" />
          </View>
      );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
        {isLoading ? (
            <ActivityIndicator size="large" color="#888" />
        ) : error ? (
            <Text style={styles.emptyText}>{error}</Text>
        ) : (
            <Text style={styles.emptyText}>No recent bill activity found.</Text> // Updated text
        )}
    </View>
  );

  return (
    <View style={styles.container}>
        {/* Removed Filter Buttons */}
      <FlatList
        data={bills} // Use bills data
        renderItem={renderBillItem} // Use new render function
        keyExtractor={(item) => item.id} // Use bill ID as key
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={styles.listContentContainer}
        onRefresh={refreshActivity}
        refreshing={isLoading}
        onEndReached={loadMoreActivity} // Use renamed loadMore function
        onEndReachedThreshold={0.5}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={11}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  listContentContainer: {
      paddingTop: 10,
      paddingBottom: 20,
  },
  headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#333',
      marginHorizontal: 15,
      marginTop: 20, // Added more top margin
      marginBottom: 15,
  },
  emptyContainer: {
    flex: 1,
    marginTop: 100,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  footerLoadingContainer: {
      paddingVertical: 20,
  },
  // Removed Filter Styles
});

export default ActivityFeedScreen; 