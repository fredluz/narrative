---
description: GitHub Copilot Instructions
globs: *.md
---
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

  <metadata>
  version: 1.1
  last_updated: 2023-11-09
  priority: high
  </metadata>
</copilot>