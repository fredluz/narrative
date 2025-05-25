# 7. UI Deep Dive: Desktop Layout & Theming

This document provides an in-depth look at how the User Interface (UI) for the Narrative application is structured and styled for desktop web browsers. The primary goal is to understand the current implementation to inform future adaptations for mobile web.

## 7.1. Overall Application Structure & Navigation

*   **Root Layout (`app/_layout.tsx`):**
    *   This file serves as the entry point for the app's UI rendering after initial setup.
    *   It wraps the entire application with essential context providers:
        *   `ClerkProvider`: For authentication.
        *   `AppThemeProvider` (from `@/contexts/ThemeContext`): For dynamic, user-selectable theming.
        *   `SupabaseProvider`: For Supabase client access.
        *   `QuestUpdateProvider`, `SuggestionProvider`, `ChatProvider`: For feature-specific state management.
    *   It handles loading of custom fonts (`Inter`, `Poppins`).
    *   Manages the splash screen visibility, hiding it once fonts and Clerk auth are loaded.
    *   Contains logic to redirect users based on their authentication status (e.g., to `/auth` if not signed in, or to `/` if signed in and trying to access auth routes).
    *   Uses the `<Slot />` component from `expo-router` to render the currently active route/screen.

*   **Routing (`expo-router`):**
    *   Navigation is managed by `expo-router`, which uses a file-system-based approach. Files in the `app/` directory map to routes.
    *   The initial route `/` (handled by `app/index.tsx`) redirects to `/landing`.
    *   The `/landing` route (handled by `app/landing.tsx`) is the main screen for authenticated users.

## 7.2. Main Desktop Interface: `DesktopLayout.tsx`

The core of the desktop UI is the `DesktopLayout` component found in `components/layouts/DesktopLayout.tsx`.

*   **Entry Point:** Rendered by `app/landing.tsx`.
*   **Structure:** It implements a three-column layout:
    1.  **Left Column:** Displays quest and task-related information.
        *   `KanbanBoard` (`@/components/quests/KanbanBoard`): Shows the main quest.
        *   `TaskList` (`@/components/tasks/TaskList`): Shows a compact list of tasks.
    2.  **Center Column:** Dedicated to the AI chat.
        *   `ChatInterface` (`@/components/chat/ChatInterface`): Provides the full chat experience.
    3.  **Right Column:** Contains the journaling features.
        *   `JournalPanel` (`@/components/journal/JournalPanel`): For creating and viewing journal entries.
*   **Data Fetching & State Management:**
    *   Relies heavily on custom hooks and context:
        *   `useAuth` (from `@clerk/clerk-expo`): For user authentication state and `userId`.
        *   `useTheme` (from `@/contexts/ThemeContext`): For dynamic theme colors.
        *   `useQuests` (from `@/services/questsService`): To fetch quest data.
        *   `useTasks` (from `@/services/tasksService`): To fetch task data.
        *   `useChat` (from `@/contexts/ChatContext`): For chat messages and interactions.
        *   `useQuestUpdate` (from `@/contexts/QuestUpdateContext`): To trigger data reloads.
    *   Manages loading states for Clerk authentication and data fetching (quests, tasks).
    *   Handles and displays error states if data fetching fails.
*   **Global Components:**
    *   `SettingsButton` (`@/components/ui/SettingsButton`): Likely provides access to application settings.

## 7.3. Styling and Theming Strategy

The application employs a multi-layered approach to styling and theming:

1.  **Dynamic User-Selectable Theme (`ThemeContext.tsx`):**
    *   Provides `themeColor` (primary accent), `secondaryColor`, and a dynamically calculated `textColor` (black or white for contrast against `themeColor`).
    *   Users can change these accent colors, and the choices are persisted via `AsyncStorage`.
    *   Accessed in components via the `useTheme()` hook.
    *   This system is primarily used for accenting interactive elements, buttons, and specific highlights.

2.  **Fixed Global Dark Theme (`app/styles/global.js`):**
    *   This file defines a specific "Cyberpunk-inspired" dark color palette (e.g., `colors.background = '#0A0A0A'`).
    *   It exports a `StyleSheet` object (`styles`) with predefined styles for common layout elements (e.g., `container`, `column`, `chatCard`) and specific components.
    *   These global styles form the base appearance of the application, particularly for the `DesktopLayout` and its main content areas.
    *   The `DesktopLayout.tsx` imports and uses `styles` and `colors` from this file.

3.  **OS-Based Light/Dark Mode (`constants/Colors.ts` & `hooks/useThemeColor.ts`):**
    *   `constants/Colors.ts` defines basic color sets for `light` and `dark` modes (e.g., text, background, tint).
    *   The `useThemeColor()` hook allows components to consume these OS-based theme colors.
    *   This system seems to be a more standard Expo setup and might be used for components that are not directly part of the main `DesktopLayout`'s cyberpunk theme or as a fallback. Its direct usage within the primary desktop UI needs further verification on a component-by-component basis, but the `DesktopLayout` itself primarily uses the `ThemeContext` and `global.js` styles.

4.  **Component-Specific Styles:**
    *   Individual components often define their own styles using `StyleSheet.create`, tailoring their appearance beyond global styles.

5.  **UI Libraries:**
    *   `react-native-paper`: Provides Material Design components that come with their own styling, which can be customized.
    *   Custom UI Components (`components/ui/`): Components like `ThemedText` and `ThemedView` likely integrate with one of the theming systems to provide theme-aware basic building blocks.

**Interplay of Theming Systems in `DesktopLayout`:**
*   The base background and structural element colors largely come from the fixed dark theme in `app/styles/global.js`.
*   Dynamic elements, highlights, and accents (like button colors, spinner colors) often use `themeColor` or `secondaryColor` from `ThemeContext.tsx`.

## 7.4. Platform-Specific Styling (`Platform.select`)

*   The `app/styles/global.js` file demonstrates the use of `Platform.select` to apply different styles for `ios`, `android`, and `default` (which typically targets web).
    *   Example: `container.flexDirection` is `'row'` for web (desktop) and `'column'` for mobile platforms.
    *   Example: `container.padding` also varies.
*   This mechanism is key for adapting layouts for different screen paradigms. While the current focus is desktop, understanding this pattern is crucial for planning the mobile web adaptation. The existing "mobile-specific styles" in `global.js` are considered outdated for now but show that platform-specific styling was previously attempted.

## 7.5. Key Reusable UI Components (`components/ui/`)

The `components/ui/` directory contains general-purpose UI elements:
*   `ThemedText`: Likely applies colors from one of the theme systems to text.
*   `ThemedView`: Similar to `ThemedText` but for view containers.
*   `IconSymbol`: For displaying icons.
*   Buttons like `PersonalityButton`, `SettingsButton`.
*   `ColorPicker`: Used for changing theme colors in settings.

These components help maintain a consistent look and feel and integrate with the established theming mechanisms.

## 7.6. Considerations for Mobile Web Adaptation

Based on the current desktop UI structure:
*   **Layout:** The three-column `DesktopLayout` will need significant rethinking for smaller screens. A tabbed interface, a collapsible sidebar, or stacked sections are common mobile patterns.
*   **Component Reusability:** Many core components within the columns (`KanbanBoard`, `TaskList`, `ChatInterface`, `JournalPanel`) might be reusable, but their internal layouts and presentation will need to be responsive or adapted.
*   **Styling:**
    *   The `Platform.select` mechanism is already in use and can be leveraged more extensively.
    *   The fixed cyberpunk theme from `global.js` might need adjustments for mobile readability and touch-friendliness.
    *   Font sizes, padding, and margins will need careful review.
*   **Navigation:** While `expo-router` works on web, mobile navigation patterns (e.g., bottom tabs, drawer) might feel more natural than the current desktop structure if directly translated.

This documentation provides a detailed snapshot of the desktop UI, serving as a foundation for planning its adaptation to mobile web.
