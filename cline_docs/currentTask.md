# Current Task: Refactor Authentication Screen

## Objective
- Modify the main authentication screen (`/auth`) to display separate "Sign In" and "Sign Up" buttons instead of directly embedding the Clerk sign-in component.
- Create dedicated screens (`/auth/signin` and `/auth/signup`) to host the respective Clerk `SignIn` and `SignUp` components.
- Ensure the new buttons on the main auth screen match the application's UI aesthetic, referencing styles from `KanbanBoard.tsx`.

## Context
- The previous implementation showed the Clerk `SignIn` component directly on `app/auth/index.tsx`.
- The goal is to provide a clearer entry point for users to choose between signing in and signing up.

## Implementation
- **`app/auth/index.tsx`:**
    - Removed the direct import and usage of the Clerk `SignIn` component.
    - Added two `TouchableOpacity` components for "Sign In" and "Sign Up".
    - Styled these buttons based on the primary action button style observed in `KanbanBoard.tsx` (using `themeColor`, padding, border-radius, etc.).
    - Implemented `onPress` handlers using `useRouter` to navigate to `/auth/signin` and `/auth/signup`.
    - Kept the existing matrix background and ASCII art.
- **`app/auth/signin.tsx`:**
    - Created this new file.
    - Imported and rendered the Clerk `SignIn` component (using the `@clerk/clerk-expo/web` import path).
    - Added basic container styling.
- **`app/auth/signup.tsx`:**
    - Created this new file.
    - Imported and rendered the Clerk `SignUp` component (using the `@clerk/clerk-expo/web` import path).
    - Added basic container styling.

## Progress
- [x] **Refactor `app/auth/index.tsx`:** Replaced Clerk component with styled navigation buttons.
- [x] **Create `app/auth/signin.tsx`:** Implemented the dedicated sign-in screen.
- [x] **Create `app/auth/signup.tsx`:** Implemented the dedicated sign-up screen.
- [x] **Fix Redirect Loop:** Adjusted `app/_layout.tsx` to correctly identify routes within `/auth` directory.
- [x] **Apply Custom Fonts:** Used Clerk's `appearance` prop to apply 'Inter' and 'Poppins' fonts to `SignIn` and `SignUp` components.
- [x] **Testing:** Verified navigation from `/auth` to `/auth/signin` and `/auth/signup` works, redirect loop is fixed, and Clerk components render correctly. *(User confirmed)*
- [ ] **Documentation Update:** Update `projectRoadmap.md` and `codebaseSummary.md`.

## Next Steps
- Update `projectRoadmap.md` and `codebaseSummary.md`.
- Task complete.
