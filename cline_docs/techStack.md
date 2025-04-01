# Tech Stack: Narrative

## Core Framework & Language
- **Framework:** React Native with Expo
  - *Justification:* Enables cross-platform development (iOS, Android, Web) from a single codebase. Expo provides a managed workflow, simplifying development and deployment.
- **Language:** TypeScript
  - *Justification:* Adds static typing to JavaScript, improving code quality, maintainability, and developer productivity through early error detection.

## Navigation
- **Routing:** Expo Router
  - *Justification:* File-based routing solution for Expo applications, simplifying navigation setup and management.

## Authentication
- **Provider:** Clerk
  - *Justification:* Dedicated authentication and user management platform, handling sign-up, sign-in, session management, and multi-factor authentication. Integrated with Supabase for database access authorization.

## Database
- **Provider:** Supabase (PostgreSQL)
  - *Justification:* Provides a scalable PostgreSQL database. Used for storing application data like quests, tasks, and journal entries. Database requests are authenticated using JWTs obtained from Clerk.

## State Management
- **Method:** React Context API
  - *Justification:* Built-in React solution for managing global or shared state across components (e.g., Theme, Authentication status, Quest data updates, Suggestions). Suitable for the current scale.

## AI Integration
- **AI Provider:** Deepseek (Inferred)
  - *Justification:* Based on `types/deepseek.ts` and agent files (`services/agents/`), suggesting integration with the Deepseek API for features like journal analysis, suggestions, and chat. Requires API keys managed via environment variables.

## UI Components
- **Approach:** Custom Components & Potentially UI Libraries
  - *Justification:* The `components/ui` directory indicates custom-built UI elements. Further inspection of `package.json` would be needed to confirm specific UI libraries, but the focus seems to be on tailored components.

## Development Environment
- **Package Manager:** npm (inferred from `package-lock.json`)
- **Configuration:** Expo Config (`app.json`, `app.config.ts`), TypeScript Config (`tsconfig.json`)
- **Environment Variables:** `.env.local` for sensitive keys (e.g., Supabase, AI API keys).
