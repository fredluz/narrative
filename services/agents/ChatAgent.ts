// File: services/agents/ChatAgent.ts
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletion } from 'openai/resources/chat/completions';
import { QuestAgent } from './QuestAgent';
import { SuggestionAgent, ConversationData, TaskStatusChangeResult } from './SuggestionAgent';
import * as chatDataUtils from '@/hooks/useChatData';
import { PersonalityType, getPersonality } from './PersonalityPrompts';
import { personalityService } from '../personalityService';
import { updateTask, fetchActiveTasks } from '../tasksService';
// <<< FIX: Use named import for the journalService object
import { journalService } from '../journalService';
// <<< FIX: Also import interfaces needed
import { JournalEntry, CheckupEntry } from '../journalService';
import { ChatMessage, Quest, Task } from '@/app/types';

// Helper function to format date
const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};


export class ChatAgent {
  // --------- Properties ---------
  private openai: OpenAI;
  private questAgent: QuestAgent;
  private suggestionAgent: SuggestionAgent;

  // --------- Constructor ---------
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
      dangerouslyAllowBrowser: true
    });
    this.questAgent = new QuestAgent();
    this.suggestionAgent = SuggestionAgent.getInstance();

    console.log("🤖 [ChatAgent] Initialized with DeepSeek for main responses.");
    console.log("🤖 [ChatAgent] SuggestionAgent configured (assumed Gemini for status checks/suggestions).");
  }

  // --------- generateChatResponse ---------
  async generateChatResponse(message: string, userId: string): Promise<string[]> {
    let statusChangeResult: TaskStatusChangeResult | null = null;
    let deepseekResponse: ChatCompletion | null = null;

    try {
        if (!userId) { throw new Error('User ID required'); }
        console.log('\n=== ChatAgent.generateChatResponse ===');

        // --- 1. Fetch Initial Context (Concurrent) ---
        const today = new Date();
        const todayStr = formatDate(today); // Helper function assumed to return 'YYYY-MM-DD'

        // Define promises for fetching data concurrently
        const activeTasksPromise = fetchActiveTasks(userId);
        const personalityTypePromise = personalityService.getUserPersonality(userId);
        const relevantQuestsPromise = this.questAgent.findRelevantQuests(message, userId);
        const historyPromise = (async (): Promise<ChatMessage[]> => {
            // Fetch chat history (e.g., from local storage)
            try {
                const storedMessages = localStorage.getItem(`chat_messages_local_${userId}`);
                if (storedMessages) {
                    // Basic validation could be added here if needed
                    return JSON.parse(storedMessages) as ChatMessage[];
                }
            } catch (e) {
                console.error("[ChatAgent] Error reading chat history from localStorage:", e);
            }
            return []; // Return empty array if fetch fails or no history
        })();

        // Fetch today's checkups using journalService
        const checkupsPromise = journalService.getCheckupEntries(todayStr, userId)
           .catch((err: any) => {
              console.error("[ChatAgent] Error fetching today's checkups:", err);
              return [] as CheckupEntry[]; // Return typed empty array on error
           });

        // Fetch recent daily journal summaries using journalService
        const recentEntriesPromise = journalService.getRecentEntries(2, userId) // Limit to 2 entries
           .catch((err: any) => {
              console.error("[ChatAgent] Error fetching recent journal entries:", err);
              return [] as JournalEntry[]; // Return typed empty array on error
           });

        // Await all concurrent fetches
        const [
            activeTasks,
            personalityType,
            relevantQuests,
            currentMessages,     // History (ChatMessage[])
            todaysCheckups,      // Today's Checkups (CheckupEntry[])
            recentEntries        // Recent Daily Summaries (JournalEntry[])
        ] = await Promise.all([
            activeTasksPromise,
            personalityTypePromise,
            relevantQuestsPromise,
            historyPromise,
            checkupsPromise,
            recentEntriesPromise
        ]);

        // Get personality based on fetched type
        const personality = getPersonality(personalityType);

        // Log the counts of fetched items for debugging
        console.log(`Fetched context: ${relevantQuests.length} quests, ${activeTasks.length} tasks, ${currentMessages.length} history, ${todaysCheckups.length} checkups, ${recentEntries.length} summaries.`);


        // --- 2. Build Prompt Context Parts ---

        // Build context string for relevant quests and their tasks
        let questContext = '';
        if (relevantQuests.length > 0) {
            questContext = '\nRELEVANT QUEST AND TASK DETAILS:\n' + relevantQuests.map((quest: Quest) => {
                let questInfo = `\nQuest: ${quest.title} (Status: ${quest.status || 'Unknown'})\n`;
                questInfo += `Description: ${quest.description || 'No description available'}\n`;

                // Add specifically relevant tasks mentioned in the quest context
                if (quest.relevantTasks && quest.relevantTasks.length > 0) {
                    questInfo += 'Relevant Tasks Mentioned:\n';
                    // Assuming Task type is correct, use 'any' as fallback if structure varies
                    quest.relevantTasks.forEach((task: Task | any) => {
                        questInfo += `- ${task.name} (Desc: ${task.description || 'N/A'}, Why Relevant: ${task.relevance})\n`;
                    });
                }

                // Add other tasks related to the quest for broader context
                const otherTasks = quest.tasks?.filter((task: Task) =>
                    !quest.relevantTasks?.some(rt => rt.taskId === task.id)
                );
                if (otherTasks && otherTasks.length > 0) {
                    questInfo += 'Other Related Tasks:\n';
                    otherTasks.forEach((task: Task) => {
                        questInfo += `- ${task.title} (${task.status})\n`;
                    });
                }

                // Add the reason why the quest itself is relevant
                if (quest.relevance) {
                    questInfo += `\nRelevance to Current Conversation: ${quest.relevance}\n`;
                }
                return questInfo;
             }).join('\n---\n'); // Separator between quests
        }

        // Build context string for currently active tasks
        let tasksContext = '';
        if (activeTasks.length > 0) {
            tasksContext = '\nACTIVE / CURRENT TASKS (User is working on these):\n' + activeTasks.map((task: Task) => {
                let taskInfo = `- ${task.title} (ID: ${task.id}, Status: ${task.status})\n`;
                if (task.description) {
                    taskInfo += `  Description: ${task.description}\n`;
                }
                // Include associated quest if available
                if (task.quest?.title) {
                    taskInfo += `  Part of Quest: ${task.quest.title}\n`;
                }
                return taskInfo;
            }).join(''); // Join task info lines
        }

        // Build context string for today's checkup entries
        let checkupContext = '';
        if (todaysCheckups && todaysCheckups.length > 0) {
            checkupContext = todaysCheckups.map((checkup: CheckupEntry) => {
                // Format time HH:MM
                const time = new Date(checkup.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                return `[${time}] Checkup: "${checkup.content || ''}"\n[${time}] My Response: "${checkup.ai_checkup_response || 'No response recorded'}"`;
            }).join('\n\n'); // Separate checkups with double newline
        } else {
             console.log("[ChatAgent] No checkup entries found for today's context.");
        }

        // Build context string for recent daily journal summaries
        let journalContext = '';
        if (recentEntries && recentEntries.length > 0) {
            journalContext = recentEntries
                // Optional: Ensure entries belong to the user (should be handled by service ideally)
                .filter((entry: JournalEntry) => entry.user_id === userId)
                .map((entry: JournalEntry) => {
                    // Format date like 'Jan 1'
                    const entryDate = new Date(entry.updated_at || entry.created_at); // Use updated_at if available
                    const formattedDate = entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    // Use user_entry and ai_response from JournalEntry
                    return `[${formattedDate}] Past Daily Summary: "${entry.user_entry || ''}"\n[${formattedDate}] My Response: "${entry.ai_response || 'No response recorded'}"`;
                }).join('\n\n'); // Separate summaries with double newline
        } else {
            console.log("[ChatAgent] No recent journal entries found for context.");
        }
        // --- 3. Format History & Messages ---
        // ... (Mapping currentMessages to chatMessages remains the same) ...
         const chatMessages: ChatCompletionMessageParam[] = currentMessages?.map((msg: ChatMessage): ChatCompletionMessageParam => ({
            role: msg.is_user ? 'user' : 'assistant',
            content: msg.message
        })) || [];

        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: personality.prompts.chat.system + `\nQuests: ${questContext || 'None'}\nTasks: ${tasksContext || 'None'}\nJournal: ${journalContext || 'None'}\nCheckups: ${checkupContext || 'None'}` },
            ...chatMessages,
            { role: "user", content: message }
        ];


                // --- 4. Define Concurrent Promises ---
                console.log('[ChatAgent] Starting concurrent: Task Status Change Check (Assumed Gemini) + Main Response (DeepSeek)'); // Added log for clarity

                const statusChangePromise = this.suggestionAgent.detectTaskStatusChangeIntent(message, userId, activeTasks)
                    .catch((err: any) => {
                        // <<< FIX: Added error logging back
                        console.error("[ChatAgent] Error during concurrent status change detection:", err);
                        return null; // Ensure null is returned on error
                    });
        
                console.log('\n=== SENDING TO DEEPSEEK LLM ==='); // Added log for clarity
                console.log(`FULL PROMPT:\n${JSON.stringify(messages)}`); // Added log for clarity
                const responsePromise = this.openai.chat.completions.create({
                    model: "deepseek-chat",
                    messages: messages,
                    // <<< FIX: Added temperature and max_tokens back
                    temperature: 0.6,
                    max_tokens: 420
                }).catch((err: any) => {
                    // <<< FIX: Added error logging back
                    console.error("[ChatAgent] Error during concurrent main response generation (DeepSeek):", err);
                    return null; // Ensure null is returned on error
                });

        // --- 5. Run Concurrently ---
        // ... (Promise.all remains the same) ...
        const [statusResult, dsResponse] = await Promise.all([ statusChangePromise, responsePromise ]);
        statusChangeResult = statusResult;
        deepseekResponse = dsResponse;

        // --- 6. Process Results ---
        if (statusChangeResult?.isStatusChangeDetected && statusChangeResult.existingTaskId && statusChangeResult.newStatus) {
          console.log(`Triggering task update: ${statusChangeResult.existingTaskId} to ${statusChangeResult.newStatus}`);
          // <<< Make sure actual update logic is here
          updateTask(statusChangeResult.existingTaskId, { status: statusChangeResult.newStatus }, userId)
            .catch(updateError => console.error(`Task update FAILED for ${statusChangeResult?.existingTaskId}:`, updateError));
      }

      let responseText = "Apologies, encountered an issue generating a response.";
      if (deepseekResponse) {
           // <<< Make sure actual response processing is here
          responseText = deepseekResponse.choices?.[0]?.message?.content || "Received empty response content.";
          console.log('AI response received (DeepSeek).');
      } else {
           // <<< Make sure actual error handling is here
           console.error("[ChatAgent] Main chat response generation failed (DeepSeek response is null).");
           responseText = "Damn netrunners must be messing with our connection. Try again in a bit.";
      }

       // <<< Make sure actual cleanup/splitting logic is here
      const cleanedResponse = responseText.replace(/^["'](.*)["']$/, '$1');
      const splitMessages = cleanedResponse.split(/\n+/).map(msg => msg.trim()).filter(msg => msg.length > 0);
      console.log('Final split messages:', splitMessages.length);
      return splitMessages.length > 0 ? splitMessages : [responseText]; // Ensure always return array


  } catch (error) {
      console.error('Critical Error in generateChatResponse:', error);
      return ["A critical system error occurred."];
  }
}






  // --- summarizeAndStoreSession ---
  async summarizeAndStoreSession(messages: ChatMessage[]): Promise<string> {
    const userId = messages[0]?.user_id;
    if (!userId) { throw new Error('User ID is required to store session'); }
    let sessionData: { id: string } | null = null; // To store session ID
    let summary: string = ''; // To store summary for checkup
    let potentialTags: string[] = []; // To store tags for checkup

    try {
      if (!messages || messages.length === 0) { throw new Error('No messages to store'); }
      if (messages.some(msg => msg.user_id !== userId)) { throw new Error('Session contains messages from multiple users'); }

      console.log('\n=== ChatAgent.summarizeAndStoreSession ===');
      console.log(`Processing ${messages.length} messages for user ${userId}`);

      // Calculate summary and tags (needed for both session and checkup)
      const messageCount = messages.length;
      const timestamp = new Date().toLocaleString();
      summary = `Chat session summary (${timestamp}): ${messages.filter(m => m.is_user).map(m => m.message).join('; ')}`.substring(0, 500); // Example summary, limit length
      const userMessages = messages.filter(m => m.is_user).map(m => m.message).join(' ');
      const commonWords = ['the','is','in','it','and','to','a','of','I','you','that','for','was','my','on','with','me','do','be','at','this','have','from','or','by','what','go','can'];
      potentialTags = userMessages.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.includes(word))
        .filter((word, i, arr) => arr.indexOf(word) === i)
        .slice(0, 5);

      // 1. Create Chat Session Metadata
      sessionData = await chatDataUtils.createChatSession(summary, potentialTags, userId);
      console.log(`[ChatAgent] Created chat session with ID: ${sessionData.id}`);

      // 2. Link Messages to Session ID
      const validMessageIds = messages.map(m => m.id).filter((id): id is number => typeof id === 'number' && id > 0);
      if (validMessageIds.length > 0) {
         await chatDataUtils.updateMessagesWithSessionId(validMessageIds, sessionData.id, userId);
      }

      // <<< 3. CREATE CHECKUP ENTRY >>>
      try {
         const dateStr = formatDate(new Date()); // Use today's date for the checkup
         console.log(`[ChatAgent] Creating automatic checkup entry from chat session summary for date ${dateStr}...`);
         // Use the calculated summary and tags. Let journalService handle AI response generation.
         const savedCheckup = await journalService.saveCheckupEntry(dateStr, summary, userId, potentialTags);
         console.log(`[ChatAgent] Successfully created checkup entry ID: ${savedCheckup.id}`);
      } catch (checkupError) {
          // Log the error but DO NOT throw - session saving already succeeded.
          console.error('[ChatAgent] Failed to automatically create checkup entry from chat session:', checkupError);
      }

      // 4. Trigger Suggestion Analysis (Optional: Could be moved after checkup creation)
      console.log(`[ChatAgent] Triggering post-session suggestion analysis for session ${sessionData.id}`);
      // Keep as fire-and-forget unless subsequent steps depend on it
      this.generateSuggestionsFromChatSession(messages, userId)
          .catch(suggestionError => { console.error(`[ChatAgent] Error triggering suggestion analysis:`, suggestionError); });

      // Return the session ID
      return sessionData.id;

    } catch (error) {
       console.error('Error in summarizeAndStoreSession:', error);
       // If session creation itself failed, sessionData might be null
       if (sessionData?.id) {
           console.warn(`[ChatAgent] Session ${sessionData.id} created, but subsequent error occurred.`);
           // Decide if you still want to return the ID or throw
           // return sessionData.id; // Option: Return ID even if checkup/suggestion fails
       }
       throw error; // Re-throw the original error
    }
  }
// --- generateSuggestionsFromChatSession ---
private async generateSuggestionsFromChatSession(messages: ChatMessage[], userId: string): Promise<void> {
  if (!messages || messages.length === 0 || !userId) { return; }
  try {
      const conversationData: ConversationData = {
        messages: messages.map((msg) => ({
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
      await this.suggestionAgent.analyzeConversation(conversationData, userId);
  } catch (error: any) { console.error('Error in suggestion generation:', error); }
}

} // End of ChatAgent class
