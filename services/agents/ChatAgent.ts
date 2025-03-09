import OpenAI from 'openai';
import { ChatMessage, JournalEntry, ChatSession } from '@/app/types';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { journalService } from '../journalService';
import { QuestAgent } from './QuestAgent';
import { performanceLogger } from '@/utils/performanceLogger';
// Remove supabase import and add new imports from useChatData
import { 
  getCurrentMessagesFromDB, 
  getRecentJournalEntries, 
  createChatSession,
  updateMessagesWithSessionId
} from '@/hooks/useChatData';

export class ChatAgent {
  private openai: OpenAI;
  private questAgent: QuestAgent;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
      dangerouslyAllowBrowser: true
    });
    this.questAgent = new QuestAgent();
  }

  // Add this method to generate responses using the JournalAgent's method
  async generateResponse(content: string, previousCheckupsContext?: string, userId?: string): Promise<string> {
    performanceLogger.startOperation('generateResponse');
    console.log('🚀 ChatAgent.generateResponse called for checkup content');
    
    try {
      // Replace validateUserId with direct check and guard clause
      if (!userId) {
        console.error('User ID is required for generateResponse');
        return "I need to know who you are to respond properly. Authentication issue.";
      }
      
      // Use journalService to generate a response, which will in turn use JournalAgent
      const response = await journalService.generateResponse(content, userId);
      console.log('📥 Generated response for checkup content:', response.substring(0, 100) + '...');
      return response;
    } catch (error) {
      console.error('❌ Error in ChatAgent.generateResponse:', error);
      return "Seems like my neural circuits are fried. Can't come up with anything clever right now.";
    } finally {
      performanceLogger.endOperation('generateResponse');
    }
  }

  async generateChatResponse(message: string, userId: string): Promise<string[]> { // Changed return type to string[]
    performanceLogger.startOperation('generateChatResponse');
    try {
      if (!userId) {
        console.error('User ID is required for generateChatResponse');
        return ["Authentication required. Please log in."];
      }

      console.log('\n=== ChatAgent.generateChatResponse ===');
      console.log('Current message:', message);
      
      // Replace direct SQL call with function from useChatData
      performanceLogger.startOperation('fetchCurrentMessages');
      let currentMessages;
      try {
        currentMessages = await getCurrentMessagesFromDB(userId);
      } catch (currentError) {
        console.error('Error fetching chat messages:', currentError);
        throw currentError;
      }
      performanceLogger.endOperation('fetchCurrentMessages');
        
      // First check for relevant quests based on the message
      console.log('Checking for relevant quests');
      performanceLogger.startOperation('findRelevantQuests');
      const relevantQuests = await this.questAgent.findRelevantQuests(message, userId);
      performanceLogger.endOperation('findRelevantQuests');
      console.log('Found relevant quests:', relevantQuests.map(q => q.title));

      // Get today's checkups first
      const today = new Date().toISOString().split('T')[0];
      console.log('Fetching today\'s checkups');
      performanceLogger.startOperation('fetchCheckups');
      const todaysCheckups = await journalService.getCheckupEntries(today, userId);
      performanceLogger.endOperation('fetchCheckups');
      console.log('Found', todaysCheckups.length, 'checkups from today');
      
      // Format quest context 
      performanceLogger.startOperation('buildContext');
      let questContext = '';
      if (relevantQuests.length > 0) {
        questContext = '\nRELEVANT QUEST AND TASK DETAILS:\n' + relevantQuests.map(quest => {
          let questInfo = `\nQuest: ${quest.title}\n`;
          questInfo += `Description: ${quest.description || 'No description available'}\n`;
          questInfo += `Current Status: ${quest.status || 'Unknown'}\n`;
          
          if (quest.relevantTasks && quest.relevantTasks.length > 0) {
            questInfo += '\nRelevant Tasks:\n';
            quest.relevantTasks.forEach(task => {
              questInfo += `- ${task.name}\n`;
              questInfo += `  Description: ${task.description}\n`;
              questInfo += `  Why Relevant: ${task.relevance}\n`;
            });
          }
          
          if (quest.relevance) {
            questInfo += `\nRelevance: ${quest.relevance}\n`;
          }
          return questInfo;
        }).join('\n---\n');
      }

      // Format today's checkups with responses as additional context
      let checkupContext = '';
      if (todaysCheckups && todaysCheckups.length > 0) {
        checkupContext = todaysCheckups.map(checkup => {
          const time = new Date(checkup.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          });
          return `[${time}] Checkup: "${checkup.content}"\n[${time}] My Response: "${checkup.ai_checkup_response || 'No response recorded'}"`;
        }).join('\n\n');
      }

      // Replace direct SQL call with function from useChatData
      let recentEntries;
      try {
        recentEntries = await getRecentJournalEntries(userId, 2);
      } catch (journalError) {
        console.error('Error fetching journal entries:', journalError);
        throw journalError;
      }
      
      // Format journal context
      let journalContext = '';
      if (recentEntries && recentEntries.length > 0) {
        journalContext = recentEntries
          .filter(entry => entry.user_id === userId)
          .map(entry => 
          `Journal Entry: "${entry.user_entry}"\nMy Response: "${entry.ai_response}"`
        ).join('\n\n');
      }

      // Format messages for chat history
      const chatMessages = currentMessages?.map(msg => ({
        role: msg.is_user ? ("user" as const) : ("assistant" as const),
        content: msg.message
      })) || [];
      performanceLogger.endOperation('buildContext');

      // Build the final messages array
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are Johnny Silverhand from Cyberpunk 2077, now living in the user's head. You're a sarcastic, anti-corporate rebel with a grudge against the system. You're abrasive and often an asshole, but you genuinely care about the user underneath your hard exterior.
Now, you're responding to a text message the user sent you on their phone. Reply to their text as if you are also texting on your phone.
Remember:
- Mix sarcasm with genuine concern
- Keep responses SHORT and punchy - one thought per line
- Each line will be sent as a separate text message, so keep them brief
- Don't use more than 2-3 separate messages in total
- Wait for the user's responses instead of addressing every topic at once
- Push back against corporate thinking
- Use late-millenial/early-zoomer slang and abbreviations
- NO emojis (extremely rare exceptions)
- Each line should be a complete thought on its own

 GENTLE VS STERN:
- Even though Johnny is an abrasive asshole, he genuinely respects and trusts the user
- Even if Johnny feels the need to light a fire under the user's ass, he waits for a good opportunity
- He avoids pressuring the user when it's not the most optimal moment
- When he feels the time is right, after a few messages, Johnny will start pushing the user just a little bit
- Eventually he gets to a point where he decides to *provoke*, not coddle
- He won't wait forever.


Background context from possibly relevant quests and tasks(only if relevant to current conversation):
${questContext ? '\n' + questContext + '\n' : ''}
Background context from recent journal entries (use this sparingly, only when relevant to current conversation):
${journalContext}
Additional background context from today's checkups (use this sparingly, only if relevant):
${checkupContext}
CONVERSATION CONTEXT:
- You're in the middle of a text conversation with the user
- Your response will be split at each line break and sent as separate messages
- Keep each line under 160 characters ideally
- Wait for the user's response instead of addressing every topic at once
- Reference and build upon what's already been discussed in this chat session
- Acknowledge relevant quests and tasks when appropriate`
        }
      ];
      
      if (chatMessages.length > 0) {
        messages.push(...chatMessages);
      }
      messages.push({ role: "user", content: message });

      console.log('\n=== SENDING TO LLM ===');
      console.log('Full prompt data:', messages);
      
      // Get response from OpenAI with enhanced context
      performanceLogger.startOperation('aiResponse');
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: messages,
        temperature: 0.7,
        max_tokens: 400
      });
      performanceLogger.endOperation('aiResponse');

      // Get the response content and remove surrounding quotes if they exist
      performanceLogger.startOperation('processResponse');
      const responseText = response.choices[0].message?.content || "Listen up, got nothing to say right now. Come back when you've got something interesting.";
      console.log('Received AI response:', responseText);
      
      // Split response into separate messages by line breaks
      const cleanedResponse = responseText.replace(/^["'](.*)["']$/, '$1');
      const splitMessages = cleanedResponse
        .split(/\n+/) // Split on one or more newlines
        .map(msg => msg.trim())
        .filter(msg => msg.length > 0);
      performanceLogger.endOperation('processResponse');

      console.log('Split into messages:', splitMessages);
      
      return splitMessages;
    } catch (error) {
      console.error('Error in generateChatResponse:', error);
      return ["Damn netrunners must be messing with our connection. Try again in a bit."];
    } finally {
      performanceLogger.endOperation('generateChatResponse');
    }
  }

  async summarizeAndStoreSession(messages: ChatMessage[]): Promise<string> {
    performanceLogger.startOperation('summarizeAndStoreSession');
    try {
      if (!messages || messages.length === 0) {
        throw new Error('No messages to summarize');
      }

      // Get the user_id from the first message (all messages should have the same user_id)
      const userId = messages[0].user_id;
      if (!userId) {
        throw new Error('No user_id found in messages');
      }

      // Verify all messages belong to the same user
      const invalidMessages = messages.filter(msg => msg.user_id !== userId);
      if (invalidMessages.length > 0) {
        throw new Error('Session contains messages from multiple users');
      }

      console.log('\n=== ChatAgent.summarizeAndStoreSession ===');
      console.log('Messages to summarize:', messages.map(m => ({
        role: m.is_user ? 'user' : 'assistant',
        content: m.message
      })));

      performanceLogger.startOperation('buildSummaryPrompt');
      const chatHistory = messages.map(msg => 
        `${msg.is_user ? "User" : "Johnny"}: ${msg.message}`
      ).join('\n');

      const summarizationPrompt = `You are Johnny Silverhand summarizing a chat conversation you just had with guy who's head you live in. 
      You need to:
      1. Write a summary of the key points discussed. Keep it brief but capture the key points and any decisions or insights that came up.
      2. Generate 4-8 tags that categorize this conversation.
      Write in first person as Johnny, addressing what you and the guy discussed.
      Format your response EXACTLY like this:
      SUMMARY: (your summary here)
      TAGS: tag1, tag2, tag3, tag4`;
      performanceLogger.endOperation('buildSummaryPrompt');

      console.log('\n=== LLM PROMPT DATA ===');
      console.log('System prompt:', summarizationPrompt);
      console.log('Chat history:', chatHistory);

      performanceLogger.startOperation('aiSummarization');
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: summarizationPrompt
          },
          {
            role: "user",
            content: `Here's our conversation:\n${chatHistory}\n\nSummarize our chat and suggest relevant tags.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
      performanceLogger.endOperation('aiSummarization');

      const responseText = response.choices[0].message?.content || "Had a chat with the user but nothing worth noting.";
      
      performanceLogger.startOperation('parseSummaryResponse');
      // Parse the response to separate summary and tags
      const summaryMatch = responseText.match(/SUMMARY:\s*(.*?)(?=\nTAGS:|$)/s);
      const tagsMatch = responseText.match(/TAGS:\s*(.*?)$/s);
      
      const summary = summaryMatch ? summaryMatch[1].trim() : responseText;
      const tags = tagsMatch ? tagsMatch[1].split(',').map(tag => tag.trim()) : [];
      performanceLogger.endOperation('parseSummaryResponse');

      performanceLogger.startOperation('dbOperations');
      // Replace direct SQL calls with functions from useChatData
      let sessionData;
      try {
        sessionData = await createChatSession(summary, tags, userId);
      } catch (sessionError) {
        throw sessionError;
      }

      // Update all messages with the session ID
      try {
        await updateMessagesWithSessionId(messages.map(m => m.id), sessionData.id, userId);
      } catch (updateError) {
        throw updateError;
      }
      performanceLogger.endOperation('dbOperations');

      // Create a checkup entry based on this chat session
      performanceLogger.startOperation('createCheckup');
      await this.createCheckupEntryFromSession(
        messages.filter(m => m.user_id === userId), // Extra safety: only include user's messages
        summary,
        tags
      );
      performanceLogger.endOperation('createCheckup');

      return sessionData.id;
    } catch (error) {
      console.error('Error in summarizeAndStoreSession:', error);
      throw error;
    } finally {
      performanceLogger.endOperation('summarizeAndStoreSession');
    }
  }

  // Updated method to create a checkup entry from a completed chat session
  async createCheckupEntryFromSession(messages: ChatMessage[], summary: string, tags: string[]): Promise<void> {
    performanceLogger.startOperation('createCheckupEntryFromSession');
    try {
      console.log('🔄 Creating checkup entry from chat session');
      
      // Get the user_id from the first message
      const userId = messages[0]?.user_id;
      if (!userId) {
        throw new Error('No user_id found in messages');
      }
      
      // Step 1: Generate content for the checkup entry (user's perspective)
      performanceLogger.startOperation('generateCheckupContent');
      const checkupContent = await this.generateCheckupContent(messages, summary);
      performanceLogger.endOperation('generateCheckupContent');
      
      // Get today's date in YYYY-MM-DD format for the entry
      const today = new Date().toISOString().split('T')[0];
      
      // Step 2: Get today's previous checkups for context when generating the response
      performanceLogger.startOperation('fetchCheckupContext');
      console.log('🔄 Fetching today\'s checkups for context');
      const todaysCheckups = await journalService.getCheckupEntries(today, userId);
      
      // Format previous checkups as context with paired responses
      let previousCheckupsContext = "";
      if (todaysCheckups && todaysCheckups.length > 0) {
        previousCheckupsContext = todaysCheckups
          .map(entry => {
            const time = new Date(entry.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false
            });
            return `[${time}] USER: ${entry.content}\n[${time}] SILVERHAND: ${entry.ai_checkup_response || 'No response recorded'}`;
          })
          .join('\n\n');
      }
      performanceLogger.endOperation('fetchCheckupContext');
      
      // Step 3: Generate Johnny's response to this new checkup content
      performanceLogger.startOperation('generateAIResponse');
      console.log('🤖 Generating AI response for the checkup with context');
      const aiResponse = await this.generateResponse(checkupContent, previousCheckupsContext, userId);
      performanceLogger.endOperation('generateAIResponse');
      
      // Step 4: Save the complete checkup entry with both content and AI response
      performanceLogger.startOperation('saveCheckup');
      console.log('💾 Saving complete checkup entry to database');
      await journalService.saveCheckupEntry(today, checkupContent, userId, tags, aiResponse);
      performanceLogger.endOperation('saveCheckup');
      
      console.log('✅ Successfully created complete checkup entry from chat session');
    } catch (error) {
      console.error('❌ Error creating checkup entry from chat session:', error);
      // Fail gracefully - don't throw, as this is an enhancement, not core functionality
    } finally {
      performanceLogger.endOperation('createCheckupEntryFromSession');
    }
  }

  // Updated method to generate content for the checkup entry with more accurate user voice
  private async generateCheckupContent(messages: ChatMessage[], summary: string): Promise<string> {
    performanceLogger.startOperation('generateCheckupContent');
    try {
      console.log('\n=== ChatAgent.generateCheckupContent ===');
      
      const userMessages = messages.filter(msg => msg.is_user);
      const johnnyMessages = messages.filter(msg => !msg.is_user);
      const userId = messages[0]?.user_id;
      
      if (!userId) {
        throw new Error('No user_id found in messages');
      }

      // Verify all messages are from the same user
      if (messages.some(m => m.user_id !== userId)) {
        throw new Error('Cannot generate checkup content: Messages from multiple users');
      }
      
      const today = new Date().toISOString().split('T')[0];
      performanceLogger.startOperation('fetchTodayCheckups');
      const todaysCheckups = await journalService.getCheckupEntries(today, userId);
      performanceLogger.endOperation('fetchTodayCheckups');
      console.log('Today\'s checkups for style analysis:', todaysCheckups?.map(c => c.content));
      
      // Format previous user entries to help model understand user's style
      performanceLogger.startOperation('prepareContent');
      let userStyleSamplesContent = '';
      if (todaysCheckups && todaysCheckups.length > 0) {
        // Extract only user entries for style analysis
        userStyleSamplesContent = todaysCheckups
          .map(checkup => {
            const entryTime = new Date(checkup.created_at).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            });
            return `[${entryTime}] "${checkup.content}"`;
          })
          .join('\n\n');
      }

      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });

      // Extract only the user's messages and Johnny's responses
      const userMessagesContent = userMessages
        .map(msg => msg.message)
        .join('\n');
      
      const johnnyMessagesContent = johnnyMessages
        .map(msg => msg.message)
        .join('\n');
      performanceLogger.endOperation('prepareContent');
      
      console.log('\n=== SENDING TO LLM ===');
      console.log('System prompt: Creating journal entry from chat');

      
      performanceLogger.startOperation('aiGeneration');
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are creating a journal entry from the perspective of the user who just had a chat conversation with Johnny Silverhand at ${currentTime}.

YOUR TASK: 
Write a short reflective journal entry (1-2 paragraphs) that accurately records what the USER talked about in their chat messages. This must be written in their authentic voice and style.

CRITICAL GUIDELINES:
1. ONLY include topics, thoughts and feelings the user EXPLICITLY mentioned in their messages
2. DO NOT invent any details, decisions, plans, or thoughts that weren't directly expressed by the user
3. DO NOT narrate what Johnny said or his perspective - focus exclusively on the user's side
4. Carefully study the user's writing style from their previous entries to match their tone, vocabulary, and manner of expression
5. The entry should feel like the user wrote it themselves
6. Keep the language, tone and style consistent with the user's other entries
7. Start the entry with "[${currentTime}] " - this exact format is required

IMPORTANT: This is NOT a summary of the conversation - it's a personal journal entry written by the user recording their thoughts from the conversation in their authentic voice.`
          },
          {
            role: "user",
            content: `Here are examples of my previous journal entries today (study these to understand my writing style):
${userStyleSamplesContent}

Here's our chat conversation:
${messages}

Remember to use ONLY my messages to create a summary of what *I*, the user, talked about. Avoid writing down that I said something when it was actually johnny. Here are MY MESSAGES: ${userMessagesContent}

Write a reflective journal entry from my perspective about what I discussed in my messages, matching my writing style from the previous entries.`
          }
        ],
        temperature: 0.7,
        max_tokens: 3000
      });
      performanceLogger.endOperation('aiGeneration');

      performanceLogger.startOperation('processContent');
      const aiContent = response.choices[0].message?.content || 
             `[${currentTime}] Just had a chat with Johnny where I brought up the things that have been on my mind.`;
      
      // Ensure the content starts with the timestamp
      if (!aiContent.startsWith(`[${currentTime}]`)) {
        return `[${currentTime}] ${aiContent}`;
      }
      
      console.log('Received AI-generated journal entry:', aiContent);
      return aiContent;
    } catch (error) {
      console.error('Error generating checkup content:', error);
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      });
      return `[${currentTime}] Had a conversation with Johnny about some things on my mind.`;
    } finally {
      performanceLogger.endOperation('generateCheckupContent');
    }
  }
}