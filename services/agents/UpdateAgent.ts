import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { performanceLogger } from '@/utils/performanceLogger';
import { Task } from '@/app/types';
import { fetchActiveTasks, updateTask } from '@/services/tasksService';
import { personalityService } from '@/services/personalityService';
import { getPersonality } from '@/services/agents/PersonalityPrompts';

/**
 * Result interface for task status change detection
 */
export interface TaskStatusChangeResult {
  isStatusChangeDetected: boolean;
  existingTaskId: number | null;
  newStatus: 'Done' | 'InProgress' | null;
  confidence: number;
  reason?: string;
}

/**
 * UpdateAgent is responsible for detecting and applying task status updates
 * based on analyzing checkup entry content.
 */
export class UpdateAgent {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  
  // Add a static instance to implement proper singleton pattern
  private static instance: UpdateAgent;

  constructor() {
    // Initialize Google Generative AI
    this.genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    console.log("🔧 [UpdateAgent] Created new agent instance");
  }

  /**
   * Static method to get the singleton instance
   */
  public static getInstance(): UpdateAgent {
    if (!UpdateAgent.instance) {
      UpdateAgent.instance = new UpdateAgent();
      console.log("🔧 Created new UpdateAgent singleton instance");
    }
    return UpdateAgent.instance;
  }

  /**
   * Process checkup content to detect and apply task status updates
   * @param checkupContent The content of the checkup entry
   * @param userId The user's ID
   * @param activeTasksList Optional pre-fetched list of active tasks
   * @returns Promise that resolves when processing is complete
   */
  public async processCheckupForStatusUpdates(
    checkupContent: string,
    userId: string,
    activeTasksList?: Task[]
  ): Promise<void> {
    performanceLogger.startOperation('processCheckupForStatusUpdates');
    try {
      console.log('🔍 [UpdateAgent] Processing checkup for status updates:', checkupContent);
      
      // Detect if there's a task status change intent in the checkup
      const statusChangeResult = await this.detectTaskStatusChange(
        checkupContent,
        userId,
        activeTasksList
      );
      
      // If a status change was detected with high confidence
      if (statusChangeResult.isStatusChangeDetected && 
          statusChangeResult.existingTaskId && 
          statusChangeResult.newStatus) {
        
        console.log(`✅ [UpdateAgent] Applying status change to task ${statusChangeResult.existingTaskId}: ${statusChangeResult.newStatus}`);
        
        // Update the task status in the database
        await updateTask(
          statusChangeResult.existingTaskId, 
          { status: statusChangeResult.newStatus },
          userId
        );
        
        console.log(`✨ [UpdateAgent] Successfully updated task ${statusChangeResult.existingTaskId} status to ${statusChangeResult.newStatus}`);
      } else {
        console.log('🚫 [UpdateAgent] No task status updates detected in checkup');
      }
    } catch (error) {
      console.error('❌ [UpdateAgent] Error processing checkup for status updates:', error);
    } finally {
      performanceLogger.endOperation('processCheckupForStatusUpdates');
    }
  }

  /**
   * Analyzes checkup content to detect if the user is indicating they've started or completed a task.
   * @param content The checkup content to analyze
   * @param userId The user's ID
   * @param activeTasksList Optional pre-fetched list of active tasks
   * @returns TaskStatusChangeResult indicating if a status change was detected and for which task
   */
  private async detectTaskStatusChange(
    content: string,
    userId: string,
    activeTasksList?: Task[]
  ): Promise<TaskStatusChangeResult> {
    performanceLogger.startOperation('detectTaskStatusChange');
    try {
      console.log('🕵️ [UpdateAgent] Analyzing task status change intent in checkup content');

      // Use provided list or fetch active tasks if not provided
      const activeTasks = activeTasksList ?? await fetchActiveTasks(userId);

      if (activeTasks.length === 0) {
        console.log('[UpdateAgent] No active (ToDo/InProgress) tasks found for status change check.');
        return { isStatusChangeDetected: false, existingTaskId: null, newStatus: null, confidence: 0 };
      }
      
      console.log(`[UpdateAgent] Checking against ${activeTasks.length} active tasks for status change intent.`);

      // Get personality for prompt style (optional)
      const personalityType = await personalityService.getUserPersonality(userId);
      const personality = getPersonality(personalityType);

      const prompt = `
Analyze the user's checkup entry STRICTLY to determine if they are stating that they have either:
1. COMPLETED an existing task (which is currently 'ToDo' or 'InProgress'). The target status would be 'Done'.
2. STARTED WORKING ON or ARE CURRENTLY WORKING ON an existing task (which is currently 'ToDo'). The target status would be 'InProgress'.

User Checkup Entry: "${content}"

Existing Active Tasks ('ToDo' or 'InProgress'):
${activeTasks.map(task => `Task ID: ${task.id} | Title: ${task.title} | Current Status: ${task.status}`).join('\n')}

CRITICAL EVALUATION:
- **Completion ('Done'):** Does the entry clearly state a task is FINISHED, DONE, or COMPLETED? Match against 'ToDo' OR 'InProgress' tasks.
- **Starting ('InProgress'):** Does the entry clearly state the user *began* work or is *currently* working on a specific task? Match ONLY against 'ToDo' tasks. Intent must be *present* action ("Starting X", "Working on X now"), not future plans ("I will start X").
- Identify the single MOST LIKELY task and the corresponding action (Done or InProgress).
- If the user mentions completing a task, prioritize that ('Done') over starting another task mentioned in the same entry.

Reply ONLY with a JSON object in this EXACT format:
{
  "isStatusChangeDetected": true/false, // true ONLY if a specific task status change is clearly indicated
  "existingTaskId": task_id_or_null, // The numeric ID of the affected task, or null
  "newStatus": "Done" | "InProgress" | null, // The NEW status ('Done' or 'InProgress'), or null
  "confidence": 0.0_to_1.0, // Confidence score (must be > 0.88 for detection)
  "reason": "Brief explanation for the decision"
}`;

      // Use Gemini Flash model for structured output
      const structuredModel = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          temperature: 0.15, // Low temp for reliable extraction
          responseMimeType: "application/json",
        }
      });

      const result = await structuredModel.generateContent(prompt);
      const responseText = this.cleanResponseText(result.response.text());

      // Parse and Validate the result
      try {
        const parsed = JSON.parse(responseText);
        const isStatusChangeDetected = parsed.isStatusChangeDetected === true &&
                               parsed.confidence > 0.88 && // High confidence threshold
                               parsed.existingTaskId != null &&
                               (parsed.newStatus === 'Done' || parsed.newStatus === 'InProgress');

        if (!isStatusChangeDetected) {
          console.log(`🚫 [UpdateAgent] No high-confidence status change detected.`);
          return { 
            isStatusChangeDetected: false, 
            existingTaskId: null, 
            newStatus: null, 
            confidence: parsed.confidence || 0, 
            reason: parsed.reason 
          };
        }

        const taskId = Number(parsed.existingTaskId);
        const newStatus = parsed.newStatus as ('Done' | 'InProgress');

        // Find the original task to validate the transition
        const originalTask = activeTasks.find(t => t.id === taskId);

        if (!originalTask) {
          console.warn(`[UpdateAgent] Detected change for Task ID ${taskId}, but task not found in provided active list.`);
          return { 
            isStatusChangeDetected: false, 
            existingTaskId: null, 
            newStatus: null, 
            confidence: 0, 
            reason: "Detected task ID not found" 
          };
        }

        // --- Validation Logic ---
        let isValidTransition = false;
        if (newStatus === 'Done') {
          // Can complete 'ToDo' or 'InProgress'
          isValidTransition = (originalTask.status === 'ToDo' || originalTask.status === 'InProgress');
        } else if (newStatus === 'InProgress') {
          // Can only start 'ToDo' tasks
          isValidTransition = (originalTask.status === 'ToDo');
        }

        if (isValidTransition) {
          console.log(`✅ [UpdateAgent] Valid status change to '${newStatus}' confirmed for Task ID: ${taskId} (Original: ${originalTask.status}). Confidence: ${parsed.confidence}. Reason: ${parsed.reason}`);
          return {
            isStatusChangeDetected: true,
            existingTaskId: taskId,
            newStatus: newStatus,
            confidence: parsed.confidence,
            reason: parsed.reason
          };
        } else {
          console.warn(`[UpdateAgent] Detected change for Task ID ${taskId} to '${newStatus}', but this is NOT a valid transition from its current status '${originalTask.status}'. Ignoring.`);
          return { 
            isStatusChangeDetected: false, 
            existingTaskId: null, 
            newStatus: null, 
            confidence: 0, 
            reason: `Invalid transition from ${originalTask.status} to ${newStatus}` 
          };
        }

      } catch (parseError) {
        console.error('Error parsing status change result:', parseError, 'Raw:', responseText);
        return { isStatusChangeDetected: false, existingTaskId: null, newStatus: null, confidence: 0 };
      }

    } catch (error) {
      console.error('Error in detectTaskStatusChange:', error);
      return { isStatusChangeDetected: false, existingTaskId: null, newStatus: null, confidence: 0 };
    } finally {
      performanceLogger.endOperation('detectTaskStatusChange');
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
}