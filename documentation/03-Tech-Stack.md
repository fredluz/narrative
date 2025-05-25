# 3. Tech Stack

This document outlines the core technologies, frameworks, libraries, and tools used in the Narrative application.

## 3.1. Core Frontend Technologies
*   **React Native:** A JavaScript framework for building native mobile applications (iOS and Android) from a single codebase.
*   **Expo:** A platform and a set of tools built around React Native to simplify development, building, and deploying universal native apps.
    *   **Expo Router:** For file-system based routing and navigation.
    *   Various Expo Modules (e.g., `expo-av` for audio, `expo-haptics`, `expo-secure-store`, `expo-font`).
*   **TypeScript:** A superset of JavaScript that adds static typing, improving code quality and maintainability.
*   **React:** The underlying JavaScript library for building user interfaces.

## 3.2. Backend & Data
*   **Supabase (`@supabase/supabase-js`):** A Backend-as-a-Service (BaaS) platform providing:
    *   **PostgreSQL Database:** For storing all application data (users, journal entries, tasks, etc.).
    *   **Authentication:** Managed via Supabase Auth, likely integrated with `@clerk/clerk-expo`.
    *   **Realtime Subscriptions (Potentially):** For live data updates.
    *   **Storage (Potentially):** For user-uploaded files.
*   **Cloudflare Workers (`@cloudflare/workers-types`, `wrangler`):** A serverless execution environment used for:
    *   Proxying requests to external AI APIs securely.
    *   Running specific backend logic (e.g., voice transcription).
    *   `wrangler` is the CLI tool for developing and deploying Cloudflare Workers.

## 3.3. AI & Machine Learning
*   **OpenAI (`openai` library):**
    *   Used for interacting with OpenAI models, specifically for voice-to-text transcription (e.g., Whisper model, likely `gpt-4o-mini-transcribe` as mentioned in previous context). The `openai` library is configured to point to DeepSeek for chat.
*   **Google Gemini (`@google/generative-ai`):**
    *   Used for interacting with Google's Gemini models for tasks like generating suggestions, analyzing text for status updates, and other AI-driven insights.
*   **DeepSeek (via `openai` library):**
    *   The primary LLM for chat functionalities, accessed through an OpenAI-compatible API endpoint.

## 3.4. UI & Styling
*   **React Native Paper (`react-native-paper`):** A Material Design component library for React Native, providing pre-built and customizable UI components.
*   **Expo Vector Icons (`@expo/vector-icons`):** Provides a wide range of commonly used icons.
*   **Expo Symbols (`expo-symbols`):** For using Apple's SF Symbols on iOS.
*   **Expo Linear Gradient (`expo-linear-gradient`):** For creating gradient backgrounds.
*   **Expo Blur (`expo-blur`):** For applying blur effects to views.
*   **React Native SVG (`react-native-svg`):** For rendering SVG images and graphics.
*   **React Native Wheel Color Picker (`react-native-wheel-color-picker`):** For color selection UI.
*   **Custom Stylesheets:** TypeScript-based style definitions (e.g., `app/styles/`).

## 3.5. State Management & Navigation
*   **React Hooks:** `useState`, `useEffect`, `useContext`, `useReducer`, `useCallback` for managing component-level and shared state.
*   **React Context API:** For providing global state or shared functionality (e.g., theming, suggestion management).
*   **Expo Router (`expo-router`):** Handles navigation and routing within the application.
*   **React Navigation (`@react-navigation/native`, `@react-navigation/bottom-tabs`):** Core libraries used by Expo Router for navigation primitives.

## 3.6. Authentication
*   **Clerk (`@clerk/clerk-expo`):** A complete user management and authentication solution, likely handling sign-up, sign-in, session management, and user profiles.

## 3.7. Utilities & Others
*   **Date FNS (`date-fns`):** A modern JavaScript date utility library.
*   **EventEmitter3 (`eventemitter3`):** A high-performance event emitter library.
*   **React Native URL Polyfill (`react-native-url-polyfill`):** Provides URL parsing capabilities in React Native environments.
*   **AsyncStorage (`@react-native-async-storage/async-storage`):** For persistent, unencrypted, asynchronous key-value storage.
*   **Expo Secure Store (`expo-secure-store`):** For encrypted storage on the device.
*   **React Native Gesture Handler (`react-native-gesture-handler`):** Provides more comprehensive touch and gesture handling.
*   **React Native Reanimated (`react-native-reanimated`):** A library for creating smooth animations and interactions.
*   **React Native WebView (`react-native-webview`):** For embedding web content within the app.
*   **Svix (`svix`):** A webhook sending service. The exact usage in this project needs to be determined by examining the code.

## 3.8. Development Tools & Environment
*   **Node.js & npm:** For managing packages and running scripts.
*   **Jest (`jest`, `jest-expo`):** A JavaScript testing framework, used for unit and component testing.
*   **TypeScript (`typescript`):** For static typing.
*   **ESLint (`expo lint` script):** Likely used for code linting to enforce coding standards (configuration needs to be checked).
*   **Babel (`@babel/core`):** JavaScript compiler used by React Native.
*   **Wrangler (`wrangler`):** CLI for Cloudflare Workers development and deployment.

This list provides a comprehensive overview of the technologies involved in Narrative. Understanding these tools and libraries will be crucial for new developers joining the project.
