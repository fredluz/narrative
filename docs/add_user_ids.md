# Adding User IDs for Supabase Row Level Security (RLS)

This document outlines the changes needed to properly support Supabase RLS by ensuring user_id is properly handled throughout the application.

## Core Pattern

1. Add user_id validation helper:
```typescript
function validateUserId(userId: string | undefined): string {
  if (!userId) {
    throw new Error('User ID is required but was not provided');
  }
  return userId;
}
```

2. Update service method signatures to include userId:
```typescript
async getEntry(date: string, userId: string): Promise<Entry>
async saveEntry(date: string, content: string, userId: string): Promise<Entry>
```

3. Validate and use userId in database queries:
```typescript
const validUserId = validateUserId(userId);
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', validUserId)
  // ...other query conditions
```

4. Include user_id in all database inserts/updates:
```typescript
await supabase
  .from('table_name')
  .insert([{
    ...otherFields,
    user_id: validUserId
  }])
```

## Component Changes

1. Get userId from Supabase session:
```typescript
const { session } = useSupabase();
```

2. Add session?.user?.id dependency to data fetching effects:
```typescript
useEffect(() => {
  const loadData = async () => {
    if (!session?.user?.id) return;
    // ...fetch data using session.user.id
  };
  
  loadData();
}, [session?.user?.id]);
```

3. Guard user actions with userId check:
```typescript
const handleSave = async () => {
  if (!session?.user?.id) return;
  // ...proceed with save using session.user.id
};
```

## Files Changed

1. `journalService.ts`:
- Added validateUserId helper
- Updated all method signatures to require userId
- Modified all database queries to filter by user_id
- Added user_id to all inserts/updates

2. `ChatAgent.ts`:
- Added user_id extraction from messages
- Pass user_id to all journalService calls
- Include user_id in chat session creation

3. `JournalPanel.tsx`:
- Get session from useSupabase hook
- Add user_id checks to all handlers
- Pass user_id to all service calls
- Add session?.user?.id dependency to effects

## Testing Changes

## Implementation Checklist

- [ ] Add validateUserId helper to services
- [ ] Update service method signatures
- [ ] Modify database queries
- [ ] Update components to use session

## Implementation Status

### Completed
- ✅ Added user_id field to all relevant tables
- ✅ Added RLS policies for all tables
- ✅ Updated service layer with validateUserId
- ✅ Added user_id handling in JournalService
- ✅ Added user_id handling in QuestService
- ✅ Updated type definitions to include user_id
- ✅ JournalPanel.tsx fully updated with proper user_id handling
- ✅ Related components properly passing user_id:
  - JournalEntryInput
  - CheckupItem
  - AIResponse
  - useJournal hook
  - ChatAgent integration
  - DesktopLayout integration
  - MobileLayout integration
- ✅ Agents properly handling user_id:
  - ✅ JournalAgent.ts:
    - Added validateUserId validation
    - Updated all public methods to require userId
    - Modified all Supabase queries to filter by user_id
    - Updated all private methods to handle userId
    - Ensured consistent parameter ordering
    - Added proper user_id handling in prompt creation
  - ✅ QuestAgent.ts:
    - Added validateUserId validation
    - Added user filtering in findRelevantQuests
    - Updated all quest operations with user_id checks
    - Added proper task filtering by user_id in quest analysis
    - Ensured consistent user_id handling in misc quest tasks
  - ✅ ChatAgent.ts:
    - Added validateUserId helper function
    - Updated generateResponse to properly validate and pass userId to journalService
    - Fixed generateChatResponse to extract userId from messages
    - Added user_id handling in summarizeAndStoreSession
    - Added proper user_id extraction and validation in createCheckupEntryFromSession
    - Updated generateCheckupContent to handle userId consistently
    - Fixed issues with chat_sessions table inserts to include user_id
    - Ensured all database queries filter by user_id
    - Improved error handling for missing user_id cases
  - ✅ Updated QuestsOverview.tsx:
    - Added proper user ID handling and validation
    - Fixed modal components to properly pass validated user IDs
    - Added guard to prevent modal rendering without valid user ID
    - Updated all database operations to validate and use user_id
    - Properly wrapped user_id access in session checks
  - ✅ Updated KanbanBoard.tsx:
    - Added proper user ID validation and session check
    - Modified toggleTaskCompletion to validate and use user_id
    - Added proper render guards for auth-required actions
  - ✅ Updated TaskList.tsx:
    - Added proper user ID validation and session check
    - Modified toggleTaskCompletion to validate and use user_id
    - Added proper error handling for task status updates
  - ✅ Updated EndOfDayReviewService.ts:
    - Added validateUserId to all methods
    - Updated getDailyReview to require and validate userId
    - Added proper user_id filter to database queries
    - Added user_id to review creation and updates
    - Added user_id to formatReviewData
    - Ensured consistent user_id passing to dependent services
  - ✅ Updated TaskStrategizer.ts:
    - Added validateUserId validation
    - Updated generateRecommendations to require userId
    - Added proper user_id handling in all methods

### In Progress
- 🔄 Updating remaining agents
- 🔄 TaskAgent.ts needs review
- 🔄 EndOfDayReviewAgent.ts needs update

### Next Steps
1. Review and update TaskAgent.ts
2. Update integration tests to include user_id scenarios 
3. Update documentation with auth requirements
4. Add user_id validation to remaining utility functions