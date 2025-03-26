
# RaceConditionFix.md - Follow This

### Plan Overview

1.  **Refactor `SupabaseContext`:** Introduce a clear state (`isInitialLoading`) to distinguish the *initial* session check from subsequent auth state changes. Ensure this state is managed correctly and reliably.
2.  **Guard Data Hooks:** Modify all custom hooks that depend on the user session (`useQuests`, `useTasks`, `useJournal`, `useChatData`, etc.) to *wait* for `isInitialLoading` to be `false` AND `session` to be valid before fetching data or setting up subscriptions.
3.  **Guard Components & Actions:** Modify UI components to show appropriate loading/unauthenticated states based on `isInitialLoading` and `session`. Guard all user-triggered actions (button presses, form submissions) that require authentication.
4.  **Verify Fix:** Test thoroughly in a deployed environment.

### Detailed Steps

**(Start executing from Step 1. Update this markdown file after *each* step.)**

#### Phase 1: Refactor `SupabaseContext.tsx`

1.  **DONE?** [ ] **Locate `SupabaseContext.tsx`.**
2.  **DONE?** [ ] **Rename `isLoading` state variable:** Find `const [isLoading, setIsLoading] = useState(true);` Rename it to `const [isInitialLoading, setIsInitialLoading] = useState(true);`. Update all internal uses of `isLoading` to `isInitialLoading` within this file. Update the `isLoading` property in the returned context `value` object to use `isInitialLoading`.
3.  **DONE?** [ ] **Create `initialSessionFetch` function:** Wrap the initial `supabase.auth.getSession()` logic (including `setIsLoading(true)` at the start and `setIsLoading(false)` in a `finally` block) inside a `useCallback` function named `initialSessionFetch`.
4.  **DONE?** [ ] **Call `initialSessionFetch` on Mount:** Modify the main `useEffect` hook. Call `initialSessionFetch()` *once* when the provider mounts.
5.  **DONE?** [ ] **Modify `onAuthStateChange` Listener:** Inside the `supabase.auth.onAuthStateChange` callback:
    *   Ensure it correctly updates the `session` state using `setSession(newSession)`.
    *   Ensure it updates `isNewUser` state logic correctly based on the event (`SIGNED_IN`, `SIGNED_OUT`).
    *   **CRITICAL:** Ensure this listener **NEVER** sets `isInitialLoading` back to `true`. It should only modify `session` and `isNewUser`.
    *   Add clear `console.log` statements for each `event` type received.
6.  **DONE?** [ ] **Verify Context Value:** Ensure the `value` object returned by the `SupabaseProvider` includes `{ session, isLoading: isInitialLoading, isNewUser, ... }`.
7.  **DONE?** [ ] **Update `RaceConditionFix.md`:** Mark Phase 1 steps 1-6 as DONE with notes.

#### Phase 2: Guard Data Hooks

**(Apply steps 8-13 to EACH relevant custom hook: `useQuests`, `useTasks`, `useJournal`, `useChatData`)**

8.  **DONE?** [ ] **Access Auth State:** In the hook (e.g., `useQuests`), import `useSupabase` and get the auth state: `const { session, isLoading: isAuthLoading } = useSupabase();`. Use `isAuthLoading` to avoid naming conflicts with the hook's own loading state.
9.  **DONE?** [ ] **Guard Data Loading Function:** Find the primary data fetching function (e.g., `loadQuests`). At the VERY BEGINNING of this function, add these guards:
    *   `if (isAuthLoading) { console.log('[HookName] Skipping load: Auth initializing.'); return; }`
    *   `if (!session?.user?.id) { console.log('[HookName] Skipping load: No session.'); /* Clear hook state if applicable */ setLoading(false); return; }`
    *   Ensure `userId` is obtained *after* these guards: `const userId = session.user.id;`. Use this `userId` for API calls.
10. **DONE?** [ ] **Guard `useEffect` for Loading:** Modify the `useEffect` that calls the data loading function. Add `isAuthLoading` and `session?.user?.id` to its dependency array. Ensure it calls the guarded loading function correctly.
11. **DONE?** [ ] **Guard `useEffect` for Subscriptions:** Modify the `useEffect` that sets up Supabase real-time subscriptions. Add the *same guards* (`if (isAuthLoading || !session?.user?.id) { ... return; }`) *before* the `supabase.channel(...).subscribe(...)` call. Ensure the `filter` in the subscription uses the confirmed `userId`. Ensure the `useEffect`'s cleanup function correctly calls `supabase.removeChannel()`. Add `isAuthLoading` and `session?.user?.id` to its dependency array. Add logging for subscription status changes.
12. **DONE?** [ ] **Guard Exported Actions:** For any functions returned by the hook that perform actions requiring auth (e.g., `setQuestAsMain`, `sendMessage`), add the same guards (`if (isAuthLoading || !session?.user?.id) { ... return; }`) at their beginning.
13. **DONE?** [ ] **Combine Loading States:** Modify the hook's returned `loading` state to reflect both auth loading and internal data loading: `return { ..., loading: isAuthLoading || internalLoadingState, ... };`.
14. **DONE?** [ ] **Update `RaceConditionFix.md`:** Mark steps 8-13 as DONE for *each* hook you modified (e.g., "DONE 8-13: Applied guards to `useQuests`."). Repeat for all relevant hooks.

#### Phase 3: Guard Components and Actions

**(Apply steps 15-18 to relevant UI components like `DesktopLayout`, `JournalPanel`, `ChatInterface`, `QuestsOverview`, etc.)**

15. **DONE?** [ ] **Access Auth/Loading States:** In the component, import `useSupabase` and get `session`, `isAuthLoading`. Also, get the `loading` state from any relevant data hooks used by the component. Combine them: `const isLoading = isAuthLoading || questsLoading || chatLoading;` (adjust based on hooks used).
16. **DONE?** [ ] **Implement Render Guards:** Add conditional rendering logic at the top of the component's return statement:
    *   `if (isAuthLoading) { return <LoadingIndicator text="Initializing..." />; }`
    *   `if (!session?.user?.id) { return <LoginPrompt />; }` // Or null/redirect if handled by AuthGuard
    *   `if (isLoading) { return <LoadingIndicator text="Loading Data..." />; }` // Check combined data loading
    *   `// Render main component content only if all checks pass`
    *   Ensure `userId` is obtained *after* these checks: `const userId = session.user.id;`.
17. **DONE?** [ ] **Guard Action Handlers:** Find all `onPress`, `onSubmit`, etc. handlers that trigger authenticated operations. Add the guards `if (isAuthLoading || !session?.user?.id) { console.error('Action requires auth'); return; }` at their very beginning. Use the confirmed `userId` for subsequent logic.
18. **DONE?** [ ] **Update `RaceConditionFix.md`:** Mark steps 15-17 as DONE for *each* component you modified.

#### Phase 4: Verification

19. **DONE?** [ ] **Local Testing:** Run the app locally. Open the browser console.
    *   Perform a hard refresh. Observe the console logs. Verify that data fetching/subscriptions wait for `isInitialLoading` to be `false` and `session` to exist.
    *   Log out. Verify components show the logged-out state correctly.
    *   Log back in. Verify data loads correctly after authentication completes.
20. **DONE?** [ ] **Deployment Testing:** Deploy the changes to a preview/staging environment.
    *   Open the deployed app in your browser. Open developer tools (Network and Console tabs).
    *   Perform a hard refresh. Monitor console logs and network requests. Verify no 401/403 errors occur due to premature requests.
    *   Interact with the app normally (load quests, tasks, chat, journal).
    *   Leave the tab idle in the background for slightly longer than the token expiry (e.g., 1.5 hours if default is 1 hour). Bring it back to the foreground. Verify the app still works OR gracefully handles session expiration (e.g., prompts for login if refresh fails). Check the console for token refresh events or errors.
    *   Simulate a slow network (using browser dev tools) and repeat login/refresh tests.
21. **DONE?** [ ] **Update `RaceConditionFix.md`:** Document the results of local and deployment testing. Note any remaining issues or successful confirmations.

#### Phase 5: Final Review

22. **DONE?** [ ] **Review `RaceConditionFix.md`:** Ensure all steps are marked DONE.
23. **DONE?** [ ] **Code Review:** Review all modified files (`SupabaseContext.tsx`, all data hooks, all guarded components) for consistent application of the guards (`isAuthLoading`, `session?.user?.id`).
24. **DONE?** [ ] **Update `RaceConditionFix.md`:** Add a final note confirming the review and the overall status of the fix.

---

**Execute these steps precisely. Document meticulously in `RaceConditionFix.md`. This structure will ensure the race conditions are systematically addressed.**