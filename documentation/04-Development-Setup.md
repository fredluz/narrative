# 4. Development Setup

This guide explains how to set up your local development environment to work on the Narrative application.

## 4.1. Prerequisites
Before you begin, ensure you have the following installed on your system:
*   **Node.js:** A recent LTS version is recommended (e.g., 18.x or 20.x). You can download it from [nodejs.org](https://nodejs.org/).
*   **npm:** Node Package Manager, which comes bundled with Node.js.
*   **Git:** For cloning the repository. Download from [git-scm.com](https://git-scm.com/).
*   **Expo CLI:** The command-line tool for Expo. Install it globally after installing Node.js:
    ```bash
    npm install -g expo-cli
    ```
*   **(Optional but Recommended) Watchman:** A file watching service that can improve performance for React Native development, especially on macOS. Installation instructions can be found on the [Watchman website](https://facebook.github.io/watchman/docs/install/).
*   **(For Mobile Development) Development Environment:**
    *   **iOS:** macOS with Xcode installed.
    *   **Android:** Android Studio installed, with an Android Virtual Device (AVD) set up or a physical Android device configured for development.
*   **(For Cloudflare Workers) Wrangler CLI:**
    ```bash
    npm install -g wrangler
    ```
    You will also need a Cloudflare account.

## 4.2. Cloning the Repository
1.  Open your terminal or command prompt.
2.  Navigate to the directory where you want to store the project.
3.  Clone the repository (replace `<repository-url>` with the actual Git repository URL):
    ```bash
    git clone <repository-url>
    cd narrative # Or the actual repository folder name
    ```

## 4.3. Installing Dependencies
Once you have cloned the repository and navigated into the project directory, install the project dependencies using npm:
```bash
npm install
```
This command will download and install all the packages listed in `package.json` and `package-lock.json`.

## 4.4. Environment Variables Setup
The application requires certain API keys and configuration settings to be stored in environment variables. These are managed using a `.env.local` file in the root of the project.

1.  **Create the `.env.local` file:**
    In the root directory of the project, create a new file named `.env.local`.

2.  **Add Environment Variables:**
    You will need to obtain the actual values for these variables from a senior team member or project lead. Add the following variables to your `.env.local` file, replacing the placeholder values:

    ```env
    # Expo / React Native
    EXPO_PUBLIC_PROJECT_ID=your_expo_project_id

    # Supabase
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anonymous_key

    # Clerk (Authentication)
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

    # AI APIs
    # Note: For client-side exposed keys, ensure they are appropriately restricted.
    # For sensitive keys (like OpenAI for DeepSeek/Transcription, Gemini),
    # these should ideally be used via a backend proxy (like the Cloudflare Workers).

    # Example for DeepSeek (if used directly client-side, though proxy is better)
    # EXPO_PUBLIC_DEEPSEEK_API_KEY=your_deepseek_api_key
    # EXPO_PUBLIC_DEEPSEEK_API_URL=your_deepseek_api_url

    # Example for Gemini (if used directly client-side, though proxy is better)
    # EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

    # Cloudflare Worker URLs (if applicable for proxying AI calls)
    # EXPO_PUBLIC_TRANSCRIPTION_WORKER_URL=your_transcription_worker_url
    # EXPO_PUBLIC_CHAT_PROXY_WORKER_URL=your_chat_proxy_worker_url
    ```
    **Important:**
    *   The exact list of required environment variables might change. Always consult with the team for the most up-to-date list and their values.
    *   `.env.local` is included in `.gitignore` and should **never** be committed to the repository.

## 4.5. Running the Application
The `package.json` file contains scripts to start the development server for different platforms:

*   **Start the development server (Metro Bundler):**
    ```bash
    npm start
    ```
    or
    ```bash
    expo start
    ```
    This will open the Expo Developer Tools in your web browser, where you can:
    *   Scan a QR code with the Expo Go app on your iOS or Android device to run the app.
    *   Press `a` to open on an Android emulator or connected device.
    *   Press `i` to open on an iOS simulator or connected device.
    *   Press `w` to open in a web browser.

*   **Run directly on Android:**
    ```bash
    npm run android
    ```
    or
    ```bash
    expo start --android
    ```

*   **Run directly on iOS:**
    ```bash
    npm run ios
    ```
    or
    ```bash
    expo start --ios
    ```

*   **Run directly in the web browser:**
    ```bash
    npm run web
    ```
    or
    ```bash
    expo start --web
    ```

## 4.6. Linting
To check your code for linting errors and enforce coding standards:
```bash
npm run lint
```
This command likely uses ESLint, configured via Expo's defaults or a custom project configuration.

## 4.7. Testing
To run tests (likely Jest tests):
```bash
npm run test
```

## 4.8. Cloudflare Workers Development
If you are working on Cloudflare Workers (e.g., in the `workers/` directory):
1.  Navigate to the specific worker directory (e.g., `cd workers/transcribe-audio`).
2.  You might need to install dependencies within that worker's directory if it has its own `package.json`.
3.  Use Wrangler CLI commands for development and deployment:
    *   `wrangler dev`: To start a local development server for the worker.
    *   `wrangler deploy`: To deploy the worker to Cloudflare.
    Refer to the `wrangler.toml` file in the root and potentially within worker subdirectories for configuration.

You should now have a working local development environment for Narrative. If you encounter any issues, consult with your team lead or a senior developer.
