import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';



export const narrativeAppInfo = `Narrative is an app that helps users manage their goals (Quests), 
track tasks, and reflect through journaling. It aims to remove friction from the process of managing goals and journaling. All of that management is done by an AI agent, never the user manually.
The point is on motivating the user not through 'gamification', but 'narrativization'.

How to use the app:
You can either chat with the AI agent or directly create a checkup entry (mini diary entries through the day that then combine into a full diary entry). 
These checkup entries are analyzed by the AI agent to create suggestions for your tasks and quests (overarching arcs/chapters in your life, or larger goals that may require multiple tasks).
At the end of the day, you join all the checkup entries into a full diary entry by pressing the 'end day' button (the moon icon). 
The AI agent will then process the journal entries, along with your quest/task list and previous entries. 
The AI agent will then create a summary of the day, along with suggestions for the next day. This will help you reflect on your day and plan for the next one.
The goal is to see your life not just as a series of tasks, but as a coherent narrative with character development and a satisfying conclusion.

The user can set a custom color theme in the settings button, as well as pick a different AI personality.
`; 

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
      const systemPrompt = `You are The Narrator, an AI assistant in the Narrative app.
Narrative helps users manage goals (Quests), track tasks, and reflect through journaling.
You are initiating the very first conversation with a new user who currently has no quests or tasks set up.
Your goal is to:
1. Briefly welcome the user to Narrative in your distinct personality ("An observant voice narrating the user's efforts and challenges. Uses precise, impactful language, noting actions and consequences with a distinct cadence and gravity.").
2. Explain Narrative's core purpose (${narrativeAppInfo}) in 1-2 concise sentences.
3. Offer to explain how the app works, if they need help in understanding how to use it.
4. Ask an open-ended question that can get them to start using the app.
Keep the entire message relatively short and engaging. Don't be very abstract or philosophical yet, the user needs to learn how the app works first.`;

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
