export interface Location {
  latitude: number | null;
  longitude: number | null;
  zipCode: string | null;
  city: string | null;
  state: string | null;
}

export interface NotificationPreferences {
  [repId: string]: { // Keyed by representative ID
    upcomingVotes: boolean;
    passedLegislation: boolean;
    breakingNews: boolean;
  };
}

// Combined User Profile and Auth Info
export interface UserProfile {
  id: string; // Corresponds to auth.users.id and profiles.id
  updated_at?: string;
  created_at?: string;
  email?: string; // Usually retrieved from auth.users

  // Location data from profiles table
  latitude?: number | null;
  longitude?: number | null;
  zip_code?: string | null;
  city?: string | null;
  state?: string | null;

  // Other profile fields can be added here later
}

// Potentially keep separate interfaces if needed elsewhere, but UserProfile is primary
// export interface Location { ... }

// App might also need info about followed reps, fetched separately
// export interface User { ... old structure ... } 