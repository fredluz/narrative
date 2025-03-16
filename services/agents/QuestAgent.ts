import OpenAI from 'openai';
import { 
  createQuest,
  updateQuest,
  deleteQuest,
  moveTasksToQuest,
  getQuestsWithTasks,
  getOrCreateMiscQuest,
} from '@/services/questsService';
import type { Quest, Task } from '@/app/types';
import { globalSuggestionStore } from '@/services/globalSuggestionStore';

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

interface TaskMoveInfo {
    taskId: number;
    reason: string;
}

interface QuestMemo {
    id: string;
    content: string;
    created_at: string;
    source: string;
}

interface ContentAnalysis {
    questId: number;
    updates: {
        description_sugg?: string;
        analysis_sugg?: string;
    };
    confidence: number;
}

export class QuestAgent {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
            baseURL: 'https://api.deepseek.com',
            dangerouslyAllowBrowser: true
        });
    }

    async createQuest(userId: string, questData: {
        title: string;
        tagline: string;
        description?: string;
        status?: 'Active' | 'On-Hold' | 'Completed';
        is_main?: boolean;
        analysis?: string;
        start_date?: string;
        end_date?: string;
        parent_quest_id?: number;
        tags?: string[];
        user_id?: string;
    }): Promise<Quest> {
        if (!userId) {
            console.error('User ID is required for createQuest');
            throw new Error('User ID is required');
        }
        
        try {
            console.log('🚀 Creating new quest:', questData.title);

            // Create the quest first
            const newQuest = await createQuest(userId, {
                ...questData,
                status: questData.status || 'Active',
                is_main: questData.is_main || false,
            });

            // Check misc quest for relevant tasks
            const miscQuest = await getOrCreateMiscQuest(userId);
            if (miscQuest.tasks && miscQuest.tasks.length > 0) {
                console.log('📋 Checking misc quest tasks for relevance to new quest');

                // Filter tasks by user_id
                const userTasks = miscQuest.tasks.filter(task => task.user_id === userId);

                if (userTasks.length > 0) {
                    const prompt = `

New Quest Details:
Title: ${questData.title}
Tagline: ${questData.tagline}
Description: ${questData.description || 'No description'}
Analysis: ${questData.analysis || 'No Analysis'}
Tags: ${questData.tags?.join(', ') || 'No tags'}

Misc Tasks to Analyze:
${userTasks.map(task => `ID: ${task.id}
Title: ${task.title}
Description: ${task.description || 'No description'}`).join('\n\n')}
.`;

                    try {
                        console.log('📤 Sending task analysis to AI');
                        const result = await this.openai.chat.completions.create({
                            model: "deepseek-chat",
                            messages: [
                                {
                                    role: "system",
                                    content: `You are analyzing tasks from a miscellaneous quest collection to see if they would be better suited for a newly created quest.
For each task, determine if it would be better suited in the new quest based on:
1. Direct relevance to the new quest's title or description
2. Thematic alignment with the quest's purpose
3. Similar tags or keywords
4. Logical grouping with the quest's scope

RESPOND ONLY WITH A JSON OBJECT IN THIS EXACT FORMAT:
{
  "tasksToMove": [
    {
      "taskId": number,
      "reason": "Clear explanation of why this task fits better in the new quest"
    }
  ]
}

Be SELECTIVE - only include tasks that have a CLEAR and STRONG connection to the new quest.`
                                },
                                {
                                    role: "user",
                                    content: prompt
                                }
                            ],
                            temperature: 0.7,
                            max_tokens: 2000
                        });
                        
                        const aiResponse = this.cleanResponseText(result.choices[0].message?.content ?? '');
                        
                        try {
                            const parsed = JSON.parse(aiResponse);
                            if (parsed.tasksToMove && Array.isArray(parsed.tasksToMove) && parsed.tasksToMove.length > 0) {
                                console.log(`🔄 Moving ${parsed.tasksToMove.length} tasks from misc to new quest`);
                                
                                // Move tasks one by one
                                const tasksToMove = parsed.tasksToMove
                                    .map((moveInfo: TaskMoveInfo) => moveInfo.taskId)
                                    .filter((taskId: number) => userTasks.some(t => t.id === taskId));

                                if (tasksToMove.length > 0) {
                                    await moveTasksToQuest(miscQuest.id, newQuest.id, userId, tasksToMove);
                                    console.log(`✅ Moved ${tasksToMove.length} tasks to new quest`);
                                }
                            }
                        } catch (parseError) {
                            console.error('❌ Error parsing AI response:', parseError);
                            // Don't throw - we still created the quest successfully
                        }
                    } catch (aiError) {
                        console.error('❌ Error analyzing tasks with AI:', aiError);
                        // Don't throw - we still created the quest successfully
                    }
                }
            }

            console.log('✅ Quest created successfully:', newQuest.id);
            return newQuest;
        } catch (error) {
            console.error('❌ Error creating quest:', error);
            throw error;
        }
    }

    async updateQuest(questId: number, userId: string, questData: {
        title?: string;
        tagline?: string;
        description?: string;
        description_sugg?: string;
        status?: 'Active' | 'On-Hold' | 'Completed';
        is_main?: boolean;
        analysis?: string;
        analysis_sugg?: string;
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

            // Get the misc quest first to ensure it exists
            const miscQuest = await getOrCreateMiscQuest(userId);
            
            // First, move any tasks to the misc quest
            await moveTasksToQuest(questId, miscQuest.id, userId);
            
            // Then delete the quest
            await deleteQuest(questId, userId);
            
            console.log('✅ Quest deleted successfully');
        } catch (error) {
            console.error('❌ Error deleting quest:', error);
            throw error;
        }
    }

    private async validateAndRepairJson(rawResponse: string | object, questId: number): Promise<QuestRelevanceItem | null> {
        // If rawResponse is already an object, validate its structure directly
        if (typeof rawResponse === 'object') {
            console.log('🔍 Validating JavaScript object');
            try {
                const response = rawResponse as QuestRelevanceItem;
                // Verify the required fields are present and of correct type
                if (typeof response.questId !== 'number' || 
                    typeof response.isRelevant !== 'boolean' || 
                    !Array.isArray(response.relevantTasks)) {
                    console.log('❌ Object is missing required fields or has wrong types');
                    return null;
                }
                console.log('✅ Object validated successfully');
                return response;
            } catch (error) {
                console.error('❌ Error validating object:', error);
                return null;
            }
        }

        // If rawResponse is a string, proceed with LLM validation
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
            const result = await this.openai.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "You are a JSON validator and repair system."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            });
            const validatedResponse = result.choices[0].message?.content ?? '';

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
        const userTasks = miscQuest.tasks;

        try {
            console.log('📤 Sending misc tasks analysis to AI');
            const result = await this.openai.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: `You are analyzing tasks from a miscellaneous quest collection to determine their relevance to a journal entry.
Consider ONLY the tasks individually - do NOT consider the quest's description or context.
Be VERY selective - only include tasks with clear, direct relevance to the journal entry.

Reply ONLY with a JSON object in the specified format.`
                    },
                    {
                        role: "user",
                        content: `Review these tasks for relevance to this journal entry:

Journal Entry: "${journalContent}"

Tasks to analyze:
${userTasks.map(task => `ID: ${task.id}
Title: ${task.title}
Description: ${task.description || 'No description'}`).join('\n\n')}

Return a JSON object in this EXACT format:
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
}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            });
            
            const aiResponse = this.cleanResponseText(result.choices[0].message?.content ?? '');
            return await this.validateAndRepairJson(aiResponse, miscQuest.id);
        } catch (error) {
            console.error('❌ Error analyzing misc tasks:', error);
            return null;
        }
    }

    private async analyzeRegularQuest(journalContent: string, quests: Quest[], userId: string): Promise<QuestRelevanceItem[]> {
        console.log(`\n🔎 Analyzing ${quests.length} quests for relevance`);
        
        try {
            const result = await this.openai.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: `You are analyzing if any quests are relevant to a journal entry.
Consider these criteria for each quest:
1. Direct mentions of the quest title or related keywords
2. Strong connections to the quest description
3. Clear references to related activities or goals
4. Current quest status relevance
5. Specific mentions or implications related to individual tasks

Be STRICT in your relevance criteria - only include if there's a CLEAR connection, above 90% certainty.

Reply ONLY with a JSON array in the specified format.`
                    },
                    {
                        role: "user",
                        content: `Analyze this journal entry's relevance to these quests:

Journal Entry: "${journalContent}"

Quests to Analyze:
${quests.map(quest => `
Quest ID: ${quest.id}
Title: ${quest.title}
Description: ${quest.description || 'No description yet'}
Status: ${quest.status}
Is Main Quest: ${quest.is_main}
Tasks:
${quest.tasks?.map(task => `- ${task.title}: ${task.description || 'No description'}`).join('\n') || 'No tasks'}
---`).join('\n')}

Return a JSON array in this EXACT format:
[
    {
        "questId": number,
        "isRelevant": boolean,
        "relevance": "string explaining why quest is relevant, or null if not",
        "relevantTasks": [
            {
                "taskId": number,
                "name": "task name", 
                "description": "task description",
                "relevance": "clear explanation of direct relevance"
            }
        ]
    }
]`
                    }
                ],
                temperature: 0.7,
                max_tokens: 3000
            });

            const aiResponse = this.cleanResponseText(result.choices[0].message?.content ?? '');
            
            try {
                const parsedResults = JSON.parse(aiResponse) as QuestRelevanceItem[];
                // Validate each result
                const validatedResults = await Promise.all(
                    parsedResults.map(result => this.validateAndRepairJson(result, result.questId))
                );
                return validatedResults.filter((result): result is QuestRelevanceItem => result !== null);
            } catch (parseError) {
                console.error('❌ Error parsing quest analysis results:', parseError);
                return [];
            }
        } catch (error) {
            console.error('❌ Error analyzing quests:', error);
            return [];
        }
    }

    async findRelevantQuests(journalContent: string, userId: string): Promise<Quest[]> {
        if (!userId) {
            console.error('User ID is required for findRelevantQuests');
            return [];
        }
        
        try {
            console.log('🔍 QuestAgent: Finding relevant quests for journal entry');
            
            const quests = await getQuestsWithTasks(userId);

            if (!quests || quests.length === 0) {
                console.log('❌ No quests found in database');
                return [];
            }

            console.log(`📋 Found ${quests.length} total quests to analyze`);

            // Get the misc quest and separate regular quests
            const miscQuest = await getOrCreateMiscQuest(userId);
            const regularQuests = quests.filter(q => q.id !== miscQuest.id);
            
            // Filter tasks by user_id for all quests
            regularQuests.forEach(quest => {
                quest.tasks = quest.tasks?.filter(task => task.user_id === userId) || [];
            });

            // Store all relevant quest data
            let relevantQuestData: QuestRelevanceItem[] = [];

            // First analyze all regular quests together
            if (regularQuests.length > 0) {
                console.log('📋 Analyzing all regular quests');
                const questAnalyses = await this.analyzeRegularQuest(journalContent, regularQuests, userId);
                relevantQuestData.push(...questAnalyses);
            }

            // Then analyze misc quest tasks if it exists and has tasks
            if (miscQuest.tasks && miscQuest.tasks.length > 0) {
                console.log('📋 Analyzing Misc quest tasks');
                miscQuest.tasks = miscQuest.tasks.filter(task => task.user_id === userId);
                const miscAnalysis = await this.analyzeMiscQuestTasks(journalContent, miscQuest, userId);
                if (miscAnalysis?.isRelevant) {
                    relevantQuestData.push(miscAnalysis);
                }
            }

            // Clean up and return results
            const finalQuestData = relevantQuestData.filter(q => q.isRelevant || q.relevantTasks.length > 0);

            // Map back to Quest type with relevance data, maintaining main quest first if relevant
            const relevantQuests = quests
                .filter(quest => finalQuestData.some(data => data.questId === quest.id))
                .sort((a, b) => {
                    if (a.is_main) return -1;
                    if (b.is_main) return 1;
                    return 0;
                })
                .map(quest => ({
                    ...quest,
                    tasks: quest.tasks?.filter(task => task.user_id === userId) || [],
                    relevance: finalQuestData.find(data => data.questId === quest.id)?.relevance || undefined,
                    relevantTasks: finalQuestData.find(data => data.questId === quest.id)?.relevantTasks || []
                }));

            console.log(`\n✨ Found ${relevantQuests.length} relevant quests:`, 
                relevantQuests.map(q => ({ title: q.title, isMain: q.is_main, taskCount: q.relevantTasks?.length })));
            return relevantQuests;

        } catch (error) {
            console.error('❌ Error in findRelevantQuests:', error);
            throw error;
        }
    }

    async analyzeContentForQuest(content: string, questId: number, userId: string, source: string): Promise<ContentAnalysis | null> {
        if (!userId) {
            console.error('User ID is required for analyzeContentForQuest');
            return null;
        }

        // Only proceed if this is an end of day entry
        if (source !== 'end-of-day') {
            console.log('Skipping quest analysis - not an end of day entry');
            return null;
        }

        try {
            console.log('🔍 Analyzing content for quest updates:', questId);

            // Get the quest
            const quests = await getQuestsWithTasks(userId);
            const quest = quests.find(q => q.id === questId);

            if (!quest) {
                console.error('Quest not found');
                return null;
            }

            const result = await this.openai.chat.completions.create({
                model: "deepseek-reasoner",
                messages: [
                    {
                        role: "system",
                        content: `You are analyzing an end-of-day journal entry to suggest updates to a quest's description and analysis.
1. Information that could update the quest's description
2. New context or insights about the quest that advances its narrative

Generate suggested updates - these will be saved separately and reviewed by the user.
Don't try to maintain the exact existing narrative - instead, focus on incorporating the new information
in a way that adds value.`
                    },
                    {
                        role: "user",
                        content: `Analyze this end-of-day journal entry in relation to an existing quest:

Quest Details:
Title: ${quest.title}
Current Description: ${quest.description || 'No description'}
Current Analysis: ${quest.analysis || 'No analysis'}

New Content to Analyze:
${content}

Generate suggested updates that the user can review. Reply ONLY with a JSON object in this exact format:
{
    "questId": ${quest.id},
    "updates": {
        "description_sugg": "Suggested updated description incorporating new information from today's reflection",
        "analysis_sugg": "Suggested new analysis incorporating today's insights"
    },
    "confidence": 0.0 to 1.0
}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 8000
            });

            const aiResponse = this.cleanResponseText(result.choices[0].message?.content ?? '');

            try {
                const parsed = JSON.parse(aiResponse) as ContentAnalysis;
                console.log('📊 Confidence level:', parsed.confidence);
                
                // Track changes made to report back
                const changes = {
                    updatedDescriptionSugg: false,
                    updatedAnalysisSugg: false,
                    errors: [] as string[]
                };

                // Only save suggestions if confidence is high
                if (parsed.confidence >= 0.8) {
                    console.log('🔄 Saving high-confidence update suggestions to database');
                    
                    // Update quest fields if provided
                    if (parsed.updates.description_sugg || parsed.updates.analysis_sugg) {
                        try {
                            const updateData: {description_sugg?: string, analysis_sugg?: string} = {};
                            
                            if (parsed.updates.description_sugg) {
                                updateData.description_sugg = parsed.updates.description_sugg;
                                changes.updatedDescriptionSugg = true;
                                console.log('📝 Saved suggested quest description');
                            }
                            
                            if (parsed.updates.analysis_sugg) {
                                updateData.analysis_sugg = parsed.updates.analysis_sugg;
                                changes.updatedAnalysisSugg = true;
                                console.log('📊 Saved suggested quest analysis');
                            }
                            
                            if (Object.keys(updateData).length > 0) {
                                const updatedQuest = await this.updateQuest(questId, userId, updateData);
                                console.log('✅ Quest suggestions saved successfully in database:', updatedQuest.id);
                            }
                        } catch (updateError) {
                            console.error('❌ Error saving quest suggestions to database:', updateError);
                            changes.errors.push(`Failed to save suggestions: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
                        }
                    }

                    // Log summary of changes
                    console.log('📋 Summary of changes:');
                    console.log(`- Description suggestion saved: ${changes.updatedDescriptionSugg}`);
                    console.log(`- Analysis suggestion saved: ${changes.updatedAnalysisSugg}`);
                    if (changes.errors.length > 0) {
                        console.log(`- Errors: ${changes.errors.length}`);
                        changes.errors.forEach(err => console.log(`  - ${err}`));
                    }
                } else {
                    console.log(`⚠️ Confidence level too low (${parsed.confidence}), no suggestions saved`);
                }

                return {
                    ...parsed,
                    meta: {
                        actualChanges: changes
                    }
                } as ContentAnalysis & { meta: { actualChanges: typeof changes } };
            } catch (parseError) {
                console.error('Error parsing AI response:', parseError);
                return null;
            }
        } catch (error) {
            console.error('Error in analyzeContentForQuest:', error);
            return null;
        }
    }

}