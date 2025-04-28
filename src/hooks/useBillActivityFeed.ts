import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Bill } from '../models/Bill';
import { getRecentBills } from '../services/congressGovService';

// TODO: Determine the current Congress number dynamically or from a reliable source.
// Using 118 as a placeholder for the 118th Congress (2023-2024).
const CURRENT_CONGRESS = 118;
const BILL_FETCH_LIMIT = 20; // Fetch bills in batches of 20

/**
 * Hook to manage fetching and storing the recent bill activity feed.
 * Supports pagination (infinite scroll) and foreground refresh.
 */
export const useBillActivityFeed = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Function to fetch bills, handling initial load and pagination
  const fetchBills = useCallback(async (isInitialLoad = false) => {
    if (!hasMore && !isInitialLoad) return;
    if (isLoading || isFetchingMore) return;

    console.log(`useBillActivityFeed: Fetching bills... Initial: ${isInitialLoad}, Offset: ${isInitialLoad ? 0 : offset}`);
    
    if (isInitialLoad) {
        setIsLoading(true);
        setOffset(0);
        setHasMore(true);
    } else {
        setIsFetchingMore(true);
    }
    setError(null);

    const currentOffset = isInitialLoad ? 0 : offset;

    try {
      // Fetch bills for the current offset
      const newBillsResult = await getRecentBills(BILL_FETCH_LIMIT, currentOffset);

      if (newBillsResult) {
        if (newBillsResult.length < BILL_FETCH_LIMIT) {
            setHasMore(false);
            console.log('useBillActivityFeed: Reached end of bills.');
        }

        setBills(prevBills => {
            // Combine and remove duplicates (using Set based on id)
            const allBills = isInitialLoad ? newBillsResult : [...prevBills, ...newBillsResult];
            const uniqueBillsMap = new Map(allBills.map(b => [b.id, b]));
            const uniqueBills = Array.from(uniqueBillsMap.values());
            // Re-sort everything by latest action date after combining and deduplicating
            uniqueBills.sort((a, b) => {
                const dateA = a.latestActionDate ? new Date(a.latestActionDate).getTime() : 0;
                const dateB = b.latestActionDate ? new Date(b.latestActionDate).getTime() : 0;
                return dateB - dateA; // Descending
            });
            return uniqueBills;
        });

        setOffset(currentOffset + BILL_FETCH_LIMIT); // Increment offset
      } else {
         console.warn(`useBillActivityFeed: Failed to fetch bills for offset ${currentOffset}.`);
         setHasMore(false); // Assume no more if fetch fails for a page?
      }

    } catch (err: any) {
      console.error('useBillActivityFeed: Error fetching activity:', err);
      setError(err.message || 'Failed to fetch recent bill activity.');
      if (isInitialLoad) setBills([]); 
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
      console.log('useBillActivityFeed: Fetching batch complete.');
    }
  }, [offset, hasMore, isLoading, isFetchingMore]);

  // Fetch initial data on mount
  useEffect(() => {
    fetchBills(true);
  }, []);

  // Handle foreground refresh
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('App came to foreground, refreshing bill activity feed...');
        fetchBills(true);
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [fetchBills]);

  // Function to load more bills
  const loadMoreBills = () => {
    if (hasMore && !isFetchingMore && !isLoading) {
        console.log('useBillActivityFeed: Loading more bills...');
        fetchBills(false);
    }
  };

  return {
    bills,
    isLoading,
    error,
    isFetchingMore,
    hasMore,
    refreshActivity: () => fetchBills(true),
    loadMoreActivity: loadMoreBills,
  };
}; 