import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import { ChatMessage, JournalEntry, ChatSession } from '@/app/types';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { journalService } from './journalService';

export class ChatAgent {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
      dangerouslyAllowBrowser: true
    });
  }

  // Add this method to generate responses using the JournalAgent's method
  async generateResponse(content: string, previousCheckupsContext?: string): Promise<string> {
    console.log('🚀 ChatAgent.generateResponse called for checkup content');
    
    try {
      // Use journalService to generate a response, which will in turn use JournalAgent
      const response = await journalService.generateResponse(content);
      console.log('📥 Generated response for checkup content:', response.substring(0, 100) + '...');
      return response;
    } catch (error) {
      console.error('❌ Error in ChatAgent.generateResponse:', error);
      return "Seems like my neural circuits are fried. Can't come up with anything clever right now.";
    }
  }

  async generateChatResponse(message: string, sessionId?: string): Promise<string> {
    try {
      console.log('🚀 ChatAgent.generateChatResponse called');
      
      // Fetch last few messages for conversation context
      const { data: recentMessages, error: chatError } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (chatError) throw chatError;

      // Fetch recent journal entries for additional context
      const { data: recentEntries, error: journalError } = await supabase
        .from('journal_entries')
        .select('user_entry, ai_response, ai_analysis')
        .order('created_at', { ascending: false })
        .limit(2);

      if (journalError) throw journalError;
      
      // NEW: Get today's checkup entries to provide immediate context
      const today = new Date().toISOString().split('T')[0];
      console.log('🔄 Fetching today\'s checkups to provide context for chat response');
      const todaysCheckups = await journalService.getCheckupEntries(today);
      
      // Format chat context
      const chatContext = (recentMessages?.map(msg => ({
        role: msg.is_user ? ("user" as const) : ("assistant" as const),
        content: msg.message
      })).reverse() || []) as ChatCompletionMessageParam[];

      // Format journal context
      const journalContext = recentEntries?.map(entry => 
        `Journal Entry: "${entry.user_entry}"\nMy Response: "${entry.ai_response}"\nMy Analysis: "${entry.ai_analysis}"`
      ).join('\n\n') || '';
      
      // Format today's checkups with responses as additional context
      let checkupContext = '';
      if (todaysCheckups && todaysCheckups.length > 0) {
        checkupContext = todaysCheckups.map(checkup => {
          const time = new Date(checkup.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
          });
          return `[${time}] Checkup: "${checkup.content}"\n[${time}] My Response: "${checkup.ai_checkup_response || 'No response recorded'}"`;
        }).join('\n\n');
      }

      console.log('📤 Sending chat prompt to AI with context');
      
      // Get response from OpenAI with enhanced context
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system" as const,
            content: `You are Johnny Silverhand from Cyberpunk 2077, now living in the user's head. You're a sarcastic, anti-corporate rebel with a grudge against the system. You're abrasive and often an asshole, but you genuinely care about the user underneath your hard exterior.
                    Now, you're responding to a text message the user sent you on their phone. Reply to their text as if you are also texting on your phone.

Remember:
- Mix sarcasm with genuine concern
- Keep responses SHORT and punchy, you're writing a text message not an email
- Push back against corporate thinking
- You're texting, so write in lowercase and use late-millenial/early-zoomer slang and abbreviations. no emojis.
- Encourage boldness and action
- Provide insightful and characteristic commentary on choices made

Memory context from today's checkups (this is what they've been telling you throughout the day, pay close attention to this for continuity):
${checkupContext}

Memory context from their recent journal entries (this is just for background knowledge):
${journalContext}

Current text conversation (treat this as part of the ongoing chat, this is the actual conversation you're having right now):
${chatContext}

Here's what they just texted you: "${message}"
Reply to it as if you're continuing this conversation - the chat context is what you've already discussed, unlike the journal entries and checkups which are just in your memory.

Remember: You're texting casually, not writing a journal response. 2 or 3 sentences max. Keep it punchy and natural like you're actually texting back and forth with them.`
          },
          {
            role: "user" as const,
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 400
      });

      // Get the response content and remove surrounding quotes if they exist
      const responseText = response.choices[0].message?.content || "Listen up, got nothing to say right now. Come back when you've got something interesting.";
      console.log('📥 Received AI response:', responseText.substring(0, 100) + '...');
      
      return responseText.replace(/^["'](.*)["']$/, '$1');
    } catch (error) {
      console.error('❌ Error in generateChatResponse:', error);
      throw error;
    }
  }

  async summarizeAndStoreSession(messages: ChatMessage[]): Promise<string> {
    try {
      if (messages.length === 0) return '';

      // Create prompt for summarization and tags
      const chatHistory = messages.map(msg => 
        `${msg.is_user ? "User" : "Johnny"}: ${msg.message}`
      ).join('\n');

      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are Johnny Silverhand summarizing a chat conversation you just had with guy who's head you live in. 
            You need to:
            1. Write a summary of the key points discussed. Keep it brief but capture the key points and any decisions or insights that came up.
            2. Generate 4-8 tags that categorize this conversation.
            Write in first person as Johnny, addressing what you and the guy discussed.
            Format your response EXACTLY like this:
            SUMMARY: (your summary here)
            TAGS: tag1, tag2, tag3, tag4`
          },
          {
            role: "user",
            content: `Here's our conversation:\n${chatHistory}\n\nSummarize our chat and suggest relevant tags.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const responseText = response.choices[0].message?.content || "Had a chat with the user but nothing worth noting.";
      
      // Parse the response to separate summary and tags
      const summaryMatch = responseText.match(/SUMMARY:\s*(.*?)(?=\nTAGS:|$)/s);
      const tagsMatch = responseText.match(/TAGS:\s*(.*?)$/s);
      
      const summary = summaryMatch ? summaryMatch[1].trim() : responseText;
      const tags = tagsMatch ? tagsMatch[1].split(',').map(tag => tag.trim()) : [];

      // Create new session with summary and tags
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert([{ 
          summary,
          tags
        }])
        .select('id')
        .single();

      if (sessionError) throw sessionError;

      // Update all messages with the session ID
      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ chat_session_id: sessionData.id })
        .in('id', messages.map(m => m.id));

      if (updateError) throw updateError;

      // Create a checkup entry based on this chat session
      await this.createCheckupEntryFromSession(messages, summary, tags);

      return sessionData.id;
    } catch (error) {
      console.error('Error in summarizeAndStoreSession:', error);
      throw error;
    }
  }

  // Updated method to create a checkup entry from a completed chat session
  async createCheckupEntryFromSession(messages: ChatMessage[], summary: string, tags: string[]): Promise<void> {
    try {
      console.log('🔄 Creating checkup entry from chat session');
      
      // Step 1: Generate content for the checkup entry (user's perspective)
      const checkupContent = await this.generateCheckupContent(messages, summary);
      
      // Get today's date in YYYY-MM-DD format for the entry
      const today = new Date().toISOString().split('T')[0];
      
      // Step 2: Get today's previous checkups for context when generating the response
      console.log('🔄 Fetching today\'s checkups for context');
      const todaysCheckups = await journalService.getCheckupEntries(today);
      
      // Format previous checkups as context with paired responses
      let previousCheckupsContext = "";
      if (todaysCheckups && todaysCheckups.length > 0) {
        previousCheckupsContext = todaysCheckups
          .map(entry => {
            const time = new Date(entry.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true
            });
            return `[${time}] USER: ${entry.content}\n[${time}] SILVERHAND: ${entry.ai_checkup_response || 'No response recorded'}`;
          })
          .join('\n\n');
      }
      
      // Step 3: Generate Johnny's response to this new checkup content
      console.log('🤖 Generating AI response for the checkup with context');
      const aiResponse = await this.generateResponse(checkupContent, previousCheckupsContext);
      
      // Step 4: Save the complete checkup entry with both content and AI response
      console.log('💾 Saving complete checkup entry to database');
      await journalService.saveCheckupEntry(today, checkupContent, tags, aiResponse);
      
      console.log('✅ Successfully created complete checkup entry from chat session');
    } catch (error) {
      console.error('❌ Error creating checkup entry from chat session:', error);
      // Fail gracefully - don't throw, as this is an enhancement, not core functionality
    }
  }

  // Updated method to generate content for the checkup entry with more accurate user voice
  private async generateCheckupContent(messages: ChatMessage[], summary: string): Promise<string> {
    try {
      // Extract only the user's messages
      const userMessages = messages
        .filter(msg => msg.is_user)
        .map(msg => msg.message)
        .join('\n');
      
      // Get Johnny's messages for context but not for mimicking style
      const johnnyMessages = messages
        .filter(msg => !msg.is_user)
        .map(msg => msg.message)
        .join('\n');
      
      // Get today's checkups to analyze user's writing style
      const today = new Date().toISOString().split('T')[0];
      console.log('🔄 Fetching today\'s checkups for context and style analysis');
      const todaysCheckups = await journalService.getCheckupEntries(today);
      
      // Format previous user entries to help model understand user's style
      let userStyleSamples = '';
      let checkupContext = '';
      
      if (todaysCheckups && todaysCheckups.length > 0) {
        // Extract only user entries for style analysis
        userStyleSamples = todaysCheckups
          .map(checkup => {
            const time = new Date(checkup.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            });
            return `[${time}] "${checkup.content}"`;
          })
          .join('\n\n');
        
        // Format as paired entries for context comprehension
        checkupContext = todaysCheckups.map(checkup => {
          const time = new Date(checkup.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
          });
          return `[${time}] My entry: "${checkup.content}"\n[${time}] Johnny's response: "${checkup.ai_checkup_response || 'No response recorded'}"`;
        }).join('\n\n');
      }
      
      console.log('📤 Sending checkup content generation prompt with user style analysis');
      
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are creating a journal entry from the perspective of the user who just had a chat conversation with Johnny Silverhand.

YOUR TASK: 
Write a short reflective journal entry (1-2 paragraphs) that accurately records what the USER talked about in their chat messages. This must be written in their authentic voice and style.

CRITICAL GUIDELINES:
1. ONLY include topics, thoughts and feelings the user EXPLICITLY mentioned in their messages
2. DO NOT invent any details, decisions, plans, or thoughts that weren't directly expressed by the user
3. DO NOT narrate what Johnny said or his perspective - focus exclusively on the user's side
4. Carefully study the user's writing style from their previous entries to match their tone, vocabulary, and manner of expression
5. The entry should feel like the user wrote it themselves.
6. Keep the language, tone and style consistent with the user's other entries

IMPORTANT: This is NOT a summary of the conversation - it's a personal journal entry written by the user recording their thoughts from the conversation in their authentic voice.`
          },
          {
            role: "user",
            content: `Here are examples of my previous journal entries today (study these to understand the context of the conversation and also my writing style):
${userStyleSamples ? userStyleSamples : "No previous entries today."}

Here's the chat conversation I just had with Johnny (I need to create a journal entry about what I said):

ONLY MY MESSAGES (these are my exact words, use these to create the journal entry):
${userMessages}

Johnny's responses (for context only):
${johnnyMessages}

Create my journal entry reflecting ONLY what I talked about in my messages, written in MY authentic voice and style. DO NOT add any new thoughts, decisions, or plans I didn't explicitly mention. DO NOT interpret or expand beyond what I actually said:`
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      });

      const aiContent = response.choices[0].message?.content || 
             "Just had a chat with Johnny where I brought up the things that have been on my mind.";
             
      console.log('📥 Generated checkup content from chat session:', aiContent.substring(0, 100) + '...');
      
      return aiContent;
    } catch (error) {
      console.error('❌ Error generating checkup content:', error);
      return "Had a conversation with Johnny about some things on my mind.";
    }
  }
}