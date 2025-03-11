# Journal Functions Analysis Report

## JournalAgent.ts Analysis

### Direct SQL Calls

1. In `generateResponse` method:
```typescript
const { data: recentEntries, error } = await supabase
  .from('journal_entries')
  .select('user_entry, ai_response, updated_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(3);
```

2. In `generateAnalysis` method:
```typescript
const { data: recentEntries, error } = await supabase
  .from('journal_entries')
  .select('user_entry, ai_analysis, updated_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(3);
```

3. In `createEndOfDayPrompt` method:
```typescript
const { data: recentEntries, error } = await supabase
  .from('journal_entries')
  .select('user_entry, ai_analysis, updated_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(3);
```

### Functions Defined

1. `constructor()` - Initializes OpenAI and QuestAgent
2. `generateResponse(currentEntry: string, userId: string, previousCheckupsContext?: string): Promise<string>` - Generates AI response for a journal entry
3. `generateAnalysis(currentEntry: string, userId: string, previousCheckupsContext?: string): Promise<string>` - Generates AI analysis for a journal entry
4. `createResponsePrompt(currentEntry, context, userId, previousCheckupsContext)` (private) - Creates prompt for AI response
5. `createAnalysisPrompt(currentEntry, context, userId, previousCheckupsContext)` (private) - Creates prompt for AI analysis
6. `processJournalEntry(currentEntry, userId, previousCheckupsContext)` - Processes journal entry by generating both response and analysis
7. `processEndOfDay(allCheckupEntries, userId)` - Process end-of-day summary and analysis
8. `createEndOfDayPrompt(allCheckupEntriesWithResponses, userId)` (private) - Creates prompt for end-of-day processing

## journalService.ts Analysis

### Database Interaction Functions

1. `getEntry(date: string, userId: string): Promise<JournalEntry | null>` - Gets a journal entry for a specific date
2. `getEntries(startDate: string, endDate: string, userId: string): Promise<JournalEntry[]>` - Gets journal entries for a date range
3. `generateAIResponses(entryId: string, content: string, userId: string): Promise<{ response: string; analysis: string }>` - Generates AI responses via JournalAgent
4. `generateResponse(content: string, userId: string): Promise<string>` - Generates just the response via JournalAgent
5. `generateAnalysis(content: string, userId: string): Promise<string>` - Generates just the analysis via JournalAgent
6. `getCheckupEntries(date: string, userId: string): Promise<CheckupEntry[]>` - Gets all checkup entries for a date
7. `saveCheckupEntry(date, content, userId, tags, aiResponse)` - Saves a checkup entry to the database
8. `getUnsavedCheckupEntries(date: string, userId: string): Promise<CheckupEntry[]>` - Gets checkup entries not linked to a daily entry
9. `saveDailyEntry(date: string, userId: string, currentText?: string): Promise<JournalEntry>` - Saves a daily entry
10. `getCheckupsForDailyEntry(dailyEntryId: string, userId: string): Promise<CheckupEntry[]>` - Gets checkups for a daily entry

### Helper Functions

1. `getTimeSinceString(date: Date): string` - Generates a human-readable "time since" string

## Refactoring Needs

To eliminate direct SQL calls in JournalAgent.ts, a new function is needed in journalService.ts:

- **Missing Function**: `getRecentEntries(limit: number, userId: string): Promise<JournalEntry[]>` - Gets a specified number of recent entries with particular fields needed for AI context.

This function would need to:
1. Accept a limit parameter to specify the number of entries
2. Return entries ordered by creation date in descending order
3. Include user_entry, ai_response, ai_analysis, and updated_at fields
4. Filter by user_id