# Codebase Summary: Narrative

## Overview
Narrative is a React Native application built with Expo and TypeScript, designed for productivity through quest, task, and journal management. It leverages Supabase for backend services and integrates AI features (likely Deepseek) for enhanced functionality like analysis and suggestions. Navigation is handled by Expo Router, and state management primarily uses React Context. Authentication is managed by Clerk.

## Key Components and Their Interactions

### `app/` Directory (Routing & Screens)
- **Purpose:** Contains the application's screens and routing logic, managed by Expo Router.
- **Structure:**
    - `_layout.tsx`: Main layout component, setting up global providers (Theme, Supabase, Clerk).
    - `index.tsx`: Main entry point or dashboard after login.
    - `landing.tsx`: Initial screen shown to users, potentially before authentication.
    - Feature Screens (`journal.tsx`, `logs.tsx`, `quests.tsx`, `notification.tsx`): Dedicated screens for core features.
    - `auth/`: Sub-directory handling authentication UI (`index.tsx`). Obsolete screens (`callback.tsx`, `loading.tsx`, `_layout.tsx`) have been removed.
    - `styles/`: Contains styling definitions for different parts of the application.

### `components/` Directory (UI Elements)
- **Purpose:** Houses reusable UI components.
- **Structure:** Organized by feature or type:
    - `chat/`: Components for the AI chat interface.
    - `journal/`: Components related to journal entries and AI analysis display.
    - `layouts/`: Top-level layout structures (Desktop, Mobile).
    - `loading/`: Loading indicators.
    - `modals/`: Modal dialogs for creating/editing quests and tasks.
    - `quests/`: Components for displaying quests (Kanban board, overview).
    - `sprint/`: Components related to sprint planning/boards.
    - `suggestions/`: UI for displaying AI-generated task suggestions.
    - `tasks/`: Components for task lists.
    - `ui/`: Generic, reusable UI elements (Buttons, Text, Views, Icons, etc.).

### `contexts/` Directory (State Management)
- **Purpose:** Contains React Context providers for managing global or shared state.
- **Examples:** `SupabaseContext` (provides DB client), `ThemeContext`, `QuestUpdateContext`, `SuggestionContext`. Authentication state managed via Clerk hooks (`useAuth`, `useUser`).

### `hooks/` Directory (Custom Hooks)
- **Purpose:** Reusable logic encapsulated in custom React hooks.
- **Examples:** `useThemeColor`, `useJournal`, `useChatData`.

### `lib/` Directory (Libraries/Configuration)
- **Purpose:** Contains setup and configuration for external libraries.
- **Example:** `supabase.ts` (Supabase client initialization, configured globally to use Clerk JWTs for requests).

### `services/` Directory (Business Logic & API Interaction)
- **Purpose:** Handles interactions with the Supabase database and AI APIs. Separates business logic from UI components. Authentication for Supabase requests is handled automatically via the configured client in `lib/supabase.ts`.
- **Structure:**
    - Service files (`journalService.ts`, `questsService.ts`, `tasksService.ts`, etc.): Specific functions for database CRUD operations and AI API calls. `authService.ts` has been removed.
    - `agents/`: Contains logic for interacting with AI models (ChatAgent, JournalAgent, etc.), including prompts.
    - `globalSuggestionStore.ts`: Potentially manages the state or caching of AI suggestions.

### `types/` Directory (TypeScript Definitions)
- **Purpose:** Defines custom TypeScript types used throughout the application.
- **Examples:** `supabase.ts` (auto-generated Supabase types), `deepseek.ts` (types for Deepseek API).

### `utils/` Directory (Utility Functions)
- **Purpose:** Contains small, reusable helper functions.
- **Examples:** `dateFormatters.ts`, `performanceLogger.ts`.

## Data Flow
1.  **User Interaction:** User interacts with UI components (`components/`).
2.  **Component Logic:** Components trigger actions, potentially using custom hooks (`hooks/`) or context (`contexts/`).
3.  **Authentication Check:** Clerk SDK/hooks (`useAuth`, `useUser`) manage authentication state. UI components might conditionally render or gate actions based on this state.
4.  **Service Layer:** Authenticated actions call functions in the `services/` directory.
5.  **Backend/API:** Service functions interact with Supabase (`lib/supabase.ts`, authenticated with Clerk JWT) for database operations or AI APIs (`services/agents/`).
6.  **State Update:** Data returned from services updates application state via Context API (`contexts/`) or local component state.
7.  **UI Update:** Components re-render based on updated state.

## External Dependencies
- **Clerk:** Authentication and user management platform. Requires environment variable for Publishable Key. Integrated via `@clerk/clerk-expo`.
- **Supabase:** PostgreSQL database provider. Client initialized in `lib/supabase.ts` (configured for Clerk JWT auth). Interacted with via `services/*Service.ts`. Requires environment variables for URL and anon key.
- **Deepseek (Inferred):** AI API for chat, analysis, suggestions. Managed via `services/agents/`. Requires environment variables for API key.
- **Expo SDK:** Core functionalities provided by the Expo framework.
- **React Navigation (via Expo Router):** Handles navigation.

## Recent Significant Changes
- Initial project setup and documentation creation. (2025-03-31)
- Migrated authentication from Supabase Auth to Clerk. Configured Supabase client for Clerk JWTs. Refactored components, hooks, and services. Cleaned up obsolete auth files. (2025-03-31)

## User Feedback Integration
- No user feedback integrated yet.
