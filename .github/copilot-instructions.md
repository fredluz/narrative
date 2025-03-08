<copilot>
  <header>
    GitHub Copilot Instructions
    
    This file contains all instructions for GitHub Copilot in a structured format optimized for AI comprehension.
  </header>

  <section>
    <title>Core Principles</title>
    - Instructions should be provided in order of importance
    - Define concepts before referencing them
    - Use clear structure when it adds clarity
    - Balance between readability and precision
  </section>

  <section>
    <title>File Location Requirements</title>
    GitHub Copilot can only read instructions from a single file located at:
    `.github/copilot-instructions.md`

    All guidance must be added to this file as new sections rather than creating additional files.
  </section>

  <section>
    <title>Instruction Structure</title>
    For simple instructions, use plain text. For complex, multi-part instructions:

    <example>
      <title>[Topic Name]</title>
      <context>Brief explanation of the domain/problem space</context>
      <definitions>Any terms or concepts that will be referenced later</definitions>
      
      <guidelines>
      1. First guideline
      2. Second guideline
      3. Third guideline
      </guidelines>
      
      <examples>
      - Good: Example of correct implementation
      - Bad: Example of incorrect implementation
      </examples>
    </example>
  </section>

  <section>
    <title>Project-Specific Knowledge</title>
    Add domain-specific knowledge to this file that Copilot should understand when generating code for this project.
     
    For complex, highly structured information that requires cross-referencing, use sections like:
    
    <definitions>
      <term>concept1: Definition of concept1</term>
      <term>concept2: Definition of concept2</term>
    </definitions>
    
    <guidelines>
      <item for="concept1">Guideline text for concept1</item>
      <item for="concept2">Guideline text for concept2</item>
    </guidelines>
  </section>

  <section>
    <title>Implementation Patterns and Pitfalls</title>
    <context>
    When we encounter and solve difficult implementation problems, we document them here to prevent future recurrence.
    </context>
    
    <guidelines>
    - Document issues after finding a solution to a non-trivial bug
    - Include minimal but useful examples from our actual codebase
    - Focus on issues that are likely to recur or that took significant time to debug
    - Update this section when implementation patterns evolve
    </guidelines>
    
   <template>

  <section>
    <issue>

      <problem>
      Blank screen on app load due to theme context initialization
      </problem>

      <context>
      The app was using theme colors from multiple sources (ThemeContext and useChatData), creating 
      potential circular dependencies. Additionally, the ThemeContext was performing async operations 
      without proper loading state management.
      </context>

      <incorrect>
      - Having components access theme colors from multiple sources
      - Not handling async initialization in context providers properly
      - Allowing circular dependencies between contexts and hooks
      </incorrect>

      <solution>
      1. Centralize theme color access through ThemeContext only
      2. Add proper loading state management in ThemeContext
      3. Remove redundant theme color access from hooks
      </solution>

      <explanation>
      Context providers that perform async operations (like loading from AsyncStorage) must handle their loading state 
      properly to prevent components from rendering with undefined values. Additionally, having multiple sources of truth 
      for the same data (like theme colors) can create circular dependencies and race conditions.
      </explanation>
      
    </issue>
</section>

  <section>
    <issue>
      <problem>
      LLM prompt effectiveness diminished by poor content ordering
      </problem>

      <context>
      When constructing prompts for LLM responses, the most relevant/critical content should be placed last 
      in the prompt, as this has the strongest influence on the response. This is especially important when 
      you want the LLM to focus on specific content or maintain a particular context while generating its response.
      </context>

      <incorrect>
      - Placing the core content/question at the start of a long prompt
      - Diluting the main topic with too much context after the key content
      - Not reinforcing critical instructions at the end of the prompt
      </incorrect>

      <solution>
      1. Structure prompts with supporting context first
      2. Place the most critical content (what you want the LLM to directly respond to) last
      3. If needed, repeat the core content at the end of the prompt to ensure it's the freshest context
      </solution>

      <explanation>
      LLMs tend to focus more strongly on content placed towards the end of prompts. By structuring prompts 
      with the most critical content last, we ensure the model's response is more directly focused on the 
      core topic/question. This is similar to how human conversations work - we tend to respond most directly 
      to the last thing said.
      </explanation>
    </issue>
</section>

  <section>
    <issue>
      <problem>
      Feature Implementation Planning and Progress Tracking
      </problem>

      <context>
      When implementing new features, components, services, or any substantial code additions, 
      it's crucial to have a clear plan and track progress. This helps maintain organization, 
      ensures comprehensive implementation, and provides documentation for future reference.
      </context>

      <solution>
      1. Create a markdown file in the appropriate directory when starting a new feature
      2. Structure the plan with sections:
         - Overview
         - Implementation Steps
         - Technical Requirements
         - Database Changes (if needed)
         - UI Components (if applicable)
         - Testing Strategy
      3. Add a "WORK SO FAR" section to track progress
      4. Update the progress section after each significant change

      Example structure:
      ```markdown
      # Feature Name

      ## Overview
      Brief description of the feature

      ## Implementation Steps
      1. Step one
      2. Step two
      ...

      ## WORK SO FAR
      ### Completed
      - ✅ Created base component structure
      - ✅ Implemented database schema

      ### In Progress
      - [ ] Implementing UI components
      - [ ] Setting up API endpoints

      ### Next Steps
      1. Add error handling
      2. Implement caching
      ```
      </solution>

      <explanation>
      This pattern ensures that:
      - Features are well-planned before implementation
      - Progress is tracked and visible
      - Implementation remains organized and methodical
      - Future developers can understand the feature's evolution
      - No critical components are overlooked
      </explanation>
    </issue>
  </section>

  <section>
    <title>Function Import Practices</title>
    <context>
    When importing functions between services or components, we need to be careful about what we import and how we use it. Import only what's needed for the specific use case, and avoid importing UI-specific hooks in service files.
    </context>

    <guidelines>
    1. Service-to-Service Imports
       - Import direct database operation functions, not React hooks
       - Example: Import getTasksByDate(), not useTasks()
       - Service files should be pure business logic without UI dependencies

    2. React Hook Usage
       - Only use hooks in React components or custom hooks
       - Never import hooks into service files
       - If you need data in a service, import the underlying data function

    3. Common Pitfalls
       - Trying to use React hooks (useTasks, useJournal, etc.) in service files
       - Importing entire service modules when only specific functions are needed
       - Circular dependencies from mixing UI and business logic

    4. Best Practices
       - Keep service files focused on data operations and business logic
       - Export both hooks (for components) and pure functions (for services)
       - Use clear naming: get* for data fetching, use* for React hooks
    </guidelines>

    <examples>
    - Good: import { getTasksByDate } from './tasksService'
    - Bad: import { useTasks } from './tasksService'

    - Good:
    ```typescript
    // In tasksService.ts
    export async function getTasksByDate() { /* ... */ }
    export function useTasks() { /* ... */ }

    // In EndOfDayReviewService.ts
    import { getTasksByDate } from './tasksService'
    ```

    - Bad:
    ```typescript
    // In EndOfDayReviewService.ts
    import { useTasks } from './tasksService'
    ```
    </examples>

    <explanation>
    This pattern ensures proper separation of concerns between UI logic (React hooks) and business/data logic (service functions). Services should never depend on React-specific features, making them more portable and easier to test.
    </explanation>
  </section>

  <metadata>
  version: 1.1
  last_updated: 2023-11-09
  priority: high
  </metadata>
</copilot>