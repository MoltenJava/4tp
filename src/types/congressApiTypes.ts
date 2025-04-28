/**
 * Simplified structure for a member object within API responses.
 */
export interface CongressGovMemberStub {
    bioguideId: string;
    name: string;
    // Add other fields if needed, e.g., party, state
}

/**
 * Structure for the response from /bill/{congress}/{type}/{number} endpoint.
 * Based on potential fields. Needs verification against actual API response.
 */
export interface CongressGovBillDetails {
    bill: {
        congress: number;
        type: string;
        number: string;
        originChamber: string;
        title: string;
        latestAction?: {
            actionDate: string; // YYYY-MM-DD
            text: string;
        };
        policyArea?: {
            name: string;
        };
        summary?: { // Might be nested further
            text: string;
        };
        sponsors?: CongressGovMemberStub[];
        cosponsors?: {
            count: number;
            // url to fetch full list?
        };
        committees?: { // Simplified
            name: string;
        }[];
        relatedBills?: {
            // Simplified structure
            congress: number;
            type: string;
            number: string;
            title: string;
        }[];
        updateDate?: string; // YYYY-MM-DDTHH:mm:ssZ
        // ... other fields like actions, constitutionalAuthorityStatementText etc.
    };
    // Other top-level fields? Like 'request', 'pagination'?
}

/**
 * Structure for a single vote record, potentially from /vote/ endpoint.
 * Needs verification against actual API response, especially regarding member positions.
 */
export interface CongressGovVoteRecord {
    vote: {
        congress: number;
        session: number;
        chamber: 'House' | 'Senate';
        rollCall: number; // e.g., 450
        date: string; // YYYY-MM-DDTHH:mm:ssZ
        question: string;
        description: string;
        result: string; // e.g., "Passed", "Failed"
        type: string; // e.g., "YEA-AND-NAY"
        bill?: { // Link to the bill if applicable
            congress: number;
            type: string;
            number: string;
            title?: string; // May or may not be present
        };
        // Member positions might be in a separate sub-object or endpoint
        // Assuming a simplified structure here if included directly
        positions?: {
            member: CongressGovMemberStub;
            votePosition: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
        }[];
        // ... other fields like amendments, requires, etc.
    };
    // Other top-level fields?
}

/**
 * Structure for a list response (e.g., from /vote or hypothetical /member/{id}/votes)
 */
export interface CongressGovListResponse<T> {
    // Check API - sometimes it's 'results', sometimes the object type like 'votes', 'bills'
    results?: T[]; 
    votes?: T[]; 
    bills?: T[];
    members?: T[]; // Adding members based on previous task
    pagination?: { // Optional pagination
        count: number;
        next?: string; // URL for next page
    };
    request?: { // Optional request info
        congress?: string;
        chamber?: string;
        // other request params
    };
}

// Type alias for a list of votes
export type CongressGovVoteListResponse = CongressGovListResponse<CongressGovVoteRecord>; 