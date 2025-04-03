import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { narrativeAppInfo, personalities, PersonalityType } from './PersonalityPrompts'


export class WelcomeAgent {
  private openai: OpenAI;
  private static instance: WelcomeAgent;

  private constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com/v1",
      dangerouslyAllowBrowser: true // Note: Security risk for production
    });
    console.log("🤖 [WelcomeAgent] Initialized with DeepSeek.");
  }

  public static getInstance(): WelcomeAgent {
    if (!WelcomeAgent.instance) {
      WelcomeAgent.instance = new WelcomeAgent();
    }
    return WelcomeAgent.instance;
  }


  async generateWelcomeMessage(userId: string): Promise<string[]> {
    console.log(`\n=== WelcomeAgent.generateWelcomeMessage for user ${userId} ===`);
    try {
      if (!userId) {
        throw new Error('User ID is required to generate welcome message');
      }

      // --- Placeholder Prompt ---
      // TODO: Replace with the actual prompt provided by the user
      const systemPrompt = `. You are The Narrator of the user's life, living inside their head, through the Narrative app.
Narrative helps users manage goals (Quests), track tasks, and reflect through journaling.
You're an observant voice narrating the user's efforts and challenges. Uses precise, impactful language, noting actions and consequences with a distinct cadence and gravity.
You are initiating the very first conversation with a new user who currently has no quests or tasks set up.
Your goal is to:
1. Briefly welcome the user to Narrative in your distinct personality.
2. Explain Narrative's core purpose (${narrativeAppInfo}) in 1-2 concise sentences.
3. Offer to explain how the app works, if they need help in understanding how to use it.
4. Ask an open-ended question that can get them to start using the app.
Keep the entire message relatively short and engaging. Don't be very abstract or philosophical yet, the user needs to learn how the app works first.
Use a clear, deliberate cadence: your words chronicle events.

Your style guide is 'The Narrator' from 'Bastion'. 
- Keep responses SHORT and punchy - one thought per line
- Each line sent as separate text message, keep them brief
- Don't use more than 2-3 separate messages in total. Make sure each message is at most a line or two, absolutely no walls of text are allowed.
- Wait for user responses instead of addressing every topic at once
 IMPORTANT: avoid doing *emotes*. They're distracting to the user and don't contribute to the narrative. They're not part of the app's design.
         Refer to context (entries, tasks, quests) as parts of the ongoing record.
         If asked questions about the app itself, refer to ${narrativeAppInfo} and explain how the app works.`;

      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Initiate the welcome message." } // Simple trigger for the LLM
      ];

      console.log('[WelcomeAgent] Sending request to DeepSeek...');
      const response = await this.openai.chat.completions.create({
        model: "deepseek-chat",
        messages: messages,
        temperature: 0.7, // Adjust as needed
        max_tokens: 250 // Keep it concise
      });

      const responseText = response.choices?.[0]?.message?.content || ` Welcome to Narrative. Ready to get started?`;
      console.log('[WelcomeAgent] Received response from DeepSeek.');

      // Basic splitting, similar to ChatAgent
      const cleanedResponse = responseText.replace(/^["'](.*)["']$/, '$1').trim();
      const splitMessages = cleanedResponse.split(/\n+/).map(msg => msg.trim()).filter(msg => msg.length > 0);

      console.log('[WelcomeAgent] Final split messages:', splitMessages.length);
      return splitMessages.length > 0 ? splitMessages : [responseText];

    } catch (error) {
      console.error('[WelcomeAgent] Error generating welcome message:', error);
      // Fallback message
      return ["Welcome to Narrative! I'm here to help you get started. What's on your mind?"];
    }
  }
}
