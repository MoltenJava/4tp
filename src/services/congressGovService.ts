import Constants from 'expo-constants';
import { Alert } from 'react-native';
import { Representative, Chamber } from '../models/Representative'; // Import our app model
import { Bill } from '../models/Bill'; // Import our app Bill model
import { Vote, VotePosition } from '../models/Vote'; // Import our app Vote model

// --- Interfaces for Congress.gov API Response --- (Based on /member endpoint)
interface CongressGovDepiction {
  attribution?: string;
  imageUrl?: string;
}

interface CongressGovTerm {
  chamber?: string; // "House of Representatives", "Senate"
  startYear?: number;
  endYear?: number | null;
}

interface CongressGovMember {
  bioguideId: string;
  depiction?: CongressGovDepiction;
  district?: number | null; // District number for House reps
  name: string;
  partyName?: string;
  state?: string;
  terms?: {
    item?: CongressGovTerm[];
  };
  updateDate?: string;
  url?: string; // Link to member details on congress.gov API
}

interface CongressGovResponse {
  members: CongressGovMember[];
  // pagination info etc.
}

// --- NEW Vote List Interfaces (Add these near other interfaces) ---
// Based on https://api.congress.gov/#/vote/vote_list structure

interface CongressGovVoteListItem {
  congress: number;
  chamber: 'House' | 'Senate';
  sessionNumber: number;
  rollCallNumber: number;
  voteType: string; // e.g., "YEA-AND-NAY", "RECORDED VOTE"
  voteTimestamp: string; // ISO 8601 format "YYYY-MM-DDTHH:mm:ssZ"
  voteQuestionText: string; // e.g., "On Passage"
  description: string; // More descriptive text about the vote
  bill?: { // Bill related to the vote, if applicable
    congress: number;
    type: string; // "HR", "S", etc.
    number: string;
  };
  // Note: Member position is NOT available in the list endpoint response
}

interface CongressGovVoteListResponse {
  votes: CongressGovVoteListItem[];
  // pagination info etc. might be present
  pagination?: {
    count: number;
    next?: string;
  };
  request?: {
    congress: string;
    chamber: string;
  };
}

// --- Interface for Bill Details API Response (Define locally) ---
// Based on fields used in parseCongressGovBillDetails
interface CongressGovBillAction {
    actionDate?: string;
    text?: string;
}

interface CongressGovBillPolicyArea {
    name?: string;
}

interface CongressGovBillSponsor {
    bioguideId?: string;
    // ... other sponsor details if needed ...
}

interface CongressGovBillSummary {
    text?: string;
    // ... other summary details if needed ...
}

interface CongressGovSingleBillData {
    congress: number;
    type: string;
    number: string;
    title: string;
    summary?: CongressGovBillSummary;
    latestAction?: CongressGovBillAction;
    policyArea?: CongressGovBillPolicyArea;
    sponsors?: CongressGovBillSponsor[];
    // Add other fields from API as needed, e.g., for fullTextUrl
    // textVersions?: { items?: { formats?: { url: string }[] }[] };
}

interface CongressGovBillDetails {
    bill: CongressGovSingleBillData;
    // ... other top-level fields if needed ...
}

// --- Interfaces for Bill List API Response --- 
interface CongressGovBillListItem {
    congress: number;
    latestAction?: {
        actionDate?: string;
        text?: string;
    };
    number: string;
    originChamber?: string;
    title: string;
    type: string;
    updateDate?: string;
    url?: string; // Link to the detailed bill API endpoint
}

interface CongressGovBillListResponse {
    bills: CongressGovBillListItem[];
    pagination?: {
        count: number;
        next?: string;
    };
}

// --- Parsing Function --- 
function parseCongressGovResponse(apiResponse: CongressGovResponse): Representative[] {
  if (!apiResponse?.members) {
    return [];
  }

  return apiResponse.members.map((member) => {
    // Determine chamber from terms
    let chamber: Chamber = 'Local'; // Default, should be overwritten
    const latestTerm = member.terms?.item?.[member.terms.item.length - 1]; // Assume last term is current
    if (latestTerm?.chamber === 'House of Representatives') chamber = 'House';
    else if (latestTerm?.chamber === 'Senate') chamber = 'Senate';

    // Basic contact info - often limited in this specific endpoint
    // More details might be on the member-specific URL provided in the response
    const contactInfo = {
        email: null, // Not directly available
        phone: null, // Not directly available
        website: null, // Not directly available
        socialMedia: null // Not directly available
    }

    const rep: Representative = {
      id: member.bioguideId, // Use bioguideId as the primary ID
      fullName: member.name,
      photoUrl: member.depiction?.imageUrl || null,
      chamber: chamber,
      district: member.district?.toString() ?? null,
      stateCode: member.state || null, // Map state from API response
      party: member.partyName || 'Unknown',
      bio: null, // Not available in this response
      contactInfo: contactInfo,
      committeeMemberships: [], // Needs separate API call
      // voteIds, upcomingVoteBillIds not available here
    };
    return rep;
  });
}

const API_KEY = Constants.expoConfig?.extra?.congressGovApiKey;
const BASE_URL = 'https://api.congress.gov/v3';

if (!API_KEY) {
  console.error(
    'Error: Congress.gov API Key not found. Make sure GOV_API_KEY is set in .env'
  );
  // Alert.alert('Configuration Error', 'Congress.gov API Key is missing.');
}

// Internal generic fetch function - unchanged
const fetchCongressGovData = async (path: string, params?: Record<string, string>): Promise<any | null> => {
  // --- DEBUGGING: Log the key being used --- 
  console.log('Using Congress.gov API Key:', API_KEY ? `'${API_KEY}'` : '(Not Found)');
  // --- END DEBUGGING ---
  
  if (!API_KEY) {
    console.error('Cannot call Congress.gov API: API Key is missing.');
    Alert.alert('Configuration Error', 'Congress.gov API Key is missing.');
    return null;
  }

  const urlParams = new URLSearchParams({
    api_key: API_KEY,
    format: 'json',
    ...params, // Add any additional params
  });

  const endpoint = `${BASE_URL}/${path}?${urlParams.toString()}`;
  console.log(`Fetching from Congress.gov API: /${path}`);

  try {
    const response = await fetch(endpoint);
    // api.congress.gov might return 429 for rate limits, handle specific statuses
    if (response.status === 429) {
        console.warn('Congress.gov API rate limit likely exceeded.');
        Alert.alert('API Limit', 'Representative service is temporarily unavailable. Please try again later.');
        return null;
    }
    // Handle other errors
    if (!response.ok) {
       const errorData = await response.text(); // Get text for non-JSON errors
       console.error(`Congress.gov API Error (${response.status}):`, errorData);
       Alert.alert('API Error', `Could not fetch data from /${path} (Status: ${response.status})`);
       return null;
    }

    const data = await response.json();
    console.log(`Congress.gov API Response OK for path: /${path}`);
    return data; // Contains a 'members' array

  } catch (error) {
    console.error(`Network or fetch error calling Congress.gov API /${path}:`, error);
    Alert.alert('Network Error', 'Could not connect to the federal information service.');
    return null;
  }
};

/**
 * Fetches the US House Representative and parses the result.
 */
export const getHouseRepByDistrict = async (
    stateCode: string,
    district: number | string
): Promise<Representative[] | null> => {
  if (!stateCode || district === null || district === undefined) return null;
  // Path adjusted to match previous implementation for member lookup
  const rawData = await fetchCongressGovData(`member/${stateCode}/${district}`); 
  if (!rawData) return null;
  return parseCongressGovResponse(rawData as CongressGovResponse);
};

/**
 * Fetches the US Senators for a state and parses the result.
 * (Endpoint path assumption needs verification)
 */
export const getSenatorsByState = async (
    stateCode: string
): Promise<Representative[] | null> => {
  if (!stateCode) return null;
  console.warn('getSenatorsByState endpoint path needs verification. Using /member/{stateCode}');
  // Path adjusted to match previous implementation for member lookup
  const rawData = await fetchCongressGovData(`member/${stateCode}`); 
  if (!rawData) return null;
   const parsed = parseCongressGovResponse(rawData as CongressGovResponse);
   return parsed.filter(rep => rep.chamber === 'Senate');
};

// --- NEW Parsing Function for Bill Details --- 
function parseCongressGovBillDetails(apiResponse: CongressGovBillDetails): Bill | null {
    const billData = apiResponse?.bill;
    if (!billData) {
        console.warn('parseCongressGovBillDetails: No bill data found in response');
        return null;
    }

    // Construct the app-specific Bill object
    const parsedBill: Bill = {
        id: `${billData.congress}-${billData.type}-${billData.number}`, // Create unique ID
        title: billData.title,
        summary: billData.summary?.text || null, // Extract summary text
        fullTextUrl: null, // Need to find where this URL is in the API response, if available
        status: billData.latestAction?.text || 'Unknown', // Use latest action text as status proxy
        latestActionText: billData.latestAction?.text || null,
        latestActionDate: billData.latestAction?.actionDate || null,
        policyArea: billData.policyArea?.name || null,
        sponsorId: billData.sponsors?.[0]?.bioguideId || null, // Assuming first sponsor is primary
    };

    // TODO: Find the correct field for fullTextUrl in the API response structure.
    // It might be under 'textVersions' or similar, requiring another look at the API docs or sample responses.

    return parsedBill;
}

/**
 * Fetches detailed information for a specific bill.
 * Ref: https://api.congress.gov/#/bill/bill_item
 * @param congress - e.g., 118
 * @param billType - e.g., 'hr'
 * @param billNumber - e.g., 1234
 * @returns Parsed Bill Details or null.
 */
export const getBillDetails = async (
    congress: number | string,
    billType: string,
    billNumber: number | string
): Promise<Bill | null> => { // Return our app model
    const path = `bill/${congress}/${billType.toLowerCase()}/${billNumber}`;
    const rawData: CongressGovBillDetails | null = await fetchCongressGovData(path);
    if (!rawData) return null; // Check if fetch failed
    
    return parseCongressGovBillDetails(rawData); // Use the new parser
};

// --- NEW Parsing Function for Vote List ---
function parseCongressGovVotesList(apiResponse: CongressGovVoteListResponse): Vote[] {
  if (!apiResponse?.votes) {
    console.warn('parseCongressGovVotesList: No votes array found in response');
    return [];
  }

  return apiResponse.votes.map((voteItem) => {
    const billId = voteItem.bill
      ? `${voteItem.bill.congress}-${voteItem.bill.type.toLowerCase()}-${voteItem.bill.number}`
      : null;

    // Map API chamber ('House'/'Senate') to our Chamber type
    let chamber: Chamber;
    if (voteItem.chamber === 'House') chamber = 'House';
    else if (voteItem.chamber === 'Senate') chamber = 'Senate';
    else chamber = 'Local'; // Should not happen for congress.gov votes

    const parsedVote: Vote = {
      // Create a unique ID for the vote record itself
      id: `${voteItem.congress}-${voteItem.chamber}-${voteItem.sessionNumber}-${voteItem.rollCallNumber}`,
      billId: billId,
      repId: null, // Member ID is not part of this list response
      chamber: chamber,
      voteDate: voteItem.voteTimestamp,
      position: null, // Member position is not part of this list response
      // Use description if available, fallback to question text
      summary: voteItem.description || voteItem.voteQuestionText || 'No description provided',
    };
    return parsedVote;
  });
}

/**
 * Fetches recent votes for a specific chamber and congress.
 * Ref: https://api.congress.gov/#/vote/vote_list
 * @param chamber - 'House' or 'Senate'
 * @param congress - e.g., 118
 * @param limit - Number of votes to return (max 250)
 * @param offset - Offset for pagination
 * @returns Parsed list of Vote objects or null.
 */
export const getRecentVotes = async (
    chamber: Chamber,
    congress: number | string,
    limit: number = 50, // Default to 50 recent votes
    offset: number = 0 // Add offset parameter
): Promise<Vote[] | null> => {
    // Use the base /vote path
    const path = 'vote';
    
    const params: Record<string, string> = {
        chamber: chamber, // Send chamber as query param
        congress: congress.toString(), // Send congress as query param
        limit: limit.toString(),
        offset: offset.toString(),
        sort: 'date desc', // Specify sort order
    };

    console.log(`Fetching from Congress.gov API Path: /${path} with params:`, params); // Log path and params

    const rawData: CongressGovVoteListResponse | null = await fetchCongressGovData(path, params);
    if (!rawData) {
        console.error(`Failed to fetch recent votes for ${chamber} ${congress}`);
        return null; // Check if fetch failed
    }

    return parseCongressGovVotesList(rawData); // Use the vote list parser
};

// --- NEW Parsing Function for Bill List --- 
function parseCongressGovBillList(apiResponse: CongressGovBillListResponse): Bill[] {
    if (!apiResponse?.bills) {
        console.warn('parseCongressGovBillList: No bills array found in response');
        return [];
    }

    return apiResponse.bills.map((billItem) => {
        // Attempt to construct the same ID format used elsewhere
        const billId = `${billItem.congress}-${billItem.type.toLowerCase()}-${billItem.number}`;
        
        // Find the full text URL from the detailed API endpoint URL if possible
        // Note: This is brittle, depends on the API URL structure remaining consistent
        const detailApiUrl = billItem.url;
        let potentialFullTextUrl: string | null = null;
        if (detailApiUrl && detailApiUrl.includes('/bill/')) {
            // A common pattern might be to add /text, but this requires verification/fetching separately
            // For now, we leave it null as the list endpoint doesn't provide it directly.
        }

        const parsedBill: Bill = {
            id: billId,
            title: billItem.title,
            summary: null, // Summary not typically in list view
            fullTextUrl: potentialFullTextUrl, // Likely null from this endpoint
            status: billItem.latestAction?.text || 'Status Unknown',
            latestActionText: billItem.latestAction?.text || null,
            latestActionDate: billItem.latestAction?.actionDate || null,
            policyArea: null, // Not in list view
            sponsorId: null, // Not in list view
        };
        return parsedBill;
    });
}

// --- NEW function to get recent bills --- 
/**
 * Fetches recent bills sorted by latest action date.
 * Ref: https://api.congress.gov/#/bill/bill_list (approximated)
 * @param limit - Number of bills to return (max 250)
 * @param offset - Offset for pagination
 * @returns Parsed list of Bill objects or null.
 */
export const getRecentBills = async (
    limit: number = 20,
    offset: number = 0
): Promise<Bill[] | null> => {
    const path = 'bill';
    const params: Record<string, string> = {
        limit: limit.toString(),
        offset: offset.toString(),
        sort: 'updateDate+desc', // Sort by update date as latestAction isn't a direct sort key
    };

    console.log(`Fetching from Congress.gov API Path: /${path} with params:`, params);
    const rawData: CongressGovBillListResponse | null = await fetchCongressGovData(path, params);

    // --- DEBUG: Log raw bill data --- 
    if (rawData?.bills) {
        console.log(`Raw bills received (showing first ${Math.min(5, rawData.bills.length)}):`, JSON.stringify(rawData.bills.slice(0, 5), null, 2));
        // Check if any Senate bills are in the raw batch
        const senateBillsCount = rawData.bills.filter(b => b.originChamber === 'Senate' || b.type?.toUpperCase() === 'S').length;
        console.log(`Found ${senateBillsCount} Senate bill(s) in this raw batch of ${rawData.bills.length}.`);
    } else {
        console.log('No raw bill data received from API.');
    }
    // --- END DEBUG ---

    if (!rawData) {
        console.error(`Failed to fetch recent bills`);
        return null;
    }

    return parseCongressGovBillList(rawData);
};

// --- Keep getBillDetails as it's used by BillDetailScreen --- 
// export const getBillDetails = async (...) => { ... };

// --- Remove or comment out getRecentVotes and its parser/interfaces --- 
/*
interface CongressGovVoteListItem { ... }
interface CongressGovVoteListResponse { ... }
function parseCongressGovVotesList(...) { ... }
export const getRecentVotes = async (...) => { ... };
*/