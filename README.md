# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## QUESTLOG

---

## 1. **Landing / Home Page**

### Purpose
- Provide an immediate overview of the user’s current situation: upcoming tasks, open quests, and recent messages from the AI assistant.

### Key Features
- **Quick Glance Cards**: 
  - Next 3 tasks due (with deadlines and location).
  - Active Quests: top 2–3 quests the user is focusing on.
  - Recent Chat Snippets: show last AI message or an “AI Suggestion of the Day.”
- **“Go to Chat” Button**: Encourages the user to jump into the conversational interface.

### Layout Highlights
- Clean hero-like header with user’s name or motivational greeting.
- Panels or cards summarizing key productivity data.
- Possibly highlight an important AI nudge—e.g., “Don’t forget to complete your daily journal!”

---

## 2. **Chat / LLM Interface Page**

### Purpose
- Central place for the user to converse with the AI assistant and see the ongoing dialogue.

### Key Features
- **Chat Thread**: 
  - Messages from the user (aligned right) and AI messages (aligned left).
  - Option to display small icons for different AI “personality modes” (Cheerleader, Stoic Mentor, etc.).
- **Message Input Field**:
  - Allows the user to type or use voice-to-text (if you plan to integrate).
  - Could have a short list of quick action buttons like “Add Task,” “Schedule Event,” or “Add Journal Entry.”
- **Proactive Reminders / Notifications**:
  - Above or below the chat, show real-time notifications when the AI proactively reminds the user about tasks or journal entries.

### Layout Highlights
- Minimal, clean design (similar to messaging apps).
- Keep the chat always scrolled to the bottom for a live feel.
- Possibly a side-panel with “context” info (like current active quest or next upcoming event) which the LLM is referencing.

---

## 3. **Quests Overview Page**

### Purpose
- Display a list of all quests (medium/long-term goals) in an RPG-inspired style. 
- Provide a quick way to see quest progress and statuses.

### Key Features
- **Quests List**:
  - Each quest has a title, short description, a progress bar or indicator of how many tasks are done vs. total tasks.
  - Buttons or links to open a specific quest detail page.
- **Add New Quest** button.

### Layout Highlights
- Visually reminiscent of an RPG quest log: 
  - Possibly with small “quest icons” or stylized headings.
- Clear statuses or color-coding to show which quests are “Active,” “On-Hold,” or “Completed.”

---

## 4. **Single Quest Detail & Kanban Page**

### Purpose
- Serve as the in-depth view for a single quest:
  - Show tasks, memos, and quest statuses (the stylized SWOT analysis logs).
  - Provide an interactive Kanban board to move tasks from “Todo” to “In-Progress” to “Done.”

### Key Features
1. **Quest Info Header**:
   - Title, short description, creation date, “active” or “completed” indicator.
2. **QuestStatus Log** (SWOT-inspired paragraphs):
   - Show the chronological updates to the quest status. 
   - Possibly collapse older status updates, with an option to expand them.
3. **Tasks Kanban Board**:
   - Three columns: “Todo,” “In-Progress,” “Done.”
   - Drag & drop tasks between columns.
   - Each task card shows task name, location, and due date. 
   - A “+ Add Task” button in the “Todo” column.
4. **Memos List**:
   - Separate panel or section for relevant memos/tips. 
   - Memos can be pinned or flagged.

### Layout Highlights
- A large Kanban board for tasks (main content).
- A right sidebar or bottom section for quest statuses (the 3-paragraph logs) and memos.

---

## 5. **Task List Page**

### Purpose
- Give the user a comprehensive view of **all** tasks across quests, sorted by their deadlines and grouped by location.

### Key Features
- **Tasks Grouped by Location**:
  - Sections like “Online/Desktop,” “Gym,” “Home,” “Errands,” etc.
- **Within Each Location**, tasks can be **sorted by date**:
  - Overdue tasks at the top, then upcoming tasks in chronological order.
- **Quick Action Buttons** for each task (e.g., “Mark Complete,” “Edit,” “Reschedule”).

### Layout Highlights
- A collapsible accordion or tab-based interface where each location is its own section.
- Possibly a toggle between “List View” and “Calendar View” to see how tasks map onto a timeline.

---
## 5. **Routine Page**

### Purpose

- Manage recurring maintenance tasks that are not tied to quests but are necessary for daily, weekly, or monthly upkeep.

### Key Features

- ## Task Categories:

- Daily Tasks

- Weekly Tasks

- Monthly Tasks

- Flexible Scheduling (e.g., “Two times a week” or “Every other Friday”).

### Integration with Calendar:

- Sync scheduled tasks with Google Calendar.

- Allow AI to dynamically adjust schedules if a user misses a task (“Let’s reschedule your workout to tomorrow”).

### Completion Tracking:

- Checkbox system to mark completed routines.

- AI-generated streak tracking (e.g., “You’ve completed your morning routine 5 days in a row!”).

### Layout Highlights

- A clean, checklist-style interface.

- Possible calendar-style heatmap for tracking consistency.

## 6. **Calendar Integration Page**

### Purpose
- Integrate with Google Calendar or another scheduling solution so the user can see tasks/events on a monthly/weekly/daily grid.

### Key Features
- **Calendar Grid**:
  - Mark tasks that have scheduled dates, plus any personal events pulled in from Google Calendar.
- **Add/Update Events**:
  - If the user clicks on a date, open a modal to add a new event or schedule an existing task directly on that date and time.
- **Sync Status**:
  - Show whether the user’s Google Calendar is linked, last sync time, any conflicts, etc.

### Layout Highlights
- Standard calendar UI (month, week, day views) with color-coded tasks vs. external events.
- Possibly embed the official Google Calendar UI using an iFrame (for a quicker MVP) or build your own.

---

## 7. **Journal Page (List & Detail)**

### Purpose
- Display the user’s historical journal entries so both the user and the AI can reflect on them.
- Provide a place to read and write new longer-form entries.

### Key Features
1. **Journal Entries List**:
   - Chronological list (most recent at top).
   - Each entry shows a short preview (first ~200 characters).
2. **Single Journal Entry View**:
   - Full content of the journal entry.
   - AI-generated insights or summaries (optional).
3. **Add New Entry**:
   - Rich text editor or simple text box.
   - Option to attach images (if you want a more personal journaling experience).

### Layout Highlights
- A minimal, distraction-free interface for writing. 
- Possibly a “prompt of the day” near the top to encourage daily journaling.

---

## 8. **Settings & Profile Page**

### Purpose
- Central hub for user settings, AI “personality” selection, notification preferences, and user account details.

### Key Features
- **AI Personality Modes**:
  - Let the user pick from pre-set prompts: “Cheerleader,” “Stoic Mentor,” “Sarcastic Pal,” etc.
- **Notification Preferences**:
  - Frequency of proactive AI check-ins.
- **Google Calendar Integration Settings**:
  - Connect/disconnect from Google account.
  - Configure default calendar, tasks sync, etc.
- **User Profile**:
  - Name, time zone, personal background info, etc.

### Layout Highlights
- Tab-based interface or simple form sections for each setting category.
- Toggle switches and radio buttons for easy configuration.

---

## 9. **High-Level UX Flow**

1. **Landing / Home**: Summaries at-a-glance → user can jump into the next needed action.  
2. **Chat**: The user interacts with the LLM for daily conversation, quick tasks, or motivational pep talks.  
   - LLM calls functions like `addTask()`, `updateQuestStatus()`, etc., behind the scenes.  
3. **Quests**: The user can view all quests or open a specific quest’s details and Kanban board.  
4. **Tasks**: The user can see and manage tasks across all quests via a consolidated view.  
5. **Journal**: The user writes new entries or reviews past ones. LLM analyzes them in the background.  
6. **Calendar**: Scheduling tasks and events, integrated with Google Calendar.  
7. **Settings**: Personalize the AI’s demeanor and manage account integrations.

---
---
Data Layer / API Integration:

Set up a proper backend service (e.g. Firebase, Supabase, or your own REST/GraphQL API)
Implement local storage with AsyncStorage for offline capabilities
Use React Query or similar for data fetching/caching/sync
Consider implementing a queue for offline actions


State Management:

Use React Context for global app state
Consider Zustand for more complex state management
Implement proper loading/error states for better UX
Handle state persistence across app restarts


UI Components & Styling:

Use React Native's built-in styling system or a library like StyleSheet
Consider NativeBase or React Native Paper for pre-built components
Implement proper keyboard handling and input behaviors
Ensure components work well across different screen sizes
Use React Native's Animated API for smooth transitions


Navigation & Screens:

Use React Navigation for screen management
Implement proper deep linking support
Consider using tab navigation for main sections
Handle proper back button behavior on Android
Implement gesture-based navigation where appropriate


Notifications & Background Tasks:

Use Expo's Notifications API for push notifications
Implement local notifications for reminders
Handle background tasks for routine updates
Manage notification permissions properly
Consider using Background Fetch for periodic updates


Authentication & Security:

Use Expo Auth Session for OAuth flows
Implement secure token storage
Handle biometric authentication where appropriate
Manage session expiration and refresh
Consider implementing app lock features


Offline Support:

Implement proper data synchronization
Use SQLite or Realm for local database
Handle conflict resolution for offline changes
Show appropriate offline indicators
Queue actions for later sync


Performance Optimization:

Implement proper list virtualization
Use image caching and lazy loading
Optimize animations for 60fps
Minimize JS bridge traffic
Handle memory management properly


Platform-Specific Features:

Use native date/time pickers
Implement proper calendar integration
Handle different keyboard behaviors
Support different screen sizes and orientations
Consider tablet-specific layouts


Testing & Monitoring:

Set up proper error tracking (e.g. Sentry)
Implement analytics for user behavior
Use Expo's testing tools
Handle crash reporting
Monitor performance metrics
### Summing Up

With these pages, your MVP will allow users to (1) chat with the AI assistant to manage tasks and goals, (2) track everything in an RPG-inspired Quest and Task interface, (3) maintain a personal Journal for deeper reflection, and (4) integrate with Google Calendar for real-time scheduling and reminders. The design focuses on balancing a fun, motivational vibe (through the RPG quest metaphor) with straightforward productivity tools (Kanban boards, calendar scheduling, etc.).

This structure provides a clear, game-like user journey while meeting the core requirement: letting the LLM act as a proactive project manager, hooking into tasks, quests, memos, and journal entries—always encouraging the user to stay on top of their goals and well-being.
