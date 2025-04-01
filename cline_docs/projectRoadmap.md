# Project Roadmap: Narrative

## High-Level Goals
- [] Develop a comprehensive productivity application named Narrative.
- [X] Integrate features for managing quests, tasks, and journal entries.
- [X] Incorporate AI capabilities for analysis, suggestions, and potentially chat interaction.
- [ ] Provide a seamless user experience across different platforms (potentially mobile and web).
- [X] Ensure data persistence using Supabase.
- [X] Implement user authentication using Clerk.

## Key Features
- [X] **Quest Management:** Create, edit, view, and organize quests (potentially using a Kanban board).
- [X] **Task Management:** Create, edit, view, and track tasks associated with quests or standalone.
- [X] **Journaling:** Allow users to write journal entries, potentially with AI analysis and check-ins.
- [X] **AI Suggestions:** Provide task suggestions based on user activity or journal entries.
- [X] **AI Chat:** Implement a chat interface for interaction with an AI agent.
- [X] **Authentication (Clerk):** Secure user login and registration using Clerk.
- [ ] **Theming/Customization:** Allow users to personalize the app's appearance (e.g., colors, personality).
- [ ] **Notifications:** Implement a notification system.
- [ ] **Sprint/Agile Features:** Include sprint planning or board components.

## Completion Criteria (Initial Setup)
- [x] `cline_docs` directory created.
- [x] `projectRoadmap.md` created with initial goals and features.
- [x] `currentTask.md` created outlining the initial setup task.
- [x] `techStack.md` created detailing the core technologies.
- [x] `codebaseSummary.md` created providing an overview of the project structure.

## Completed Tasks
- 2025-03-31: Created `cline_docs` directory.
- 2025-03-31: Completed initial documentation setup (`projectRoadmap.md`, `currentTask.md`, `techStack.md`, `codebaseSummary.md`).
- 2025-03-31: Migrated authentication from Supabase Auth to Clerk. Configured Supabase client for Clerk JWTs. Refactored components, hooks, and services. Cleaned up obsolete auth files.
- 2025-04-01: Fixed signed-out redirect logic in `app/_layout.tsx` to correctly navigate users to `/auth`.
