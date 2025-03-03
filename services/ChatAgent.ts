import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import { ChatMessage, JournalEntry, ChatSession } from '@/app/types';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

export class ChatAgent {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1',
      dangerouslyAllowBrowser: true
    });
  }

  async generateChatResponse(message: string, sessionId?: string): Promise<string> {
    try {
      // Fetch last few messages for conversation context
      const { data: recentMessages, error: chatError } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (chatError) throw chatError;

      // Fetch recent journal entries for additional context - now including ai_analysis
      const { data: recentEntries, error: journalError } = await supabase
        .from('journal_entries')
        .select('user_entry, ai_response, ai_analysis')
        .order('created_at', { ascending: false })
        .limit(2);

      if (journalError) throw journalError;

      // Format context for the prompt with explicit type casting
      const chatContext = (recentMessages?.map(msg => ({
        role: msg.is_user ? ("user" as const) : ("assistant" as const),
        content: msg.message
      })).reverse() || []) as ChatCompletionMessageParam[];

      const journalContext = recentEntries?.map(entry => 
        `Journal Entry: "${entry.user_entry}"\nMy Response: "${entry.ai_response}"\nMy Analysis: "${entry.ai_analysis}"`
      ).join('\n\n') || '';

      // Get response from OpenAI
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

Memory context from their recent journal entries (this is just for your memory, don't reply to these directly): 
${journalContext}

Current text conversation (treat this as part of the ongoing chat, this is the actual conversation you're having right now):
${chatContext}

Here's what they just texted you: "${message}"
Reply to it as if you're continuing this conversation - the chat context is what you've already discussed, unlike the journal entries which are just in your memory.

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
      return responseText.replace(/^["'](.*)["']$/, '$1');
    } catch (error) {
      console.error('Error in generateChatResponse:', error);
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

      return sessionData.id;
    } catch (error) {
      console.error('Error in summarizeAndStoreSession:', error);
      throw error;
    }
  }
}