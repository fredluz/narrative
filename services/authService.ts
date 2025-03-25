import { supabase } from '@/lib/supabase';
import { Provider } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Register the WebBrowser for redirects
WebBrowser.maybeCompleteAuthSession();

// Create a redirect URI based on the platform and environment
const createRedirectURL = () => {
  // For web platform
  if (Platform.OS === 'web') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // For production environments (not localhost)
    if (hostname !== 'localhost' && !hostname.includes('192.168.') && !hostname.includes('127.0.0.1')) {
      // If it's the preview URL with the unique ID
      if (hostname.includes('--dq4rj9xk2v.expo.app')) {
        return `${protocol}//narrative--dq4rj9xk2v.expo.app/auth/callback`;
      }
      
      // For the production URL
      if (hostname.includes('narrative.expo.app')) {
        return `${protocol}//narrative.expo.app/auth/callback`;
      }
      
      // Fallback to using current origin if it's another production URL
      return `${protocol}//${hostname}/auth/callback`;
    }
    
    // For local development
    return `${window.location.origin}/auth/callback`;
  }

  // For mobile, use the app scheme
  return makeRedirectUri({
    scheme: 'questlog',
    path: 'auth/callback',
  });
};

export const authService = {
  // Sign in with email and password
  async signInWithPassword(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error signing in:', error);
      return { data: null, error };
    }
  },

  // Sign up with email and password
  async signUpWithPassword(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error signing up:', error);
      return { data: null, error };
    }
  },

  // Sign in with OAuth provider (Google)
  async signInWithOAuth(provider: Provider) {
    try {
      const redirectURL = createRedirectURL();
      console.log('Using redirect URL:', redirectURL);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          skipBrowserRedirect: Platform.OS !== 'web', // Only skip for mobile
          redirectTo: redirectURL,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
      
      if (Platform.OS === 'web') {
        // For web, Supabase handles the redirect
        return { data, error: null };
      }
      
      // For mobile, handle the OAuth flow manually
      if (!data?.url) throw new Error('No URL returned from signInWithOAuth');
      
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectURL,
        { showInRecents: true }
      );
      
      if (result.type === 'success' && result.url) {
        const { url } = result;
        // Extract the code from the URL
        const params = new URL(url).searchParams;
        const code = params.get('code');
        
        if (!code) {
          throw new Error('No code parameter found in redirect URL');
        }
        
        // Exchange the code for a session
        console.log('Exchanging code for session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (sessionError) throw sessionError;
        return { data: sessionData, error: null };
      } else {
        throw new Error('Authentication cancelled or failed');
      }
    } catch (error: any) {
      console.error('Error signing in with OAuth:', error);
      return { data: null, error };
    }
  },

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('Error signing out:', error);
      return { error };
    }
  },

  // Get current session
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error getting session:', error);
      return { data: null, error };
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { user: data.user, error: null };
    } catch (error: any) {
      console.error('Error getting current user:', error);
      return { user: null, error };
    }
  }
};

// Helper function to extract tokens from URL
function extractTokensFromUrl(url: string): { accessToken?: string; refreshToken?: string } {
  const params = new URLSearchParams(url.split('#')[1]);
  return {
    accessToken: params.get('access_token') || undefined,
    refreshToken: params.get('refresh_token') || undefined,
  };
}