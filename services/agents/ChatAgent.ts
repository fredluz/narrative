// ================================================================
// COMPLETE services/agents/ChatAgent.ts file - NO performanceLogger
// Reverted prompt structure, using Gemini Flash for both steps
// ================================================================

// --------- Imports ---------
import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold, Content } from "@google/generative-ai"; // Import Gemini types
import { QuestAgent } from './QuestAgent';
// Import TaskCompletionResult along with other types
import { SuggestionAgent, ConversationData, TaskStatusChangeResult } from './SuggestionAgent';
// Removed performanceLogger import
import {
  createChatSession,
  updateMessagesWithSessionId
} from '@/hooks/useChatData';
import { PersonalityType, getPersonality } from './PersonalityPrompts';
import { personalityService } from '../personalityService';
import { updateTask, fetchActiveTasks } from '../tasksService'; // Import updateTask
import { ChatMessage, Quest, Task } from '@/app/types'; // Ensure Task is imported

export class ChatAgent {

  // --------- Properties ---------
  private questAgent: QuestAgent;
  private suggestionAgent: SuggestionAgent;
  private genAI: GoogleGenerativeAI;
  private mainResponseModel: GenerativeModel; // Model for chat

  // Safety Settings for Gemini
  private safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  // --------- Constructor ---------
  constructor() {
    this.questAgent = new QuestAgent();
    this.suggestionAgent = SuggestionAgent.getInstance(); // Use singleton

    // Initialize Gemini
    this.genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
    this.mainResponseModel = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        safetySettings: this.safetySettings
    });

    console.log("🤖 [ChatAgent] Initialized with Gemini Flash for main responses and completion checks.");
  }

  // --------- generateChatResponse (Concurrent Gemini Flash) ---------
    // --------- generateChatResponse (Concurrent Gemini Flash with History) ---------
    async generateChatResponse(message: string, userId: string): Promise<string[]> {
      let statusChangeResult: TaskStatusChangeResult | null = null;
      let mainGenResult: any | null = null; // Store Gemini generation result
  
      try {
        if (!userId) {
          console.error('User ID is required for generateChatResponse');
          return ["Authentication required. Please log in."];
         }
  
        console.log('\n=== ChatAgent.generateChatResponse (Concurrent Flash w/ History) ===');
        console.log(`Processing message for user ${userId}: "${message}"`);
  
        // --- 1. Fetch Initial Context & History ---
        // Fetch active tasks first
        const initialActiveTasks = await fetchActiveTasks(userId);
        // Fetch other context and potentially history concurrently
        const otherContextPromise = Promise.all([
            personalityService.getUserPersonality(userId),
            this.questAgent.findRelevantQuests(message, userId),
            // Fetch message history from local storage (or DB if needed)
            (async () => {
                try {
                    // Assuming useChatData stores current session messages locally
                    const storedMessages = localStorage.getItem(`chat_messages_local_${userId}`);
                    if (storedMessages) {
                        return JSON.parse(storedMessages) as ChatMessage[];
                    }
                } catch (e) {
                    console.error("Error reading chat history from localStorage:", e);
                }
                return []; // Return empty array on error or if not found
            })()
        ]);
        const [personalityType, relevantQuests, currentMessages] = await otherContextPromise; // Added currentMessages
        const personality = getPersonality(personalityType);
        console.log(`Fetched initial context: ${relevantQuests.length} quests, ${initialActiveTasks.length} active tasks, ${currentMessages.length} history messages.`);
  
        // --- 2. Build Prompt Context Parts ---
        let questContext = '';
        if (relevantQuests.length > 0) {
           questContext = '\nRelevant Projects:\n' + relevantQuests.map(q => `- ${q.title} (Status: ${q.status})`).join('\n');
        }
        let tasksContext = '';
        if (initialActiveTasks.length > 0) {
           tasksContext = '\nYour Currently Active Tasks (Not Done):\n' + initialActiveTasks.map(task => `- Task ID ${task.id}: ${task.title} (Status: ${task.status})`).join('\n');
        }
  
        // --- 3. Format History & Construct Gemini 'contents' Array ---
        // System instructions and context combined
        const systemInstructions = `${personality.prompts.chat.system}
  You are having a conversation. Acknowledge if the user mentions completing OR starting a task.
  
  ${questContext ? questContext + '\n' : ''}
  ${tasksContext ? tasksContext + '\n' : ''}`;
  
        // Map local history to Gemini's Content format
        const chatHistoryForGemini: Content[] = currentMessages.map(msg => ({
          // Gemini uses 'model' for the assistant's role
          role: msg.is_user ? "user" : "model",
          parts: [{ text: msg.message }]
        }));
  
        // Construct the final 'contents' array for the API call
        const contents: Content[] = [
            // You can try putting system instructions here,
            // but often it's better mixed into the first turn or user message if no specific system role support.
            { role: "model", parts: [{ text: systemInstructions }] }, // Simulating system instructions
            ...chatHistoryForGemini, // Add the actual history
            { role: "user", parts: [{ text: message }] } // Add the current user message
        ];
  
        // --- 4. Define Concurrent Promises ---
        console.log('[ChatAgent] Starting concurrent Gemini Flash: Status Change Check + Main Response');
  
        // Promise A: Task Status Change Detection
        const statusChangePromise = this.suggestionAgent.detectTaskStatusChangeIntent(message, userId, initialActiveTasks)
            .catch(err => {
                console.error("[ChatAgent] Error during concurrent status change detection:", err);
                return null;
            });
  
        // Promise B: Main Chat Response Generation (using Gemini Flash with 'contents')
        const responsePromise = this.mainResponseModel.generateContent({
            contents: contents, // Pass the structured history
            // generationConfig: { temperature: 0.7 }, // Can override config here
            safetySettings: this.safetySettings // Pass safety settings
        }).catch(err => {
            console.error("[ChatAgent] Error during concurrent main response generation (Gemini):", err);
            return null;
        });
  
        // --- 5. Run Concurrently ---
        const [statusResult, respResult] = await Promise.all([
            statusChangePromise,
            responsePromise
        ]);
  
        statusChangeResult = statusResult;
        mainGenResult = respResult;
  
        // --- 6. Process Results ---
  
        // Handle DB update based on the status change check result (async background)
        if (statusChangeResult?.isStatusChangeDetected && statusChangeResult.existingTaskId && statusChangeResult.newStatus) {
            const taskId = statusChangeResult.existingTaskId;
            const newStatus = statusChangeResult.newStatus;
            console.log(`[ChatAgent] Post-concurrent: Status change to '${newStatus}' detected for Task ${taskId}. Triggering background update...`);
            updateTask(taskId, { status: newStatus }, userId) // Fire and forget
                .then(() => console.log(`[ChatAgent] Background '${newStatus}' update SUCCESS for Task ${taskId}.`))
                .catch(updateError => console.error(`[ChatAgent] Background '${newStatus}' update FAILED for Task ${taskId}:`, updateError));
        } else {
            console.log(`[ChatAgent] Post-concurrent: No high-confidence status change detected for DB update.`);
        }
  
        // Process the main AI response from Gemini
        let responseText = "Main chat response generation failed.";
        let blockReason = null;
        if (!mainGenResult) {
            console.error("[ChatAgent] Main chat response generation failed (Gemini).");
            responseText = "Main chat response generation failed";
        }
        else {
            try {
               if (mainGenResult.response.promptFeedback?.blockReason) {
                   blockReason = mainGenResult.response.promptFeedback.blockReason;
                   console.warn(`[ChatAgent] Gemini response blocked due to safety settings: ${blockReason}`);
                   responseText = "I can't respond to that specific request due to safety guidelines. Let's talk about something else.";
               }
               // Ensure response and candidates exist before accessing text
               else if (mainGenResult.response?.candidates?.length > 0 && mainGenResult.response.candidates[0].content?.parts?.length > 0) {
                   responseText = mainGenResult.response.candidates[0].content.parts[0].text || "Seems I lost my train of thought.";
               } else {
                   // Fallback if structure is unexpected
                   responseText = mainGenResult.response?.text() || "Got an unusual response structure.";
               }
            } catch (e) {
               console.error("[ChatAgent] Error extracting text from Gemini response:", e);
               responseText = "I generated a response, but had trouble reading it back. Weird.";
            }
        }
        console.log('Received AI response (Gemini Flash, post-concurrent):', responseText);
  
        // Return the AI's response directly
        const cleanedResponse = responseText.replace(/^["'](.*)["']$/, '$1');
        const splitMessages = cleanedResponse.split(/\n+/).map(msg => msg.trim()).filter(msg => msg.length > 0);
  
        console.log('Final split messages (Gemini):', splitMessages);
        return splitMessages;
  
      } catch (error) {
        console.error('Error in generateChatResponse (Concurrent Flash w/ History):', error);
        return ["A critical system error occurred."];
      }
    } // End of generateChatResponse

  // --------- summarizeAndStoreSession ---------
  async summarizeAndStoreSession(messages: ChatMessage[]): Promise<string> {
    const userId = messages[0]?.user_id;
    if (!userId) {
      throw new Error('No user_id found in messages');
    }

    try {
      if (!messages || messages.length === 0) {
        throw new Error('No messages to store');
      }
      if (messages.some(msg => msg.user_id !== userId)) {
         throw new Error('Session contains messages from multiple users');
      }

      console.log('\n=== ChatAgent.summarizeAndStoreSession ===');

      // Simplified Summary & Tags (Keep existing logic)
      const messageCount = messages.length;
      const timestamp = new Date().toLocaleString();
      const summary = `Chat session with ${messageCount} messages on ${timestamp}`;
      const userMessages = messages.filter(m => m.is_user).map(m => m.message).join(' ');
      const commonWords = ['the','is','in','it','and','to','a','of','I','you','that','for','was','my','on','with','me','do','be','at','this','have','from','or','by','what','go','can'];
      const potentialTags = userMessages.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.includes(word))
        .filter((word, i, arr) => arr.indexOf(word) === i)
        .slice(0, 5);

      // Create session in database
      const sessionData = await createChatSession(summary, potentialTags, userId);

      // Update all messages with the session ID
      const validMessageIds = messages.map(m => m.id).filter(id => typeof id === 'number' && id > 0);
      if (validMessageIds.length > 0) {
          await updateMessagesWithSessionId(validMessageIds, sessionData.id, userId);
      } else {
          console.warn("[ChatAgent] No valid message IDs found to update with session ID.");
      }

      // Trigger suggestion analysis AFTER session is stored
      await this.generateSuggestionsFromChatSession(messages, userId);

      return sessionData.id;

    } catch (error) {
      console.error('Error in storeSession:', error);
      throw error;
    }
    // Removed finally block with performanceLogger
  }

  // --------- generateSuggestionsFromChatSession ---------
  private async generateSuggestionsFromChatSession(messages: ChatMessage[], userId: string): Promise<void> {
    if (!messages || messages.length === 0 || !userId) {
      console.log('[ChatAgent] No messages or user ID, skipping suggestion generation.');
      return;
    }

    console.log(`\n=== ChatAgent.generateSuggestionsFromChatSession ===`);
    console.log(`Triggering analysis for ${messages.length} messages for user ${userId}`);

    try {
      // Format messages into ConversationData structure
      const conversationData: ConversationData = {
        messages: messages.map(msg => ({
          role: msg.is_user ? "user" as const : "assistant" as const,
          content: msg.message,
          timestamp: msg.created_at
        })),
        metadata: {
          startTime: messages[0]?.created_at || new Date().toISOString(),
          endTime: messages[messages.length - 1]?.created_at || new Date().toISOString(),
          totalMessages: messages.length
        }
      };

      // Use the singleton instance of SuggestionAgent
      await this.suggestionAgent.analyzeConversation(conversationData, userId);

      console.log(`✅ [ChatAgent] Finished triggering suggestion analysis for session.`);

    } catch (error) {
      console.error('❌ Error during generateSuggestionsFromChatSession:', error);
      // Log error but don't throw
    }
    // Removed finally block with performanceLogger
  }
} // End of ChatAgent class