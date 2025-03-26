import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router'; // Keep if needed for error redirects
import { personalityService } from '@/services/personalityService'; // Keep if checkIfNewUser uses it

interface SupabaseContextType {
  session: Session | null;
  /** ONLY true during the initial session check on app startup. */
  isLoading: boolean;
  isNewUser: boolean;
  checkIfNewUser: (userId: string) => Promise<boolean>;
  /** Manually triggers a session refresh attempt. */
  refreshSession: () => Promise<Session | null>;
}

const SupabaseContext = createContext<SupabaseContextType>({
  session: null,
  isLoading: true, // Start loading initially
  isNewUser: false,
  checkIfNewUser: async () => false,
  refreshSession: async () => null,
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Tracks INITIAL load only
  const [isNewUser, setIsNewUser] = useState(false);
  const router = useRouter(); // Keep for potential error redirects

  const checkIfNewUser = useCallback(async (userId: string) => {
    console.log(`[SupabaseContext] Checking if user ${userId} is new...`);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_personality')
        .eq('id', userId)
        .single();

      // PGRST116 = No rows found, which is expected for a new user profile fetch
      if (error && error.code !== 'PGRST116') {
          console.error('[SupabaseContext] Error fetching profile for new user check:', error);
          throw error; // Re-throw other errors
      }

      const isNew = !data?.ai_personality;
      console.log(`[SupabaseContext] User ${userId} isNew: ${isNew}`);
      setIsNewUser(isNew);
      return isNew;
    } catch (error) {
      console.error('[SupabaseContext] Unexpected error in checkIfNewUser:', error);
      setIsNewUser(false); // Default to not new on error
      return false;
    }
  }, []); // Empty dependency array - this function doesn't depend on component state

  // Function to manually refresh session state if needed (e.g., button click)
  // It attempts refreshSession first, then falls back to getSession.
  // It does NOT affect the initial isLoading state.
  const refreshSession = useCallback(async (): Promise<Session | null> => {
    console.log('[SupabaseContext] Attempting manual session refresh...');
    let refreshedSession: Session | null = null;
    try {
      // Prefer refreshSession as it uses the refresh token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.warn('[SupabaseContext] Manual refreshSession failed, trying getSession:', refreshError.message);
        // Fallback to getSession if refresh fails (e.g., invalid refresh token)
        const { data: getData, error: getError } = await supabase.auth.getSession();
        if (getError) {
          console.error('[SupabaseContext] Manual getSession failed after refresh failure:', getError);
          throw getError; // Throw if both fail
        }
        refreshedSession = getData.session;
      } else {
        refreshedSession = refreshData.session;
      }

      console.log('[SupabaseContext] Manual refresh check result:', refreshedSession ? 'Session active' : 'No session');
      setSession(refreshedSession); // Update state immediately

      if (refreshedSession) {
        await checkIfNewUser(refreshedSession.user.id);
      } else {
        setIsNewUser(false);
      }
      return refreshedSession;

    } catch (error) {
      console.error('[SupabaseContext] Error during manual session refresh:', error);
      setSession(null); // Clear session on critical error
      setIsNewUser(false);
      // Consider redirecting on specific auth errors if needed
      // if (error?.status === 401 || error?.message?.includes('invalid refresh token')) {
      //    router.replace('/auth');
      // }
      return null; // Indicate failure
    }
  }, [checkIfNewUser, router]); // Add router if used

  // Initial session fetch logic, runs only once on mount
  const initialSessionFetch = useCallback(async () => {
    console.log('[SupabaseContext] Performing initial session fetch...');
    // No need to set isLoading=true here, it starts as true
    try {
      // getSession is sufficient and lighter for initial check
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('[SupabaseContext] Initial getSession error:', error);
        setSession(null);
        setIsNewUser(false);
      } else {
        console.log('[SupabaseContext] Initial getSession result:', currentSession ? `Session found for ${currentSession.user.id}` : 'No session');
        setSession(currentSession);
        if (currentSession) {
          await checkIfNewUser(currentSession.user.id);
        } else {
          setIsNewUser(false);
        }
      }
    } catch (e) {
      console.error('[SupabaseContext] Unexpected error during initial session fetch:', e);
      setSession(null);
      setIsNewUser(false);
    } finally {
      console.log('[SupabaseContext] Initial session fetch complete.');
      setIsLoading(false); // Mark initial loading as finished
    }
  }, [checkIfNewUser]); // Depends on checkIfNewUser

  // Effect to run initial fetch and set up listener
  useEffect(() => {
    initialSessionFetch(); // Run the initial check

    // Set up the listener for subsequent auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(`[SupabaseContext] Auth state changed: ${event}`, newSession ? `User: ${newSession.user.id}` : 'No session');

      // Update session state directly from the event
      setSession(newSession);

      // Update isNewUser status based on the new session state
      if (newSession) {
        // Avoid redundant checks if the user ID hasn't actually changed (e.g., on TOKEN_REFRESHED)
        // Only check if it's a SIGNED_IN event or if the user ID is different from the previous session state
        // Note: Comparing session objects directly might be unreliable due to object references. Use IDs.
        // We need access to the *previous* session state here. Let's simplify for now:
        // Check if new on SIGNED_IN. For TOKEN_REFRESHED, assume user status (new/existing) is unchanged.
        if (event === 'SIGNED_IN') {
            await checkIfNewUser(newSession.user.id);
        }
      } else {
        // Clear isNewUser if session becomes null (SIGNED_OUT or error)
        setIsNewUser(false);
      }
       // *** Crucially, DO NOT set isLoading here. ***
    });

    // Cleanup listener on unmount
    return () => {
      console.log('[SupabaseContext] Unsubscribing from auth state changes.');
      subscription.unsubscribe();
    };
  }, [initialSessionFetch, checkIfNewUser]); // Dependencies for setting up the effect

  // Provide the context value
  const value = {
    session,
    isLoading, // Now accurately reflects ONLY the initial load state
    isNewUser,
    checkIfNewUser,
    refreshSession, // Provide the manual refresh function
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => useContext(SupabaseContext);