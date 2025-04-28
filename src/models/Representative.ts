export type Chamber = 'House' | 'Senate' | 'Local';

export interface ContactInfo {
  email: string | null;
  phone: string | null;
  website: string | null;
  socialMedia: {
    twitter?: string;
    facebook?: string;
    // Add other platforms as needed
  } | null;
}

export interface CommitteeMembership {
  id: string;
  name: string;
  role?: string; // e.g., 'Chair', 'Member'
}

export interface Representative {
  id: string;
  fullName: string;
  photoUrl: string | null;
  chamber: Chamber;
  district: string | null; // Can be null for Senators, etc.
  stateCode: string | null; // Added state abbreviation (e.g., 'CA')
  party: string;
  bio: string | null;
  contactInfo: ContactInfo | null;
  committeeMemberships: CommitteeMembership[];
  // votes and upcomingVotes might be fetched separately or embedded
  // For simplicity now, let's assume IDs, they can be populated later
  voteIds?: string[];
  upcomingVoteBillIds?: string[];
} 