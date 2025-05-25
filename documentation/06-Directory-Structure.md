# 6. Directory Structure

This document provides an overview of the main directories in the Narrative application and their purpose. Understanding this structure will help you navigate the codebase and locate relevant files.

```
narrative/
├── .expo/                  # Expo's internal cache and build files
├── .git/                   # Git version control files
├── .github/                # GitHub specific files (e.g., workflows)
├── .vscode/                # VS Code editor settings
├── .wrangler/              # Wrangler CLI cache and state
├── app/                    # Core application screens, navigation, and layouts
│   ├── _layout.tsx         # Root layout for the app
│   ├── +not-found.tsx      # Fallback for unmatched routes
│   ├── index.tsx           # Main entry screen (e.g., home or landing)
│   ├── journal.tsx         # Journal screen
│   ├── quests.tsx          # Quests screen
│   ├── auth/               # Authentication related screens (signin, signup)
│   └── styles/             # Screen-specific or feature-specific styles
├── assets/                 # Static assets
│   ├── fonts/              # Custom fonts
│   └── images/             # Images, icons, splash screens
├── components/             # Reusable UI components shared across the app
│   ├── chat/               # Chat specific components
│   ├── journal/            # Journal specific components
│   ├── layouts/            # Layout components (e.g., DesktopLayout, MobileLayout)
│   ├── loading/            # Loading indicators
│   ├── modals/             # Modal dialog components
│   ├── quests/             # Quest specific components
│   ├── sprint/             # Sprint board components
│   ├── suggestions/        # Suggestion related components
│   ├── tasks/              # Task related components
│   └── ui/                 # Generic UI elements (buttons, text, views)
├── constants/              # Application-wide constants
│   └── Colors.ts           # Theme colors and color palettes
├── contexts/               # React Context providers for global state management
│   ├── ChatContext.tsx
│   ├── QuestUpdateContext.tsx
│   ├── SuggestionContext.tsx
│   ├── SupabaseContext.tsx
│   └── ThemeContext.tsx
├── documentation/          # Project documentation (you are here!)
├── hooks/                  # Custom React Hooks for reusable stateful logic
│   ├── useChatData.ts
│   ├── useJournal.ts
│   └── useThemeColor.ts
├── lib/                    # Core library code, helper functions, client initializations
│   └── supabase.ts         # Supabase client initialization and helper functions
├── node_modules/           # Project dependencies
├── scripts/                # Utility scripts for development or build processes
│   └── reset-project.js
├── services/               # Modules for interacting with backend services and external APIs
│   ├── chatDataService.ts
│   ├── journalService.ts
│   ├── questsService.ts
│   ├── tasksService.ts
│   └── agents/             # AI agent logic (ChatAgent, SuggestionAgent, etc.)
├── types/                  # TypeScript type definitions and interfaces
│   ├── deepseek.ts
│   └── supabase.ts
├── utils/                  # General utility functions
│   ├── dateFormatters.ts
│   └── performanceLogger.ts
├── workers/                # Source code for Cloudflare Workers
│   ├── clerk-user-sync/
│   └── transcribe-audio/
├── .env.local              # Local environment variables (gitignored)
├── .gitignore              # Specifies intentionally untracked files that Git should ignore
├── app.config.ts           # Expo app configuration (dynamic)
├── app.json                # Expo app configuration (static)
├── package.json            # Project metadata, dependencies, and scripts
├── package-lock.json       # Records exact versions of dependencies
├── tsconfig.json           # TypeScript compiler options
└── wrangler.toml           # Cloudflare Workers configuration
```

## Key Directory Explanations:

*   **`app/`**: This is the heart of your application's navigation and screen structure, powered by `expo-router`. Each file or directory here typically maps to a route in the app.
    *   `_layout.tsx`: Defines the root layout component for a directory of routes.
    *   `+not-found.tsx`: A special file for handling routes that are not matched.
    *   Subdirectories like `auth/` group related screens (e.g., sign-in, sign-up).
    *   `styles/` within `app/` might contain styles specific to screens or layouts in this directory.
*   **`assets/`**: Stores all static assets like fonts, images, and icons.
*   **`components/`**: Contains reusable UI components that are used across multiple screens. These are generally "dumb" components focused on presentation. Subdirectories group components by feature or type.
*   **`constants/`**: Holds values that are constant throughout the application, such as color definitions (`Colors.ts`), API endpoints (if not in .env), or configuration flags.
*   **`contexts/`**: Manages global or shared state using React's Context API. Each file typically defines a context and its provider (e.g., `ThemeContext.tsx` for theming).
*   **`hooks/`**: Custom React Hooks that encapsulate reusable stateful logic or side effects (e.g., `useJournal.ts` for journal-related logic, `useThemeColor.ts` for accessing theme colors).
*   **`lib/`**: Often used for initializing third-party libraries or providing utility functions that are core to the application's infrastructure (e.g., `supabase.ts` for initializing the Supabase client).
*   **`services/`**: Contains modules responsible for business logic and data fetching/manipulation. This layer abstracts away the direct interaction with APIs or databases from the UI components.
    *   **`agents/`**: A subdirectory within `services/` dedicated to AI agent logic. Each agent handles interactions with specific AI models for tasks like chat, suggestions, or analysis.
*   **`types/`**: Stores custom TypeScript type definitions and interfaces used throughout the project, promoting type safety.
*   **`utils/`**: Contains general-purpose utility functions that don't fit into other specific categories (e.g., date formatting, helper functions).
*   **`workers/`**: Houses the source code for serverless functions deployed on Cloudflare Workers. Each subdirectory typically represents a separate worker.

This structure aims to promote modularity, separation of concerns, and ease of navigation within the Narrative codebase.
