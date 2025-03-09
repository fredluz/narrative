import { useEffect, useRef } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useRouter, useSegments } from 'expo-router';
import { requireAuth } from '@/utils/auth';

export function AuthGuard() {
  const { session } = useSupabase();
  const segments = useSegments();
  const router = useRouter();
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    const inAuthGroup = segments[0] === 'auth';
    const currentUserId = session?.user?.id || null;
    
    if (previousUserId.current !== currentUserId) {
      const authResult = requireAuth(session, inAuthGroup);
      if (authResult?.redirect) {
        console.log(`Auth guard: Redirecting to ${authResult.redirect}`);
        router.replace(authResult.redirect);
      }
      previousUserId.current = currentUserId;
    }
  }, [session?.user?.id, segments]);

  return null;
}
