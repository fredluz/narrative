# Active Context

## Current Work Focus:
The project is focused on building a cross-platform productivity and journaling application (Narrative) that integrates task/quest management, journaling, and AI-driven suggestions/assistance. The current technical focus is on refining the SuggestionAgent and related AI-driven features, ensuring robust architecture, and maintaining up-to-date documentation and system patterns.

## Recent Changes & Activity:
- Populated the Memory Bank with up-to-date documentation from the main project docs
- Clarified and updated system architecture, tech stack, and product context
- Ongoing work on SuggestionAgent comparison and improvement

## Next Steps:
1. Continue refining SuggestionAgent and related AI/agent logic
2. Ensure all documentation and memory-bank files reflect the latest project direction
3. Maintain alignment between code, documentation, and memory-bank for onboarding and technical clarity

## Active Decisions & Considerations:
- Rely on the main documentation for authoritative information
- Use dual LLM strategy (Gemini + DeepSeek) for suggestions/analysis
- Maintain modular, agent-based architecture
- Prioritize security, cross-platform consistency, and robust async handling

## Important Patterns & Preferences:
- Modular, service/agent-based architecture
- Centralized suggestion store decoupled from UI
- Use of React Context for global state
- Singleton pattern for agents
- Clear separation of business logic and UI
