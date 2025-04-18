import OpenAI from 'openai';
import { personalities, type PersonalityType } from './PersonalityPrompts';
import { getQuestsWithTasks } from '@/services/questsService';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Export the interface
export interface GeneratedQuestData {
    name: string;
    tagline?: string;
    description: string;
    status?: 'Active' | 'On-Hold' | 'Completed';
    is_main?: boolean;
    tags?: string[];
}

export class CreateQuestAgent {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
            baseURL: 'https://api.deepseek.com',
            dangerouslyAllowBrowser: true
        });
    }

    /**
     * Step 1: Ask clarifying questions based on initial user input.
     */
    async askFollowUpQuestions(
        initialInput: string,
        personalityType: PersonalityType,
        userId: string
    ): Promise<string[]> {
        const currentQuests = await getQuestsWithTasks(userId);
        const questList = currentQuests.map(q => `- ${q.title}: ${q.description || 'No description'}`).join('\n');
        const personalityInfo = personalities[personalityType];

        // System prompt: Instruct the LLM ONLY to ask questions.
        const systemPrompt = `
You are ${personalityInfo.name}, ${personalityInfo.prompts.analysis.system}.
Your goal right now is to ask 1-3 specific, clarifying follow-up questions about the user's initial quest idea to gather enough information to define it clearly later.
Focus on missing details needed for a compelling quest (e.g., motivation, challenges, specific outcome, timeframe if relevant). You will write a 3-5 paragraph quest description later, so ask questions that will help you understand the user's vision.
Keep your questions concise and in character.
Current Quests for context (avoid suggesting duplicates):
${questList}
`;

        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: initialInput }
        ];

        const result = await this.openai.chat.completions.create({
            model: 'deepseek-chat',
            messages,
            temperature: 0.7, // Slightly lower temp for focused questions
            max_tokens: 600, // Limit tokens for questions
            // No response_format needed, expect plain text
        });

        const responseContent = result.choices[0]?.message?.content;
        if (!responseContent) {
            // Fallback if AI fails to ask questions
            return ["What is the main goal you want to achieve?", "Why is this important to you right now?"];
        }

        // Split response into potential questions
        const questions = responseContent
            .split('\n')
            .map(line => line.trim().replace(/^- /, '')) // Clean up list markers
            .filter(line => line.length > 0 && line.includes('?')); // Basic check for question format

        // Return questions or fallback if parsing fails
        return questions.length > 0 ? questions : ["Could you tell me a bit more about what you envision?", "What's the first step you imagine taking?"];
    }


    /**
     * Step 2: Generate quest data JSON based on the full conversation (initial input + Q&A).
     */
    async generateQuestData(
        conversation: { role: 'user' | 'agent'; content: string }[],
        personalityType: PersonalityType,
        userId: string
    ): Promise<GeneratedQuestData> { // Return only GeneratedQuestData or throw error
        const currentQuests = await getQuestsWithTasks(userId);
        const questList = currentQuests.map(q => `- ${q.title}: ${q.description || 'No description'}`).join('\n');
        const personalityInfo = personalities[personalityType];

        // System prompt: Instruct the LLM ONLY to generate JSON.
        const systemPrompt = `
You are ${personalityInfo.name}, ${personalityInfo.prompts.analysis.system}.
Based on the entire conversation provided (user's initial idea, your questions, and their answers), synthesize the information into a compelling quest.
Your text needs to be emotionally engaging and inspiring. You are the chronicler of the user's journey, so make it sound epic and meaningful.
Your text should be reminiscent of RPG quest descriptions, with a focus on the user's goals and motivations. Think of Cyberpunk2077, Witcher, Fallout: New Vegas, or similar games.
It both reminds the user of their task, and adds depth to it, making it feel like a real quest in a game.
Your task is to create a JSON object with the following fields:
Use the following format EXACTLY:
{
  "name": "Concise and evocative quest title, referencing movies, books, music or games",
  "tagline": "Short, inspiring tagline (max 15 words) like a movie tagline",
  "description": "Detailed description of the quest, its goals, and significance (4-5 paragraphs)"
}
DO NOT add any text before or after the JSON object.
Ensure the JSON is valid.
Current Quests for context (avoid duplicates):
${questList}
`;

        // Build messages array for LLM - include the full conversation
        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            // Map conversation roles correctly for the API
            ...conversation.map(msg => ({
                role: msg.role === 'agent' ? 'assistant' : 'user',
                content: msg.content
            } as ChatCompletionMessageParam))
        ];

        const result = await this.openai.chat.completions.create({
            model: 'deepseek-chat',
            messages,
            temperature: 0.8, // Can adjust temperature for creativity
            max_tokens: 8000, // Reduced tokens as we only expect JSON
            response_format: { type: 'json_object' } // Enforce JSON output
        });

        const responseContent = result.choices[0]?.message?.content;
        if (!responseContent) {
            throw new Error('Agent returned an empty response.');
        }

        try {
            // Attempt to parse the JSON directly, assuming LLM adheres to the prompt
            const questData: GeneratedQuestData = JSON.parse(responseContent);

            // Basic validation
            if (!questData.name || !questData.description) {
                throw new Error('Generated quest data is missing required fields (name or description).');
            }
            // Add default status if missing
            if (!questData.status) {
                questData.status = 'Active';
            }
             // Add default is_main if missing
            if (questData.is_main === undefined) {
                questData.is_main = false;
            }


            return questData;
        } catch (error) {
            console.error("Failed to parse JSON response from agent:", responseContent, error);
            throw new Error('Agent failed to generate valid quest data in the expected format.');
        }
    }
}

export const createQuestAgent = new CreateQuestAgent();
