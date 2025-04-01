import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { getClerkInstance } from '@clerk/clerk-expo'; // Import getClerkInstance

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase key length:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0);

// Get the current URL for auth redirects (Less relevant now)
const getURL = () => {
  if (Platform.OS === 'web') {
    const url = new URL(window.location.href);
    const hostname = url.hostname;

    // Handle localhost
    if (hostname === 'localhost') {
      return `http://${hostname}:8001`;
    }

    // Handle production domains
    return `https://${hostname}`;
  }
  return 'narrative://'; // Updated to reflect the new name
};

// Client initialization using accessToken function with getClerkInstance
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  { // Main options object starts here
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: false, // Clerk handles refresh
      persistSession: false,   // **Important: Don't persist Supabase sessions**
      detectSessionInUrl: false,
    },
    global: {
      headers: {
         'x-client-info': 'questlog-expo-clerk-getinstance-v2', // Indicate this attempt
      },
    },
    // Add accessToken directly within the main options object
    accessToken: async () => {
      try {
        const clerkInstance = getClerkInstance(); // Get initialized instance
        // Get token WITHOUT template name
        const token = await clerkInstance.session?.getToken();
        console.log("[SupabaseClient] Clerk token fetched via getClerkInstance:", token ? 'Token retrieved' : 'No token/session');
        return token ?? null;
      } catch (error) {
        console.error("[SupabaseClient] Error getting Clerk token via getClerkInstance:", error);
        return null;
      }
    },
  } // Main options object ends here
);

// Removed Supabase onAuthStateChange listener as Clerk handles auth state.
// Ensure native handshake logic is removed from _layout.tsx as this should handle token injection.
