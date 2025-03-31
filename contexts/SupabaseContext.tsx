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
  console.log(`[SupabaseContext] PROVIDER CONSTRUCTOR: ${new Date().toISOString()}`);
  
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Tracks INITIAL load only
  const [isNewUser, setIsNewUser] = useState(false);
  const router = useRouter(); // Keep for potential error redirects

  // DEBUG: Track state changes
  useEffect(() => {
    console.log(`[SupabaseContext] STATE CHANGE - isLoading: ${isLoading} at ${new Date().toISOString()}`);
  }, [isLoading]);

  useEffect(() => {
    console.log(`[SupabaseContext] STATE CHANGE - session: ${session ? `User ${session.user.id}` : 'null'} at ${new Date().toISOString()}`);
  }, [session]);

  // DEBUG: Track component mounting/unmounting
  useEffect(() => {
    console.log(`[SupabaseContext] COMPONENT MOUNTED at ${new Date().toISOString()}`);
    
    // Debug memory usage
    if (typeof window !== 'undefined' && (window as any).performance && (window as any).performance.memory) {
      console.log(`[SupabaseContext] Memory usage at mount: `, (window as any).performance.memory);
    }
    
    return () => {
      console.log(`[SupabaseContext] COMPONENT UNMOUNTED at ${new Date().toISOString()}`);
      console.log(`[SupabaseContext] Final state at unmount - isLoading: ${isLoading}, session: ${session ? 'exists' : 'null'}`);
    };
  }, []);

  const checkIfNewUser = useCallback(async (userId: string) => {
    console.log(`[SupabaseContext] Checking if user ${userId} is new... at ${new Date().toISOString()}`);
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
      console.log(`[SupabaseContext] User ${userId} isNew: ${isNew} at ${new Date().toISOString()}`);
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
    console.log(`[SupabaseContext] Attempting manual session refresh at ${new Date().toISOString()}`);
    let refreshedSession: Session | null = null;
    try {
      // Prefer refreshSession as it uses the refresh token
      console.log('[SupabaseContext] Calling supabase.auth.refreshSession()');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.warn(`[SupabaseContext] Manual refreshSession failed at ${new Date().toISOString()}, trying getSession:`, refreshError.message);
        // Fallback to getSession if refresh fails (e.g., invalid refresh token)
        console.log('[SupabaseContext] Calling supabase.auth.getSession() as fallback');
        const { data: getData, error: getError } = await supabase.auth.getSession();
        if (getError) {
          console.error(`[SupabaseContext] Manual getSession failed after refresh failure at ${new Date().toISOString()}:`, getError);
          throw getError; // Throw if both fail
        }
        refreshedSession = getData.session;
      } else {
        refreshedSession = refreshData.session;
      }

      console.log(`[SupabaseContext] Manual refresh check result at ${new Date().toISOString()}:`, refreshedSession ? `Session active for ${refreshedSession.user.id}` : 'No session');
      console.log('[SupabaseContext] Session expiry:', refreshedSession?.expires_at ? new Date(refreshedSession.expires_at * 1000).toISOString() : 'n/a');
      console.log('[SupabaseContext] About to call setSession() with result');
      setSession(refreshedSession); // Update state immediately

      if (refreshedSession) {
        await checkIfNewUser(refreshedSession.user.id);
      } else {
        setIsNewUser(false);
      }
      return refreshedSession;

    } catch (error) {
      console.error(`[SupabaseContext] Error during manual session refresh at ${new Date().toISOString()}:`, error);
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
    console.log(`[SupabaseContext] Performing initial session fetch at ${new Date().toISOString()}`);
    console.log('[SupabaseContext] isLoading value at start of initialSessionFetch:', isLoading);
    // No need to set isLoading=true here, it starts as true
    try {
      // getSession is sufficient and lighter for initial check
      console.log('[SupabaseContext] Calling supabase.auth.getSession()');
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (error) {
        console.error(`[SupabaseContext] Initial getSession error at ${new Date().toISOString()}:`, error);
        setSession(null);
        setIsNewUser(false);
      } else {
        console.log(`[SupabaseContext] Initial getSession result at ${new Date().toISOString()}:`, currentSession ? `Session found for ${currentSession.user.id}` : 'No session');
        if (currentSession) {
          console.log('[SupabaseContext] Session details:', {
            userId: currentSession.user.id,
            expires_at: currentSession.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : 'session expires_at undefined',
            expires_in: currentSession.expires_at ? Math.floor((currentSession.expires_at * 1000 - Date.now()) / 1000) + ' seconds' : 'undefined',
            hasRefreshToken: !!currentSession.refresh_token,
          });
        }
        console.log('[SupabaseContext] About to call setSession() from initialSessionFetch');
        setSession(currentSession);
        if (currentSession) {
          await checkIfNewUser(currentSession.user.id);
        } else {
          setIsNewUser(false);
        }
      }
    } catch (e) {
      console.error(`[SupabaseContext] Unexpected error during initial session fetch at ${new Date().toISOString()}:`, e);
      setSession(null);
      setIsNewUser(false);
    } finally {
      console.log(`[SupabaseContext] Initial session fetch complete at ${new Date().toISOString()}`);
      console.log('[SupabaseContext] About to call setIsLoading(false) to mark initial loading as finished');
      setIsLoading(false); // Mark initial loading as finished
      console.log('[SupabaseContext] setIsLoading(false) called');
    }
  }, [checkIfNewUser]); // Depends on checkIfNewUser

  // Effect to run initial fetch and set up listener
  useEffect(() => {
    console.log(`[SupabaseContext] Setting up auth effect at ${new Date().toISOString()}`);
    console.log('[SupabaseContext] Calling initialSessionFetch()');
    initialSessionFetch(); // Run the initial check

    // Set up the listener for subsequent auth events
    console.log('[SupabaseContext] Setting up auth state change listener');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(`[SupabaseContext] Auth state changed: ${event} at ${new Date().toISOString()}`, newSession ? `User: ${newSession.user.id}` : 'No session');
      
      if (newSession) {
        console.log('[SupabaseContext] New session details in auth state change:', {
          userId: newSession.user.id,
          expires_at: newSession.expires_at ? new Date(newSession.expires_at * 1000).toISOString() : 'session expires_at undefined',
          expires_in: newSession.expires_at ? Math.floor((newSession.expires_at * 1000 - Date.now()) / 1000) + ' seconds' : 'undefined',
          hasRefreshToken: !!newSession.refresh_token,
          event: event
        });
      }

      // DEBUG: Critical - check if isLoading is still true at this point
      console.log(`[SupabaseContext] isLoading value during auth state change (${event}): ${isLoading}`);
      console.log('[SupabaseContext] About to call setSession() from auth state change handler');

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
            console.log(`[SupabaseContext] SIGNED_IN event, checking if user is new`);
            await checkIfNewUser(newSession.user.id);
        } else if (event === 'TOKEN_REFRESHED') {
            console.log(`[SupabaseContext] TOKEN_REFRESHED event at ${new Date().toISOString()}`);
        }
      } else {
        // Clear isNewUser if session becomes null (SIGNED_OUT or error)
        setIsNewUser(false);
      }
       // *** Crucially, DO NOT set isLoading here. ***
       console.log(`[SupabaseContext] Auth state change handler complete. isLoading remains: ${isLoading}`);
    });

    // Cleanup listener on unmount
    return () => {
      console.log(`[SupabaseContext] Unsubscribing from auth state changes at ${new Date().toISOString()}`);
      subscription.unsubscribe();
    };
  }, [initialSessionFetch, checkIfNewUser]); // Dependencies for setting up the effect

  // DEBUG: Track token expiry and auto-refresh
  useEffect(() => {
    if (!session) return;
    
    const checkTokenExpiry = () => {
      // Fix: Move the conditional console.log out of the expression to avoid breaking Rules of Hooks
      const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now(); // Convert to milliseconds
      if (!session.expires_at) {
        console.log('no session expiry date found');
      }
      
      const now = Date.now();
      const timeLeft = expiresAt - now;
      
      console.log(`[SupabaseContext] Token expiry check at ${new Date().toISOString()}:`, {
        expiresAt: new Date(expiresAt).toISOString(),
        timeLeft: Math.floor(timeLeft / 1000) + ' seconds',
        hasRefreshToken: !!session.refresh_token
      });
      
      // Log when token is about to expire
      if (timeLeft < 5 * 60 * 1000) { // 5 minutes
        console.log(`[SupabaseContext] TOKEN WILL EXPIRE SOON: ${Math.floor(timeLeft / 1000)} seconds left`);
      }
    };
    
    // Check immediately
    checkTokenExpiry();
    
    // Then check every minute
    const interval = setInterval(checkTokenExpiry, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [session]);

  // Provide the context value
  const value = {
    session,
    isLoading, // Now accurately reflects ONLY the initial load state
    isNewUser,
    checkIfNewUser,
    refreshSession, // Provide the manual refresh function
  };

  console.log(`[SupabaseContext] Rendering provider with values - isLoading: ${isLoading}, hasSession: ${!!session}, isNewUser: ${isNewUser} at ${new Date().toISOString()}`);

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => useContext(SupabaseContext);