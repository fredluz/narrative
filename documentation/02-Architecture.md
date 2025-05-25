# 2. Architecture

## 2.1. Overview
Narrative follows a modern client-server architecture, primarily designed as a mobile-first application with web capabilities, leveraging React Native and Expo. The backend functionalities are largely supported by Backend-as-a-Service (BaaS) solutions and serverless functions for specific tasks.

The main components of the architecture are:

*   **Frontend Client:** A React Native/Expo application responsible for the user interface (UI), user experience (UX), local state management, and client-side logic. This runs on users' devices (iOS, Android) and in web browsers.
*   **Backend Services (BaaS):** Supabase is utilized for core backend functionalities, including:
    *   **Database:** Storing user data, journal entries, tasks, quests, etc.
    *   **Authentication:** Managing user sign-up, sign-in, and sessions (potentially via Clerk integration, which often uses Supabase or similar for user data persistence).
    *   **Realtime (Optional):** Supabase's realtime capabilities might be used for features requiring instant data synchronization.
*   **Serverless Functions:** Cloudflare Workers are employed for specific backend tasks that benefit from a serverless environment, such as:
    *   Securely proxying requests to external AI APIs.
    *   Handling computationally intensive or sensitive operations like voice transcription.
*   **External AI APIs:** The application integrates with multiple third-party AI services to provide its intelligent features:
    *   **DeepSeek:** Likely for primary chat functionalities.
    *   **Google Gemini:** Used for suggestions, status checks, and potentially other analytical tasks.
    *   **OpenAI:** Specifically for voice-to-text transcription (e.g., Whisper via a Cloudflare Worker).

## 2.2. High-Level Diagram

```mermaid
graph LR
    User[User] --> Frontend{Narrative App (React Native/Expo)};

    subgraph Frontend
        direction TB
        UI[UI Components]
        StateMgmt[State Management (Hooks, Context)]
        Nav[Navigation (Expo Router)]
        ClientLogic[Client-Side Logic / Agents]
    end

    Frontend --> Supabase[Supabase BaaS];
    Frontend --> CFWorkers[Cloudflare Workers];
    CFWorkers --> OpenAIApi[OpenAI API (Transcription)];
    ClientLogic --> DeepSeekAPI[DeepSeek API (Chat)];
    ClientLogic --> GeminiAPI[Google Gemini API (Suggestions, Analysis)];

    Supabase -- Authentication & Data --> Frontend;
    Supabase -- User Data --> CFWorkers;

    style User fill:#D6EAF8,stroke:#3498DB
    style Frontend fill:#E8F8F5,stroke:#1ABC9C
    style Supabase fill:#FCF3CF,stroke:#F1C40F
    style CFWorkers fill:#FDEDEC,stroke:#E74C3C
    style OpenAIApi fill:#F4ECF7,stroke:#8E44AD
    style DeepSeekAPI fill:#F4ECF7,stroke:#8E44AD
    style GeminiAPI fill:#F4ECF7,stroke:#8E44AD
```

## 2.3. Key Architectural Patterns & Decisions

*   **Cross-Platform Development:** React Native and Expo enable a single codebase to target iOS, Android, and Web, reducing development effort and ensuring a consistent user experience.
*   **Component-Based UI:** The frontend is built using React's component model, promoting reusability, modularity, and maintainability. UI elements are likely composed from standard React Native components and libraries like React Native Paper.
*   **Service Layer Abstraction:** A dedicated `services/` directory likely contains modules that abstract interactions with backend systems (Supabase) and external APIs. This decouples data fetching and manipulation logic from UI components.
*   **Agent Pattern for AI Logic:** An `services/agents/` directory suggests the use of an Agent pattern. Each agent (e.g., `ChatAgent`, `SuggestionAgent`, `UpdateAgent`, `JournalAgent`) encapsulates the logic for interacting with specific AI models for particular tasks (chat, suggestions, analysis, status updates). This promotes separation of concerns and makes it easier to manage different AI capabilities.
*   **State Management:**
    *   **Local Component State:** `useState` and `useReducer` for managing state within individual components.
    *   **Shared State (React Context):** The `contexts/` directory indicates the use of React Context API (e.g., `ThemeContext`, `SuggestionContext`, `ChatContext`) for managing global or widely shared state.
    *   **Custom Hooks:** The `hooks/` directory (e.g., `useJournal`, `useChatData`) is used to encapsulate reusable stateful logic and side effects, promoting cleaner components and better code organization.
*   **Routing/Navigation:** `expo-router` is used for managing navigation and deep linking within the application, providing a file-system-based routing approach.
*   **Asynchronous Operations:** `async/await` is extensively used for handling asynchronous operations like API calls, database interactions, and AI processing.
*   **Serverless for Specific Tasks:** Using Cloudflare Workers for tasks like API proxying and transcription offloads these responsibilities from the client and provides a secure, scalable environment for them.

## 2.4. Data Flow (General Examples)

*   **User Authentication:**
    1.  User interacts with UI (e.g., sign-in form).
    2.  Client-side logic (possibly in an `AuthService` or hook) calls Clerk/Supabase Auth.
    3.  Supabase handles authentication and returns a session/token.
    4.  Client stores session information and updates UI.
*   **Creating a Journal Entry:**
    1.  User types in `JournalPanel.tsx`.
    2.  State is managed by `useJournal` hook.
    3.  On save, `useJournal` calls a function in `journalService.ts`.
    4.  `journalService.ts` saves the entry to Supabase.
    5.  After successful save, `journalService.ts` may trigger AI processing by invoking methods on `JournalAgent`, `SuggestionAgent`, and `UpdateAgent`.
    6.  These agents interact with external AI APIs (Gemini, DeepSeek).
    7.  Results (AI feedback, suggestions, status updates) are processed and potentially stored back in Supabase or managed in client-side state (e.g., `SuggestionContext`).
*   **Chat Interaction:**
    1.  User sends a message via `ChatInterface.tsx`.
    2.  `ChatContext` and `useChatData` manage chat state.
    3.  A `ChatAgent` handles the message, prepares context, and calls an AI API (e.g., DeepSeek).
    4.  The AI response is received by the `ChatAgent`.
    5.  The response is added to the chat state and displayed in the UI.
    6.  The `ChatAgent` might also trigger automatic journal entry creation based on the conversation.

## 2.5. Modularity and Separation of Concerns
The project structure (e.g., `components/`, `services/`, `hooks/`, `contexts/`, `agents/`) indicates a strong emphasis on modularity and separation of concerns:
*   **UI Components:** Focused on rendering and user interaction.
*   **Hooks:** Encapsulate reusable UI logic and state.
*   **Contexts:** Manage global or shared application state.
*   **Services:** Handle external communications (backend, APIs).
*   **Agents:** Manage complex AI-related logic and interactions.

This separation helps in maintaining a cleaner, more scalable, and testable codebase.
