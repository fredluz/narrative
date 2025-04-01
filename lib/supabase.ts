import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
// Clerk import removed as token handling will shift to sign-in flow

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase key length:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0);

// Get the current URL for auth redirects (Keep for potential future use, though Clerk handles redirects now)
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

// Simplified client initialization
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      // Keep AsyncStorage for potential Supabase session persistence if needed by native integration
      storage: AsyncStorage,
      autoRefreshToken: false, // Let Supabase handle its session refresh if signInWithIdToken is used
      persistSession: true,    // Allow Supabase to persist its session after signInWithIdToken
      detectSessionInUrl: false, // Clerk handles the URL detection
    },
    global: {
      headers: {
         'x-client-info': 'questlog-expo-clerk-native', // Indicate native integration approach
      },
    },
  }
);

// Supabase onAuthStateChange listener might be needed again depending on how native integration is implemented
// We can add it back later if required.
