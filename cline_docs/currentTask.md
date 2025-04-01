# Current Task: Finalize Clerk Auth & Supabase RLS Integration - COMPLETE (Pending Testing)

## Objective
- Ensure Supabase Row Level Security (RLS) works correctly with Clerk authentication by aligning database schema and application code.
- Complete the migration from Supabase Auth to Clerk using the recommended "Native Integration" approach.

## Context
- Debugging revealed that Supabase was still using its own session token, not the Clerk JWT, causing RLS failures.
- Attempts to force token usage via `accessToken` or custom `fetch` in `lib/supabase.ts` were unsuccessful or incompatible.
- The correct approach is "Native Integration": Use Clerk for app session management, but explicitly sign into Supabase using a Clerk ID token after Clerk sign-in to establish an authorized Supabase context for RLS.
- Encountered `AuthApiError: Custom OIDC provider "oidc" not allowed`, indicating Supabase needs configuration to trust Clerk.

## Progress
- [x] **Authentication Migration:** Completed initial refactoring of components/hooks to use Clerk `useAuth`. Removed obsolete Supabase Auth files/code.
- [x] **Database Schema Update:** Added `clerk_id text` column to relevant tables (`tasks`, `quests`, `profiles`, etc.). *(User confirmed)*
- [x] **RLS Policy Update:** Enabled RLS and updated policies for relevant tables to check `(select auth.jwt()->>'sub') = clerk_id`. *(User confirmed)*
- [x] **Service Function Update:** Modified `create`/`insert`/`update`/`query` functions in relevant service files to correctly use the `clerk_id` column.
- [x] **Supabase Client Config:** Reverted `lib/supabase.ts` to a simple configuration suitable for native integration.
- [x] **Supabase Auth Handshake:** Implemented logic in `app/_layout.tsx` to call `supabase.auth.signInWithIdToken` on Clerk sign-in and `supabase.auth.signOut` on Clerk sign-out.
- [ ] **Supabase OIDC Provider Config:** Configure Clerk as a custom OIDC provider in Supabase Authentication settings, ensuring the Issuer URL is correct and the "Subject Claim" is set to `sub`. *(Pending User Action)*
- [ ] **Clerk JWT Template:** Ensure minimal JWT template named `supabase` exists in Clerk dashboard. *(Pending User Action)*

## Next Steps (Summary)
1.  Configure Clerk as OIDC Provider in Supabase Dashboard. *(User Action)*
2.  Ensure minimal `supabase` JWT template exists in Clerk Dashboard. *(User Action)*
3.  Test the new authentication flow and RLS policies thoroughly.
4.  (Optional/Later) Backfill `clerk_id` for existing data.

## Remaining Integration Tasks (Detailed)

### 1. Configure Supabase OIDC Provider *(User Action)*

*   **Goal:** Allow Supabase to trust and validate JWTs issued by Clerk.
*   **Location:** Supabase Dashboard -> Authentication -> Providers -> OIDC (or JWT).
*   **Action:**
    1.  Enable the OIDC provider.
    2.  Set the **Issuer URL** to your Clerk application's Issuer URL.
    3.  Ensure the **Subject Claim** (or similar field) is set to `sub`.
    4.  Configure Client ID/Secret if required (check Supabase docs).
    5.  Consider disabling nonce check if needed.
    6.  Save the configuration.

### 3. Implement Supabase Auth Handshake - DONE (Code Added)

*   ~~**Goal:** Synchronize Supabase Auth state with Clerk Auth state using the native integration pattern.~~
*   ~~**File:** `app/_layout.tsx`~~
*   ~~**Action:** Added `useEffect` hook to handle `signInWithIdToken` and `signOut` based on Clerk's `isSignedIn` state.~~

### 4. Testing - PENDING

*   **Action:** Thoroughly test all authentication flows and data operations *after* completing steps 1 & 2:
    *   Sign up, Sign in, Sign out.
    *   Creating, viewing, editing, deleting tasks, quests, journal entries, checkups, chat messages.
    *   Ensure users can only see/modify their own data (RLS check).
    *   Verify that operations fail appropriately for unauthenticated users.
    *   Check console logs for any errors during the Supabase sign-in/sign-out process.

### 5. Backfill `clerk_id` (Optional/Later)

*   **Goal:** Populate the `clerk_id` column for existing rows created before this change.
*   **Action:** Requires a mapping between the old Supabase `user_id` (uuid) and the corresponding Clerk User ID (text). This might involve a custom script or manual updates if the mapping isn't readily available (e.g., in Clerk user metadata).
