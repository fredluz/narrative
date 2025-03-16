// filepath: c:\Users\ThinkPad\Code\QuestLogMockupsWL\QuestLog\services\agents\SuggestionAgent.ts
import OpenAI from 'openai';
import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { performanceLogger } from '@/utils/performanceLogger';
import { Quest, Task } from '@/app/types';
import { createTask, fetchTasks, updateTask, fetchTasksByQuest } from '@/services/tasksService'; // Import fetchTasksByQuest
import { createQuest, fetchQuests, getOrCreateMiscQuest } from '@/services/questsService';

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
  // Add a flag to indicate if this is an edit suggestion for an existing task
  isEditSuggestion?: boolean;
  existingTaskId?: number;
  // Remove editFields property and rely solely on updateValues
  updateValues?: {
    title?: string;
    status?: 'ToDo' | 'InProgress' | 'Done';
    description?: string;
    deadline?: string;
    scheduled_for?: string;
    location?: string;
    priority?: 'high' | 'medium' | 'low';
  };
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

// Interface to represent task similarity comparison results
interface TaskSimilarityResult {
  isMatch: boolean;
  existingTask: Task | null;
  matchConfidence: number; // 0 to 1
}

// Interface for task update field generation
interface TaskUpdateFields {
  shouldUpdate: boolean;
  updateFields: string[];
  updateValues: {
    title?: string;
    status?: 'ToDo' | 'InProgress' | 'Done';
    description?: string;
    deadline?: string;
    scheduled_for?: string;
    location?: string;
    priority?: 'high' | 'medium' | 'low';
  };
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
      
      console.log('🔍 SuggestionAgent: Analyzing checkup entry for potential tasks');
      
      // Generate task suggestion directly
      const suggestion = await this.generateTaskSuggestion(entry, userId, {
        sourceMessage: entry,
        relatedMessages: [], // Single entry context
        confidence: 0.7,
        timing: 'short-term'
      });
      
      // If we have a task suggestion, check if it's a duplicate before returning
      if (suggestion) {
        return await this.checkForDuplicatesBeforeShowing(suggestion, userId);
      }
      
      return null;
    } catch (error) {
      console.error('Error in analyzeJournalEntry:', error);
      return null;
    } finally {
      performanceLogger.endOperation('analyzeJournalEntry');
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
      console.log(`🚀 Generated task suggestion. Content: ${JSON.stringify(content)} Context: ${JSON.stringify(context)}\n Prompt: ${prompt}`);

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
      // Check if this is an edit suggestion
      if (suggestion.isEditSuggestion && suggestion.existingTaskId) {
        console.log('📝 Updating existing task from edit suggestion:', suggestion.existingTaskId);
        
        // Get the original task to ensure we have the latest data
        const questId = suggestion.quest_id || (await getOrCreateMiscQuest(userId)).id;
        const questTasks = await fetchTasksByQuest(questId, userId);
        const existingTask = questTasks.find(t => t.id === suggestion.existingTaskId);
        
        if (!existingTask) {
          console.error('Could not find existing task to update');
          return null;
        }
        
        // If updateValues is missing, generate them now
        let updateData: Record<string, any> = {};
        
        if (!suggestion.updateValues) {
          const updateFields = await this.generateTaskUpdateFields(suggestion, existingTask, suggestion.sourceContent);
          if (updateFields.updateValues) {
            updateData = { ...updateFields.updateValues };
          }
        } else {
          updateData = { ...suggestion.updateValues };
        }
        
        // Only perform the update if there are changes to make
        if (Object.keys(updateData).length > 0) {
          updateData.updated_at = new Date().toISOString();
          console.log('Updating task with values:', updateData);
          const updatedTask = await updateTask(suggestion.existingTaskId, updateData, userId);
          return updatedTask;
        } else {
          console.log('No changes needed for the existing task');
          return null;
        }
      }
      
      // If it's not an edit suggestion, proceed with regular task creation
      console.log('📝 Creating task from suggestion:', suggestion.title);
      
      // Get the quest ID, should be determined already during duplicate check
      const finalQuestId = suggestion.quest_id || 
        (await getOrCreateMiscQuest(userId)).id;
      
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
   * Find the best quest for a task using LLM analysis
   * @param suggestion The task suggestion
   * @param userId The user's ID
   * @returns Quest ID of the best matching quest, or misc quest if no good match
   */
  private async findBestQuestForTask(suggestion: TaskSuggestion, userId: string): Promise<number> {
    try {
      console.log('🔍 Finding best quest for task:', suggestion.title);
      
      // Get all user quests for analysis
      const quests = await fetchQuests(userId);
      if (!quests || quests.length === 0) {
        console.log('No quests found, using misc quest');
        const miscQuest = await getOrCreateMiscQuest(userId);
        return miscQuest.id;
      }
      
      // Create a prompt that lists all available quests with their details
      const prompt = `You are analyzing a new task to determine which existing quest it belongs to.

New Task:
Title: ${suggestion.title}
Description: ${suggestion.description || 'No description'}
${suggestion.scheduled_for ? `Scheduled for: ${suggestion.scheduled_for}` : ''}
${suggestion.deadline ? `Deadline: ${suggestion.deadline}` : ''}
${suggestion.location ? `Location: ${suggestion.location}` : ''}

Available Quests:
${quests.map(quest => `
ID: ${quest.id}
Title: ${quest.title}
Tagline: ${quest.tagline || 'No tagline'}
Description: ${quest.description || 'No description'}
Status: ${quest.status}
Is Main: ${quest.is_main ? 'Yes' : 'No'}
`).join('\n---\n')}

Based on the task details, determine which quest is the best fit for this task.
Consider:
1. Theme alignment - does the task directly relate to the quest's purpose?
2. Scope fit - is the task at the right level of detail for the quest?
3. Timeline alignment - does the task fit within the quest's timeframe?

Reply ONLY with a JSON object in this format:
{
  "questId": number (the ID of the best matching quest, or null if no good match),
  "confidence": number between 0-1 (how confident you are in this match),
  "reason": "Brief explanation of why this quest is the best fit"
}

If there is no good match, return null for questId and a reason explaining why.`;

      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0].message?.content;
      if (!responseText) {
        console.log('Empty response from AI for quest matching');
        const miscQuest = await getOrCreateMiscQuest(userId);
        return miscQuest.id;
      }

      try {
        const parsed = JSON.parse(responseText);
        
        // If a quest was identified with good confidence, use it
        if (parsed.questId && parsed.confidence > 0.7) {
          console.log(`Found matching quest ID ${parsed.questId} with confidence ${parsed.confidence}`);
          console.log(`Reason: ${parsed.reason}`);
          return parsed.questId;
        } else {
          console.log('No confident quest match found. Using misc quest.');
          console.log(`Reason: ${parsed.reason}`);
          const miscQuest = await getOrCreateMiscQuest(userId);
          return miscQuest.id;
        }
      } catch (parseError) {
        console.error('Error parsing quest match result:', parseError);
        const miscQuest = await getOrCreateMiscQuest(userId);
        return miscQuest.id;
      }
    } catch (error) {
      console.error('Error finding best quest for task:', error);
      const miscQuest = await getOrCreateMiscQuest(userId);
      return miscQuest.id;
    }
  }

  /**
   * Checks if a task suggestion is similar to any existing tasks
   * Uses LLM to compare the tasks and determine if they are similar enough
   * @param suggestion The task suggestion to compare
   * @param userId The user's ID
   * @param questId The quest ID to focus on first
   * @returns Information about the similarity and whether to update
   */
  private async findSimilarTask(suggestion: TaskSuggestion, userId: string, questId: number): Promise<TaskSimilarityResult> {
    performanceLogger.startOperation('findSimilarTask');
    try {
      // Default result - no match
      const defaultResult: TaskSimilarityResult = {
        isMatch: false,
        existingTask: null,
        matchConfidence: 0
      };
      
      // Get tasks only for the specific quest (or misc quest if no match was found)
      console.log(`Fetching tasks only for quest ID: ${questId}`);
      const questTasks = await fetchTasksByQuest(questId, userId);
      
      if (!questTasks || questTasks.length === 0) {
        console.log('No existing tasks found in the target quest for comparison');
        return defaultResult;
      }
      
      console.log(`Comparing new task suggestion against ${questTasks.length} existing tasks in quest ${questId}`);
      
      // Use Gemini 2.0 Flash for task comparison - just for finding a match
      const prompt = `You are analyzing if a new task suggestion is semantically equivalent to any existing tasks.

New Task Suggestion:
Title: ${suggestion.title}
Description: ${suggestion.description || 'None'}
Scheduled for: ${suggestion.scheduled_for}
Deadline: ${suggestion.deadline || 'None'}
Priority: ${suggestion.priority}
${suggestion.location ? `Location: ${suggestion.location}` : ''}

Existing tasks in the same quest:
${questTasks.map(task => `
Task ID: ${task.id}
Title: ${task.title}
Description: ${task.description || 'None'}
Status: ${task.status}
Scheduled for: ${task.scheduled_for}
Deadline: ${task.deadline || 'None'}
Priority: ${task.priority || 'None'}
${task.location ? `Location: ${task.location}` : ''}
`).join('\n---\n')}

CRITICAL EVALUATION GUIDELINES:
Look for SEMANTIC EQUIVALENCE, not just literal text matching
   - "Make dinner" and "Cook pasta for dinner" could refer to the same task
   - "Bake a cake" and "Bake a chocolate cake for tomorrow's birthday" likely refer to the same task
   - "Call mom about vacation" and "Call mother to discuss summer trip" are semantically the same task

Determine:
1. Is the new task SEMANTICALLY THE SAME as any existing task?
2. If yes, which existing task is it equivalent to?

Reply ONLY with a JSON object in this format:
{
  "isMatch": true/false,
  "matchingTaskId": task id of matching task or null if no match,
  "matchConfidence": 0.0 to 1.0 (how confident you are that this is the same task)
}`;

      try {
        // Use Gemini model instead of OpenAI
        const result = await this.model.generateContent(prompt);
        const responseText = this.cleanResponseText(result.response.text().trim());
        
        if (!responseText) {
          console.log('Empty response from AI for task comparison');
          return defaultResult;
        }

        const parsed = JSON.parse(responseText);
        
        // Find the matching task if one was identified
        const matchingTask = parsed.isMatch && parsed.matchingTaskId ? 
          questTasks.find(t => t.id === parsed.matchingTaskId) || 
          questTasks.find(t => t.id === Number(parsed.matchingTaskId)) :
          null;
        
        if (parsed.isMatch && matchingTask) {
          console.log(`Found semantic match between "${suggestion.title}" and existing task "${matchingTask.title}" (confidence: ${parsed.matchConfidence})`);
        }
        
        return {
          isMatch: parsed.isMatch,
          existingTask: matchingTask || null,
          matchConfidence: parsed.matchConfidence || 0
        };
      } catch (parseError) {
        console.error('Error parsing task comparison result:', parseError);
        return defaultResult;
      }
    } catch (error) {
      console.error('Error comparing tasks:', error);
      return {
        isMatch: false,
        existingTask: null,
        matchConfidence: 0
      };
    } finally {
      performanceLogger.endOperation('findSimilarTask');
    }
  }

  /**
   * Generates update fields for an existing task based on new source content
   * @param suggestion The new task suggestion
   * @param existingTask The existing task that was found to be a match
   * @param sourceContent The original source content that generated this suggestion
   * @returns Task update field recommendations
   */
  private async generateTaskUpdateFields(
    suggestion: TaskSuggestion, 
    existingTask: Task, 
    sourceContent: string
  ): Promise<TaskUpdateFields> {
    performanceLogger.startOperation('generateTaskUpdateFields');
    try {
      // Default result
      const defaultResult: TaskUpdateFields = {
        shouldUpdate: false,
        updateFields: [],
        updateValues: {}
      };
      
      // Check if there's source content to analyze
      if (!sourceContent || !existingTask) {
        console.log('Missing source content or existing task, cannot generate update fields');
        return defaultResult;
      }
      
      console.log(`Analyzing source content to generate updates for task: "${existingTask.title}"`);
      
      // Use Gemini 2.0 Flash to analyze the source content and suggest updates
      const prompt = `You are analyzing a user message to determine how to update an existing task.

Existing Task:
Title: ${existingTask.title}
Description: ${existingTask.description || 'None'}
Status: ${existingTask.status}
Scheduled for: ${existingTask.scheduled_for || 'None'}
Deadline: ${existingTask.deadline || 'None'}
Priority: ${existingTask.priority || 'None'}
Location: ${existingTask.location || 'None'}

User Message (that references this task):
"${sourceContent}"

New Task Suggestion Generated:
Title: ${suggestion.title}
Description: ${suggestion.description || 'None'}
Scheduled for: ${suggestion.scheduled_for}
Deadline: ${suggestion.deadline || 'None'}
Priority: ${suggestion.priority}
${suggestion.location ? `Location: ${suggestion.location}` : ''}

Based on the user message and the new suggestion, determine which fields should be updated in the existing task.

IMPORTANT GUIDELINES:
1. Only suggest updates for fields that have meaningful new information
2. Use the user message and context to determine what should be updated
3. Only include fields in updateValues that should actually change
4. For status, only use one of these exact values: "ToDo", "InProgress", or "Done"

Reply ONLY with a JSON object in this format:
{
  "shouldUpdate": true/false,
  "updateFields": ["title", "status", "description", "deadline", "scheduled_for", "location"],
  "updateValues": {
    "title": "The new title to use",
    "status": "ToDo/InProgress/Done",
    "description": "The new description to use",
    "deadline": "YYYY-MM-DD",
    "scheduled_for": "YYYY-MM-DD",
    "location": "The new location"
  }
}`;

      try {
        // Use Gemini model for analysis
        const result = await this.model.generateContent(prompt);
        const responseText = this.cleanResponseText(result.response.text().trim());
        
        if (!responseText) {
          console.log('Empty response from AI for update field generation');
          return defaultResult;
        }

        const parsed = JSON.parse(responseText);
        
        if (parsed.shouldUpdate) {
          console.log(`Suggested updates for task "${existingTask.title}":`, parsed.updateValues);
        }
        
        return {
          shouldUpdate: parsed.shouldUpdate || false,
          updateFields: parsed.updateFields || [],
          updateValues: parsed.updateValues || {}
        };
      } catch (parseError) {
        console.error('Error parsing update fields generation result:', parseError);
        return defaultResult;
      }
    } catch (error) {
      console.error('Error generating update fields:', error);
      return {
        shouldUpdate: false,
        updateFields: [],
        updateValues: {}
      };
    } finally {
      performanceLogger.endOperation('generateTaskUpdateFields');
    }
  }

  /**
   * Checks if a newly generated task suggestion is similar to existing tasks
   * If it is, converts it into an edit suggestion instead
   * @param suggestion The newly generated task suggestion
   * @param userId The user's ID
   * @returns The original suggestion, or a modified one if a duplicate is found
   */
  private async checkForDuplicatesBeforeShowing(suggestion: TaskSuggestion, userId: string): Promise<TaskSuggestion> {
    try {
      console.log('🔍 Checking if task suggestion is similar to existing tasks:', suggestion.title);
      
      // First find the best quest for this task
      let questId = suggestion.quest_id;
      if (!questId) {
        questId = await this.findBestQuestForTask(suggestion, userId);
      }
      
      // Then check if this task is similar to any existing tasks in that quest
      const similarityCheck = await this.findSimilarTask(suggestion, userId, questId);
      
      // If we found a similar task, convert this into an edit suggestion
      if (similarityCheck.isMatch && similarityCheck.existingTask && similarityCheck.matchConfidence > 0.7) {
        console.log(`Found similar existing task (${similarityCheck.matchConfidence.toFixed(2)} confidence). Converting to edit suggestion.`);
        
        // Generate update fields based on the source content
        const updateFields = await this.generateTaskUpdateFields(suggestion, similarityCheck.existingTask, suggestion.sourceContent);
        
        // Modify the suggestion to indicate it's an edit suggestion
        suggestion.isEditSuggestion = true;
        suggestion.existingTaskId = similarityCheck.existingTask.id;
        suggestion.quest_id = similarityCheck.existingTask.quest_id;
        suggestion.updateValues = updateFields.updateValues;
        
        // Update the title to indicate it's an edit
        suggestion.title = `Update: ${suggestion.title}`;
        
        if (similarityCheck.existingTask.title) {
          // Create a more useful description that shows what's being updated
          const updateFieldsList = updateFields.updateValues ? 
            Object.keys(updateFields.updateValues).join(', ') : 
            'No specific fields';
            
          suggestion.description = `Edit to existing task "${similarityCheck.existingTask.title}":\n\n${suggestion.description}\n\nFields to update: ${updateFieldsList}`;
        }
      } else {
        // This is a new task suggestion, just assign the quest ID
        suggestion.quest_id = questId;
      }
      
      return suggestion;
    } catch (error) {
      console.error('Error checking for duplicate tasks:', error);
      // If there's an error, just return the original suggestion
      return suggestion;
    }
  }

  /**
   * Clean response text from model output
   * Handles JSON formatting issues from different model outputs
   */
  private cleanResponseText(text: string): string {
    // Extract JSON content if wrapped in markdown code blocks
    const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonRegex);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // If no code block, return the original text
    return text;
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