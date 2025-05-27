# Tech Context

## Core Technologies & Tools:
- **Programming Language:** TypeScript
- **Framework/Library:** React Native (with Expo)
- **Backend as a Service (BaaS):** Supabase (PostgreSQL, Auth, Storage, Functions)
- **AI/LLM APIs:**
    - OpenAI (via `openai` library, for voice-to-text and DeepSeek chat)
    - Google Gemini (via `@google/generative-ai`, for suggestions/analysis)
    - DeepSeek (primary LLM for chat, OpenAI-compatible API)
- **State Management:**
    - React Hooks (`useState`, `useEffect`, `useContext`, `useReducer`, `useCallback`)
    - React Context API (Theme, Suggestion, Chat, etc.)
    - `globalSuggestionStore` (custom suggestion queue)
- **Styling & UI:**
    - React Native Paper (Material Design components)
    - Expo Vector Icons, Expo Symbols, Expo Linear Gradient, Expo Blur
    - React Native SVG, React Native Wheel Color Picker
    - Custom stylesheets (`app/styles/`, `StyleSheet.create`)
- **Navigation:**
    - Expo Router (file-system based routing)
    - React Navigation (core navigation primitives)
- **Authentication:** Clerk (`@clerk/clerk-expo`)
- **Serverless Functions:** Cloudflare Workers (proxying AI calls, transcription)
- **Utilities:**
    - date-fns, eventemitter3, react-native-url-polyfill
    - AsyncStorage, Expo Secure Store
    - React Native Gesture Handler, Reanimated, WebView
    - Svix (webhook service)

## Development Setup:
- **Prerequisites:** Node.js (LTS), npm, Git, Expo CLI, Watchman (optional), Xcode/Android Studio (for mobile), Wrangler CLI (for Cloudflare Workers)
- **Repository:** Clone via Git
- **Dependencies:** Install with `npm install`
- **Environment Variables:** Managed in `.env.local` (see documentation for required keys)
- **Running the App:**
    - `npm start` or `expo start` (Expo Dev Tools)
    - `npm run android` / `expo start --android`
    - `npm run ios` / `expo start --ios`
    - `npm run web` / `expo start --web`
- **Linting:** `npm run lint` (ESLint)
- **Testing:** `npm run test` (Jest)
- **Cloudflare Workers:** Use Wrangler CLI (`wrangler dev`, `wrangler deploy`)

## Technical Constraints & Considerations:
- **API Key Security:** Prefer proxying AI keys via Cloudflare Workers; avoid exposing sensitive keys client-side
- **API Rate Limits & Costs:** Use Gemini Flash for quick/cheap ops, DeepSeek for deeper analysis
- **Cross-Platform Consistency:** Ensure features and UI work across iOS, Android, and Web
- **State Synchronization:** Manage state between contexts, global stores, and components
- **Async Operations:** Use `async/await`, handle loading and error states robustly
