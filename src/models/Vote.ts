import { Chamber } from './Representative';

export type VotePosition = 'Yea' | 'Nay' | 'Abstain' | 'Not Voting';

export interface Vote {
  id: string;
  billId: string | null; // Can be null if vote not tied to a specific bill
  repId: string | null; // Will be null when fetching general votes
  chamber: Chamber;
  voteDate: string; // ISO 8601 date string recommended
  position: VotePosition | null; // Will be null when fetching general votes
  summary: string | null; // AI-generated summary or vote question/description
} 