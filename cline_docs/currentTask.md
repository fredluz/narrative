# Current Task: Finalize Clerk Auth & Supabase RLS Integration

## Objective
- Ensure Supabase Row Level Security (RLS) works correctly with Clerk authentication by aligning database schema and application code.
- Complete the migration from Supabase Auth to Clerk.

## Context
- Previous attempts to configure Supabase client token handling (`accessToken`, custom `fetch`) encountered errors or were based on deprecated methods.
- The core issue identified is a mismatch between the Clerk User ID (`text`, like `user_...`) provided by the application and the `user_id` column (`uuid`) in Supabase tables used by RLS policies.
- The chosen solution is to add a dedicated `clerk_id` (`text`) column to relevant Supabase tables and update RLS policies and application code accordingly.

## Progress
- [x] **Authentication Migration:** Completed initial refactoring of components/hooks to use Clerk `useAuth`. Removed obsolete Supabase Auth files/code.
- [x] **Supabase Client Config:** Reverted `lib/supabase.ts` to a simple configuration, removing complex token handling attempts. Authentication will rely on RLS policies evaluating the JWT provided by Clerk.
- [x] **Database Schema Update:** Added `clerk_id text` column to relevant tables (`tasks`, `quests`, etc.). *(User confirmed)*
- [x] **RLS Policy Update:** Enabled RLS and updated policies for relevant tables to check `(select auth.jwt()->>'sub') = clerk_id`. *(User confirmed)*

## Next Steps (Summary)
1.  Modify service functions (`create`/`update`) to use the new `clerk_id` column.
2.  Test the new authentication flow and RLS policies thoroughly.
3.  (Optional/Later) Backfill `clerk_id` for existing data.

## Remaining Integration Tasks (Detailed)

### 1. Modify Service Functions (Use `clerk_id`)

*   **Goal:** Update `create`/`insert`/`update` functions in service files to correctly handle the `clerk_id` column.
*   **Files & Actions:**
    *   `services/tasksService.ts`:
        *   Modify `createTask` to insert the Clerk User ID into the `clerk_id` column, not `user_id`.
        *   Verify `updateTask` does not attempt to modify `user_id` or `clerk_id`.
    *   `services/questsService.ts`:
        *   Modify `createQuest` to insert the Clerk User ID into the `clerk_id` column, not `user_id`.
        *   Verify `updateQuest` does not attempt to modify `user_id` or `clerk_id`.
    *   `services/journalService.ts`:
        *   Modify `saveCheckupEntry` and `saveDailyEntry` to insert the Clerk User ID into the `clerk_id` column (assuming one was added), not `user_id`.
    *   `hooks/useChatData.ts` / `services/chatDataService.ts`:
        *   Modify logic that inserts chat messages (`chat_messages` table) to use the `clerk_id` column (assuming one was added), not `user_id`.
*   **Note:** The `user_id` (uuid) column can likely be ignored during inserts now. RLS policies handle authorization based on `clerk_id`.

### 2. Testing - PENDING

*   **Action:** Thoroughly test all authentication flows and data operations:
    *   Sign up, Sign in, Sign out.
    *   Creating, viewing, editing, deleting tasks, quests, journal entries, checkups, chat messages.
    *   Ensure users can only see/modify their own data.
    *   Verify that operations fail appropriately for unauthenticated users.

### 3. Backfill `clerk_id` (Optional/Later)

*   **Goal:** Populate the `clerk_id` column for existing rows created before this change.
*   **Action:** Requires a mapping between the old Supabase `user_id` (uuid) and the corresponding Clerk User ID (text). This might involve a custom script or manual updates if the mapping isn't readily available (e.g., in Clerk user metadata).
