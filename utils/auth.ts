import { Session } from '@supabase/supabase-js';

export function assertSession(session: Session | null): asserts session is Session {
  if (!session) {
    console.error('Auth guard: Session validation failed - no active session');
    throw new Error('User is not authenticated');
  }

  if (!session.user?.id) {
    console.error('Auth guard: Session validation failed - no user ID');
    throw new Error('Invalid session: missing user ID');
  }

  console.log('Auth guard: Session validated for user', session.user.id);
}

export function verifyOwnership(ownerId: string | undefined, sessionUserId: string | undefined): boolean {
  if (!ownerId || !sessionUserId) {
    console.warn('Ownership verification failed: missing ID');
    return false;
  }
  return ownerId === sessionUserId;
}

export function requireAuth(
  session: Session | null, 
  inAuthGroup: boolean,
  isNewUser?: boolean
): { redirect: string } | null {
  const currentUserId = session?.user?.id;
  
  // Handle unauthenticated users
  if (!currentUserId && !inAuthGroup) {
    // Redirect to auth index when not authenticated and not already in auth group
    return { redirect: '/auth/' };
  }
  
  // Handle authenticated users in auth screens
  if (currentUserId && inAuthGroup) {
    // Redirect to landing page when authenticated but in auth group
    return { redirect: '/landing' };
  }

  // Handle new users who need onboarding (only when authenticated and not in auth or onboarding)
  const inOnboarding = window.location.pathname.includes('/onboarding');
  if (currentUserId && isNewUser && !inAuthGroup && !inOnboarding) {
    return { redirect: '/onboarding' };
  }

  return null;
}

export function requireOwnership(session: Session | null, ownerId?: string) {
  if (!session?.user?.id || !ownerId) {
    return {
      allowed: false,
      message: "You don't have permission to view this content."
    };
  }
  
  return {
    allowed: session.user.id === ownerId,
    message: session.user.id !== ownerId ? "You don't have permission to view this content." : null
  };
}
