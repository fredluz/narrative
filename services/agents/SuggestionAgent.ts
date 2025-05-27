// filepath: c:\Users\ThinkPad\Code\QuestLogMockupsWL\QuestLog\services\agents\SuggestionAgent.ts
import OpenAI from 'openai';
import { GoogleGenerativeAI, type GenerativeModel, SchemaType } from "@google/generative-ai";
import { performanceLogger } from '@/utils/performanceLogger';
import { Quest, Task } from '@/app/types';
import { createTask, fetchTasks, updateTask, fetchTasksByQuest, fetchActiveTasks } from '@/services/tasksService'; // Import fetchActiveTasks
import { createQuest, fetchQuests, getOrCreateMiscQuest, updateQuest } from '@/services/questsService'; // Import updateQuest
import { personalityService } from '@/services/personalityService';
import { getPersonality } from '@/services/agents/PersonalityPrompts';
import { globalSuggestionStore } from '../globalSuggestionStore';

/**
 * Represents a task suggestion generated from user content
 */// Add these lines at the top of your TaskSuggestion and QuestSuggestion interfaces (if not already present)

export interface TaskSuggestion {
  id: string; // Keep as client-side ID until accepted
  sourceContent: string;
  timestamp: string;
  type: 'task';
  title: string;
  description: string;
  scheduled_for: string;
  deadline?: string;
  location?: string;
  status: 'ToDo'; // Default status
  tags?: string[];
  quest_id?: number; // Will be populated AFTER quest is accepted if pending
  priority: 'high' | 'medium' | 'low';
  subtasks?: string;
  isEditSuggestion?: boolean;
  existingTaskId?: number;
  updateValues?: {
    title?: string;
    status?: 'ToDo' | 'InProgress' | 'Done';
    description?: string;
    deadline?: string;
    scheduled_for?: string;
    location?: string;
    priority?: 'high' | 'medium' | 'low';
  };
  previousTaskId?: number;
  continuesFromTask?: Task;

  // NEW: For linking tasks to quests suggested in the same batch
  pendingQuestClientId?: string;
}

export interface QuestSuggestion {
  id: string; // Client-side ID
  sourceContent: string;
  timestamp: string;
  type: 'quest';
  title: string;
  // quest_id?: number; // Removed, redundant with id for suggestions
  tagline: string;
  description: string;
  status: 'Active'; // Default status
  start_date?: string;
  end_date?: string;
  is_main: boolean;
  // relatedTasks?: TaskSuggestion[]; // Keep for initial structure if needed, but linking relies on pendingQuestClientId
  
  // NEW: Store client IDs of tasks associated with this suggested quest
  pendingTaskClientIds?: string[];
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
  isContinuation?: boolean; // New field to indicate if this is a continuation
  continuationReason?: string; // Explanation of why this is considered a continuation
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


// NEW: Interface for Status Change Detection Result
export interface TaskStatusChangeResult {
  isStatusChangeDetected: boolean;
  existingTaskId: number | null;
  newStatus: 'Done' | 'InProgress' | null; // The status to change TO
  confidence: number;
  reason?: string;
}


type Suggestion = TaskSuggestion | QuestSuggestion;

export interface TaskCompletionResult {
  isCompletion: boolean;
  existingTaskId: number | null;
  confidence: number; // 0 to 1
  reason?: string;
}
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
   * Generates a task suggestion from content
   * @param content The source content
   * @param userId The user's ID
   * @returns A task suggestion or null
   */
  public async generateTaskSuggestion(
    content: string,
    userId: string,
    context?: TaskContext
  ): Promise<TaskSuggestion[]> {
    performanceLogger.startOperation('generateTaskSuggestion');
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Get current personality for task generation
      const personalityType = await personalityService.getUserPersonality(userId);
      const personality = getPersonality(personalityType);

      const prompt = `You are ${personality.name}. ${personality.description}
Current date is: ${currentDate}

Analyze this content and generate ONE OR MORE separate tasks. If multiple distinct tasks are mentioned, create a separate task for each one.

Content: "${content}"

${context ? `Context:
- Source Message: ${context.sourceMessage}
- Related Messages: ${context.relatedMessages.join('\n')}
- Confidence: ${context.confidence}` : ''}

Generate a JSON object with this EXACT format:
{
  "tasks": [
    {
      "title": "Brief task title for first task",
      "description": "Detailed description incorporating context",
      "scheduled_for": "YYYY-MM-DD format date when task should start (must be ${currentDate} or later)",
      "deadline": "YYYY-MM-DD format deadline if mentioned (must be ${currentDate} or later), otherwise null",
      "location": "Location if mentioned, otherwise null",
      "priority": "high, medium, or low based on urgency/importance",
      "tags": ["relevant", "keyword", "tags"],
      "subtasks": "Comma-separated list of subtasks if appropriate, otherwise empty string"
    }
  ]
}

IMPORTANT:
- Write descriptions in your characteristic voice and style
- Create SEPARATE tasks for distinct activities
- Each task should be focused and specific
- Do not combine unrelated tasks into one
- All dates must be ${currentDate} or later
- Never use dates from the past`;

      console.log(`🚀 Generating task suggestion(s). Content: ${JSON.stringify(content)} Context: ${JSON.stringify(context)}\n Prompt: ${prompt}`);

      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: content }
        ],
        temperature: 0.4,
        max_tokens: 3000,
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0].message?.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      try {
        const parsed = JSON.parse(responseText);
        const timestamp = new Date().toISOString();

        // Return empty array if no tasks
        if (!parsed.tasks || parsed.tasks.length === 0) {
          console.log('No tasks generated from content');
          return [];
        }

        // Process all tasks
        const suggestions = parsed.tasks.map((taskData: {
          title: string;
          description: string;
          scheduled_for: string;
          deadline: string | null;
          location: string | null;
          priority: 'high' | 'medium' | 'low';
          tags: string[];
          subtasks: string;
        }) => ({
          id: `task-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          sourceContent: content,
          timestamp,
          type: 'task',
          title: taskData.title,
          description: taskData.description,
          scheduled_for: taskData.scheduled_for,
          deadline: taskData.deadline === 'null' ? undefined : taskData.deadline,
          location: taskData.location === 'null' ? undefined : taskData.location,
          status: 'ToDo',
          tags: taskData.tags || [],
          priority: taskData.priority || 'medium',
          subtasks: taskData.subtasks || undefined
        } as TaskSuggestion));

        console.log('✅ Generated task suggestions:', suggestions.map((s: TaskSuggestion) => s.title));
        return suggestions;

      } catch (parseError) {
        console.error('Error parsing task suggestion:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error generating task suggestion:', error);
      return [];
    } finally {
      performanceLogger.endOperation('generateTaskSuggestion');
    }
  }

  /**
   * Upgrades a task suggestion to a quest suggestion using LLM analysis
   * @param task The task suggestion to upgrade
   * @returns A quest suggestion if successful, null otherwise
   */
  async upgradeTaskToQuest(task: TaskSuggestion, userId: string): Promise<QuestSuggestion | null> {
    performanceLogger.startOperation('upgradeTaskToQuest');
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Get current personality for quest generation
      const personalityType = await personalityService.getUserPersonality(userId);
      const personality = getPersonality(personalityType);
      
      console.log('⬆️ Upgrading task to quest:', task.title);
      interface UpgradedQuestLLMOutput {
        title: string;
        tagline: string;
        description: string;
        start_date?: string;
        end_date?: string;
        relatedTasks: Array<{ // Define structure for tasks within the LLM output
          title: string;
          description: string;
          scheduled_for: string;
        }>;
      }

      const prompt = `You are ${personality.name}. ${personality.description}
Current date is: ${currentDate}

Upgrade this task to a quest (a larger goal that might require multiple tasks). 

Task Title: ${task.title}
Task Description: ${task.description}
Scheduled For: ${task.scheduled_for}
${task.deadline ? `Deadline: ${task.deadline}` : ''}
${task.location ? `Location: ${task.location}` : ''}
Priority: ${task.priority}
${task.tags && task.tags.length > 0 ? `Tags: ${task.tags.join(', ')}` : ''}
${task.subtasks ? `Subtasks: ${task.subtasks}` : ''}

Generate a JSON object with these EXACT fields, using your characteristic voice and perspective:
{
  "title": "Quest title - can be based on the original task or expanded",
  "tagline": "Short, one-line description of the quest",
  "description": "Detailed description of the overall goal/objective",
  "start_date": "YYYY-MM-DD - must be ${currentDate} or later",
  "end_date": "YYYY-MM-DD - must be after start_date",
  "relatedTasks": [
    {
      "title": "First related task - include the original task here",
      "description": "Description of first task",
      "scheduled_for": "YYYY-MM-DD"
    }
  ]
}

IMPORTANT:
- Write in your unique voice and perspective
- Add subtasks of the original task to the related tasks
- Add 2-3 more related tasks that would help achieve this quest
- Make the quest a meaningful expansion of the original task
- All dates must be ${currentDate} or later
- Never use dates from the past`;

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
        const parsed: UpgradedQuestLLMOutput = JSON.parse(responseText);
        const timestamp = new Date().toISOString();
        
        const clientQuestId = `quest-${timestamp}-${Math.random().toString(36).substring(2, 10)}`;
        const suggestion: QuestSuggestion = {
          id: clientQuestId,
          sourceContent: task.sourceContent,
          timestamp,
          type: 'quest',
          title: parsed.title,
          tagline: parsed.tagline,
          description: parsed.description,
          status: 'Active',
          start_date: parsed.start_date,
          end_date: parsed.end_date,
          is_main: false,
          
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
          const updateFields = await this.generateTaskUpdateFields(suggestion, existingTask, suggestion.sourceContent, userId);
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
        clerk_id: userId
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
  public async findBestQuestForTask(suggestion: TaskSuggestion, userId: string): Promise<number> {
    try {
      console.log('🔍 Finding best quest for task:', suggestion.title);
      
      // Get all user quests for analysis
      const quests = await fetchQuests(userId);
      if (!quests || quests.length === 0) {
        console.log('No quests found, using misc quest');
        const miscQuest = await getOrCreateMiscQuest(userId);
        return miscQuest.id;
      }
      
      // Create a task and quest information for the model
      const taskInfo = `Title: ${suggestion.title}
Description: ${suggestion.description || 'No description'}
${suggestion.scheduled_for ? `Scheduled for: ${suggestion.scheduled_for}` : ''}
${suggestion.deadline ? `Deadline: ${suggestion.deadline}` : ''}
${suggestion.location ? `Location: ${suggestion.location}` : ''}`;

      const questsInfo = quests.map(quest => `
ID: ${quest.id}
Title: ${quest.title}
Tagline: ${quest.tagline || 'No tagline'}
Description: ${quest.description || 'No description'}
Status: ${quest.status}
Is Main: ${quest.is_main ? 'Yes' : 'No'}
`).join('\n---\n');

      // Define the schema for structured output
      const questMatcherSchema = {
        type: SchemaType.OBJECT as const,
        description: "Quest matching analysis result",
        properties: {
          questId: {
            type: SchemaType.INTEGER as const,
            description: "The ID of the best matching quest, or null if no good match",
            nullable: true
          },
          confidence: {
            type: SchemaType.NUMBER as const,
            description: "How confident the model is in this match (0-1)",
          },
          reason: {
            type: SchemaType.STRING as const,
            description: "Brief explanation of why this quest is the best fit"
          }
        },
        required: ["questId", "confidence", "reason"]
      };

      // Create a model with the schema for structured output
      const structuredModel = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: questMatcherSchema
        }
      });

      // Prepare the prompt text
      const promptText = `You are analyzing a new task to determine which existing quest it belongs to.
Consider these criteria:
1. Theme alignment - does the task directly relate to the quest's purpose?
2. Scope fit - is the task at the right level of detail for the quest?
3. Timeline alignment - does the task fit within the quest's timeframe?

Find the best quest for this task:

New Task:
${taskInfo}

Available Quests:
${questsInfo}`;

      // Generate content with structured output
      const result = await structuredModel.generateContent(promptText);
      const responseText = result.response.text();
      
      if (!responseText) {
        console.log('⚠️ Empty response from Gemini for quest matching');
        const miscQuest = await getOrCreateMiscQuest(userId);
        return miscQuest.id;
      }
      
      // Parse the JSON response - should already be well-structured
      try {
        const parsed = JSON.parse(responseText);
        console.log(`✅ Gemini returned quest match analysis with confidence: ${parsed.confidence}`);
        
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
        console.error('❌ Error parsing Gemini response:', parseError);
        console.error('Raw response:', responseText);
        const miscQuest = await getOrCreateMiscQuest(userId);
        return miscQuest.id;
      }
    } catch (error) {
      console.error('❌ Error finding best quest for task:', error);
      const miscQuest = await getOrCreateMiscQuest(userId);
      return miscQuest.id;
    }
  }

  /**
   * Generates update fields for an existing task based on new source content
   * @param suggestion The new task suggestion
   * @param existingTask The existing task that was found to be a match
   * @param sourceContent The original source content that generated this suggestion
   * @returns Task update field recommendations
   */
  public async generateTaskUpdateFields(
    suggestion: TaskSuggestion, 
    existingTask: Task, 
    sourceContent: string,
    userId: string
  ): Promise<TaskUpdateFields> {
    performanceLogger.startOperation('generateTaskUpdateFields');
    try {
      // Get current personality for update analysis
      const personalityType = await personalityService.getUserPersonality(userId);
      const personality = getPersonality(personalityType);

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
      const prompt = `You are ${personality.name}. ${personality.description}

Analyze user message to determine how to update an existing task. Use your unique perspective to evaluate these changes.

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
1. Use your characteristic perspective to evaluate changes
2. Only suggest updates for fields that have meaningful new information
3. Use the user message and context to determine what should be updated
4. Only include fields in updateValues that should actually change
5. For status, only use one of these exact values: "ToDo", "InProgress", or "Done"

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
   * @param suggestion The newly generated task suggestion
   * @param userId The user's ID
   * @returns TaskSimilarityResult with match information
   */
  public async checkForDuplicatesBeforeShowing(suggestion: TaskSuggestion, userId: string): Promise<TaskSimilarityResult> {
    try {
      console.log('🔍 Checking if task suggestion is similar to existing active tasks:', suggestion.title);
      
      const allUserTasks = await fetchTasks(userId);
      const activeTasks = allUserTasks.filter(task => 
        task.status === 'ToDo' || task.status === 'InProgress'
      );
      
      if (activeTasks.length === 0) {
        console.log('No active tasks found for comparison');
        return {
          isMatch: false,
          existingTask: null,
          matchConfidence: 0
        };
      }
      
      console.log(`Comparing new task suggestion against ${activeTasks.length} active tasks`);
      
      const prompt = `You are analyzing if a new task suggestion is semantically equivalent to or a continuation of any existing tasks.

New Task Suggestion:
Title: ${suggestion.title}
Description: ${suggestion.description || 'None'}
Scheduled for: ${suggestion.scheduled_for}
Deadline: ${suggestion.deadline || 'None'}
Priority: ${suggestion.priority}
${suggestion.location ? `Location: ${suggestion.location}` : ''}

Existing active tasks:
${activeTasks.map(task => `
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
1. Look for SEMANTIC EQUIVALENCE (same task):
   - "Make dinner" and "Cook pasta for dinner" refer to the same task
   - "Bake a cake" and "Bake chocolate cake for tomorrow" refer to the same task

2. Look for TASK CONTINUATIONS (logical next step):
   - "Schedule doctor appointment" -> "Go to doctor appointment"
   - "Buy ingredients for cake" -> "Bake the cake"
   - "Draft email to client" -> "Send client email"

Determine:
1. Is the new task SEMANTICALLY THE SAME as any existing task?
2. If not, is it a LOGICAL CONTINUATION of any existing task?
3. If yes to either, which existing task is it related to?

Reply ONLY with a JSON object in this format:
{
  "isMatch": true/false,
  "matchingTaskId": task id of matching task or null if no match,
  "matchConfidence": 0.0 to 1.0,
  "isContinuation": true/false,
  "continuationReason": "Brief explanation of why this is a continuation, or null if not"
}`;

      try {
        const result = await this.model.generateContent(prompt);
        const responseText = this.cleanResponseText(result.response.text().trim());
        
        if (!responseText) {
          console.log('Empty response from AI for task comparison');
          return {
            isMatch: false,
            existingTask: null,
            matchConfidence: 0
          };
        }

        const parsed = JSON.parse(responseText);
        
        const matchingTask = parsed.isMatch && parsed.matchingTaskId ? 
          activeTasks.find(t => t.id === parsed.matchingTaskId) || 
          activeTasks.find(t => t.id === Number(parsed.matchingTaskId)) :
          null;
        
        return {
          isMatch: !!parsed.isMatch,
          existingTask: matchingTask || null,
          matchConfidence: parsed.matchConfidence || 0,
          isContinuation: !!parsed.isContinuation,
          continuationReason: parsed.continuationReason || null
        };
        
      } catch (parseError) {
        console.error('Error parsing task comparison result:', parseError);
        return {
          isMatch: false,
          existingTask: null,
          matchConfidence: 0
        };
      }
    } catch (error) {
      console.error('Error checking for duplicate tasks:', error);
      return {
        isMatch: false,
        existingTask: null,
        matchConfidence: 0
      };
    }
  }

  /**
   * Regenerates a task suggestion with context from its predecessor
   * @param suggestion Current task suggestion
   * @param previousTask The task this one continues from
   * @param questContext Optional quest context if the task belongs to a quest
   */
  public async regenerateTaskWithContinuationContext(
    suggestion: TaskSuggestion,
    previousTask: Task,
    questContext?: Quest
  ): Promise<TaskSuggestion | null> {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      console.log('♻️ Regenerating task suggestion with continuation context');
      
      const prompt = `Current date is: ${currentDate}

Generate an improved task description using the context of its predecessor task and quest.

Previous Task:
Title: ${previousTask.title}
Description: ${previousTask.description || 'None'}
Status: ${previousTask.status}
Priority: ${previousTask.priority || 'None'}

${questContext ? `Related Quest:
Title: ${questContext.title}
Description: ${questContext.description || 'None'}
Status: ${questContext.status}` : ''}

Current Task Suggestion:
Title: ${suggestion.title}
Description: ${suggestion.description || 'None'}

This task is a continuation or next step after the previous task.
Generate a JSON object with these EXACT fields that incorporates this context:
{
  "title": "Improved task title that shows continuity",
  "description": "Enhanced description that references the previous task",
  "priority": "high/medium/low (based on previous task)",
  "scheduled_for": "YYYY-MM-DD (must be ${currentDate} or later)",
  "tags": ["relevant", "tags", "including", "continuation"]
}

IMPORTANT:
- All dates must be ${currentDate} or later
- Never use dates from the past`;

      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: prompt }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0].message?.content;
      if (!responseText) {
        throw new Error('Empty response from AI');
      }

      const parsed = JSON.parse(responseText);
      const timestamp = new Date().toISOString();

      // Create new suggestion with improved context
      const enhancedSuggestion: TaskSuggestion = {
        ...suggestion,
        id: `task-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
        title: parsed.title,
        description: parsed.description,
        scheduled_for: parsed.scheduled_for,
        priority: parsed.priority,
        tags: parsed.tags,
        timestamp,
        previousTaskId: previousTask.id, // Add reference to previous task
        quest_id: previousTask.quest_id // Carry over the quest ID from the previous task
      };

      console.log('✨ Generated enhanced continuation task:', enhancedSuggestion.title);
      return enhancedSuggestion;

    } catch (error) {
      console.error('Error regenerating task with continuation context:', error);
      return null;
    }
  }

  /**
   * Converts a task suggestion into an edit suggestion for an existing task
   * @param suggestion The original task suggestion
   * @param existingTask The existing task that was found to be similar
   * @returns The modified task suggestion as an edit suggestion
   */
  public async convertToEditSuggestion(suggestion: TaskSuggestion, existingTask: Task): Promise<TaskSuggestion> {
    try {
      // Generate update fields based on the source content
      const updateFields = await this.generateTaskUpdateFields(suggestion, existingTask, suggestion.sourceContent, existingTask.clerk_id);
      
      // Modify the suggestion to indicate it's an edit suggestion and preserve quest context
      suggestion.isEditSuggestion = true;
      suggestion.existingTaskId = existingTask.id;
      suggestion.quest_id = existingTask.quest_id; // Ensure quest_id is carried over
      suggestion.updateValues = updateFields.updateValues;
      
      // Update the title to indicate it's an edit
      suggestion.title = `Update: ${suggestion.title}`;
      
      if (existingTask.title) {
        // Create a more useful description that shows what's being updated
        const updateFieldsList = updateFields.updateValues ? 
          Object.keys(updateFields.updateValues).join(', ') : 
          'No specific fields';
          
        suggestion.description = `Edit to existing task "${existingTask.title}":\n\n${suggestion.description}\n\nFields to update: ${updateFieldsList}`;
      }
      
      // Log for tracking quest context
      console.log('Created edit suggestion with quest context:', {
        taskId: suggestion.id,
        questId: suggestion.quest_id,
        title: suggestion.title
      });
      

      return suggestion;
    } catch (error) {
      console.error('Error converting to edit suggestion:', error);
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
   * MODIFIED: Creates a quest and potentially links related tasks afterward.
   * @param suggestion The quest suggestion to create
   * @param userId The user's ID
   */
  async acceptQuestSuggestion(suggestion: QuestSuggestion, userId: string): Promise<Quest | null> {
    try {
      console.log(`📝 [SuggestionAgent] Accepting quest suggestion: ${suggestion.title} (Client ID: ${suggestion.id})`);

      const questData = {
        title: suggestion.title,
        tagline: suggestion.tagline,
        description: suggestion.description,
        status: suggestion.status,
        start_date: suggestion.start_date,
        end_date: suggestion.end_date,
        is_main: false, // Keep default as false
        clerk_id: userId
      };

      // Create the quest in the database
      const createdQuest = await createQuest(userId, questData);
      console.log(`✅ Quest created in DB with ID: ${createdQuest.id}`);

      // --- NEW: Link pending tasks ---
      // This part is now handled in SuggestionContext after the quest is successfully created.
      // We return the created quest so the context can use its ID.

      // Original logic to create tasks immediately is removed from here.
      // If relatedTasks were part of the initial LLM structure and stored on suggestion,
      // they are now handled via pendingTaskClientIds in the context.

      return createdQuest; // Return the newly created quest object

    } catch (error) {
      console.error(`❌ Error accepting quest suggestion ${suggestion.title}:`, error);
      return null;
    }
  }

  /**
   * Analyzes a full chat session (all messages, both user and assistant) to generate task and quest suggestions.
   * Passes all quests and tasks to the LLM, and uses existing deduplication/assignment logic.
   */
  public async analyzeChatHistoryForSuggestions(
    chatMessages: ConversationMessage[],
    userId: string
  ): Promise<void> {
    console.log('starting analyzeChatHistoryForSuggestions');
    try {
      if (!userId || !chatMessages || chatMessages.length === 0) {
        console.error('[SuggestionAgent] Missing userId or chatMessages for analysis');
        return;
      }
 // Format chat session for prompt
 const formattedConversation = chatMessages.map(msg =>
  `${msg.role.toUpperCase()}: ${msg.content}`
).join('\n');

      // Fetch all quests (each quest includes its tasks, including "Misc" quest)
      const allQuests = await fetchQuests(userId);
   
     
      // Format quests and tasks for prompt
      const formattedQuests =  JSON.stringify(allQuests, null, 2);
      const currentDate = new Date().toISOString().split('T')[0];
      const personalityType = await personalityService.getUserPersonality(userId);
      const personality = getPersonality(personalityType);
      // New prompt: allow suggesting new tasks for existing quests, new quests (with tasks), and standalone tasks
      const prompt = `You are ${personality.name}. ${personality.description}
Current date is: ${currentDate}. You are to extract actionable tasks and quests from a conversation.

You have access to:
- The full chat session (see below).
- All existing quests and their tasks (see below).

Your job:
1. Suggest new tasks for any existing quest (reference by quest ID or title).
2. Suggest new quests (with optional new tasks for those quests).
3. Suggest standalone tasks (not belonging to any quest).

For each new task, specify:
- The quest it belongs to (by quest ID or title), or mark as standalone.

Output a JSON object with this structure:
{
  "suggestedTasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "quest_id": "existing quest ID",
      "quest_title": "existing quest title",
      "scheduled_for": "YYYY-MM-DD",
      "deadline": "YYYY-MM-DD or null",
      "priority": "high/medium/low",
      "tags": ["tag1", "tag2"]
    }
    // ... more tasks
  ],
  "suggestedQuests": [
    {
      "title": "New Quest Title",
      "tagline": "Short tagline",
      "description": "Quest description",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "tasks": [
        {
          "title": "Task for new quest",
          "description": "Task description",
          "scheduled_for": "YYYY-MM-DD",
          "deadline": "YYYY-MM-DD or null",
          "priority": "high/medium/low",
          "tags": ["tag1", "tag2"]
        }
        // ... more tasks for this new quest
      ]
    }
    // ... more new quests
  ]
}

IMPORTANT:
- Only suggest tasks that are not already present in the existing quests/tasks.
- Assign new tasks to the most relevant existing quest if possible.
- If a task does not fit any existing quest, mark it as standalone.
- Use the chat session and user context for inspiration.

--- CHAT SESSION ---
${formattedConversation}

--- EXISTING QUESTS & TASKS ---
${formattedQuests}

IMPORTANT RULES:
- Create Quests for significant, multi-step goals.
- Create Tasks for specific, actionable items.
- Assign tasks to "associatedTasks" ONLY IF they clearly belong to a NEWLY SUGGESTED Quest defined in the same response.
- Tasks that seem independent or might relate to *existing* database quests go into "standaloneTasks".
- Generate UNIQUE clientQuestId and clientTaskId for each item (e.g., use 'temp-quest-' + random string).
- Ensure all dates are ${currentDate} or later.
- Write content in your characteristic ${personality.name} voice.`;

      console.log('Sending prompt to LLM');
      console.log(prompt);
      // Call LLM for suggestions
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 3500,
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0].message?.content;
      if (!responseText) {
        throw new Error('Empty response from AI during chat history analysis');
      }

      const parsed = JSON.parse(responseText);
      const timestamp = new Date().toISOString();
      const sourceContent = formattedConversation;

      // Process suggested quests (new quests)
      const suggestedQuestsData = parsed.suggestedQuests || [];
      for (const questData of suggestedQuestsData) {
        const questSuggestion: QuestSuggestion = {
          id: `quest-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          sourceContent,
          timestamp,
          type: 'quest',
          title: questData.title,
          tagline: questData.tagline,
          description: questData.description,
          status: 'Active',
          start_date: questData.start_date,
          end_date: questData.end_date,
          is_main: false,
          pendingTaskClientIds: []
        };
        globalSuggestionStore.addSuggestion(questSuggestion);
        // If the quest has tasks, add them as well
        if (Array.isArray(questData.tasks)) {
          for (const taskData of questData.tasks) {
            const taskSuggestion: TaskSuggestion = {
              id: `task-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
              sourceContent,
              timestamp,
              type: 'task',
              title: taskData.title,
              description: taskData.description,
              scheduled_for: taskData.scheduled_for,
              deadline: taskData.deadline,
              location: taskData.location,
              status: 'ToDo',
              tags: taskData.tags || [],
              priority: taskData.priority || 'medium',
              subtasks: taskData.subtasks || undefined,
              pendingQuestClientId: questSuggestion.id
            };
            globalSuggestionStore.addSuggestion(taskSuggestion);
          }
        }
      }

      // Process suggested tasks (for existing quests or standalone)
      const suggestedTasksData = parsed.suggestedTasks || [];
      for (const taskData of suggestedTasksData) {
        // Try to match quest_id to an actual quest
        let questId: number | undefined = undefined;
        if (taskData.quest_id) {
          // Try to match by ID
          const match = allQuests.find(q => String(q.id) === String(taskData.quest_id));
          if (match) questId = match.id;
        } else if (taskData.quest_title) {
          // Try to match by title
          const match = allQuests.find(q => q.title.toLowerCase() === String(taskData.quest_title).toLowerCase());
          if (match) questId = match.id;
        }
        const taskSuggestion: TaskSuggestion = {
          id: `task-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
          sourceContent,
          timestamp,
          type: 'task',
          title: taskData.title,
          description: taskData.description,
          scheduled_for: taskData.scheduled_for,
          deadline: taskData.deadline,
          location: taskData.location,
          status: 'ToDo',
          tags: taskData.tags || [],
          priority: taskData.priority || 'medium',
          subtasks: taskData.subtasks || undefined,
          quest_id: questId
        };
        // Deduplication/assignment logic (existing methods)
        const similarityResult = await this.checkForDuplicatesBeforeShowing(taskSuggestion, userId);
        if (similarityResult.isMatch && similarityResult.existingTask) {
          if (similarityResult.isContinuation) {
            const questContext = similarityResult.existingTask.quest_id ?
              allQuests.find(q => q.id === similarityResult.existingTask?.quest_id) : undefined;
            const enhancedSuggestion = await this.regenerateTaskWithContinuationContext(
              { ...taskSuggestion, continuesFromTask: similarityResult.existingTask },
              similarityResult.existingTask,
              questContext
            );
            if (enhancedSuggestion) {
              globalSuggestionStore.addSuggestion(enhancedSuggestion);
            }
          } else if (similarityResult.matchConfidence > 0.7) {
            const editSuggestion = await this.convertToEditSuggestion(taskSuggestion, similarityResult.existingTask);
            globalSuggestionStore.addSuggestion(editSuggestion);
          } else {
            // If questId is not set, try to find best quest
            if (!questId) {
              const bestQuestId = await this.findBestQuestForTask(taskSuggestion, userId);
              taskSuggestion.quest_id = bestQuestId;
            }
            globalSuggestionStore.addSuggestion(taskSuggestion);
          }
        } else {
          // If questId is not set, try to find best quest
          if (!questId) {
            const bestQuestId = await this.findBestQuestForTask(taskSuggestion, userId);
            taskSuggestion.quest_id = bestQuestId;
          }
          globalSuggestionStore.addSuggestion(taskSuggestion);
        }
      }
    } catch (error) {
      console.error('❌ Error in analyzeChatHistoryForSuggestions:', error);
    } finally {
      performanceLogger.endOperation('analyzeChatHistoryForSuggestions');
    }
  }


  /**
   * Analyzes checkup content to generate task and quest suggestions
   * @param checkupContent The content of the checkup entry
   * @param userId The user's ID
   * @returns Promise that resolves when analysis is complete
   */
  public async analyzeCheckupForSuggestions(checkupContent: string, userId: string): Promise<void> {
    performanceLogger.startOperation('analyzeCheckupForSuggestions');
    console.log(`\n=== SuggestionAgent.analyzeCheckupForSuggestions ===`);
    console.log(`Analyzing checkup content for user ${userId}: "${checkupContent.substring(0, 100)}${checkupContent.length > 100 ? '...' : ''}"`);

    try {
      const currentDate = new Date().toISOString().split('T')[0];
      const personalityType = await personalityService.getUserPersonality(userId);
      const personality = getPersonality(personalityType);
      const allQuests = await fetchQuests(userId);
      const formattedQuests = JSON.stringify(allQuests, null, 2);

      // Combined prompt to generate both quests and tasks from checkup content
      const prompt = `You are ${personality.name}. ${personality.description}
Current date is: ${currentDate}. Your task is to analyze the Journal Entry and suggest new tasks and quests.

You have access to:
- The full Journal Entry (see below).
- All existing quests and their tasks (see below).

Your job:
1. Suggest new tasks for any existing quest (reference by quest ID or title).
2. Suggest new quests (with optional new tasks for those quests).
3. Suggest standalone tasks (not belonging to any quest).

For each new task, specify:
- The quest it belongs to (by quest ID or title), or mark as standalone.

Output a JSON object with this structure:
{
  "suggestedTasks": [
    {
      "title": "Task title",
      "description": "Task description",
      "quest_id": "existing quest ID",
      "quest_title": "existing quest title",
      "scheduled_for": "YYYY-MM-DD",
      "deadline": "YYYY-MM-DD or null",
      "priority": "high/medium/low",
      "tags": ["tag1", "tag2"]
    }
    // ... more tasks
  ],
  "suggestedQuests": [
    {
      "title": "New Quest Title",
      "tagline": "Short tagline",
      "description": "Quest description",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "tasks": [
        {
          "title": "Task for new quest",
          "description": "Task description",
          "scheduled_for": "YYYY-MM-DD",
          "deadline": "YYYY-MM-DD or null",
          "priority": "high/medium/low",
          "tags": ["tag1", "tag2"]
        }
        // ... more tasks for this new quest
      ]
    }
    // ... more new quests
  ]
}

IMPORTANT:
- Only suggest tasks that are not already present in the existing quests/tasks.
- Assign new tasks to the most relevant existing quest if possible.
- If a task does not fit any existing quest, mark it as standalone.
- Use the Journal Entry and user context for inspiration.

--- Journal Entry ---
${checkupContent}

--- EXISTING QUESTS & TASKS ---
${formattedQuests}

IMPORTANT RULES:
- Create Quests for significant, multi-step goals.
- Create Tasks for specific, actionable items.
- Assign tasks to "associatedTasks" ONLY IF they clearly belong to a NEWLY SUGGESTED Quest defined in the same response.
- Tasks that seem independent or might relate to *existing* database quests go into "standaloneTasks".
- Generate UNIQUE clientQuestId and clientTaskId for each item (e.g., use 'temp-quest-' + random string).
- Ensure all dates are ${currentDate} or later.
- Write content in your characteristic ${personality.name} voice.`;

      console.log('🚀 [SuggestionAgent] Sending analysis prompt to AI...');
      console.log(prompt);
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat", 
        messages: [{ role: "system", content: prompt }],
        temperature: 0.4,
        max_tokens: 3500,
        response_format: { type: "json_object" }
      });

      const responseText = response.choices[0].message?.content;
      if (!responseText) {
        throw new Error('Empty response from AI during checkup analysis');
      }

      console.log('✅ [SuggestionAgent] Received analysis response. Parsing...');
      const parsed = JSON.parse(responseText);
      const timestamp = new Date().toISOString();
      const sourceContent = checkupContent; // Use checkup content as source

      // --- Process Quests FIRST ---
      const suggestedQuestsData = parsed.suggestedQuests || [];
      const allGeneratedTaskSuggestions: TaskSuggestion[] = []; // Keep track of all tasks generated

      console.log(`Processing ${suggestedQuestsData.length} suggested quests...`);
      for (const questData of suggestedQuestsData) {
        const clientQuestId = questData.clientQuestId || `quest-${timestamp}-${Math.random().toString(36).substring(2, 10)}`;
        const associatedTaskClientIds: string[] = [];

        const questSuggestion: QuestSuggestion = {
          id: clientQuestId,
          sourceContent: sourceContent,
          timestamp,
          type: 'quest',
          title: questData.title,
          tagline: questData.tagline,
          description: questData.description,
          status: 'Active',
          start_date: questData.start_date === 'null' ? undefined : questData.start_date,
          end_date: questData.end_date === 'null' ? undefined : questData.end_date,
          is_main: false, // Default, user can change later
          pendingTaskClientIds: [] // Initialize
        };

        // Process tasks associated with THIS quest
        const associatedTasksData = questData.associatedTasks || [];
        console.log(`Processing ${associatedTasksData.length} tasks for quest: ${questData.title}`);
        for (const taskData of associatedTasksData) {
          const clientTaskId = taskData.clientTaskId || `task-${timestamp}-${Math.random().toString(36).substring(2, 10)}`;
          associatedTaskClientIds.push(clientTaskId); // Link task to quest

          const taskSuggestion: TaskSuggestion = {
            id: clientTaskId,
            sourceContent: sourceContent,
            timestamp,
            type: 'task',
            title: taskData.title,
            description: taskData.description,
            scheduled_for: taskData.scheduled_for,
            deadline: taskData.deadline === 'null' ? undefined : taskData.deadline,
            location: taskData.location === 'null' ? undefined : taskData.location,
            status: 'ToDo',
            tags: taskData.tags || [],
            priority: taskData.priority || 'medium',
            // quest_id: undefined, // Leave undefined for now
            pendingQuestClientId: clientQuestId, // Link back to the suggested quest
          };
          allGeneratedTaskSuggestions.push(taskSuggestion);
        }

        // Add the list of associated task IDs to the quest suggestion
        questSuggestion.pendingTaskClientIds = associatedTaskClientIds;

        console.log(`✨ Adding Quest Suggestion: ${questSuggestion.title} (ID: ${questSuggestion.id}) with ${associatedTaskClientIds.length} pending tasks.`);
        globalSuggestionStore.addSuggestion(questSuggestion);
      }

      // --- Process Standalone Tasks ---
      const standaloneTasksData = parsed.standaloneTasks || [];
      console.log(`Processing ${standaloneTasksData.length} standalone tasks...`);
      for (const taskData of standaloneTasksData) {
          // Create standalone task suggestion
          const clientTaskId = taskData.clientTaskId || `task-${timestamp}-${Math.random().toString(36).substring(2, 10)}`;
          const taskSuggestion: TaskSuggestion = {
              id: clientTaskId,
              sourceContent: sourceContent,
              timestamp,
              type: 'task',
              title: taskData.title,
              description: taskData.description,
              scheduled_for: taskData.scheduled_for,
              deadline: taskData.deadline === 'null' ? undefined : taskData.deadline,
              location: taskData.location === 'null' ? undefined : taskData.location,
              status: 'ToDo',
              tags: taskData.tags || [],
              priority: taskData.priority || 'medium',
              // No pendingQuestClientId for standalone tasks initially
          };

          // Now, check this standalone task against EXISTING quests and duplicates/continuations
          console.log(`🔄 Processing standalone task: ${taskSuggestion.title}`);
          const similarityResult = await this.checkForDuplicatesBeforeShowing(taskSuggestion, userId);

          if (similarityResult.isMatch && similarityResult.existingTask) {
              if (similarityResult.isContinuation) {
                  console.log('🔄 Standalone task identified as continuation:', similarityResult.continuationReason);
                  const questContext = similarityResult.existingTask.quest_id ?
                      await fetchQuests(userId).then(quests => quests.find(q => q.id === similarityResult.existingTask?.quest_id)) : undefined;

                  const enhancedSuggestion = await this.regenerateTaskWithContinuationContext(
                      { ...taskSuggestion, continuesFromTask: similarityResult.existingTask },
                      similarityResult.existingTask,
                      questContext
                  );
                  if (enhancedSuggestion) {
                      console.log(`✨ Adding Enhanced Continuation Suggestion: ${enhancedSuggestion.title}`);
                      allGeneratedTaskSuggestions.push(enhancedSuggestion);
                  }
              } else if (similarityResult.matchConfidence > 0.7) {
                  console.log(`🔄 Standalone task is duplicate/edit (${similarityResult.matchConfidence.toFixed(2)} confidence). Converting.`);
                  const editSuggestion = await this.convertToEditSuggestion(taskSuggestion, similarityResult.existingTask);
                  console.log(`✨ Adding Edit Suggestion: ${editSuggestion.title}`);
                  allGeneratedTaskSuggestions.push(editSuggestion);
              } else {
                  // Low confidence match, treat as new standalone task for now
                   console.log('🔄 Standalone task is new (low confidence match). Finding best existing quest.');
                   const questId = await this.findBestQuestForTask(taskSuggestion, userId);
                   taskSuggestion.quest_id = questId; // Assign to existing or misc quest
                   console.log(`✨ Adding Standalone Task Suggestion: ${taskSuggestion.title} to Quest ID ${questId}`);
                   allGeneratedTaskSuggestions.push(taskSuggestion);
              }
          } else {
               // No match found, find best existing quest
               console.log('🔄 Standalone task is new. Finding best existing quest.');
               const questId = await this.findBestQuestForTask(taskSuggestion, userId);
               taskSuggestion.quest_id = questId; // Assign to existing or misc quest
               console.log(`✨ Adding Standalone Task Suggestion: ${taskSuggestion.title} to Quest ID ${questId}`);
               allGeneratedTaskSuggestions.push(taskSuggestion);
          }
      }

      // Add all processed task suggestions to the store
      for (const taskToAdd of allGeneratedTaskSuggestions) {
          console.log(`🛒 Adding task ${taskToAdd.title} (ID: ${taskToAdd.id}, Pending Quest: ${taskToAdd.pendingQuestClientId || 'None'}, Real Quest: ${taskToAdd.quest_id || 'None'}) to store.`);
          globalSuggestionStore.addSuggestion(taskToAdd);
      }

    } catch (error) {
      console.error('❌ Error in analyzeCheckupForSuggestions:', error);
    } finally {
      performanceLogger.endOperation('analyzeCheckupForSuggestions');
    }
  }

}