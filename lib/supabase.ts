import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

const SUPABASE_URL = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase key length:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0);

// Get the current URL for auth redirects
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
  return 'questlog://';
};

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: { 
        'x-client-info': 'questlog',
      },
    },
  })

// Configure auth callbacks
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Handle successful sign in
    console.log('User signed in:', session.user?.id);
  } else if (event === 'SIGNED_OUT') {
    // Handle sign out
    console.log('User signed out');
  }
});
