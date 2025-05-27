# Current Task: SuggestionAgent Refactor & Context-Aware Chat Analysis

## Core Goal
Revamp `SuggestionAgent.ts` to analyze chat history with full awareness of existing user quests and tasks, intelligently generating, editing, or continuing tasks, and associating them with appropriate quests *before* presenting suggestions to the user.

## Phased Plan

### Phase 1: Data Fetching & Preparation
- Implement/ensure `getQuestContextForLLM(userId)` in `questsService.ts` (summarized quest data)
- Implement/ensure `getActiveTaskContextForLLM(userId)` in `tasksService.ts` (summarized active task data)

### Phase 2: Core Logic & Processing Pipeline
- Remove/deprecate `analyzeCheckupForSuggestions`
- Implement `analyzeChatHistoryForSuggestions(chatMessages, userId)`
    - Fetch quest/task context and personality
    - Construct LLM prompt with chat, quests, tasks, personality, date
    - LLM output: proposed new quest themes, task proposals for existing quests, unassigned tasks
    - Parse LLM JSON response
    - For each new quest theme: check for duplicates, create `QuestSuggestion` or link to existing
    - For each task proposal: create `TaskSuggestion`, set quest association (existing, new, or unassigned)
    - For all tasks: run duplicate/continuation check, refine as needed (edit, continuation, or new)
    - Assign to best quest if not already linked
    - Add all validated suggestions to `globalSuggestionStore`

### Phase 3: Helper Method Refinement
- Review/update:
    - `checkForDuplicatesBeforeShowing`
    - `regenerateTaskWithContinuationContext`
    - `convertToEditSuggestion`
    - `findBestQuestForTask`
    - `generateTaskSuggestion` (if kept)
    - `TaskSuggestion`/`QuestSuggestion` interfaces (fields for linking, edits, continuations)

### Phase 4: Integration
- Update `ChatAgent.ts` (or equivalent) to trigger `analyzeChatHistoryForSuggestions` at appropriate times (e.g., after N messages, on command, or on chat close)
- Collect relevant chat messages and userId for analysis

### Phase 5: Testing & Iteration
- Unit tests for SuggestionAgent methods and LLM prompt/response handling
- Integration tests for end-to-end suggestion flow
- Manual testing with various chat scenarios
- Iterate on LLM prompt for accuracy and cost

## Key Considerations
- Prompt complexity and token limits: summarize context, be mindful of LLM context window
- LLM reliability: accuracy of mapping tasks/quests is critical
- Performance: optimize LLM calls, use fast models for simple checks
- User experience: avoid overwhelming users, suggestions should be relevant and non-redundant
- Continue using client-side IDs for new suggestions until persisted

## Reference: SuggestionAgent Processing Flow
- See `plans/suggestion_agent_flowchart.md` for a detailed stepwise flowchart of the new pipeline

---

This phased plan provides a clear, actionable roadmap for the SuggestionAgent refactor and context-aware chat analysis.

## Key Areas for Comparison & Improvement:
1. Input analysis methods (chat, journal, conversation)
2. Suggestion generation logic (task, quest, edits, continuations)
3. LLM usage (prompts, models, parameters)
4. Data structures for suggestions (TaskSuggestion, QuestSuggestion)
5. State management and interaction with globalSuggestionStore
6. Error handling and performance
7. Unique features in each agent (e.g., conversation analysis, edit/continuation handling)

## Expected Outcome:
A clear, documented comparison and a plan for integrating the best features of both agents into the main project, improving the sophistication and relevance of AI-driven suggestions.

## Next Steps:
1. Review and compare both agent implementations
2. Document findings and recommendations
3. Implement improvements in SuggestionAgent
4. Update documentation and memory-bank as needed

## Files to Analyze:
- `services/agents/CASCADE_SuggestionAgent.ts`
- `services/agents/SuggestionAgent.ts`
