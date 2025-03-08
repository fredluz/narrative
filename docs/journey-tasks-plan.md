# Journey Tasks Feature

## Overview
Implement automatic task creation from Johnny's AI analysis recommendations in journal entries. 
The system will parse the analysis output for task suggestions and create appropriate tasks with 
proper categorization and quest linking.

## Implementation Steps
1. Create a TaskRecommendationParser service
   - ✅ Parse analysis text for task sections
   - ✅ Extract task details (title, description, priority)
   - ✅ Map recommendations to appropriate quests

2. Extend CreateTaskModal
   - ✅ Add support for quest_id selection
   - ✅ Add priority field
   - ✅ Support task recommendations display
   - ✅ Add quest matching suggestions
   - ✅ Smart quest auto-selection based on tags

3. Add TaskRecommendation component
   - ✅ Display parsed recommendations
   - ✅ Create standalone TaskRecommendation component
   - ✅ Integrate with AIAnalysis component
   - ✅ Show quest matching suggestions
   - ✅ Add task creation interface

4. Update JournalService
   - Add methods to extract task recommendations
   - Link tasks to journal entries
   - Store reference to originating analysis

## Technical Requirements
- Pattern matching for task extraction
- Quest categorization algorithm
- Task priority inference
- Batch task creation API

## Database Changes
- Add task_recommendations table
  - recommendation_id
  - journal_entry_id
  - analysis_text
  - created_at
  - status (pending/accepted/rejected)

- Add fields to tasks table
  - recommendation_id (nullable, foreign key)
  - analysis_context (text)
  - priority_score

## UI Components
1. TaskRecommendationCard
   - ✅ Display single recommendation
   - ✅ Show matching quest tags
   - ✅ Priority indicator with color coding
   - ✅ Create task button

2. TaskRecommendationList
   - ✅ List all recommendations
   - ✅ Integrated task creation
   - ✅ Priority-based styling

3. Extended CreateTaskModal
   - ✅ Quest selection dropdown
   - ✅ Priority field with visual indicators
   - ✅ Source recommendation display
   - ✅ Auto-population of fields from recommendation

## Testing Strategy
1. Parser Tests
   - Various analysis formats
   - Edge cases
   - Priority inference

2. UI Tests
   - Recommendation display
   - Task creation flow
   - Quest matching

3. Integration Tests
   - End-to-end flow
   - Database consistency
   - Analysis linking

## WORK SO FAR
### Completed
- ✅ Created planning document
- ✅ Implemented TaskRecommendationParser service with priority inference
- ✅ Extended CreateTaskModal with quest and priority support
- ✅ Added recommendation handling to CreateTaskModal
- ✅ Implemented smart quest matching based on task tags
- ✅ Created TaskRecommendation component
- ✅ Integrated TaskRecommendation into AIAnalysis
- ✅ Added automatic quest matching from recommendation tags
- ✅ Implemented task priority inference from recommendation text
- ✅ Added support for switching to Analysis view after daily entry
- ✅ Integrated task creation workflow in journal interface

### In Progress
- [ ] Testing recommendation parsing with various AI response formats
- [ ] Adding persistence layer for recommendations
- [ ] Implementing status tracking for recommendations

### Next Steps
1. Add database schema for recommendation tracking
2. Implement recommendation persistence in JournalService
3. Add task status tracking for recommendations
4. Add batch task creation support
5. Add success/error notifications for task creation

### Today's Progress Notes
1. Successfully implemented task creation from Johnny's analysis recommendations
2. Integrated recommendation parsing into AIAnalysis component
3. Added smart quest matching based on task content
4. Improved task priority inference system
5. Added automatic view switching after daily entry creation

Key features implemented:
- Task recommendations parsed from Battle Plan sections
- Priority inference from recommendation text
- Quest tag suggestions based on task content
- Seamless integration with existing task creation flow
- Improved UX with automatic view transitions