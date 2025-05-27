# System Patterns

## System Architecture:
- **Frontend:** React Native (Expo) for cross-platform mobile and web UI
- **Backend:** Supabase for database, authentication, and serverless functions
- **AI/LLM Integration:**
    - DeepSeek (OpenAI-compatible) for chat and complex NLP
    - Google Gemini for fast, cost-effective suggestions/analysis
    - OpenAI (Whisper) for voice-to-text transcription
- **State Management:**
    - React Context API (Theme, Suggestion, Chat, etc.)
    - Custom global stores (e.g., `globalSuggestionStore`)
- **Service Layer:** TypeScript classes encapsulate business logic (e.g., `SuggestionAgent`, `ChatAgent`, `TasksService`, `QuestsService`)
- **Agents:** Specialized classes for AI-driven features, using Singleton pattern

## Key Technical Decisions & Patterns:
- **Dual LLM Strategy:** Use Gemini for quick checks, DeepSeek for deeper analysis
- **Client-Side IDs:** Temporary IDs for suggestions before DB persistence, enabling linking and UI updates
- **Global Suggestion Store:** Centralized suggestion queue decouples generation from UI
- **Personality Service:** AI can adopt different personas for engagement
- **Performance Logging:** Track operation durations for optimization
- **Direct Update Handlers:** Components can subscribe to suggestion updates directly
- **Singleton Pattern:** Used for agent classes to ensure single instances
- **Service Layer:** Business logic separated from UI
- **Context API:** For global/shared state
- **Modular Agent Design:** Each agent handles a specific AI domain

## Directory Structure (Summary):
- `app/`: Screens, navigation, layouts (Expo Router)
- `components/`: Reusable UI components (by feature/type)
- `constants/`: App-wide constants (e.g., colors)
- `contexts/`: React Context providers
- `hooks/`: Custom hooks for stateful logic
- `lib/`: Core library code, client initializations
- `services/`: Data fetching, business logic, AI agents
- `types/`: TypeScript types/interfaces
- `utils/`: General utilities
- `workers/`: Cloudflare Workers code

## Critical Implementation Paths:
1. **User Input (Chat/Journal) → Agent Analysis:**
    - UI captures input, passes to agent (e.g., `ChatAgent`, `JournalAgent`)
    - Agent may call `SuggestionAgent` for analysis
2. **Suggestion Generation → Display:**
    - `SuggestionAgent` uses LLMs to generate suggestions
    - Suggestions added to `globalSuggestionStore`
    - Contexts/UI components consume and display suggestions
3. **Suggestion Acceptance → Database:**
    - User accepts suggestion
    - Agent/service saves to Supabase
    - Suggestion removed from store
4. **Task/Quest Linking:**
    - Pending tasks/quests linked by client-side IDs, updated on DB save
5. **Duplicate/Continuation Handling:**
    - Check for duplicates/continuations before showing or saving suggestions
