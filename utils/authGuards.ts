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

  // Log successful validation for debugging
  console.log('Auth guard: Session validated for user', session.user.id);
}

/**
 * Helper to verify data ownership
 * Use this for component-level ownership checks
 */
export function verifyOwnership(ownerId: string | undefined, sessionUserId: string | undefined): boolean {
  if (!ownerId || !sessionUserId) {
    console.warn('Ownership verification failed: missing ID');
    return false;
  }
  return ownerId === sessionUserId;
}
