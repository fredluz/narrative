import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { personalityService } from '@/services/personalityService';

interface SupabaseContextType {
  session: Session | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  isNewUser: boolean;
  checkIfNewUser: (userId: string) => Promise<boolean>;
}

const SupabaseContext = createContext<SupabaseContextType>({
  session: null,
  isLoading: true,
  refreshSession: async () => {},
  isNewUser: false,
  checkIfNewUser: async () => false,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const router = useRouter();
  
  // Use a ref to track if we need to refresh
  const sessionExpiryTimeout = useRef<NodeJS.Timeout | null>(null);

  // Check if user is new (no ai_personality set)
  const checkIfNewUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_personality')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      // User is new if ai_personality is null, undefined or empty string
      const isNew = !data?.ai_personality;
      setIsNewUser(isNew);
      return isNew;
    } catch (error) {
      console.error('Error checking if user is new:', error);
      return false;
    }
  }, []);

  // Function to refresh the session state
  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      console.log('Session refresh:', currentSession ? 'Session exists' : 'No session');
      
      if (currentSession) {
        // Log session expiry time for debugging
        const expiresAt = new Date(currentSession.expires_at! * 1000);
        console.log(`Session will expire at: ${expiresAt.toLocaleString()}`);
        
        // Check if this is a new user
        await checkIfNewUser(currentSession.user.id);
      }
      
      setSession(currentSession);
      
      // Schedule session refresh before expiry if we have a session
      scheduleSessionRefresh(currentSession);
    } catch (error) {
      console.error('Error refreshing session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [checkIfNewUser]);
  
  // Schedule a session refresh before the token expires
  const scheduleSessionRefresh = useCallback((currentSession: Session | null) => {
    // Clear any existing timeout
    if (sessionExpiryTimeout.current) {
      clearTimeout(sessionExpiryTimeout.current);
      sessionExpiryTimeout.current = null;
    }
    
    // If no session, nothing to schedule
    if (!currentSession) return;
    
    try {
      // Get expiry time from the session (in seconds)
      const expiresAt = currentSession.expires_at;
      if (!expiresAt) return;
      
      // Calculate when to refresh (60 seconds before expiry)
      const expiryDate = new Date(expiresAt * 1000);
      const now = new Date();
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();
      const refreshTime = Math.max(timeUntilExpiry - 60000, 0); // 60 seconds before expiry, minimum 0
      
      if (refreshTime <= 0) {
        // Token is already expired or about to expire, refresh now
        refreshSession();
        return;
      }
      
      console.log(`Scheduling session refresh in ${Math.round(refreshTime / 1000)} seconds`);
      
      // Set timeout to refresh session before it expires
      sessionExpiryTimeout.current = setTimeout(() => {
        console.log('Executing scheduled session refresh');
        supabase.auth.refreshSession().then(({ data, error }) => {
          if (error) {
            console.error('Error refreshing session:', error);
            return;
          }
          
          if (data.session) {
            console.log('Session refreshed successfully');
            setSession(data.session);
            // Schedule the next refresh
            scheduleSessionRefresh(data.session);
          }
        });
      }, refreshTime);
    } catch (e) {
      console.error('Error scheduling session refresh:', e);
    }
  }, [refreshSession]);

  useEffect(() => {
    // Initialize session
    refreshSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event, newSession ? 'Session exists' : 'No session');
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        
        if (newSession) {
          const expiresAt = new Date(newSession.expires_at! * 1000).toLocaleString();
          console.log(`User ${newSession.user.id} authenticated until ${expiresAt}`);
          
          // Check if user is new when they sign in
          if (event === 'SIGNED_IN') {
            await checkIfNewUser(newSession.user.id);
          }
          
          // Schedule refresh for this new session
          scheduleSessionRefresh(newSession);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setIsNewUser(false);
        
        // Clear any scheduled refresh
        if (sessionExpiryTimeout.current) {
          clearTimeout(sessionExpiryTimeout.current);
          sessionExpiryTimeout.current = null;
        }
      }
    });

    return () => {
      // Clean up the auth subscription
      subscription.unsubscribe();
      
      // Clear any scheduled refresh
      if (sessionExpiryTimeout.current) {
        clearTimeout(sessionExpiryTimeout.current);
        sessionExpiryTimeout.current = null;
      }
    };
  }, [scheduleSessionRefresh, checkIfNewUser]);

  const value = {
    session,
    isLoading,
    refreshSession,
    isNewUser,
    checkIfNewUser,
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => useContext(SupabaseContext);
