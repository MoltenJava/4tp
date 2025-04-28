/**
 * Represents a legislative bill within the application.
 * Based on requirements from PRD.txt and potential data from congress.gov.
 */
export interface Bill {
  id: string; // Unique identifier (e.g., 118-hr-1234)
  title: string; // Official title
  summary: string | null; // Simplified summary (could be AI-generated later or from API)
  fullTextUrl: string | null; // Link to the full text (e.g., on congress.gov)
  status: string; // Current status (e.g., 'Introduced', 'Passed House', 'Became Law')
  latestActionText: string | null; // Text of the latest action
  latestActionDate: string | null; // Date of the latest action (YYYY-MM-DD)
  policyArea: string | null; // e.g., 'Health', 'Armed Forces and National Security'
  sponsorId: string | null; // Bioguide ID of the primary sponsor
  // Potentially add more fields later: sponsors list, cosponsor count, related bills, etc.
} 