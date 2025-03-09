import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { 
  createQuest,
  updateQuest,
  deleteQuest,
  moveTasksToQuest,
  getQuestsWithTasks,
  MISC_QUEST_ID
} from '@/services/questsService';
import type { Quest, Task } from '@/app/types';

interface TaskRelevanceItem {
    taskId: number;
    name: string;
    description: string;
    relevance: string;
}

interface QuestRelevanceItem {
    questId: number;
    isRelevant: boolean;
    relevance?: string | null;
    relevantTasks: TaskRelevanceItem[];
}

export class QuestAgent {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    }

    async createQuest(userId: string, questData: {
        title: string;
        tagline: string;
        description?: string;
        status?: 'Active' | 'On-Hold' | 'Completed';
        is_main?: boolean;
        start_date?: string;
        end_date?: string;
        parent_quest_id?: number;
        tags?: string[];
        user_id?: string;
    }): Promise<Quest> {
        // Check if userId exists
        if (!userId) {
            console.error('User ID is required for createQuest');
            throw new Error('User ID is required');
        }
        
        try {
            console.log('🚀 Creating new quest:', questData.title);

            // Use questsService instead of direct database call
            const quest = await createQuest(userId, {
                ...questData,
                status: questData.status || 'Active',
                is_main: questData.is_main || false,
            });

            console.log('✅ Quest created successfully:', quest.id);
            return quest;
        } catch (error) {
            console.error('❌ Error creating quest:', error);
            throw error;
        }
    }

    async updateQuest(questId: number, userId: string, questData: {
        title?: string;
        tagline?: string;
        description?: string;
        status?: 'Active' | 'On-Hold' | 'Completed';
        is_main?: boolean;
        start_date?: string;
        end_date?: string;
        parent_quest_id?: number;
        tags?: string[];
        user_id?: string;
    }): Promise<Quest> {
        // Check if userId exists
        if (!userId) {
            console.error('User ID is required for updateQuest');
            throw new Error('User ID is required');
        }
        
        try {
            console.log('🔄 Updating quest:', questId);

            // Use questsService instead of direct database call
            const quest = await updateQuest(questId, userId, questData);

            console.log('✅ Quest updated successfully:', quest.id);
            return quest;
        } catch (error) {
            console.error('❌ Error updating quest:', error);
            throw error;
        }
    }

    async deleteQuest(questId: number, userId: string): Promise<void> {
        // Check if userId exists
        if (!userId) {
            console.error('User ID is required for deleteQuest');
            throw new Error('User ID is required');
        }
        
        try {
            console.log('🗑️ Deleting quest:', questId);

            // First, move any tasks to the misc quest
            await moveTasksToQuest(questId, MISC_QUEST_ID, userId);
            
            // Then delete the quest
            await deleteQuest(questId, userId);
            
            console.log('✅ Quest deleted successfully');
        } catch (error) {
            console.error('❌ Error deleting quest:', error);
            throw error;
        }
    }

    private async validateAndRepairJson(rawResponse: string, questId: number): Promise<QuestRelevanceItem | null> {
        console.log('🔍 Validating JSON response:', rawResponse);
        
        const prompt = `You are a JSON validator and repair system. Your job is to:
1. Check if the input is valid JSON
2. If it's valid, ensure it matches the expected format
3. If it's invalid but fixable, repair it
4. If it's beyond repair, return null

Expected JSON format:
{
  "questId": ${questId},
  "isRelevant": boolean,
  "relevance": string | null,
  "relevantTasks": [
    {
      "taskId": number,
      "name": string,
      "description": string,
      "relevance": string
    }
  ]
}

Input to validate: "${rawResponse}"

IMPORTANT: Your response must be EXACTLY in this format:
START JSON
{valid json object or the word 'null'}
END JSON

DO NOT add any backticks, quotes, or other markers around the JSON.`;

        try {
            console.log('📤 Sending JSON validation request to AI');
            const result = await this.model.generateContent(prompt);
            const validatedResponse = result.response.text().trim();

            if (!validatedResponse) {
                console.log('❌ No response received from validator');
                return null;
            }

            // Extract content between markers
            const startMarker = "START JSON";
            const endMarker = "END JSON";
            const startIndex = validatedResponse.indexOf(startMarker);
            const endIndex = validatedResponse.indexOf(endMarker);

            if (startIndex === -1 || endIndex === -1) {
                console.log('❌ Validator response missing markers');
                return null;
            }

            const jsonContent = validatedResponse
                .substring(startIndex + startMarker.length, endIndex)
                .trim();

            if (jsonContent === 'null') {
                console.log('❌ JSON validation failed - response cannot be repaired');
                return null;
            }

            try {
                const parsed = JSON.parse(jsonContent) as QuestRelevanceItem;
                // Verify the required fields are present and of correct type
                if (typeof parsed.questId !== 'number' || 
                    typeof parsed.isRelevant !== 'boolean' || 
                    !Array.isArray(parsed.relevantTasks)) {
                    console.log('❌ Repaired JSON is missing required fields or has wrong types');
                    return null;
                }
                console.log('✅ JSON validated and parsed successfully');
                return parsed;
            } catch (parseError) {
                console.error('❌ Error parsing validated JSON:', parseError);
                return null;
            }
        } catch (error) {
            console.error('❌ Error in JSON validation:', error);
            return null;
        }
    }

    private cleanResponseText(response: string): string {
        console.log('🧹 Cleaning response text of markdown/code markers');
        // Remove common markdown/code block markers
        return response
            .replace(/^```(?:json)?/gm, '') // Remove opening code block
            .replace(/```$/gm, '')          // Remove closing code block
            .replace(/^`{1,2}/gm, '')      // Remove inline code marks at start
            .replace(/`{1,2}$/gm, '')      // Remove inline code marks at end
            .trim();
    }

    private async analyzeMiscQuestTasks(journalContent: string, miscQuest: Quest, userId: string): Promise<QuestRelevanceItem | null> {
        console.log('🔍 Analyzing Misc quest tasks specifically');
        
        if (!miscQuest.tasks || miscQuest.tasks.length === 0) {
            console.log('❌ No tasks found in Misc quest');
            return null;
        }

        // Filter tasks by user_id
        const userTasks = miscQuest.tasks

        const prompt = `You are analyzing ONLY the tasks from a miscellaneous quest collection to see if they're relevant to a journal entry.
DO NOT consider the quest's description or context - ONLY look at each task individually.

Journal Entry: "${journalContent}"

Tasks to analyze:
${userTasks.map(task => `ID: ${task.id}
Title: ${task.title}
Description: ${task.description || 'No description'}`).join('\n\n')}

For each task, determine if it's specifically relevant to the journal content.
Only include tasks that have a STRONG, DIRECT connection to the journal entry.

RESPOND ONLY WITH A JSON OBJECT IN THIS EXACT FORMAT:
{
  "questId": ${miscQuest.id},
  "isRelevant": false,
  "relevance": "Only included if specific tasks are relevant",
  "relevantTasks": []
}

If any tasks are relevant, include them like this:
{
  "questId": ${miscQuest.id},
  "isRelevant": true,
  "relevance": "Tasks related to specific journal mentions",
  "relevantTasks": [
    {
      "taskId": [task id],
      "name": "task name",
      "description": "task description",
      "relevance": "CLEAR explanation of the direct connection to journal content"
    }
  ]
}

Be VERY selective - only include tasks with clear, direct relevance to the journal entry.`;

        try {
            console.log('📤 Sending misc tasks analysis to AI');
            const result = await this.model.generateContent(prompt);
            const aiResponse = this.cleanResponseText(result.response.text().trim());
            
            return await this.validateAndRepairJson(aiResponse, miscQuest.id);
        } catch (error) {
            console.error('❌ Error analyzing misc tasks:', error);
            return null;
        }
    }

    private async analyzeRegularQuest(journalContent: string, quest: Quest, userId: string): Promise<QuestRelevanceItem | null> {
        console.log(`\n🔎 Analyzing regular quest: "${quest.title}"`);
        
        // Filter tasks by user_id
        const userTasks = quest.tasks || [];

        const prompt = `You are analyzing if this quest is relevant to a journal entry. Reply ONLY with a JSON object.

Journal Entry: "${journalContent}"

Quest Details:
Title: ${quest.title}
Description: ${quest.description || 'No description yet'}
Tasks:
${userTasks.map(task => `- ${task.title}: ${task.description || 'No description'}`).join('\n') || 'No tasks'}

Consider:
1. Direct mentions of the quest title or related keywords
2. Strong connections to the quest description
3. Clear references to related activities or goals
4. Current quest status relevance
5. Specific mentions or implications related to individual tasks

Be STRICT in your relevance criteria - only include if there's a CLEAR connection.

RESPOND ONLY WITH A JSON OBJECT IN THIS EXACT FORMAT:
{
  "questId": ${quest.id},
  "isRelevant": false,
  "relevance": null,
  "relevantTasks": []
}

OR if relevant:
{
  "questId": ${quest.id},
  "isRelevant": true,
  "relevance": "detailed explanation of relevance",
  "relevantTasks": [
    {
      "taskId": [task id],
      "name": "task name",
      "description": "task description",
      "relevance": "clear explanation of direct relevance"
    }
  ]
}`;

        try {
            const result = await this.model.generateContent(prompt);
            const aiResponse = this.cleanResponseText(result.response.text().trim());
            return await this.validateAndRepairJson(aiResponse, quest.id);
        } catch (error) {
            console.error('❌ Error analyzing regular quest:', error);
            return null;
        }
    }

    async findRelevantQuests(journalContent: string, userId: string): Promise<Quest[]> {
        // Check if userId exists
        if (!userId) {
            console.error('User ID is required for findRelevantQuests');
            return [];  // Return empty array for read operation
        }
        
        try {
            console.log('🔍 QuestAgent: Finding relevant quests for journal entry');
            
            // Use questsService instead of direct database call
            const quests = await getQuestsWithTasks(userId);

            if (!quests || quests.length === 0) {
                console.log('❌ No quests found in database');
                return [];
            }

            console.log(`📋 Found ${quests.length} total quests to analyze`);

            // Separate misc quest from regular quests
            const miscQuest = quests.find(q => q.id === MISC_QUEST_ID);
            const regularQuests = quests.filter(q => q.id !== MISC_QUEST_ID);

            // Store all relevant quest data
            const relevantQuestData: QuestRelevanceItem[] = [];

            // First analyze misc quest tasks if it exists
            let miscTaskIds: number[] = [];
            if (miscQuest) {
                console.log('📋 Analyzing Misc quest tasks first');
                // Filter tasks by user_id before analysis
                miscQuest.tasks = miscQuest.tasks?.filter(task => task.user_id === userId) || [];
                const miscAnalysis = await this.analyzeMiscQuestTasks(journalContent, miscQuest, userId);
                if (miscAnalysis?.isRelevant) {
                    miscTaskIds = miscAnalysis.relevantTasks.map(task => task.taskId);
                    relevantQuestData.push(miscAnalysis);
                }
            }

            // Then analyze regular quests
            console.log(`📋 Analyzing ${regularQuests.length} regular quests`);
            for (const quest of regularQuests) {
                // Filter tasks by user_id before analysis
                quest.tasks = quest.tasks?.filter(task => task.user_id === userId) || [];
                const questAnalysis = await this.analyzeRegularQuest(journalContent, quest, userId);
                if (questAnalysis?.isRelevant) {
                    // If any tasks from misc are now associated with a specific quest,
                    // remove them from misc
                    if (miscTaskIds.length > 0) {
                        const miscQuestData = relevantQuestData.find(q => q.questId === miscQuest?.id);
                        if (miscQuestData) {
                            // Remove any misc tasks that are now associated with this specific quest
                            miscQuestData.relevantTasks = miscQuestData.relevantTasks.filter(
                                task => !questAnalysis.relevantTasks.some(rt => rt.taskId === task.taskId)
                            );
                            // Update misc quest relevance status if no tasks remain
                            if (miscQuestData.relevantTasks.length === 0) {
                                miscQuestData.isRelevant = false;
                                miscQuestData.relevance = undefined;
                            }
                        }
                    }
                    relevantQuestData.push(questAnalysis);
                }
            }

            // Clean up - remove any misc quest if it has no remaining relevant tasks
            const finalQuestData = relevantQuestData.filter(q => q.isRelevant && q.relevantTasks.length > 0);

            // Map back to Quest type with relevance data
            const relevantQuests = quests
                .filter(quest => finalQuestData.some(data => data.questId === quest.id))
                .map(quest => ({
                    ...quest,
                    // Ensure tasks are filtered by user_id in the final result
                    tasks: quest.tasks?.filter(task => task.user_id === userId) || [],
                    relevance: finalQuestData.find(data => data.questId === quest.id)?.relevance || undefined,
                    relevantTasks: finalQuestData.find(data => data.questId === quest.id)?.relevantTasks || []
                }));

            console.log(`\n✨ Found ${relevantQuests.length} relevant quests:`, 
                relevantQuests.map(q => ({ title: q.title, taskCount: q.relevantTasks?.length })));
            return relevantQuests;

        } catch (error) {
            console.error('❌ Error in findRelevantQuests:', error);
            throw error;
        }
    }
}