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

interface TaskContext {
  sourceMessage: string;
  relatedMessages: string[];
  confidence: number;
  dependencies?: string[];
  timing?: string;
}

type Suggestion = TaskSuggestion | QuestSuggestion;

// Define handler interfaces for direct updates
interface SuggestionUpdateHandlers {
  onSuggestionUpdate?: (taskSuggestions: TaskSuggestion[], questSuggestions: QuestSuggestion[]) => void;
}

/**
 * SuggestionAgent analyzes user messages and journal entries to generate task suggestions.
 * Quests can be created by upgrading existing tasks when requested by the user.
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
      baseURL: 'https://api.deepseek.com',
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
   * Analyzes a chat message to identify potential task suggestions
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
      
      console.log('🔍 SuggestionAgent: Analyzing chat message for potential tasks');
      
      // Generate task suggestion directly
      const taskSuggestion = await this.generateTaskSuggestion(message, userId);
      if (taskSuggestion) {
        this.addSuggestionToQueue(taskSuggestion);
      }
      
    } catch (error) {
      console.error('Error in analyzeMessage:', error);
    } finally {
      performanceLogger.endOperation('analyzeMessage');
    }
  }

  /**
   * Analyzes a journal entry to identify potential task suggestions
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
      
      console.log('🔍 SuggestionAgent: Analyzing journal/checkup entry for potential tasks');
      
      const prompt = `Analyze this journal/checkup entry for tasks and action items that should be tracked.

Context: This is from a regular check-in where the user reflects on their current state, progress, and plans.

Look specifically for:
1. Direct statements of intention ("I need to", "I should", "I will")
2. Mentioned obligations or responsibilities
3. Goals or targets they want to achieve
4. Problems they want to solve
5. Follow-up items from previous activities
6. Time-sensitive matters or deadlines

For anything that could be a task, consider:
- How concrete and actionable is it?
- Is there a clear next step?
- Does it have a timeframe (today, this week, etc)?
- Is it a one-time task or part of a larger goal?

Entry to analyze: "${entry}"

Return your findings in this exact JSON format:
{
  "tasks": [
    {
      "content": "The specific action to be taken",
      "sourceMessage": "The original message with the task",
      "relatedMessages": ["Message with timing info", "Message with location"],
      "confidence": 0.8,
      "dependencies": ["Prerequisite task if any"],
      "timing": "immediate | short-term"
    }
  ]
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text().trim().toLowerCase();
      const hasTaskPotential = response === 'true';

      if (hasTaskPotential) {
        console.log('✨ Task potential detected in journal entry');
        const taskSuggestion = await this.generateTaskSuggestion(entry, userId, {
          sourceMessage: entry,
          relatedMessages: [], // Single entry context
          confidence: 0.7, // Slightly lower confidence since journal entries are more reflective
          timing: 'short-term' // Journal tasks tend to be more planned
        });
        
        if (taskSuggestion) {
          this.addSuggestionToQueue(taskSuggestion);
        }
      }
      
    } catch (error) {
      console.error('Error in analyzeJournalEntry:', error);
    } finally {
      performanceLogger.endOperation('analyzeJournalEntry');
    }
  }

  /**
   * Analyzes a complete conversation for task suggestions
   */
  async analyzeConversation(conversation: ConversationData, userId: string): Promise<void> {
    performanceLogger.startOperation('analyzeConversation');
    try {
      if (!userId) {
        console.error('User ID is required for analyzeConversation');
        return;
      }

      console.log('🔍 SuggestionAgent: Analyzing complete conversation');

      const prompt = `Analyze this conversation for specific, actionable tasks that the user needs to complete.
      Look ONLY for:
      1. Direct user commitments with clear actions ("I will do X", "I need to do Y")
      2. User agreeing to concrete suggestions ("Yes, I'll try that", "I should definitely do that")
      3. Tasks with explicit actions or deadlines

      IGNORE vague intentions without specific actions

      For each CONCRETE task identified, extract:
      1. The specific action to be taken
      2. The exact message containing the task
      3. Any messages that add important details (timing, location, etc.)
      4. A confidence score (0-1) based on how explicitly the user committed to it
      5. Any prerequisite tasks that must be done first
      6. The timing (immediate: within 24h, short-term: within a week)

      Return your findings in this exact JSON format:
      {
        "tasks": [
          {
            "content": "The specific action to be taken",
            "sourceMessage": "The original message with the task",
            "relatedMessages": ["Message with timing info", "Message with location"],
            "confidence": 0.8,
            "dependencies": ["Prerequisite task if any"],
            "timing": "immediate | short-term"
          }
        ]
      }`;

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

      // Parse the response and generate suggestions
      try {
        const responseText = response.choices[0].message?.content || '{}';
        const parsed = JSON.parse(responseText);
        const tasks = parsed.tasks || [];
        
        console.log(`Found ${tasks.length} potential tasks in conversation`);
        
        // Generate task suggestions for each identified task
        for (const task of tasks) {
          const suggestion = await this.generateTaskSuggestion(
            task.content,
            userId,
            {
              sourceMessage: task.sourceMessage,
              relatedMessages: task.relatedMessages || [],
              confidence: task.confidence || 0.5,
              dependencies: task.dependencies,
              timing: task.timing
            }
          );
          
          if (suggestion) {
            this.addSuggestionToQueue(suggestion);
          }
        }
      } catch (parseError) {
        console.error('Error parsing conversation analysis:', parseError);
        console.error('Response content:', response.choices[0].message?.content);
      }
    } catch (error) {
      console.error('Error in analyzeConversation:', error);
    } finally {
      performanceLogger.endOperation('analyzeConversation');
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