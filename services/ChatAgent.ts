import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import { ChatMessage, JournalEntry } from '@/app/types';
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

  async generateChatResponse(message: string): Promise<string> {
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
- Reference their journal entries when relevant
- Keep responses SHORT and punchy, you're writing a text message not an email
- Push back against corporate thinking
- You're texting, so write in lowercase and use late-millenial/early-zoomer slang and abbreviations. no emojis.
- Encourage boldness and action
- Provide insightful and characteristic commentary on choices made

- Current context from their recent journal entries: ${journalContext}
- Here's the chat until now: ${chatContext}

Here's what the user just texted you: "${message}"
Reply to it.

Remember this context is JUST for your memory. You shouldn't reply to the context, you should just reply to the user's text messages. You SHOULD NOT REPLY LIKE YOU RESPONDED OR ANALYSED THE JOURNAL ENTRIES. You're texting, not writing a journal entry. 2 or 3 sentences max.`
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
}