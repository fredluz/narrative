# System Patterns: QuestLog

## 1. Architecture Overview
QuestLog appears to follow a standard client-server architecture pattern, common for modern web/mobile applications:
*   **Frontend:** React Native / Expo application handling UI rendering, state management, and user interactions.
*   **Backend:** Supabase providing database services, authentication, and potentially serverless functions (though not explicitly confirmed yet).
*   **External Services:** AI APIs (DeepSeek, Gemini) for chat responses, analysis, and suggestions.

```mermaid
graph LR
    A[User] --> B(React Native Frontend);
    B --> C{Supabase Backend};
    B --> D{AI APIs};
    C --> B;
    D --> B;

    subgraph Frontend Components
        direction LR
        UI[UI Components] --> HM[Hooks & State Mgmt];
        HM --> SL[Service Layer Abstraction];
        SL --> AG[AI Agent Logic];
    end

    B -.-> UI;
    B -.-> HM;
    B -.-> SL;
    B -.-> AG;

    SL --> C;
    AG --> D;
```

## 2. Key Technical Decisions & Patterns
*   **Cross-Platform Development:** Using React Native and Expo allows targeting multiple platforms (iOS, Android, Web) from a single codebase.
*   **Component-Based UI:** Leveraging React's component model for building the user interface. Specific UI libraries like `react-native-paper` are used.
*   **State Management:**
    *   Local component state (`useState`).
    *   Shared state via React Context API (`ThemeContext`, `SuggestionContext`, potentially others).
    *   Custom Hooks (`useJournal`, `useAuth`, `useTheme`, `useSuggestions`) encapsulate related state logic and side effects, promoting reusability and separation of concerns.
*   **Data Fetching & Services:** A dedicated service layer (`services/`) abstracts interactions with the backend (Supabase) and potentially external APIs. This keeps data logic separate from UI components.
*   **AI Integration:** An "Agent" pattern (`services/agents/`) is used to encapsulate logic related to interacting with different AI models (DeepSeek, Gemini) for specific tasks (chat, suggestions, analysis).
*   **Asynchronous Operations:** Extensive use of `async/await` for handling asynchronous tasks like API calls and database operations. Error handling (`try/catch`) is present but needs detailed review for consistency and robustness.
*   **Routing:** `expo-router` is used for navigation within the application.
*   **Styling:** Combination of global styles (`styles/global.js`) and feature-specific styles (`journalStyles.ts`, `questStyles.ts`). Theming is supported via `ThemeContext`.

## 3. Component Relationships (Focus on Journal Feature)
*   **`JournalPanel.tsx` (UI):** Displays journal entries, input fields, AI responses. Uses `useJournal` hook for data and actions, `useSuggestions` for triggering analysis, `useAuth` for user ID, `useTheme` for styling. Interacts with `journalService` indirectly via hooks or directly for specific actions like checking daily entry status. Calls `router.push` for navigation.
*   **`useJournal.ts` (Hook):** Manages state related to the journal (current date, entries, AI responses, loading/error states). Provides functions to interact with `journalService` (e.g., `saveCurrentCheckup`, fetching entries). Handles local state updates (`updateLocalEntryText`).
*   **`journalService.ts` (Service):** Contains functions for direct interaction with the Supabase backend (or equivalent data store) for CRUD operations on journal entries (checkups, daily entries).
*   **`ChatAgent.ts` (Agent):** Handles chat interactions. Generates automatic checkup entries after a chat session using `generateCheckupContent` and saves them via `journalService.saveCheckupEntry`. Fetches past checkups via `journalService` for context.
*   **`SuggestionContext.tsx` / `SuggestionAgent.ts` (Context/Agent):** Manages suggestion logic. `analyzeJournalEntry` function (likely within `SuggestionAgent` and exposed via context) is called from `JournalPanel.tsx` after saving a checkup to trigger AI analysis/feedback.
*   **`CheckupItem.tsx` / `AIResponse.tsx` (UI):** Child components used by `JournalPanel.tsx` to render individual checkups and AI feedback.

## 4. Critical Implementation Paths (Journal Feature)
*   **Manual Checkup:** `JournalPanel` (Input) -> `handleSaveCheckup` -> `useJournal.saveCurrentCheckup` -> `journalService.saveCheckupEntry` (fetches context, calls `JournalAgent.generateResponse` which emits `ANALYZE_JOURNAL_ENTRY` event, saves checkup+response to DB) -> `useSuggestions.analyzeJournalEntry` (called after save, seems redundant).
*   **Automatic Checkup:** `ChatAgent.summarizeAndStoreSession` -> `generateCheckupContent` (uses LLM) -> `journalService.saveCheckupEntry` (fetches context, calls `JournalAgent.generateResponse` which emits `ANALYZE_JOURNAL_ENTRY` event, saves checkup+response to DB).
*   **Daily Entry:** `JournalPanel` (Button) -> `handleDailyEntry` -> (potentially `useJournal.saveCurrentCheckup` for final text) -> `journalService.saveDailyEntry` (fetches all checkups, formats content, calls `JournalAgent.processEndOfDay` for EOD response & analysis, saves daily entry to DB, updates checkups to link them) -> `router.push('/journal')`. The daily analysis is displayed within `app/journal.tsx` by fetching the `JournalEntry` object.

## 5. Potential Areas for Review
*   Consistency in error handling across UI, hooks, services, and agents.
*   Management of loading states, especially during concurrent operations.
*   Potential race conditions between saving checkup entries and triggering suggestion analysis (event emitted *before* DB save in service, direct call happens *after*).
*   Data flow and state synchronization between `useJournal`, `JournalPanel`, and `journalService`.
*   Robustness of the daily entry generation, specifically the final step of linking checkups via DB update after the main entry is saved.
*   Apparent redundancy in triggering suggestion analysis for manual checkups (event emission + direct call).
