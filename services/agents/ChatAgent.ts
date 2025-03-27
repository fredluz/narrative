import OpenAI from 'openai';
import { ChatMessage, JournalEntry, ChatSession, Quest } from '@/app/types';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { QuestAgent } from './QuestAgent';
import { SuggestionAgent, ConversationData } from './SuggestionAgent';
import { performanceLogger } from '@/utils/performanceLogger';
import { 
  getCurrentMessagesFromDB, 
  createChatSession,
  updateMessagesWithSessionId
} from '@/hooks/useChatData';
import { PersonalityType, getPersonality } from './PersonalityPrompts';
import { personalityService } from '../personalityService';
import { eventsService, EVENT_NAMES } from '../eventsService';
import { fetchActiveTasks } from '../tasksService';
import {Task} from '@/app/types';
export class ChatAgent {
  private openai: OpenAI;
  private questAgent: QuestAgent;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com', // updated per docs
      dangerouslyAllowBrowser: true
    });
    this.questAgent = new QuestAgent();
  }
  
  async generateChatResponse(message: string, userId: string): Promise<string[]> { // Changed return type to string[]
    performanceLogger.startOperation('generateChatResponse');
    try {
      if (!userId) {
        console.error('User ID is required for generateChatResponse');
        return ["Authentication required. Please log in."];
      }

      // Get current personality for this call
      const personalityType = await personalityService.getUserPersonality(userId);
      const personality = getPersonality(personalityType);

      console.log('\n=== ChatAgent.generateChatResponse ===');
      console.log('Current message:', message);
      console.log ('Current Personality:', personality.name);
      // Get messages from localStorage instead of DB
      performanceLogger.startOperation('fetchCurrentMessages');
      let currentMessages: ChatMessage[] = [];
      try {
        const storedMessages = localStorage.getItem(`chat_messages_local_${userId}`);
        if (storedMessages) {
          currentMessages = JSON.parse(storedMessages);
        }
      } catch (currentError) {
        console.error('Error fetching chat messages from localStorage:', currentError);
        throw currentError;
      }
      performanceLogger.endOperation('fetchCurrentMessages');
        
      // First check for relevant quests based on the message
      let relevantQuests: Quest[] = [];
      console.log('Checking for relevant quests');
      performanceLogger.startOperation('findRelevantQuests');
      try {
        relevantQuests = await this.questAgent.findRelevantQuests(message, userId);
        console.log('Found relevant quests:', relevantQuests.map(q => q.title));
      } catch (error) {
        console.error('Error finding relevant quests:', error);
        relevantQuests = [];
      } finally {
        performanceLogger.endOperation('findRelevantQuests');
      }

      // Get active tasks alongside quests
      let activeTasks: Task[] = [];
      console.log('Fetching active tasks');
      performanceLogger.startOperation('fetchActiveTasks');
      try {
        activeTasks = await fetchActiveTasks(userId);
        console.log('Found active tasks:', activeTasks.length);
      } catch (error) {
        console.error('Error fetching active tasks:', error);
        activeTasks = [];
      } finally {
        performanceLogger.endOperation('fetchActiveTasks');
      }

      
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
          console.log('Quest info:', questInfo);
          return questInfo;
        }).join('\n---\n');
      }

      // Add tasks context
      let tasksContext = '';
      if (activeTasks.length > 0) {
        tasksContext = '\nACTIVE / CURRENT TASKS (this is what the user is working on right now):\n' + activeTasks.map(task => {
          let taskInfo = `- ${task.title}\n`;
          if (task.description) {
            taskInfo += `  Description: ${task.description}\n`;
          }
          taskInfo += `  Status: ${task.status}\n`;
          if (task.quest?.title) {
            taskInfo += `  Part of Quest: ${task.quest.title}\n`;
          }
          console.log('Task info:', taskInfo);
          return taskInfo;
        }).join('\n');
      }

      // Format messages for chat history
      const chatMessages = currentMessages?.map(msg => ({
        role: msg.is_user ? ("user" as const) : ("assistant" as const),
        content: msg.message
      })) || [];
      performanceLogger.endOperation('buildContext');

      // Build the final messages array with personality-based system prompt
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: personality.prompts.chat.system + `

Background context from possibly relevant projects (only if relevant to current conversation):
${questContext ? '\n' + questContext + '\n' : ''}
Background context from possibly relevant tasks (only if relevant to current conversation):
${tasksContext ? '\n' + tasksContext + '\n' : ''}`
        }
      ];
      
      // Add all previous messages from this chat session
      if (chatMessages.length > 0) {
        console.log('Adding previous messages to context:', chatMessages.length);
        messages.push(...chatMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })));
      }
      
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
      return ["Error."];
    } finally {
      performanceLogger.endOperation('generateChatResponse');
    }
  }

  async summarizeAndStoreSession(messages: ChatMessage[]): Promise<string> {
    performanceLogger.startOperation('storeSession');

    // Get the user_id right away for the event
    const userId = messages[0]?.user_id;
    if (!userId) {
      throw new Error('No user_id found in messages');
    }

    try {
      if (!messages || messages.length === 0) {
        throw new Error('No messages to store');
      }

      // Verify all messages belong to the same user
      const invalidMessages = messages.filter(msg => msg.user_id !== userId);
      if (invalidMessages.length > 0) {
        throw new Error('Session contains messages from multiple users');
      }

      console.log('\n=== ChatAgent.storeSession ===');
      
      // Generate simple timestamp-based summary instead of using LLM
      const messageCount = messages.length;
      const timestamp = new Date().toLocaleString();
      const summary = `Chat session with ${messageCount} messages on ${timestamp}`;
      
      // Use basic message content keywords as tags instead of LLM-generated ones
      const userMessages = messages.filter(m => m.is_user).map(m => m.message).join(' ');
      const commonWords = ['the', 'and', 'to', 'a', 'of', 'I', 'you', 'is', 'in', 'it', 'that', 'for', 'was'];
      const potentialTags = userMessages
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.includes(word))
        .filter((word, i, arr) => arr.indexOf(word) === i) // Unique only
        .slice(0, 5); // Limit to 5 tags

      performanceLogger.startOperation('dbOperations');
      // Create session in database
      let sessionData;
      try {
        sessionData = await createChatSession(summary, potentialTags, userId);
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
      
      // After successfully storing the session, analyze it for possible suggestions
      this.generateSuggestionsFromChatSession(messages, userId);

      return sessionData.id;
    } catch (error) {
      console.error('Error in storeSession:', error);
      throw error;
    } finally {
      performanceLogger.endOperation('storeSession');
    }
  }
  
  /**
   * Analyzes a completed chat session and generates task/quest suggestions
   * @param messages Array of chat messages from the session
   * @param userId User ID
   */
  private async generateSuggestionsFromChatSession(messages: ChatMessage[], userId: string): Promise<void> {
    if (!messages || messages.length === 0 || !userId) {
      console.log('No messages or user ID available for suggestion generation');
      return;
    }
    
    console.log(`\n=== ChatAgent.generateSuggestionsFromChatSession ===`);
    console.log(`Analyzing ${messages.length} messages for potential suggestions`);
    
    try {
      // Format the messages into a conversation data structure
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
      
      // Get the suggestion agent singleton instance
      const suggestionAgent = SuggestionAgent.getInstance();
      
      // Analyze the conversation for task and quest suggestions
      await suggestionAgent.analyzeConversation(conversationData, userId);
      
    } catch (error) {
      console.error('Error generating suggestions from chat session:', error);
      // Don't throw the error to avoid breaking the session storage process
    }
  }
}