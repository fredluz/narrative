import { useEffect, useRef } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useRouter, useSegments } from 'expo-router';
import { requireAuth } from '@/utils/auth';

export function AuthGuard() {
  const { session, isLoading } = useSupabase();
  const segments = useSegments();
  const router = useRouter();
  const previousUserId = useRef<string | null>(null);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Skip authentication check while Supabase is still loading the session
    if (isLoading) {
      return;
    }

    const inAuthGroup = segments[0] === 'auth';
    const currentUserId = session?.user?.id || null;
    
    // Only process redirects when:
    // 1. The user ID has changed (login/logout occurred)
    // 2. We haven't already processed a redirect for this route
    if (previousUserId.current !== currentUserId || !hasRedirected.current) {
      const authResult = requireAuth(session, inAuthGroup);
      
      if (authResult?.redirect) {
        console.log(`Auth guard: Redirecting to ${authResult.redirect} (from ${segments.join('/')})`);
        hasRedirected.current = true;
        router.replace(authResult.redirect);
      } else {
        // No redirect needed, mark as processed
        hasRedirected.current = true;
      }
      
      previousUserId.current = currentUserId;
    }
    
    return () => {
      // Reset the redirect flag when segments change
      if (segments.length > 0) {
        hasRedirected.current = false;
      }
    };
  }, [session?.user?.id, segments, isLoading, router]);

  return null;
}
