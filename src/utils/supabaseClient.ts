import 'react-native-url-polyfill/auto'; // Required for Supabase to work in React Native
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
// Import directly from @env (react-native-dotenv)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Adapter for using SecureStore as Supabase storage
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};

// Use imported variables
const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

// Check if the variables were loaded correctly
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Error: Supabase URL or Anon Key not loaded from .env. Check .env file and babel.config.js setup.'
  );
  // It's crucial these exist, maybe throw an error
  throw new Error('Supabase environment variables not found!');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: ExpoSecureStoreAdapter as any, // Cast to any to bridge type differences if necessary
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
); 