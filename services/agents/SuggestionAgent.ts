// filepath: c:\Users\ThinkPad\Code\QuestLogMockupsWL\QuestLog\services\agents\SuggestionAgent.ts
import OpenAI from 'openai';
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { performanceLogger } from '@/utils/performanceLogger';
import { Quest, Task } from '@/app/types';
import { createTask } from '@/services/tasksService';
import { createQuest, getOrCreateMiscQuest } from '@/services/questsService';

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


interface TaskContext {
  sourceMessage: string;
  relatedMessages: string[];
  confidence: number;
  dependencies?: string[];
  timing?: string;
}

type Suggestion = TaskSuggestion | QuestSuggestion;

/**
 * SuggestionAgent handles AI/LLM operations for generating task and quest suggestions.
 * State management is handled by SuggestionContext.
 */
export class SuggestionAgent {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private openai: OpenAI;
  
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
   * Analyzes a chat message to identify potential task suggestions
   * @param message The chat message content to analyze
   * @param userId The user's ID
   * @returns A task suggestion if one is found, null otherwise
   */
  async analyzeMessage(message: string, userId: string): Promise<TaskSuggestion | null> {
    performanceLogger.startOperation('analyzeMessage');
    try {
      if (!userId) {
        console.error('User ID is required for analyzeMessage');
        return null;
      }
      
      console.log('🔍 SuggestionAgent: Analyzing chat message for potential tasks');
      
      // Generate task suggestion directly
      return await this.generateTaskSuggestion(message, userId);
      
    } catch (error) {
      console.error('Error in analyzeMessage:', error);
      return null;
    } finally {
      performanceLogger.endOperation('analyzeMessage');
    }
  }

  /**
   * Analyzes a journal entry to identify potential task suggestions
   * @param entry The journal entry content to analyze
   * @param userId The user's ID
   * @returns A task suggestion if one is found, null otherwise
   */
  async analyzeJournalEntry(entry: string, userId: string): Promise<TaskSuggestion | null> {
    performanceLogger.startOperation('analyzeJournalEntry');
    try {
      if (!userId) {
        console.error('User ID is required for analyzeJournalEntry');
        return null;
      }
      
      console.log('🔍 SuggestionAgent: Analyzing journal/checkup entry for potential tasks');
      
      // Generate task suggestion directly
      return await this.generateTaskSuggestion(entry, userId, {
        sourceMessage: entry,
        relatedMessages: [], // Single entry context
        confidence: 0.7, // Slightly lower confidence since journal entries are more reflective
        timing: 'short-term' // Journal tasks tend to be more planned
      });
      
    } catch (error) {
      console.error('Error in analyzeJournalEntry:', error);
      return null;
    } finally {
      performanceLogger.endOperation('analyzeJournalEntry');
    }
  }

  /**
   * Analyzes a complete conversation for task suggestions
   * @returns Array of generated task suggestions
   */
  async analyzeConversation(conversation: ConversationData, userId: string): Promise<TaskSuggestion[]> {
    performanceLogger.startOperation('analyzeConversation');
    try {
      if (!userId) {
        console.error('User ID is required for analyzeConversation');
        return [];
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
        const suggestions: TaskSuggestion[] = [];
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
            suggestions.push(suggestion);
          }
        }
        
        return suggestions;
      } catch (parseError) {
        console.error('Error parsing conversation analysis:', parseError);
        console.error('Response content:', response.choices[0].message?.content);
        return [];
      }
    } catch (error) {
      console.error('Error in analyzeConversation:', error);
      return [];
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
   * Upgrades a task suggestion to a quest suggestion using LLM analysis
   * @param task The task suggestion to upgrade
   * @returns A quest suggestion if successful, null otherwise
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
      
      return await createTask(taskData);
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