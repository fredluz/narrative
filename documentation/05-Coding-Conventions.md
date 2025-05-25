# 5. Coding Conventions

This document outlines the coding conventions and best practices to be followed when developing the Narrative application. Adhering to these conventions ensures code consistency, readability, and maintainability.

## 5.1. General Principles
*   **Readability:** Write code that is easy to understand. Use clear variable and function names.
*   **Simplicity:** Prefer simple solutions over complex ones unless the complexity is justified.
*   **Consistency:** Follow the established patterns and styles found in the existing codebase.
*   **DRY:** Avoid duplicating code. Encapsulate reusable logic in functions, hooks, or components.

## 5.2. TypeScript
*   **Strict Mode:** The project uses `compilerOptions.strict = true` in `tsconfig.json`. This enables a range of type-checking behaviors that lead to more robust code. Strive to write code that is fully compliant with strict mode.
*   **Type Everything:** Provide explicit types for function parameters, return values, and variables where type inference is not obvious or sufficient.
    *   Use interfaces (`interface`) for defining the shape of objects and public APIs.
    *   Use types (`type`) for unions, intersections, or more complex type definitions.
*   **Avoid `any`:** Minimize the use of the `any` type. If `any` is necessary, provide a clear justification in a comment. Prefer `unknown` for values where the type is not known in advance, and perform necessary type checks.
*   **Non-null Assertion Operator (`!`):** Use the non-null assertion operator sparingly and only when you are certain that a value will not be `null` or `undefined` at runtime.

## 5.3. Naming Conventions
*   **Components:** PascalCase (e.g., `UserProfile.tsx`, `JournalEntryInput`).
*   **Files (Non-Component):** camelCase (e.g., `journalService.ts`, `useAuth.ts`) or kebab-case if preferred by a specific module type (e.g., worker scripts). Strive for consistency within module types.
*   **Variables & Functions:** camelCase (e.g., `currentUser`, `fetchJournalEntries`).
*   **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`, `API_TIMEOUT`).
*   **Interfaces & Types:** PascalCase (e.g., `interface UserProfile`, `type JournalStatus`).
*   **Boolean Variables:** Prefix with `is`, `has`, `should` (e.g., `isLoading`, `hasSubmitted`, `shouldUpdate`).

## 5.4. Component Structure
*   **Functional Components:** Prefer functional components with Hooks over class components.
*   **Props:** Define props using TypeScript interfaces. Destructure props at the beginning of the component.
*   **JSX:**
    *   Keep JSX clean and readable.
    *   If a component's render logic becomes too complex, break it down into smaller, reusable sub-components.
    *   Use self-closing tags for components without children (e.g., `<MyIcon />`).
*   **Styling:**
    *   Use StyleSheet.create for component-specific styles.
    *   Refer to global styles (e.g., `app/styles/global.js`) for common theming and utility styles.
    *   Organize styles logically within the `StyleSheet.create` object.

## 5.5. State Management
*   **Local State (`useState`):** Use for state that is local to a single component.
*   **Custom Hooks:** Encapsulate complex stateful logic and side effects related to a specific feature or concern into custom hooks (e.g., `useJournal`, `useChatData`).
*   **React Context (`useContext`):** Use for global state or state that needs to be shared across many components at different levels of the component tree (e.g., theme, authentication status, global suggestions). Avoid overusing Context for state that can be managed locally or passed down through props.

## 5.6. Imports
*   **Path Aliases:** The project uses path aliases configured in `tsconfig.json` (e.g., `@/*` pointing to `./*`). Utilize these aliases for cleaner import paths:
    ```typescript
    import MyComponent from '@/components/MyComponent';
    import { userService } from '@/services/userService';
    ```
*   **Organize Imports:** Group imports by type (e.g., external libraries, project modules, styles). Many IDEs can automate this.
*   **Named vs. Default Exports:** Be consistent. If a module primarily exports one thing, a default export might be appropriate. For modules exporting multiple related items, named exports are generally preferred.

## 5.7. Asynchronous Code
*   **`async/await`:** Use `async/await` for managing asynchronous operations to improve readability.
*   **Error Handling:** Implement robust error handling for all asynchronous operations (API calls, database interactions). Use `try...catch` blocks and handle errors gracefully (e.g., display user-friendly messages, log errors).
*   **Loading States:** Manage and display loading states appropriately in the UI during asynchronous operations.

## 5.8. Comments
*   Write comments to explain complex logic, non-obvious decisions, or important workarounds.
*   Avoid commenting on obvious code.
*   Keep comments up-to-date as the code evolves.
*   Use `// TODO:` for tasks that need to be done and `// FIXME:` for known issues that need fixing.

## 5.9. Linting & Formatting
*   **Expo Lint:** The project includes an `npm run lint` script, which likely uses ESLint with Expo's recommended settings.
*   **Run Linter Regularly:** Run the linter frequently to catch issues early.
*   **IDE Integration:** Configure your IDE to use the project's ESLint (and Prettier, if adopted) configuration for real-time feedback and auto-formatting on save. This helps maintain consistency automatically.
*   While specific Prettier configuration isn't explicitly found, adhering to common formatting standards (consistent indentation, spacing, line breaks) is expected. The `expo lint` command may enforce some formatting rules.

## 5.10. File Structure
*   Follow the existing directory structure (see `06-Directory-Structure.md`).
*   Group related files together (e.g., components for a specific feature in a subdirectory within `components/`).

By following these conventions, we can build a more robust, maintainable, and collaborative codebase for Narrative.
