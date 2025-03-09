# Quest Functions Analysis Report

## QuestAgent.ts Analysis

### Direct SQL Calls

1. **createQuest**
   - SQL Operation: INSERT
   - Table: 'quests'
   - Returns: Single quest record
   ```typescript
   supabase.from('quests').insert({...}).select('*').single()
   ```

2. **updateQuest**
   - SQL Operation: UPDATE
   - Table: 'quests'
   - Returns: Single quest record
   ```typescript
   supabase.from('quests').update({...}).eq('id', questId).eq('user_id', userId).select('*').single()
   ```

3. **deleteQuest**
   - SQL Operations: Two operations
     a. UPDATE on tasks table (moving tasks to misc quest)
     ```typescript
     supabase.from('tasks').update({ quest_id: MISC_QUEST_ID }).eq('quest_id', questId).eq('user_id', userId)
     ```
     b. DELETE from quests table
     ```typescript
     supabase.from('quests').delete().eq('id', questId).eq('user_id', userId)
     ```

4. **findRelevantQuests**
   - SQL Operation: SELECT
   - Table: 'quests' with nested 'tasks'
   - Returns: Array of quests with tasks
   ```typescript
   supabase.from('quests').select(`
       id, title, analysis, status, tagline, description, is_main,
       created_at, updated_at, tags, start_date, end_date,
       parent_quest_id, user_id,
       tasks (...)
   `).eq('user_id', userId)
   ```

### Functions Defined in QuestAgent

1. **Constructor**
   - Initializes Google Generative AI
   - Sets up model configuration

2. **Public Methods**
   - `createQuest(userId: string, questData: {...}): Promise<Quest>`
   - `updateQuest(questId: number, userId: string, questData: {...}): Promise<Quest>`
   - `deleteQuest(questId: number, userId: string): Promise<void>`
   - `findRelevantQuests(journalContent: string, userId: string): Promise<Quest[]>`

3. **Private Helper Methods**
   - `validateAndRepairJson(rawResponse: string, questId: number): Promise<QuestRelevanceItem | null>`
   - `cleanResponseText(response: string): string`
   - `analyzeMiscQuestTasks(journalContent: string, miscQuest: Quest, userId: string): Promise<QuestRelevanceItem | null>`
   - `analyzeRegularQuest(journalContent: string, quest: Quest, userId: string): Promise<QuestRelevanceItem | null>`

## questsService.ts Analysis

### Existing Functions and Operations

1. **Database Operations**
   - `fetchQuests(userId: string): Promise<Quest[]>`
     - Fetches all quests with their tasks for a user
     - Returns full Quest[] array with nested tasks
   
   - `createQuest(questData: QuestInput): Promise<Quest>`
     - Creates a new quest
     - Handles date field cleaning
     - Returns created quest

   - `updateQuest(questId: number, questData: QuestInput): Promise<void>`
     - Updates existing quest
     - Verifies quest ownership
     - Handles date field cleaning
     
   - `updateMainQuest(questId: number, userId: string): Promise<void>`
     - Updates which quest is marked as main
     - Uses RPC call to handle database update
     - Verifies quest ownership

2. **React Hook**
   - `useQuests()`
     - Provides quests data and operations to React components
     - Manages loading and error states
     - Handles real-time updates via Supabase subscription
     - Returns:
       - mainQuest
       - quests array
       - setQuestAsMain function
       - loading state
       - error state
       - reload function

### Gaps in Functionality

The following operations from QuestAgent.ts need to be added to questsService.ts:

1. **Quest Deletion**
   - No existing function to delete quests
   - Need to add `deleteQuest(questId: number, userId: string): Promise<void>`
   - Should handle both quest deletion and task reassignment

2. **Task Quest Updates**
   - No direct function to move tasks between quests
   - Need to add `updateTaskQuest(taskId: number, newQuestId: number, userId: string): Promise<void>`
   - Required for quest deletion flow

## Updated Recommendations for Refactoring

1. **New Service Functions Needed**
   ```typescript
   // Add to questsService.ts:
   async function deleteQuest(questId: number, userId: string): Promise<void>;
   async function updateTaskQuest(taskId: number, newQuestId: number, userId: string): Promise<void>;
   ```

2. **QuestAgent.ts Changes**
   - Replace direct Supabase calls with service function calls
   - Update error handling to match service patterns
   - Maintain LLM-related logic while removing database logic

3. **Implementation Priority**
   1. Add missing service functions to questsService.ts
   2. Update QuestAgent.ts to use service functions
   3. Test all operations to ensure functionality is preserved
   4. Update error handling and types to match

4. **Type Updates Needed**
   - Ensure QuestInput type is consistent between files
   - Add return types for all new functions
   - Share types through a common types file

Next step: Create the missing service functions in questsService.ts before modifying QuestAgent.ts.

## Recommendations for Refactoring

1. **Required Service Functions**
   The following functions should exist in questsService.ts to support QuestAgent.ts:
   - `createQuest(userId: string, questData: {...}): Promise<Quest>`
   - `updateQuest(questId: number, userId: string, questData: {...}): Promise<Quest>`
   - `deleteQuest(questId: number, userId: string): Promise<void>`
   - `getQuestsWithTasks(userId: string): Promise<Quest[]>`
   - `updateTaskQuest(taskId: number, newQuestId: number, userId: string): Promise<void>`

2. **Next Steps**
   - Review questsService.ts to determine which functions already exist
   - Create missing functions in questsService.ts
   - Refactor QuestAgent.ts to use service functions instead of direct SQL calls
   - Update error handling and response typing to match service functions

Please provide the contents of questsService.ts to complete this analysis and proceed with the refactoring.
