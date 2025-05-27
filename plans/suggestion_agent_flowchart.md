graph TD
    A[ChatAgent triggers analysis] --> B(SuggestionAgent.analyzeChatHistoryForSuggestions);
    B --> C{Fetch Context};
    C --> C1[Get Existing Quests (DB)];
    C --> C2[Get Active Tasks (DB)];
    C --> C3[Get User Personality];

    C1 --> D;
    C2 --> D;
    C3 --> D[Construct LLM Prompt with Chat History & Context];
    
    D --> E{Call Primary LLM (e.g., DeepSeek)};
    E --> F{Parse LLM JSON Response};
    F --> F_Error[Handle LLM/Parse Errors - Log & Exit];
    F --> G{Initialize finalTaskSuggestions & finalQuestSuggestions lists};

    G --> H{Process `proposedNewQuestThemes` from LLM response};
    H -- For each theme --> H1{Similarity Check vs Existing DB Quests};
    H1 -- Genuinely New --> H2[Create QuestSuggestion object];
    H2 --> H3[Add QuestSuggestion to finalQuestSuggestions];
    H2 --> H4{Process associatedTaskProposals for this new QuestSuggestion};
    H4 -- For each task proposal --> H5[Create TaskSuggestion];
    H5 --> H6[Set task.pendingQuestClientId = newQuest.clientQuestId];
    H6 --> I(Add to tasksToProcessFurther list);
    
    H1 -- Duplicate of Existing Quest --> H7[Identify actualExistingQuestId];
    H7 --> H8{Process associatedTaskProposals for this existing Quest};
    H8 -- For each task proposal --> H9[Create TaskSuggestion];
    H9 --> H10[Set task.quest_id = actualExistingQuestId];
    H10 --> I;

    G --> J{Process `taskProposalsForExistingQuests` from LLM response};
    J -- For each task proposal --> J1[Create TaskSuggestion];
    J1 --> J2[Set task.quest_id = taskProposal.existingQuestId];
    J2 --> I;

    G --> K{Process `unassignedTaskProposals` from LLM response};
    K -- For each task proposal --> K1[Create TaskSuggestion];
    K1 --> I;

    I --> L{Mandatory Pre-Display Refinement Loop};
    L -- For each TaskSuggestion in tasksToProcessFurther --> M{Call checkForDuplicatesBeforeShowing};
    M --> N{Match Found? (isMatch & existingTask)};
    N -- Yes --> O{Is Continuation?};
    O -- Yes --> P[Call regenerateTaskWithContinuationContext];
    P --> P1[Ensure quest_id inherited];
    P1 --> Q[Add refinedSuggestion to finalTaskSuggestions];
    
    O -- No (Edit/Duplicate with high confidence) --> R[Call convertToEditSuggestion];
    R --> R1[Ensure quest_id inherited];
    R1 --> Q;
    
    N -- No (or low confidence match) --> S{Genuinely New Task};
    S --> T{Task.quest_id or task.pendingQuestClientId already set?};
    T -- No --> U[Call findBestQuestForTask];
    U --> U1[Set task.quest_id = assignedQuestId];
    U1 --> V[Add currentTaskSuggestion to finalTaskSuggestions];
    T -- Yes --> V;
    
    Q --> W(End of loop for one task);
    V --> W;
    W -.-> L;

    L -- Loop Finished --> X{Add All Suggestions to GlobalStore};
    X --> X1[Add QuestSuggestions from finalQuestSuggestions to globalSuggestionStore];
    X --> X2[Add TaskSuggestions from finalTaskSuggestions to globalSuggestionStore];
    
    X1 --> Y[SuggestionContext updates UI];
    X2 --> Y;

    subgraph SuggestionAgent Internal Processing
        direction LR
        C
        D
        E
        F
        G
        H
        J
        K
        I
        L
        M
        N
        O
        P
        R
        S
        T
        U
        V
        Q
        W
        X
    end
```

**Explanation of the Flowchart:**

1.  **Trigger:** The process starts when `ChatAgent` (or a similar component) decides to analyze the chat history.
2.  **Context Gathering:** `analyzeChatHistoryForSuggestions` first fetches all necessary context: existing quests, active tasks from the database, and the user's current AI personality.
3.  **Primary LLM Call:** This context, along with the chat messages, is used to construct a detailed prompt for a powerful LLM (like DeepSeek). The LLM's job is to identify potential new quest themes, tasks for these new themes, tasks for existing quests, and any unassigned tasks.
4.  **LLM Response Parsing:** The structured JSON response from the LLM is parsed.
5.  **Processing LLM Output (Initial Categorization):**
    *   **Proposed New Quest Themes:** Each theme is checked for similarity against existing DB quests.
        *   If truly new, a `QuestSuggestion` is created and its associated task proposals are converted to `TaskSuggestion` objects (linked via `pendingQuestClientId`) and added to a temporary list (`tasksToProcessFurther`).
        *   If it's a duplicate of an existing quest, its task proposals are converted to `TaskSuggestion` objects, directly linked to the `actualExistingQuestId`, and added to `tasksToProcessFurther`.
    *   **Task Proposals for Existing Quests:** These are converted to `TaskSuggestion` objects, linked to the `existingQuestId` provided by the LLM, and added to `tasksToProcessFurther`.
    *   **Unassigned Task Proposals:** These are converted to `TaskSuggestion` objects and added to `tasksToProcessFurther`. Their quest association will be determined later if they are not edits/continuations.
6.  **Mandatory Pre-Display Refinement Loop (Critical Step):**
    *   *Every* `TaskSuggestion` in the `tasksToProcessFurther` list goes through this refinement:
        *   **Duplicate/Continuation Check:** `checkForDuplicatesBeforeShowing` is called.
        *   **If Match Found:**
            *   If it's a **continuation**, `regenerateTaskWithContinuationContext` is called to create an enhanced suggestion, inheriting the `quest_id`.
            *   If it's an **edit/duplicate** (with high confidence), `convertToEditSuggestion` is called, inheriting the `quest_id`.
            *   The refined suggestion is added to the `finalTaskSuggestions` list.
        *   **If No Significant Match (Genuinely New Task):**
            *   If the task doesn't already have a `quest_id` (from LLM direct assignment or because its new quest theme was validated) or a `pendingQuestClientId`, then `findBestQuestForTask` is called to assign it to the most appropriate existing quest (or the miscellaneous quest).
            *   This (now quest-associated) new task suggestion is added to `finalTaskSuggestions`.
7.  **Add to Global Store:** All validated `QuestSuggestion` objects (from `finalQuestSuggestions`) and refined/validated `TaskSuggestion` objects (from `finalTaskSuggestions`) are added to the `globalSuggestionStore`.
8.  **UI Update:** The `SuggestionContext` (or equivalent UI layer) observes changes in the `globalSuggestionStore` and displays the new suggestions to the user.

This flow ensures that before any suggestion is presented, it has been cross-referenced with existing data and refined to be as relevant and non-redundant as possible.
