# Narrative - Your AI Partner in Thought and Action

Narrative is a unique productivity application designed to help you navigate the journey from scattered thoughts to clear, engaging goals. It acts as your AI partner, transforming mental clutter and unstructured ideas into actionable plans.

## The Core Idea: Braindump, Structure, Engage

Many productivity tools require you to have structured thoughts *before* you can use them effectively. Narrative flips this:

1.  **Braindump Your Way:** Externalize your thoughts freely. Use either:
    *   **Conversational AI Chat:** Talk with your chosen AI personality about ideas, tasks, feelings, or anything on your mind.
    *   **Direct Journaling:** Use the dedicated Journal panel to type out your thoughts or record voice notes (which are automatically transcribed).
2.  **AI-Powered Structuring:** As you chat or add journal entries, Narrative's AI analyzes your input. It identifies potential goals and actionable steps, proactively offering them as structured **Quest** (larger goals) and **Task** suggestions.
3.  **User-Driven Refinement:** You remain in control. Review the AI's suggestions. Accept them, reject them, or expand Task suggestions into a detailed view to refine details (title, description, schedule, deadline, priority, link to Quests, subtasks) before committing. Standalone tasks can even be upgraded into new Quests.
4.  **Engaging Narrativization:** By framing goals as "Quests" and interacting through distinct AI personalities, Narrative aims to make your productivity journey feel more like a meaningful story you're actively shaping, rather than just a checklist. This approach is inspired by how Role-Playing Games (RPGs) use quest logs to keep players engaged and aware of the steps needed to advance the plot.

## How It Works: The User Flow

*   **Login:** Authenticate using Clerk.
*   **Main Interface:** A three-column layout presents:
    *   **Column 1 (Quests & Tasks):** Visualize your commitments.
        *   `KanbanBoard`: Focuses on your designated "Main Quest" tasks. Filter by status (ToDo, InProgress, Done, Active, All) and cycle through statuses.
        *   `TaskList`: Displays *all* your active tasks, including standalone ones. Cycle through statuses here too. Triggers the initial welcome message for new users.
    *   **Column 2 (AI Chat - `ChatInterface`):**
        *   Converse with the AI.
        *   Click "Finish Chat" to end the session and automatically generate a summary journal check-in.
        *   Review AI-generated Task/Quest suggestions appearing below the chat. Accept, reject, expand (for tasks), or upgrade (tasks to quests).
    *   **Column 3 (Journal - `JournalPanel`):**
        *   Navigate daily entries.
        *   View check-ins (manual, voice, chat-generated).
        *   Add new entries via text input or voice recording (with auto-transcription).
        *   Save entries as check-ins, triggering AI analysis.
        *   View AI feedback on check-ins.
        *   Generate a consolidated daily summary entry.

## Key Features

*   **Dual Braindumping:** Use AI Chat or direct Journaling (text/voice) to capture thoughts.
*   **Intelligent Suggestion Engine:** Get AI-generated Quest & Task suggestions derived from your chat and journal entries.
*   **Integrated Journal:** Automatic check-ins from chat, plus manual & voice entry options, with AI analysis capabilities and daily summaries.
*   **Structured Goal & Task Tracking:** Manage commitments via a focused Main Quest Kanban and a comprehensive Task List.
*   **Personalization:** Choose your AI personality and theme.

## Who is Narrative For?

Narrative is ideal for:

*   Individuals seeking a more fluid and less rigid approach to productivity.
*   Thinkers who benefit from externalizing ideas (talking or writing) to find clarity.
*   Anyone looking for an AI partner to help transform unstructured thoughts into actionable plans.
*   Users wanting a more engaging, reflective, and narrative-driven way to manage goals and tasks.

## For Beta Testers & Contributors

*   **Tech Stack:** React Native/Expo, TypeScript, Supabase (Database), Clerk (Auth), Cloudflare Workers (Backend tasks like transcription), AI APIs (DeepSeek, Gemini).
*   **Contribution Guidelines:** (Coming Soon)
*   **Bug Reporting/Feedback:** (Coming Soon - Please use GitHub Issues for now)
