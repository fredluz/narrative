import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import OpenAI from 'openai';
import { 
  createQuest,
  updateQuest,
  deleteQuest,
  moveTasksToQuest,
  getQuestsWithTasks,
  getOrCreateMiscQuest,
  addMemoToQuest,
  getQuestMemos
} from '@/services/questsService';
import type { Quest, Task } from '@/app/types';
import { globalSuggestionStore } from '@/services/globalSuggestionStore';
import { MemoSuggestion } from '@/services/agents/SuggestionAgent';

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
        description?: string;
        analysis?: string;
    };
    memos: {
        title: string;
        content: string;
        tags: string[];
        source: string;
    }[];
    confidence: number;
}

export class QuestAgent {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    private openai: OpenAI;

    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
                    const prompt = `You are analyzing tasks from a miscellaneous quest collection to see if they would be better suited for a newly created quest.

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

Be SELECTIVE - only include tasks that have a CLEAR and STRONG connection to the new quest.`;

                    try {
                        console.log('📤 Sending task analysis to AI');
                        const result = await this.model.generateContent(prompt);
                        const aiResponse = this.cleanResponseText(result.response.text().trim());
                        
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

            // Get the misc quest and main quest
            const miscQuest = await getOrCreateMiscQuest(userId);
            const mainQuest = quests.find(q => q.is_main);
            const regularQuests = quests.filter(q => !q.is_main && q.id !== miscQuest.id);

            // Store all relevant quest data
            const relevantQuestData: QuestRelevanceItem[] = [];

            // First analyze main quest if it exists
            if (mainQuest) {
                console.log('📋 Analyzing main quest first:', mainQuest.title);
                mainQuest.tasks = mainQuest.tasks?.filter(task => task.user_id === userId) || [];
                const mainQuestAnalysis = await this.analyzeRegularQuest(journalContent, mainQuest, userId);
                if (mainQuestAnalysis?.isRelevant) {
                    relevantQuestData.push(mainQuestAnalysis);
                }
            }

            // Then analyze misc quest tasks if it exists and has tasks
            let miscTaskIds: number[] = [];
            if (miscQuest.tasks && miscQuest.tasks.length > 0) {
                console.log('📋 Analyzing Misc quest tasks');
                miscQuest.tasks = miscQuest.tasks.filter(task => task.user_id === userId);
                const miscAnalysis = await this.analyzeMiscQuestTasks(journalContent, miscQuest, userId);
                if (miscAnalysis?.isRelevant) {
                    miscTaskIds = miscAnalysis.relevantTasks.map(task => task.taskId);
                    relevantQuestData.push(miscAnalysis);
                }
            }

            // Finally analyze remaining regular quests
            console.log(`📋 Analyzing ${regularQuests.length} regular quests`);
            for (const quest of regularQuests) {
                quest.tasks = quest.tasks?.filter(task => task.user_id === userId) || [];
                const questAnalysis = await this.analyzeRegularQuest(journalContent, quest, userId);
                if (questAnalysis?.isRelevant) {
                    if (miscTaskIds.length > 0) {
                        const miscQuestData = relevantQuestData.find(q => q.questId === miscQuest?.id);
                        if (miscQuestData) {
                            // Remove any misc tasks that are now associated with this specific quest
                            miscQuestData.relevantTasks = miscQuestData.relevantTasks.filter(
                                task => !questAnalysis.relevantTasks.some(rt => rt.taskId === task.taskId)
                            );
                            if (miscQuestData.relevantTasks.length === 0) {
                                miscQuestData.isRelevant = false;
                                miscQuestData.relevance = undefined;
                            }
                        }
                    }
                    relevantQuestData.push(questAnalysis);
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

        try {
            console.log('🔍 Analyzing content for quest updates:', questId);

            // Get the quest and its existing memos
            const quests = await getQuestsWithTasks(userId);
            const quest = quests.find(q => q.id === questId);
            const memos = await getQuestMemos(questId, userId);

            if (!quest) {
                console.error('Quest not found');
                return null;
            }

            // Create the system prompt for deepseek-reasoner
            const systemPrompt = `You are analyzing new content related to a quest, looking for:
1. Information that should update the quest's description
2. Important details worth preserving as memos
3. New context or insights about the quest that advances it's narrative

You will be asked to both update the quest's description/analysis and create new memos if needed.
For the quest's description, you must make sure not to deviate from the existing narrative arc. Don't delete, contradict or replace existing information unless new content clearly supersedes it.
Your example should be RPGs, where the quest is a story arc and the memos are important lore or story details.
As in RPGs, a new quest description should be a continuation of the existing story, not a complete rewrite.
`;

            const result = await this.openai.chat.completions.create({
                model: "deepseek-reasoner",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: `Analyze this new content in relation to an existing quest:

Quest Details:
Title: ${quest.title}
Current Description: ${quest.description || 'No description'}
Current Analysis: ${quest.analysis || 'No analysis'}

Existing Memos:
${memos.map(memo => `- ${memo.content}`).join('\n')}

New Content to Analyze:
${content}

Reply ONLY with a JSON object in this exact format:
{
    "questId": ${quest.id},
    "updates": {
        "description": "Updated description incorporating new information concerning the narrative. What you write here will replace the existing description field.",
        "analysis": "New analysis incorporating insights"
    },
    "memos": [
        {
            "content": "The memo's content - important information worth preserving",
            "tags": ["relevant", "tags"],
            "source": "${source}"
        }
    ],
    "confidence": 0.0 to 1.0
}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 8000
            });

            const aiResponse = this.cleanResponseText(result.choices[0].message?.content || '');

            try {
                const parsed = JSON.parse(aiResponse) as ContentAnalysis;
                console.log('📊 Confidence level:', parsed.confidence);
                
                // Track changes made to report back
                const changes = {
                    updatedDescription: false,
                    updatedAnalysis: false,
                    addedMemoSuggestions: 0,
                    errors: [] as string[]
                };

                // Apply updates if confidence is high
                if (parsed.confidence >= 0.8) {
                    console.log('🔄 Applying high-confidence updates to database');
                    
                    // Update quest fields if provided
                    if (parsed.updates.description || parsed.updates.analysis) {
                        try {
                            const updateData: {description?: string, analysis?: string} = {};
                            
                            if (parsed.updates.description) {
                                updateData.description = parsed.updates.description;
                                changes.updatedDescription = true;
                                console.log('📝 Updated quest description');
                            }
                            
                            if (parsed.updates.analysis) {
                                updateData.analysis = parsed.updates.analysis;
                                changes.updatedAnalysis = true;
                                console.log('📊 Updated quest analysis');
                            }
                            
                            if (Object.keys(updateData).length > 0) {
                                const updatedQuest = await this.updateQuest(questId, userId, updateData);
                                console.log('✅ Quest updated successfully in database:', updatedQuest.id);
                            }
                        } catch (updateError) {
                            console.error('❌ Error updating quest in database:', updateError);
                            changes.errors.push(`Failed to update quest: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
                        }
                    }

                    // Create memo suggestions instead of directly adding them
                    if (parsed.memos && parsed.memos.length > 0) {
                        console.log(`📝 Creating ${parsed.memos.length} new memo suggestions`);
                        
                        for (const memo of parsed.memos) {
                            try {
                                // Ensure tags is an array
                                const timestamp = new Date().toISOString();
                                const memoSuggestion: MemoSuggestion = {
                                    id: `memo-${timestamp}-${Math.random().toString(36).substring(2, 10)}`,
                                    sourceContent: content,
                                    sourceType: 'ai',
                                    timestamp,
                                    type: 'memo',
                                    content: memo.content,
                                    tags: Array.isArray(memo.tags) ? memo.tags : [],
                                    source: memo.source,
                                    questId,
                                    userId
                                };
                                
                                // Add to global suggestion store
                                globalSuggestionStore.addMemoSuggestion(memoSuggestion);
                                changes.addedMemoSuggestions++;
                            } catch (memoError) {
                                console.error('❌ Error creating memo suggestion:', memoError);
                                changes.errors.push(`Failed to create memo suggestion: ${memoError instanceof Error ? memoError.message : 'Unknown error'}`);
                            }
                        }
                    }

                    // Log summary of changes
                    console.log('📋 Summary of changes:');
                    console.log(`- Description updated: ${changes.updatedDescription}`);
                    console.log(`- Analysis updated: ${changes.updatedAnalysis}`);
                    console.log(`- Memo suggestions created: ${changes.addedMemoSuggestions}/${parsed.memos.length}`);
                    if (changes.errors.length > 0) {
                        console.log(`- Errors: ${changes.errors.length}`);
                        changes.errors.forEach(err => console.log(`  - ${err}`));
                    }
                } else {
                    console.log(`⚠️ Confidence level too low (${parsed.confidence}), no changes applied`);
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

    // Add method to accept a memo suggestion
    async acceptMemoSuggestion(suggestion: MemoSuggestion): Promise<void> {
        try {
            console.log('📝 Creating memo from suggestion:', suggestion.content.substring(0, 30) + '...');
            await addMemoToQuest(suggestion.questId, suggestion.userId, {
                content: suggestion.content,
                tags: suggestion.tags,
                source: suggestion.source
            });
            
            // Remove the suggestion from the store
            globalSuggestionStore.removeMemoSuggestion(suggestion.id);
        } catch (error) {
            console.error('Error creating memo from suggestion:', error);
            throw error;
        }
    }
}