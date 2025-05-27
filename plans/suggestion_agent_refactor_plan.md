# Refactoring Plan: SuggestionAgent.ts for Context-Aware Chat Analysis

**Core Goal:** Revamp `SuggestionAgent.ts` to analyze chat history with full awareness of existing user quests and tasks, intelligently generating, editing, or continuing tasks, and associating them with appropriate quests *before* presenting suggestions to the user.

## Phase 1: Data Fetching & Preparation Utilities

1.  **Modify `services/questsService.ts`:**
    *   Create or ensure existence of `async function getQuestContextForLLM(userId: string): Promise<Array<{id: number, title: string, description?: string, status: string}>>`
        *   Fetches all quests for the `userId`.
        *   Returns a summarized array suitable for inclusion in an LLM prompt (e.g., ID, title, short description/tagline, status).
        
2.  **Modify `services/tasksService.ts`:**
    *   Create or ensure existence of `async function getActiveTaskContextForLLM(userId: string): Promise<Array<{id: number, title: string, description?: string, status: string, quest_id: number}>>`
        *   Fetches all *active* (ToDo, InProgress) tasks for the `userId`.
        *   Returns a summarized array (ID, title, short description, status, associated quest ID).
        *   Ensure descriptions are truncated.

## Phase 2: Core Logic in `SuggestionAgent.ts` - New Primary Method & Processing Pipeline

1.  **Deprecate/Remove `analyzeCheckupForSuggestions`:**
    *   Comment out or remove this method. Its functionality will be superseded by the new chat history analysis.
2.  **Define New Primary Method: `async analyzeChatHistoryForSuggestions(chatMessages: ConversationMessage[], userId: string): Promise<void>`**
    *   **Step 2.1: Fetch Context:**
        *   Call `getQuestContextForLLM(userId)` to get existing quest data.
        *   Call `getActiveTaskContextForLLM(userId)` to get existing active task data.
        *   Retrieve current personality using `personalityService.getUserPersonality(userId)` and `getPersonality()`.
    *   **Step 2.2: Construct LLM Prompt (e.g., for DeepSeek):**
        *   **Inputs to Prompt:**
            *   The `chatMessages` array.
            *   The summarized list of existing quests (from Step 2.1).
            *   The summarized list of active tasks (from Step 2.1).
            *   Current date.
            *   Current personality details.
        *   **LLM Instructions:**
            *   Identify potential new tasks from the chat.
            *   For each potential task, determine if it aligns with an *existing quest* (referencing the provided quest list and IDs). If so, specify the `existingQuestId`.
            *   Identify potential new quest *themes* if the chat discusses larger goals not covered by existing quests.
            *   If a task relates to a *newly proposed quest theme*, associate it with a temporary client-generated ID for that theme.
            *   Provide all details necessary to form a `TaskSuggestion` (title, description, scheduled_for, deadline, priority, tags, etc.).
        *   **Expected JSON Output Structure from LLM:**
            ```json
            {
              "proposedNewQuestThemes": [
                { 
                  "clientQuestId": "temp-quest-UNIQUE_ID_1", // LLM generates or is instructed on format
                  "title": "New Quest Theme Title", 
                  "tagline": "...",
                  "description": "...",
                  "associatedTaskProposals": [ // Raw task details from chat for this new quest
                    { 
                      "clientTaskId": "temp-task-A", // LLM generates or is instructed on format
                      "title": "Task Title for new quest", 
                      "description": "...",
                      // ... other task fields
                    }
                  ] 
                }
              ],
              "taskProposalsForExistingQuests": [
                { 
                  "existingQuestId": 123, // ID of an actual DB quest
                  "clientTaskId": "temp-task-B",
                  "title": "Task Title for existing quest", 
                  "description": "...",
                  // ... other task fields
                }
              ],
              "unassignedTaskProposals": [ // Tasks LLM couldn't confidently map
                { 
                  "clientTaskId": "temp-task-C",
                  "title": "Unassigned Task Title", 
                  "description": "...",
                  // ... other task fields
                }
              ]
            }
            ```
    *   **Step 2.3: Call LLM and Parse Response:**
        *   Use `openai.chat.completions.create` with `response_format: { type: "json_object" }`.
        *   Handle potential errors in LLM call or parsing. If errors occur, log them and exit gracefully for this attempt.
    *   **Step 2.4: Initialize Processing Lists:**
        *   `finalTaskSuggestions: TaskSuggestion[] = []`
        *   `finalQuestSuggestions: QuestSuggestion[] = []`
    *   **Step 2.5: Process `proposedNewQuestThemes`:**
        *   For each `theme` in `parsedResponse.proposedNewQuestThemes`:
            *   Perform a similarity check against the actual existing quests (fetched in Step 2.1). This might involve a simple string comparison or a more sophisticated local check if feasible, or even a quick targeted LLM call if necessary (though aim to minimize extra LLM calls).
            *   **If Genuinely New Theme:**
                *   Create a `QuestSuggestion` object using `theme.title`, `theme.tagline`, `theme.description`, and `theme.clientQuestId`.
                *   Add this `QuestSuggestion` to `finalQuestSuggestions`.
                *   For each `taskProposal` in `theme.associatedTaskProposals`:
                    *   Create an initial `TaskSuggestion` object from `taskProposal` details.
                    *   Set `taskSuggestion.pendingQuestClientId = theme.clientQuestId`.
                    *   Set `taskSuggestion.id = taskProposal.clientTaskId`.
                    *   Add to a temporary list, e.g., `tasksToProcessFurther`.
            *   **If Theme is Duplicate of Existing Quest:**
                *   Identify the `actualExistingQuestId`.
                *   For each `taskProposal` in `theme.associatedTaskProposals`:
                    *   Create an initial `TaskSuggestion` object.
                    *   Set `taskSuggestion.quest_id = actualExistingQuestId` (directly linking it).
                    *   Set `taskSuggestion.id = taskProposal.clientTaskId`.
                    *   Add to `tasksToProcessFurther`.
    *   **Step 2.6: Process `taskProposalsForExistingQuests`:**
        *   For each `taskProposal` in `parsedResponse.taskProposalsForExistingQuests`:
            *   Create an initial `TaskSuggestion` object.
            *   Set `taskSuggestion.quest_id = taskProposal.existingQuestId`.
            *   Set `taskSuggestion.id = taskProposal.clientTaskId`.
            *   Add to `tasksToProcessFurther`.
    *   **Step 2.7: Process `unassignedTaskProposals`:**
        *   For each `taskProposal` in `parsedResponse.unassignedTaskProposals`:
            *   Create an initial `TaskSuggestion` object.
            *   Set `taskSuggestion.id = taskProposal.clientTaskId`.
            *   (Quest ID will be determined later by `findBestQuestForTask` if not an edit/continuation).
            *   Add to `tasksToProcessFurther`.
    *   **Step 2.8: Mandatory Pre-Display Refinement for ALL `tasksToProcessFurther`:**
        *   For each `currentTaskSuggestion` in `tasksToProcessFurther`:
            *   Call `similarityResult = await this.checkForDuplicatesBeforeShowing(currentTaskSuggestion, userId)`.
            *   **If `similarityResult.isMatch` and `similarityResult.existingTask`:**
                *   Let `matchedExistingTask = similarityResult.existingTask`.
                *   If `similarityResult.isContinuation`:
                    *   `refinedSuggestion = await this.regenerateTaskWithContinuationContext(currentTaskSuggestion, matchedExistingTask, questContextOfMatchedTask)`.
                    *   Ensure `refinedSuggestion.quest_id` is correctly inherited from `matchedExistingTask.quest_id`.
                *   Else (it's an edit/duplicate and confidence is high, e.g., > 0.7):
                    *   `refinedSuggestion = await this.convertToEditSuggestion(currentTaskSuggestion, matchedExistingTask)`.
                    *   Ensure `refinedSuggestion.quest_id` is correctly inherited from `matchedExistingTask.quest_id`.
                *   If `refinedSuggestion` exists, add it to `finalTaskSuggestions`.
            *   **Else (no significant match - genuinely new task):**
                *   If `currentTaskSuggestion.quest_id` is not already set (and `pendingQuestClientId` is also not set):
                    *   `assignedQuestId = await this.findBestQuestForTask(currentTaskSuggestion, userId)`.
                    *   `currentTaskSuggestion.quest_id = assignedQuestId`.
                *   Add `currentTaskSuggestion` to `finalTaskSuggestions`.
    *   **Step 2.9: Add to Global Store:**
        *   For each `questSugg` in `finalQuestSuggestions`: `globalSuggestionStore.addSuggestion(questSugg)`.
        *   For each `taskSugg` in `finalTaskSuggestions`: `globalSuggestionStore.addSuggestion(taskSugg)`.
        *   (The `SuggestionContext` will then pick these up for UI display).

## Phase 3: Refine Helper Methods in `SuggestionAgent.ts`

1.  **Review/Update `checkForDuplicatesBeforeShowing(suggestion, userId)`:**
    *   Ensure its prompt is robust for comparing a new proposal against existing active tasks.
    *   It already fetches active tasks.
2.  **Review/Update `regenerateTaskWithContinuationContext(suggestion, previousTask, questContext?)`:**
    *   Ensure it correctly uses `previousTask.quest_id` for the new suggestion.
3.  **Review/Update `convertToEditSuggestion(suggestion, existingTask)`:**
    *   Ensure it correctly uses `existingTask.quest_id` for the edit suggestion.
    *   The logic for `generateTaskUpdateFields` will be critical here.
4.  **Review/Update `findBestQuestForTask(suggestion, userId)`:**
    *   This remains crucial for tasks that are new and not directly assigned to a new or existing quest by the primary LLM.
    *   Ensure its prompt effectively uses the list of all existing quests.
5.  **Review/Update `generateTaskSuggestion` (if kept for other purposes, e.g., manual task creation assist):**
    *   If this method is still called directly (e.g., by `CreateTaskModal`), it should also ideally run its output through the duplicate/edit/continuation check and `findBestQuestForTask` before finalizing. For simplicity, direct calls might just create a basic suggestion, and the user manually links it. The main proactive flow is `analyzeChatHistoryForSuggestions`.
6.  **Update `TaskSuggestion` and `QuestSuggestion` Interfaces:**
    *   Ensure fields like `pendingQuestClientId`, `pendingTaskClientIds`, `isEditSuggestion`, `existingTaskId`, `updateValues`, `previousTaskId` are correctly defined and utilized.

## Phase 4: Integration with `ChatAgent.ts` (or equivalent)

1.  **Modify `ChatAgent.ts` (or the component/service that manages chat interactions):**
    *   Implement logic to decide *when* to call `SuggestionAgent.analyzeChatHistoryForSuggestions`. Examples:
        *   Periodically (e.g., after a few user messages or a pause in conversation).
        *   On a specific trigger (e.g., user types a command like "/analyze chat").
        *   When the chat interface is closed or loses focus.
    *   Collect the relevant `chatMessages` (e.g., last N messages, messages since last analysis).
    *   Call `SuggestionAgent.getInstance().analyzeChatHistoryForSuggestions(messages, userId)`.

## Phase 5: Testing and Iteration

1.  **Unit Tests:** For individual functions in `SuggestionAgent`, especially the LLM prompt constructions and parsing of responses.
2.  **Integration Tests:** Test the end-to-end flow from `analyzeChatHistoryForSuggestions` to suggestions appearing in the `globalSuggestionStore`.
3.  **Manual Testing with Various Scenarios:**
    *   Chat about new topics (should suggest new tasks, potentially new quests).
    *   Chat about topics related to existing quests (should suggest tasks for those existing quests).
    *   Chat that implies an update to an existing task.
    *   Chat that implies a follow-up to an existing task.
    *   Short and long chat histories.
4.  **Prompt Engineering:** Expect to iterate on the main LLM prompt in `analyzeChatHistoryForSuggestions` to get the desired structured output and accurate associations. Monitor LLM costs and token usage.

## Key Considerations:

*   **Prompt Complexity & Token Limits:** Providing full quest and task lists to the LLM can make prompts very large. Use summarized data and be mindful of context window limits.
*   **LLM Reliability:** The accuracy of the initial LLM analysis (Phase 2.2) is crucial. If it struggles to map tasks to existing quests or identify new quest themes correctly, the downstream processing will be affected.
*   **Performance:** Multiple LLM calls (main analysis, then potentially for duplicates, continuations, best quest) can take time. Optimize by:
    *   Using faster models (like Gemini Flash) for simpler checks.
    *   Performing some checks locally if possible (e.g., simple string similarity for quest themes before an LLM call).
*   **User Experience:** How and when suggestions are presented. Avoid overwhelming the user. The `globalSuggestionStore` and `SuggestionContext` will handle the UI part.
*   **Client-Side IDs:** Continue using client-side IDs (`clientQuestId`, `clientTaskId`) for items proposed by the LLM until they are either mapped to existing DB items or new DB items are created upon user acceptance.

This plan provides a comprehensive roadmap for the refactor.
```

I will now write this content to `plans/suggestion_agent_refactor_plan.md`.
