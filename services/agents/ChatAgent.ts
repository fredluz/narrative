// File: services/agents/ChatAgent.ts
import OpenAI from 'openai';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ChatCompletionMessageParam, ChatCompletion } from 'openai/resources/chat/completions';
import { QuestAgent } from './QuestAgent';
import { SuggestionAgent } from './SuggestionAgent';
import { UpdateAgent, TaskStatusChangeResult } from './UpdateAgent';
import * as chatDataUtils from '@/hooks/useChatData';
import { PersonalityType, getPersonality } from './PersonalityPrompts';
import { personalityService } from '../personalityService';
import { updateTask, fetchActiveTasks } from '../tasksService';
// <<< FIX: Use named import for the journalService object
import { journalService } from '../journalService';
// <<< FIX: Also import interfaces needed
import { JournalEntry, CheckupEntry } from '../journalService';
import { ChatMessage, Quest, Task } from '@/app/types';
import { ConversationMessage } from './SuggestionAgent';

// Helper function to format date
const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};


export class ChatAgent {
  // --------- Properties ---------
  private openai: OpenAI;
  private questAgent: QuestAgent;
  private suggestionAgent: SuggestionAgent;
  private updateAgent: UpdateAgent;
  private genAI: GoogleGenerativeAI;

  // --------- Constructor ---------
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
      dangerouslyAllowBrowser: true
    });
    this.questAgent = new QuestAgent();
    this.suggestionAgent = SuggestionAgent.getInstance();
    this.updateAgent = UpdateAgent.getInstance();
    this.genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');

    console.log("🤖 [ChatAgent] Initialized with DeepSeek for main responses.");
    console.log("🤖 [ChatAgent] SuggestionAgent and UpdateAgent configured for suggestions and status updates.");
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
        const todayStr = formatDate(today);

        // Get dates for the last 7 days
        const dates = Array.from({length: 7}, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return formatDate(d);
        });

        // Define promises for fetching data concurrently
        const activeTasksPromise = fetchActiveTasks(userId);
        const personalityTypePromise = personalityService.getUserPersonality(userId);
        const relevantQuestsPromise = this.questAgent.findRelevantQuests(message, userId);
        const historyPromise = (async (): Promise<ChatMessage[]> => {
            try {
                const storedMessages = localStorage.getItem(`chat_messages_local_${userId}`);
                if (storedMessages) {
                    return JSON.parse(storedMessages) as ChatMessage[];
                }
            } catch (e) {
                console.error("[ChatAgent] Error reading chat history from localStorage:", e);
            }
            return [];
        })();

        // Fetch checkups for the last 7 days using journalService
        const checkupsPromises = dates.map(date => 
            journalService.getCheckupEntries(date, userId)
                .catch((err: any) => {
                    console.error(`[ChatAgent] Error fetching checkups for ${date}:`, err);
                    return [] as CheckupEntry[];
                })
        );

        // Await all concurrent fetches
        const [
            activeTasks,
            personalityType,
            relevantQuests,
            currentMessages,
            ...checkupsByDate  // This will be an array of CheckupEntry[] arrays
        ] = await Promise.all([
            activeTasksPromise,
            personalityTypePromise,
            relevantQuestsPromise,
            historyPromise,
            ...checkupsPromises
        ]);

        // Get personality based on fetched type
        const personality = getPersonality(personalityType);

        // Log the counts of fetched items for debugging
        console.log(`Fetched context: ${relevantQuests.length} quests, ${activeTasks.length} tasks, ${currentMessages.length} history, ${checkupsByDate.flat().length} checkups from last 7 days.`);

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

        // Build context string for checkups from last 7 days
        let checkupContext = '';
        const allCheckups = checkupsByDate.flat().sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()  // Changed sort order to ascending
        );

        if (allCheckups.length > 0) {
            checkupContext = '\nRECENT CHECKUPS (Last 7 Days) DON\'T WRITE LIKE THIS, USE ONLY FOR MEMORY CONTEXT:\n' + allCheckups.map((checkup: CheckupEntry) => {
                const checkupDate = new Date(checkup.created_at);
                const formattedDate = checkupDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const time = checkupDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                return `[${formattedDate} ${time}] Entry: "${checkup.content || ''}"\n[${formattedDate} ${time}] Response: "${checkup.ai_checkup_response || 'No response recorded'}"`;
            }).join('\n\n');
        } else {
            console.log("[ChatAgent] No checkup entries found for last 7 days.");
            checkupContext = 'No recent checkups available.';
        }

        // --- 3. Format History & Messages ---
        const chatMessages: ChatCompletionMessageParam[] = currentMessages?.map((msg: ChatMessage): ChatCompletionMessageParam => ({
            role: msg.is_user ? 'user' : 'assistant',
            content: msg.message
        })) || [];

        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: personality.prompts.chat.system + `\nQuests: ${questContext || 'None'}\nTasks: ${tasksContext || 'None'}\nCheckups: ${checkupContext}` },
            ...chatMessages,
            { role: "user", content: message }
        ];


                // --- 4. Define Concurrent Promises ---
                console.log('[ChatAgent] Starting concurrent: Task Status Check (UpdateAgent) + Main Response (DeepSeek)');

                // Use UpdateAgent instead of SuggestionAgent for task status change detection
                const statusChangePromise = this.updateAgent.processCheckupForStatusUpdates(message, userId, activeTasks)
                    .then(() => {
                        // Since processCheckupForStatusUpdates doesn't return a result, we need to handle this differently
                        // For now, just return null since we're handling the update inside the agent
                        return null;
                    })
                    .catch((err: any) => {
                        console.error("[ChatAgent] Error during concurrent status change detection:", err);
                        return null; // Ensure null is returned on error
                    });

                console.log('\n=== SENDING TO DEEPSEEK LLM ===');
                console.log(`FULL PROMPT:\n${JSON.stringify(messages)}`);
                const responsePromise = this.openai.chat.completions.create({
                    model: "deepseek-chat",
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1020
                }).catch((err: any) => {
                    console.error("[ChatAgent] Error during concurrent main response generation (DeepSeek):", err);
                    return null; // Ensure null is returned on error
                });

        // --- 5. Run Concurrently ---
        const [statusResult, dsResponse] = await Promise.all([ statusChangePromise, responsePromise ]);
        
        // Fix the typing issue - ensure proper casting from potential null
        statusChangeResult = statusResult as TaskStatusChangeResult | null;
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
    const userId = messages[0]?.clerk_id;
    if (!userId) { throw new Error('User ID is required to store session'); }
    let sessionData: { id: string } | null = null; // To store session ID
    let summary: string = ''; // To store summary for checkup
    let potentialTags: string[] = []; // To store tags for checkup

    try {
      if (!messages || messages.length === 0) { throw new Error('No messages to store'); }
      if (messages.some(msg => msg.clerk_id !== userId)) { throw new Error('Session contains messages from multiple users'); }

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

      // 3. CREATE CHECKUP ENTRY
      try {
         const dateStr = formatDate(new Date()); // Use today's date for the checkup
         console.log(`[ChatAgent] Creating automatic checkup entry from chat session summary for date ${dateStr}...`);

         // Generate the checkup content using the new method
         const checkupContent = await this.generateCheckupContent(messages, summary);
         const savedCheckup = await journalService.saveCheckupEntry(dateStr, checkupContent, userId, potentialTags);
         console.log(`[ChatAgent] Successfully created checkup entry ID: ${savedCheckup.id}`);
      } catch (checkupError) {
          // Log the error but DO NOT throw - session saving already succeeded
          console.error('[ChatAgent] Failed to automatically create checkup entry from chat session:', checkupError);
      }

      // 4. Trigger Suggestion Analysis (Optional)
      //      console.log(`[ChatAgent] Triggering post-session suggestion analysis for session ${sessionData.id}`);
      //      this.generateSuggestionsFromChatSession(messages, userId)
      //          .catch(suggestionError => { console.error(`[ChatAgent] Error triggering suggestion analysis:`, suggestionError); });

      return sessionData.id;

    } catch (error) {
       console.error('Error in summarizeAndStoreSession:', error);
       if (sessionData?.id) {
           console.warn(`[ChatAgent] Session ${sessionData.id} created, but subsequent error occurred.`);
       }
       throw error;
    }
  }

  // --------- generateCheckupContent ---------
  private async generateCheckupContent(messages: ChatMessage[], summary: string): Promise<string> {
    console.log('\n=== [ChatAgent] generateCheckupContent ===');
    try {
      const userId = messages[0]?.clerk_id;
      if (!userId) {
        throw new Error('No clerk_id found in messages');
      }
      if (messages.some(m => m.clerk_id !== userId)) {
         throw new Error('Cannot generate checkup content: Messages from multiple users');
      }

      // Get dates for the last 7 days
      const dates = Array.from({length: 7}, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      });

      // Fetch checkups for each date
      const checkupsPromises = dates.map(date => journalService.getCheckupEntries(date, userId));
      const checkupsByDate = await Promise.all(checkupsPromises);
      
      // Flatten and sort all checkups
      const allCheckups = checkupsByDate
        .flat()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log(`[ChatAgent] Found ${allCheckups.length} checkups from last 7 days for style analysis.`);

      let userStyleSamplesContent = '';
      if (allCheckups.length > 0) {
        userStyleSamplesContent = allCheckups
          .map(checkup => {
            const entryDate = new Date(checkup.created_at);
            const dateStr = entryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = entryDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            return `[${dateStr} ${timeStr}] "${checkup.content}"`; // Now includes date and time
          })
          .join('\n\n');
      }

      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

      const userMessagesContent = messages
        .filter(msg => msg.is_user)
        .map(msg => msg.message)
        .join('\n');

      // Get the personality for the prompt context
      const personalityType = await personalityService.getUserPersonality(userId);
      const personality = getPersonality(personalityType);

      const checkupEntrySystem = `You are helping to register the information of the user's chat with ${personality.name}.
Current time is ${currentTime}.
Write from the user's perspective, focusing ONLY ON WHAT THE USER SAID. Make sure to write down tasks and goals, and their timerange (IF SPECIFIED).
Never add anything that isn't explicitly said by the user, even if you *think* it is implied.
Start the entry with "[${currentTime}] ".
Do NOT include information from ${personality.name}'s responses in the summary. Never assume the user agrees with that the AI Agent said.
ONLY WRITE DOWN EXACTLY WHAT THE USER EXPLICITLY SAID.`.trim();

      // Format the full conversation
      const fullConversation = messages.map(msg => {
          const role = msg.is_user ? "Me" : personality.name;
          return `${role}: ${msg.message}`;
      }).join('\n');

      const prompt = `Here are examples of my previous journal entries today (for writing style):
${userStyleSamplesContent || "No previous entries today."}

Here's our FULL chat conversation:
${fullConversation}

Write a reflective journal entry from my perspective about what we discussed, matching my writing style from the examples.
 Don't make shit up, I'll sue you if you put words in my mouth. But make it a nice, well-written journal entry about my conversation with ${personality.name}. Never add anything that isn't explicitly said by me, even if you *think* it is implied (it isn't).
 Start with "[${currentTime}] ".`;

      console.log('Prompt for checkup entry:', checkupEntrySystem, prompt);

      // Using DeepSeek instead of Gemini Flash
      const completion = await this.openai.chat.completions.create({
          model: "deepseek-chat",
          messages: [
              { role: "system", content: checkupEntrySystem },
              { role: "user", content: prompt }
          ],
          temperature: 0.3, // Lower temperature for more consistent output
          max_tokens: 600 // Reasonable length for a journal entry
      });

      const aiContent = completion.choices[0]?.message?.content || `[${currentTime}] Just had a chat with ${personality.name}.`;

      // Final check for timestamp
      const finalContent = aiContent.trim().startsWith(`[${currentTime}]`) ? aiContent.trim() : `[${currentTime}] ${aiContent.trim()}`;
      console.log('[ChatAgent] Generated checkup entry content:', finalContent);
      return finalContent;

    } catch (error) {
      console.error('[ChatAgent] Error generating checkup content:', error);
      const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      const personalityName = getPersonality(await personalityService.getUserPersonality(messages[0]?.clerk_id || 'johnny')).name || 'the AI';
      return `[${currentTime}] Had a conversation with ${personalityName}.`; // Fallback
    }
  }


} // End of ChatAgent class
