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
  private taskSuggestions: TaskSuggestion[] = [];
  private questSuggestions: QuestSuggestion[] = [];
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
    this.updateHandlers = handlers;
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
  private async generateTaskSuggestion(content: string, userId: string): Promise<TaskSuggestion | null> {
    performanceLogger.startOperation('generateTaskSuggestion');
    try {
      console.log('🚀 Generating task suggestion from content');
      
      const prompt = `Create a task based on this content: "${content}"

Generate a JSON object with these EXACT fields:
{
  "title": "Brief task title",
  "description": "Detailed description of what needs to be done",
  "scheduled_for": "YYYY-MM-DD format date when task should start, choose appropriate date based on context or use today's date if unclear",
  "deadline": "YYYY-MM-DD format deadline if mentioned, otherwise null",
  "location": "Location if mentioned, otherwise null",
  "priority": "high, medium, or low based on urgency/importance",
  "tags": ["relevant", "keyword", "tags"],
  "subtasks": "Comma-separated list of subtasks if appropriate, otherwise empty string"
}

IMPORTANT:
- Make the task ACTIONABLE and SPECIFIC
- Use the user's actual wording when possible
- Set reasonable dates based on the content
- Infer priority from urgency/importance clues
- Only include what's in the original content
- Use empty string or null for missing information`;

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
  private async generateQuestSuggestion(content: string, userId: string): Promise<QuestSuggestion | null> {
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
    
    if (suggestion.type === 'task') {
      console.log('📋 Current task suggestions queue length:', this.taskSuggestions.length);
      this.taskSuggestions.push(suggestion as TaskSuggestion);
      console.log('📋 New task suggestions queue length:', this.taskSuggestions.length);
      console.log('Task suggestions queue:', this.taskSuggestions.map(t => ({ id: t.id, title: t.title })));
    } else {
      console.log('🏆 Current quest suggestions queue length:', this.questSuggestions.length);
      this.questSuggestions.push(suggestion as QuestSuggestion);
      console.log('🏆 New quest suggestions queue length:', this.questSuggestions.length);
      console.log('Quest suggestions queue:', this.questSuggestions.map(q => ({ id: q.id, title: q.title })));
    }
    
    // CRITICAL FIX: Make sure we have handlers before trying to call them
    // Also add more debug to see if this is getting called
    if (this.updateHandlers && this.updateHandlers.onSuggestionUpdate) {
      console.log('🚨 Calling direct update handler with:', {
        taskCount: this.taskSuggestions.length,
        questCount: this.questSuggestions.length
      });
      try {
        this.updateHandlers.onSuggestionUpdate([...this.taskSuggestions], [...this.questSuggestions]);
        console.log('✅ Direct update handler executed successfully');
      } catch (error) {
        console.error('❌ Error in direct update handler:', error);
      }
    }
  }

  /**
   * Clears all suggestion queues
   */
  clearSuggestionQueue(): void {
    this.taskSuggestions = [];
    this.questSuggestions = [];
    
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
    return [...this.taskSuggestions];
  }
  
  /**
   * Gets the current quest suggestions
   * @returns Array of quest suggestions
   */
  getQuestSuggestions(): QuestSuggestion[] {
    return [...this.questSuggestions];
  }
  
  /**
   * Removes a task suggestion from the queue by ID
   * @param id ID of the task suggestion to remove
   */
  removeTaskSuggestion(id: string): void {
    this.taskSuggestions = this.taskSuggestions.filter(task => task.id !== id);
    
    // Call direct update handler if registered
    if (this.updateHandlers.onSuggestionUpdate) {
      this.updateHandlers.onSuggestionUpdate([...this.taskSuggestions], [...this.questSuggestions]);
    }
    
  }
  
  /**
   * Removes a quest suggestion from the queue by ID
   * @param id ID of the quest suggestion to remove
   */
  removeQuestSuggestion(id: string): void {
    this.questSuggestions = this.questSuggestions.filter(quest => quest.id !== id);
    
    // Call direct update handler if registered
    if (this.updateHandlers.onSuggestionUpdate) {
      this.updateHandlers.onSuggestionUpdate([...this.taskSuggestions], [...this.questSuggestions]);
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