# Tech Context: QuestLog

## 1. Core Technologies
*   **Frontend Framework:** React Native / Expo
*   **Language:** TypeScript
*   **Backend-as-a-Service (BaaS):** Supabase (Database, Auth, potentially Functions)
*   **UI Libraries:** React Native Paper, Expo Vector Icons
*   **Routing:** Expo Router
*   **State Management:** React Hooks (useState, useEffect, useCallback), React Context API, Custom Hooks
*   **Backend-as-a-Service (BaaS):** Supabase (Database)
    
*   **Serverless Functions:** Cloudflare Workers (for secure API proxying, e.g., transcription)
*   **AI APIs:**
    *   DeepSeek (via OpenAI compatible API - primary chat)
    *   Google Gemini (via `generative-ai` SDK - likely for suggestions, status checks, potentially analysis)
    *   OpenAI (Whisper/gpt-4o-mini-transcribe via Cloudflare Worker for voice-to-text)

## 2. Development Environment & Tooling
*   **Package Manager:** npm (inferred from `package.json`, `package-lock.json`)
*   **Build/Bundling:** Managed by Expo CLI
*   **Linting/Formatting:** Likely ESLint/Prettier (standard for TypeScript projects, but config files not explicitly provided yet)
*   **Version Control:** Git (inferred from `.gitignore`)
*   **Configuration:**
    *   Environment variables (`.env.local`) for client-side keys/settings.
    *   Cloudflare Secrets for backend API keys (e.g., OpenAI key for transcription worker).

## 3. Key Dependencies (Observed/Inferred)
*   `react`, `react-native`
*   `expo`
*   `@supabase/supabase-js` (or similar for Supabase interaction)
*   `openai` (configured for DeepSeek endpoint)
*   `@google/generative-ai`
*   `react-native-paper`
*   `expo-router`
*   `@expo/vector-icons`
*   `@clerk/clerk-expo` (for Authentication)

## 4. Technical Constraints & Considerations
*   **API Keys:** Requires proper management of API keys for Supabase, DeepSeek, and Gemini (currently using `.env.local`, which is suitable for local development but needs secure handling for production).
*   **Expo `dangerouslyAllowBrowser`:** The `openai` client is configured with `dangerouslyAllowBrowser: true`. This implies API calls might be made directly from the client-side. While convenient for development, this is a **significant security risk** as it exposes the API key. For production, these calls should ideally be proxied through a secure backend (e.g., Supabase Functions or a dedicated server).
*   **Rate Limiting:** Potential rate limits on external AI APIs need to be considered and handled gracefully.
*   **Cross-Platform Compatibility:** Ensuring UI components and native features work consistently across iOS, Android, and Web.
*   **Offline Support:** No indication of offline support currently. Data operations likely require an active internet connection.
*   **State Management Complexity:** As the application grows, managing state across contexts, hooks, and local state might become complex.
*   **Serverless Function Cold Starts:** Cloudflare Workers generally have very low cold start times, but it's a factor to be aware of for user experience.

## 5. Tool Usage Patterns
*   **Supabase Client:** Likely initialized once (e.g., in `lib/supabase.ts`) and used across various service files (`journalService.ts`, `tasksService.ts`, etc.).
*   **AI Clients:** `OpenAI` (for DeepSeek) and `GoogleGenerativeAI` clients are instantiated within the relevant Agent classes (`ChatAgent`, `SuggestionAgent`).
*   **Custom Hooks:** Used extensively to encapsulate feature-specific logic and state (e.g., `useJournal` for journal data, `useSuggestions` for suggestion interactions).
*   **Services:** Provide a clear API for interacting with backend resources (Supabase), separating data logic from UI and state management.
*   **Cloudflare Workers:** Used for specific backend tasks requiring secure API key handling or potentially heavier computation offloaded from the client (e.g., transcription proxy). Wrangler CLI used for development and deployment.
