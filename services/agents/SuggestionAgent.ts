// filepath: c:\Users\ThinkPad\Code\QuestLogMockupsWL\QuestLog\services\agents\SuggestionAgent.ts
import OpenAI from 'openai';
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { performanceLogger } from '@/utils/performanceLogger';
import { Quest, Task } from '@/app/types';
import { createTask } from '@/services/tasksService';
import { createQuest, getOrCreateMiscQuest } from '@/services/questsService';
import { globalSuggestionStore } from '../globalSuggestionStore';

/**
 * Represents a task suggestion generated from user content
 */
export interface TaskSuggestion {
  id: string;
  sourceContent: string;
  sourceType: 'chat' | 'journal';
  timestamp: string;
  type: 'task';
  title: string;
  description: string;
  scheduled_for: string;
  deadline?: string;
  location?: string;
  status: 'ToDo';
  tags?: string[];
  quest_id?: number;
  priority: 'high' | 'medium' | 'low';
  subtasks?: string;
}

/**
 * Represents a quest suggestion generated from user content
 */
export interface QuestSuggestion {
  id: string;
  sourceContent: string;
  sourceType: 'chat' | 'journal';
  timestamp: string;
  type: 'quest';
  title: string;
  tagline: string;
  description: string;
  status: 'Active';
  start_date?: string;
  end_date?: string;
  is_main: boolean;
  relatedTasks?: TaskSuggestion[];
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ConversationData {
  messages: ConversationMessage[];
  metadata: {
    startTime: string;
    endTime: string;
    totalMessages: number;
  };
}

interface TaskGroup {
  content: string;
  context: {
    sourceMessage: string;
    relatedMessages: string[];
    confidence: number;
    dependencies?: string[];
    timing?: 'immediate' | 'short-term' | 'long-term';
  };
}

interface QuestPattern {
  content: string;
  context: {
    sourceMessage: string;
    relatedMessages: string[];
    confidence: number;
  };
}

interface TaskContext {
  sourceMessage: string;
  relatedMessages: string[];
  confidence: number;
  dependencies?: string[];
  timing?: string;
}

interface QuestContext {
  sourceMessage: string;
  relatedMessages: string[];
  confidence: number;
}

type Suggestion = TaskSuggestion | QuestSuggestion;

// Define handler interfaces for direct updates
interface SuggestionUpdateHandlers {
  onSuggestionUpdate?: (taskSuggestions: TaskSuggestion[], questSuggestions: QuestSuggestion[]) => void;
}

/**
 * SuggestionAgent analyzes user messages and journal entries to generate
 * task and quest suggestions.
 */
export class SuggestionAgent {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private openai: OpenAI;
  private updateHandlers: SuggestionUpdateHandlers = {};
  
  // Add a static instance to implement proper singleton pattern
  private static instance: SuggestionAgent;

  constructor() {
    // Initialize both APIs
    this.genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    this.openai = new OpenAI({
      apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
      dangerouslyAllowBrowser: true
    });
    
    console.log("🔧 [SuggestionAgent] Created new agent instance");
  }

  // Static method to get the singleton instance
  public static getInstance(): SuggestionAgent {
    if (!SuggestionAgent.instance) {
      SuggestionAgent.instance = new SuggestionAgent();
      console.log("🔧 Created new SuggestionAgent singleton instance");
    }
    return SuggestionAgent.instance;
  }

  /**
   * Registers handlers for direct updates instead of using events
   * @param handlers Object containing update handler functions
   */
  registerUpdateHandlers(handlers: SuggestionUpdateHandlers): void {
    console.log('📢 [SuggestionAgent] Registering update handlers:', {
      hasOnSuggestionUpdate: !!handlers.onSuggestionUpdate
    });
    this.updateHandlers = handlers;
    
    // Immediately call handlers with current state to ensure components are in sync
    if (handlers.onSuggestionUpdate) {
      console.log('🔄 [SuggestionAgent] Initial sync of suggestion queues:');
      // Use the global store to get the current suggestions
      const tasks = globalSuggestionStore.getTaskSuggestions();
      const quests = globalSuggestionStore.getQuestSuggestions();
      handlers.onSuggestionUpdate(tasks, quests);
    }
  }

  /**
   * Analyzes a chat message to identify potential task or quest suggestions
   * @param message The chat message content to analyze
   * @param userId The user's ID
   */
  async analyzeMessage(message: string, userId: string): Promise<void> {
    performanceLogger.startOperation('analyzeMessage');
    try {
      if (!userId) {
        console.error('User ID is required for analyzeMessage');
        return;
      }
      
      console.log('🔍 SuggestionAgent: Analyzing chat message for potential tasks/quests');
      
      // Use Gemini for quick detection
      const hasTaskPotential = await this.detectTaskPotential(message);
      
      if (hasTaskPotential) {
        console.log('✨ Task potential detected in message');
        const taskSuggestion = await this.generateTaskSuggestion(message, userId);
        if (taskSuggestion) {
          this.addSuggestionToQueue(taskSuggestion);
        }
      }
      
      const hasQuestPotential = await this.detectQuestPotential(message);
      
      if (hasQuestPotential) {
        console.log('🏆 Quest potential detected in message');
        const questSuggestion = await this.generateQuestSuggestion(message, userId);
        if (questSuggestion) {
          this.addSuggestionToQueue(questSuggestion);
        }
      }
      
    } catch (error) {
      console.error('Error in analyzeMessage:', error);
    } finally {
      performanceLogger.endOperation('analyzeMessage');
    }
  }

  /**
   * Analyzes a journal entry to identify potential task or quest suggestions
   * @param entry The journal entry content to analyze
   * @param userId The user's ID
   */
  async analyzeJournalEntry(entry: string, userId: string): Promise<void> {
    performanceLogger.startOperation('analyzeJournalEntry');
    try {
      if (!userId) {
        console.error('User ID is required for analyzeJournalEntry');
        return;
      }
      
      console.log('🔍 SuggestionAgent: Analyzing journal entry for potential tasks/quests');
      
      // Journal entries are more likely to contain task/quest material, so we analyze both
      
      // Generate a task suggestion from the journal content
      const taskSuggestion = await this.generateTaskSuggestion(entry, userId);
      if (taskSuggestion) {
        this.addSuggestionToQueue(taskSuggestion);
      }
      
      // Generate a quest suggestion from the journal content
      const questSuggestion = await this.generateQuestSuggestion(entry, userId);
      if (questSuggestion) {
        this.addSuggestionToQueue(questSuggestion);
      }
      
    } catch (error) {
      console.error('Error in analyzeJournalEntry:', error);
    } finally {
      performanceLogger.endOperation('analyzeJournalEntry');
    }
  }

  /**
   * Analyzes a complete conversation for task and quest suggestions
   */
  async analyzeConversation(conversation: ConversationData, userId: string): Promise<void> {
    performanceLogger.startOperation('analyzeConversation');
    try {
      if (!userId) {
        console.error('User ID is required for analyzeConversation');
        return;
      }

      console.log('🔍 SuggestionAgent: Analyzing complete conversation');

      const prompt = `Analyze this conversation between USER and AI. Each message is clearly marked with its source.
      Pay special attention to:
      1. User commitments (when they say they will do something)
      2. AI suggestions that the user agrees with
      3. Goals mentioned by the user
      4. Tasks discussed between both parties

      Conversation:
      ${conversation.messages.map(msg => 
        `${msg.role.toUpperCase()}: ${msg.content}`
      ).join('\n')}`;

      // Generate suggestions using the complete conversation context
      const [taskGroups, questPatterns] = await Promise.all([
        this.identifyTaskGroups(conversation),
        this.identifyQuestPatterns(conversation)
      ]);

      // Process each identified task group
      for (const group of taskGroups) {
        const suggestion = await this.generateTaskSuggestion(
          group.content,
          userId,
          group.context
        );
        if (suggestion) {
          this.addSuggestionToQueue(suggestion);
        }
      }

      // Process each identified quest pattern
      for (const pattern of questPatterns) {
        const suggestion = await this.generateQuestSuggestion(
          pattern.content,
          userId,
          pattern.context
        );
        if (suggestion) {
          this.addSuggestionToQueue(suggestion);
        }
      }
    } catch (error) {
      console.error('Error in analyzeConversation:', error);
    } finally {
      performanceLogger.endOperation('analyzeConversation');
    }
  }

  private async identifyTaskGroups(conversation: ConversationData): Promise<TaskGroup[]> {
    const prompt = `From this conversation, identify potential tasks the user might need to complete.
    Focus on:
    1. Direct user commitments ("I will...", "I need to...")
    2. User agreeing to AI suggestions
    3. Explicit task discussions

    For each potential task, extract:
    1. The core action or task statement
    2. The message that contains this task
    3. Any related messages that provide context
    4. A confidence score (0-1) indicating how likely this is a real task
    5. Any dependencies or related tasks
    6. The timing (immediate, short-term, or long-term)

    Return your findings in this exact JSON format:
    {
      "tasks": [
        {
          "content": "Core task statement or action",
          "sourceMessage": "The original full message containing the task",
          "relatedMessages": ["First related message", "Second related message"],
          "confidence": 0.8,
          "dependencies": ["Optional related task"],
          "timing": "immediate | short-term | long-term"
        }
      ]
    }`;

    console.log('Sending task identification prompt to AI');

    const response = await this.openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: prompt },
        { 
          role: "user", 
          content: conversation.messages.map(msg => 
            `${msg.role.toUpperCase()}: ${msg.content}`
          ).join('\n')
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    try {
      // Get the response content
      const responseText = response.choices[0].message?.content || '{}';
      console.log('Task identification response received, parsing...');
      
      // Parse the JSON response
      const parsed = JSON.parse(responseText);
      
      // Check for tasks array in the response with a fallback to empty array
      const tasks = parsed.tasks || [];
      
      console.log(`Found ${tasks.length} potential tasks in conversation`);
      
      // Map the tasks to our TaskGroup format
      return tasks.map((task: any) => ({
        content: task.content || '',
        context: {
          sourceMessage: task.sourceMessage || '',
          relatedMessages: task.relatedMessages || [],
          confidence: task.confidence || 0.5,
          dependencies: task.dependencies,
          timing: task.timing
        }
      }));
    } catch (error) {
      console.error('Error parsing task groups:', error);
      console.error('Response content:', response.choices[0].message?.content);
      // Return empty array on error
      return [];
    }
  }

  private async identifyQuestPatterns(conversation: ConversationData): Promise<QuestPattern[]> {
    const prompt = `Analyze this conversation to identify potential quests (larger goals or projects that could span multiple tasks).

Focus on identifying:
1. Long-term goals or aspirations mentioned by the user
2. Multi-step projects or initiatives
3. Recurring themes about larger objectives
4. Related groups of tasks that could form a meaningful quest
5. User's expressed intentions about future achievements
6. AI suggestions that the user shows interest in pursuing

For each potential quest pattern, determine:
1. The core goal or objective (what would define success?)
2. All related messages that discuss this goal
3. Any specific tasks or steps mentioned
4. Timeline indicators (immediate, short-term, long-term)
5. User's level of commitment (0-1 confidence score)

Return as JSON object in format:
{
  "quests": [
    {
      "content": "Core message that best expresses the quest goal",
      "sourceMessage": "Original message where the pattern started",
      "relatedMessages": ["Array of related message texts"],
      "confidence": 0.8
    }
  ]
}`;

    console.log('Sending quest identification prompt to AI');
    
    const response = await this.openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: prompt },
        { 
          role: "user", 
          content: conversation.messages.map(msg => 
            `${msg.role.toUpperCase()}: ${msg.content}`
          ).join('\n')
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    try {
      // Get the response content
      const responseText = response.choices[0].message?.content || '{}';
      console.log('Quest identification response received, parsing...');
      
      // Parse the JSON response
      const parsed = JSON.parse(responseText);
      
      // Check for quests array in the response with a fallback to empty array
      const quests = parsed.quests || parsed.questPatterns || [];
      
      console.log(`Found ${quests.length} potential quests in conversation`);
      
      // Map the quests to our QuestPattern format
      return quests.map((quest: any) => ({
        content: quest.content || '',
        context: {
          sourceMessage: quest.sourceMessage || '',
          relatedMessages: quest.relatedMessages || [],
          confidence: quest.confidence || 0.5
        }
      }));
    } catch (error) {
      console.error('Error parsing quest patterns:', error);
      console.error('Response content:', response.choices[0].message?.content);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Detects if content has potential for task generation
   * @param content Text content to analyze
   * @returns Boolean indicating if content has task potential
   */
  private async detectTaskPotential(content: string): Promise<boolean> {
    try {
      const prompt = `Determine if this message contains potential for task creation. 
Look for:
- Action items or to-dos
- Commitments or intentions
- Deadlines or timeframes
- Specific activities the user plans to do

Message: "${content}"

Respond ONLY with "true" if there is task potential or "false" if not.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text().trim().toLowerCase();
      return response === 'true';
    } catch (error) {
      console.error('Error detecting task potential:', error);
      return false;
    }
  }

  /**
   * Detects if content has potential for quest generation
   * @param content Text content to analyze
   * @returns Boolean indicating if content has quest potential
   */
  private async detectQuestPotential(content: string): Promise<boolean> {
    try {
      const prompt = `Determine if this message contains potential for quest creation (larger goals that might involve multiple tasks). 
Look for:
- Mentions of goals or aspirations
- Medium/long-term projects
- Life changes or significant endeavors
- Multiple related tasks that could be grouped
- Recurring themes about a larger objective

Message: "${content}"

Respond ONLY with "true" if there is quest potential or "false" if not.`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text().trim().toLowerCase();
      return response === 'true';
    } catch (error) {
      console.error('Error detecting quest potential:', error);
      return false;
    }
  }

  /**
   * Generates a task suggestion from content
   * @param content The source content
   * @param userId The user's ID
   * @returns A task suggestion or null
   */
  private async generateTaskSuggestion(
    content: string,
    userId: string,
    context?: TaskContext
  ): Promise<TaskSuggestion | null> {
    performanceLogger.startOperation('generateTaskSuggestion');
    try {
      console.log('🚀 Generating task suggestion with context');
      
      const prompt = `Create a task based on this content and context:

Content: "${content}"

${context ? `Context:
- Source Message: ${context.sourceMessage}
- Related Messages: ${context.relatedMessages.join('\n')}
- Confidence: ${context.confidence}` : ''}

Generate a JSON object with these EXACT fields:
{
  "title": "Brief task title",
  "description": "Detailed description incorporating context",
  "scheduled_for": "YYYY-MM-DD format date when task should start",
  "deadline": "YYYY-MM-DD format deadline if mentioned, otherwise null",
  "location": "Location if mentioned, otherwise null",
  "priority": "high, medium, or low based on urgency/importance",
  "tags": ["relevant", "keyword", "tags"],
  "subtasks": "Comma-separated list of subtasks if appropriate, otherwise empty string"
}`;

      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: content }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0].message?.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      try {
        const parsed = JSON.parse(responseText);
        const timestamp = new Date().toISOString();
        const sourceType = content.length > 200 ? 'journal' : 'chat';
        
        const suggestion: TaskSuggestion = {
          id: `task-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          sourceContent: content,
          sourceType,
          timestamp,
          type: 'task',
          title: parsed.title,
          description: parsed.description,
          scheduled_for: parsed.scheduled_for,
          deadline: parsed.deadline === 'null' ? undefined : parsed.deadline,
          location: parsed.location === 'null' ? undefined : parsed.location,
          status: 'ToDo',
          tags: parsed.tags || [],
          priority: parsed.priority || 'medium',
          subtasks: parsed.subtasks || undefined
        };
        
        console.log('✅ Generated task suggestion:', suggestion.title);
        return suggestion;
      } catch (parseError) {
        console.error('Error parsing task suggestion:', parseError);
        return null;
      }
    } catch (error) {
      console.error('Error generating task suggestion:', error);
      return null;
    } finally {
      performanceLogger.endOperation('generateTaskSuggestion');
    }
  }

  /**
   * Generates a quest suggestion from content
   * @param content The source content
   * @param userId The user's ID
   * @returns A quest suggestion or null
   */
  private async generateQuestSuggestion(
    content: string,
    userId: string,
    context?: QuestContext
  ): Promise<QuestSuggestion | null> {
    performanceLogger.startOperation('generateQuestSuggestion');
    try {
      console.log('🚀 Generating quest suggestion from content');
      
      const prompt = `Create a quest (a larger goal that might require multiple tasks) based on this content: "${content}"

Generate a JSON object with these EXACT fields:
{
  "title": "Brief quest title",
  "tagline": "Short, one-line description of the quest",
  "description": "Detailed description of the overall goal/objective",
  "start_date": "YYYY-MM-DD format date when quest should start, choose appropriate date based on context or use today's date if unclear",
  "end_date": "YYYY-MM-DD format completion date if mentioned, otherwise null",
  "is_main": false,
  "relatedTasks": [
    {
      "title": "First related task",
      "description": "Description of first task",
      "scheduled_for": "YYYY-MM-DD"
    }
  ]
}

IMPORTANT:
- Make the quest represent a meaningful goal
- Create 2-4 related tasks that would help achieve this quest
- Use the user's actual wording when possible
- Set reasonable dates based on the content
- Only include what's in the original content or can be directly inferred
- Use empty string or null for missing information`;

      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: content }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0].message?.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      try {
        const parsed = JSON.parse(responseText);
        const timestamp = new Date().toISOString();
        const sourceType = content.length > 200 ? 'journal' : 'chat';
        
        const relatedTasks: TaskSuggestion[] = parsed.relatedTasks.map((task: any) => ({
          id: `task-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          sourceContent: content,
          sourceType,
          timestamp,
          type: 'task',
          title: task.title,
          description: task.description,
          scheduled_for: task.scheduled_for,
          status: 'ToDo',
          priority: 'medium',
        }));
        
        const suggestion: QuestSuggestion = {
          id: `quest-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          sourceContent: content,
          sourceType,
          timestamp,
          type: 'quest',
          title: parsed.title,
          tagline: parsed.tagline,
          description: parsed.description,
          status: 'Active',
          start_date: parsed.start_date,
          end_date: parsed.end_date === 'null' ? undefined : parsed.end_date,
          is_main: false,
          relatedTasks
        };
        
        console.log('✅ Generated quest suggestion:', suggestion.title);
        return suggestion;
      } catch (parseError) {
        console.error('Error parsing quest suggestion:', parseError);
        return null;
      }
    } catch (error) {
      console.error('Error generating quest suggestion:', error);
      return null;
    } finally {
      performanceLogger.endOperation('generateQuestSuggestion');
    }
  }

  /**
   * Upgrades a task suggestion to a quest suggestion
   * @param task The task suggestion to upgrade
   * @returns A quest suggestion
   */
  async upgradeTaskToQuest(task: TaskSuggestion): Promise<QuestSuggestion | null> {
    performanceLogger.startOperation('upgradeTaskToQuest');
    try {
      console.log('⬆️ Upgrading task to quest:', task.title);
      
      const prompt = `Upgrade this task to a quest (a larger goal that might require multiple tasks):

Task Title: ${task.title}
Task Description: ${task.description}
Scheduled For: ${task.scheduled_for}
${task.deadline ? `Deadline: ${task.deadline}` : ''}
${task.location ? `Location: ${task.location}` : ''}
Priority: ${task.priority}
${task.tags && task.tags.length > 0 ? `Tags: ${task.tags.join(', ')}` : ''}
${task.subtasks ? `Subtasks: ${task.subtasks}` : ''}

Generate a JSON object with these EXACT fields:
{
  "title": "Quest title - can be based on the original task or expanded",
  "tagline": "Short, one-line description of the quest",
  "description": "Detailed description of the overall goal/objective",
  "start_date": "YYYY-MM-DD - use the original task's scheduled_for date",
  "end_date": "YYYY-MM-DD - use the original task's deadline or a reasonable date",
  "relatedTasks": [
    {
      "title": "First related task - include the original task here",
      "description": "Description of first task",
      "scheduled_for": "YYYY-MM-DD"
    },
    {
      "title": "Second related task that would help complete this quest",
      "description": "Description of second task",
      "scheduled_for": "YYYY-MM-DD"
    }
  ]
}

IMPORTANT:
- Make the original task the first related task
- Add 2-3 more related tasks that would help achieve this quest
- Make the quest a meaningful expansion of the original task
- Set reasonable dates based on the original task`;

      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0].message?.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      try {
        const parsed = JSON.parse(responseText);
        const timestamp = new Date().toISOString();
        
        // Convert related tasks to TaskSuggestions
        const relatedTasks: TaskSuggestion[] = parsed.relatedTasks.map((taskData: any) => ({
          id: `task-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          sourceContent: task.sourceContent,
          sourceType: task.sourceType,
          timestamp,
          type: 'task',
          title: taskData.title,
          description: taskData.description,
          scheduled_for: taskData.scheduled_for,
          status: 'ToDo',
          priority: task.priority,
          tags: task.tags
        }));

        const suggestion: QuestSuggestion = {
          id: `quest-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          sourceContent: task.sourceContent,
          sourceType: task.sourceType,
          timestamp,
          type: 'quest',
          title: parsed.title,
          tagline: parsed.tagline,
          description: parsed.description,
          status: 'Active',
          start_date: parsed.start_date,
          end_date: parsed.end_date,
          is_main: false,
          relatedTasks
        };

        console.log('✅ Successfully upgraded task to quest:', suggestion.title);
        return suggestion;
      } catch (parseError) {
        console.error('Error parsing upgraded quest:', parseError);
        return null;
      }
    } catch (error) {
      console.error('Error upgrading task to quest:', error);
      return null;
    } finally {
      performanceLogger.endOperation('upgradeTaskToQuest');
    }
  }

  /**
   * Adds a suggestion to the appropriate queue
   * @param suggestion The suggestion to add
   */
  addSuggestionToQueue(suggestion: Suggestion): void {
    console.log('\n=== SuggestionAgent.addSuggestionToQueue ===');
    console.log('Adding suggestion:', {
      type: suggestion.type,
      id: suggestion.id,
      title: suggestion.type === 'task' ? suggestion.title : (suggestion as QuestSuggestion).title,
      sourceType: suggestion.sourceType,
      timestamp: suggestion.timestamp
    });
    
    // Add the suggestion to the global store instead of internal arrays
    globalSuggestionStore.addSuggestion(suggestion);
    
    // CRITICAL FIX: Make sure we have handlers before trying to call them
    if (this.updateHandlers && this.updateHandlers.onSuggestionUpdate) {
      console.log('🚨 Calling direct update handler with:');
      
      try {
        // Get the updated suggestions from the global store
        const tasks = globalSuggestionStore.getTaskSuggestions();
        const quests = globalSuggestionStore.getQuestSuggestions();
        
        // Pass them to the update handler
        this.updateHandlers.onSuggestionUpdate(tasks, quests);
        console.log('✅ Direct update handler executed successfully');
      } catch (error) {
        console.error('❌ Error in direct update handler:', error);
        console.error(error);
      }
    } else {
      console.warn('⚠️ No update handler registered or handler is undefined');
    }
  }

  /**
   * Clears all suggestion queues
   */
  clearSuggestionQueue(): void {
    // Clear the global store
    globalSuggestionStore.clearSuggestions();
    
    // Call direct update handler if registered
    if (this.updateHandlers.onSuggestionUpdate) {
      this.updateHandlers.onSuggestionUpdate([], []);
    }
  }
  
  /**
   * Gets the current task suggestions
   * @returns Array of task suggestions
   */
  getTaskSuggestions(): TaskSuggestion[] {
    // Return from the global store
    return globalSuggestionStore.getTaskSuggestions();
  }
  
  /**
   * Gets the current quest suggestions
   * @returns Array of quest suggestions
   */
  getQuestSuggestions(): QuestSuggestion[] {
    // Return from the global store
    return globalSuggestionStore.getQuestSuggestions();
  }
  
  /**
   * Removes a task suggestion from the queue by ID
   * @param id ID of the task suggestion to remove
   */
  removeTaskSuggestion(id: string): void {
    console.log('🗑️ [SuggestionAgent] Removing task suggestion:', id);
    
    // Remove from the global store
    globalSuggestionStore.removeTaskSuggestion(id);
    
    // Call direct update handler if registered
    if (this.updateHandlers && this.updateHandlers.onSuggestionUpdate) {
      console.log('🔄 [SuggestionAgent] Notifying handler of task removal');
      
      // Get the updated suggestions from the global store
      const tasks = globalSuggestionStore.getTaskSuggestions();
      const quests = globalSuggestionStore.getQuestSuggestions();
      
      this.updateHandlers.onSuggestionUpdate(tasks, quests);
    } else {
      console.warn('⚠️ No update handler registered for task removal');
    }
  }
  
  /**
   * Removes a quest suggestion from the queue by ID
   * @param id ID of the quest suggestion to remove
   */
  removeQuestSuggestion(id: string): void {
    console.log('🗑️ [SuggestionAgent] Removing quest suggestion:', id);
    
    // Remove from the global store
    globalSuggestionStore.removeQuestSuggestion(id);
    
    // Call direct update handler if registered
    if (this.updateHandlers && this.updateHandlers.onSuggestionUpdate) {
      console.log('🔄 [SuggestionAgent] Notifying handler of quest removal');
      
      // Get the updated suggestions from the global store
      const tasks = globalSuggestionStore.getTaskSuggestions();
      const quests = globalSuggestionStore.getQuestSuggestions();
      
      this.updateHandlers.onSuggestionUpdate(tasks, quests);
    } else {
      console.warn('⚠️ No update handler registered for quest removal');
    }
  }
  
  /**
   * Creates a task in the database from a task suggestion
   * @param suggestion The task suggestion to create
   * @param userId The user's ID
   */
  async acceptTaskSuggestion(suggestion: TaskSuggestion, userId: string): Promise<Task | null> {
    try {
      console.log('📝 Creating task from suggestion:', suggestion.title);
      
      // If no quest_id is provided, get the misc quest
      let finalQuestId = suggestion.quest_id;
      if (!finalQuestId) {
        console.log('No quest specified, using misc quest');
        const miscQuest = await getOrCreateMiscQuest(userId);
        finalQuestId = miscQuest.id;
      }
      
      const taskData = {
        title: suggestion.title,
        description: suggestion.description,
        scheduled_for: suggestion.scheduled_for,
        deadline: suggestion.deadline,
        location: suggestion.location,
        status: suggestion.status,
        tags: suggestion.tags,
        priority: suggestion.priority,
        subtasks: suggestion.subtasks,
        quest_id: finalQuestId,
        user_id: userId
      };
      
      const task = await createTask(taskData);
      this.removeTaskSuggestion(suggestion.id);
      
      return task;
    } catch (error) {
      console.error('Error creating task from suggestion:', error);
      return null;
    }
  }
  
  /**
   * Creates a quest in the database from a quest suggestion
   * @param suggestion The quest suggestion to create
   * @param userId The user's ID
   */
  async acceptQuestSuggestion(suggestion: QuestSuggestion, userId: string): Promise<Quest | null> {
    try {
      console.log('📝 Creating quest from suggestion:', suggestion.title);
      
      const questData = {
        title: suggestion.title,
        tagline: suggestion.tagline,
        description: suggestion.description,
        status: suggestion.status,
        start_date: suggestion.start_date,
        end_date: suggestion.end_date,
        is_main: false,
        user_id: userId
      };
      
      const quest = await createQuest(userId, questData);
      this.removeQuestSuggestion(suggestion.id);
      
      // Create related tasks if they exist
      if (suggestion.relatedTasks && suggestion.relatedTasks.length > 0) {
        for (const taskSuggestion of suggestion.relatedTasks) {
          await createTask({
            title: taskSuggestion.title,
            description: taskSuggestion.description,
            scheduled_for: taskSuggestion.scheduled_for,
            status: 'ToDo',
            priority: taskSuggestion.priority,
            quest_id: quest.id,
            user_id: userId
          });
        }
      }
      
      return quest;
    } catch (error) {
      console.error('Error creating quest from suggestion:', error);
      return null;
    }
  }
}