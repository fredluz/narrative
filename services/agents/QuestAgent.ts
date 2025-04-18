import OpenAI from 'openai';
import { GoogleGenerativeAI, type GenerativeModel, SchemaType } from "@google/generative-ai";
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
// personalityService is not needed here anymore for fetching the prompt text directly
// import { personalityService } from '@/services/personalityService'; 
import { personalities, type PersonalityType } from './PersonalityPrompts'; // Import prompts object and type

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

interface GeneratedQuestData {
    name: string;
    description: string;
    tagline?: string;
    status?: 'Active' | 'On-Hold' | 'Completed';
    is_main?: boolean;
    tags?: string[];
}

export class QuestAgent {
    private openai: OpenAI;
    private actuallyOAI: OpenAI;
    private genAI: GoogleGenerativeAI;
    private geminiModel: GenerativeModel;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.EXPO_PUBLIC_DEEPSEEK_API_KEY,
            baseURL: 'https://api.deepseek.com',
            dangerouslyAllowBrowser: true
        });
        this.actuallyOAI = new OpenAI({
            apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
            dangerouslyAllowBrowser: true
        });
        
        // Initialize Gemini
        this.genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
        this.geminiModel = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        console.log('🔧 [QuestAgent] Initialized with OpenAI, OpenAI actual, and Gemini models');
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
        clerk_id?: string;
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

                // Filter tasks by clerk_id
                const userTasks = miscQuest.tasks.filter(task => task.clerk_id === userId);

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
        clerk_id?: string;
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

    private async analyzeRegularQuest(journalContent: string, quests: Quest[], userId: string): Promise<QuestRelevanceItem[]> {
        console.log(`\n🔎 Analyzing ${quests.length} quests for relevance using Gemini model`);
        
        try {
            // Define the schema for structured output that matches QuestRelevanceItem[]
            const questRelevanceSchema = {
                type: SchemaType.ARRAY as const,
                description: "Analysis of quests' relevance to journal entry",
                items: {
                    type: SchemaType.OBJECT as const,
                    properties: {
                        questId: {
                            type: SchemaType.INTEGER as const,
                            description: "ID of the quest being analyzed"
                        },
                        isRelevant: {
                            type: SchemaType.BOOLEAN as const,
                            description: "Whether the quest is relevant to the journal entry"
                        },
                        relevance: {
                            type: SchemaType.STRING as const,
                            description: "Explanation of why the quest is relevant, or null if not relevant",
                            nullable: true
                        },
                        relevantTasks: {
                            type: SchemaType.ARRAY as const,
                            description: "List of tasks from this quest that are relevant to the journal entry",
                            items: {
                                type: SchemaType.OBJECT as const,
                                properties: {
                                    taskId: {
                                        type: SchemaType.INTEGER as const,
                                        description: "ID of the relevant task"
                                    },
                                    name: {
                                        type: SchemaType.STRING as const,
                                        description: "Title of the task"
                                    },
                                    description: {
                                        type: SchemaType.STRING as const,
                                        description: "Description of the task"
                                    },
                                    relevance: {
                                        type: SchemaType.STRING as const,
                                        description: "Explanation of why this task is relevant to the journal entry"
                                    }
                                },
                            }
                        }
                    },
                    required: ["questId", "isRelevant", "relevantTasks", "relevance"]
                }
            };

            // Create a model with the schema for structured output
            const structuredModel = this.genAI.getGenerativeModel({
                model: "gemini-2.0-flash",
                generationConfig: {
                    temperature: 0.4,
                    responseMimeType: "application/json",
                    responseSchema: questRelevanceSchema
                }
            });

            // Prepare the prompt text
            const promptText = `Analyze this journal entry's relevance to these quests:

Journal Entry: "${journalContent}"

Quests to Analyze:
${quests.map(quest => `
Quest ID: ${quest.id}
Title: ${quest.title}
Description: ${quest.description || 'No description yet'}
Status: ${quest.status}
Is Main Quest: ${quest.is_main}
Tasks:
${quest.tasks?.map(task => `- Task ID: ${task.id}, Title: ${task.title}, Description: ${task.description || 'No description'}`).join('\n') || 'No tasks'}
---`).join('\n')}

Analyze criteria:
1. Direct mentions of quest title or related keywords
2. Strong connections to quest description
3. Clear references to related activities or goals
4. Current quest status relevance
5. Specific mentions related to individual tasks

IMPORTANT: Be VERY STRICT in your relevance criteria - only include quests or tasks with CLEAR, DIRECT connections, above 90% certainty.
For each quest, determine if it's relevant and which specific tasks are mentioned or implied in the journal entry.`;

            // Generate content with structured output
            const result = await structuredModel.generateContent(promptText);
            const responseText = result.response.text();
            
            if (!responseText) {
                console.log('⚠️ Empty response from Gemini for quest analysis');
                return [];
            }
            
            // Parse the JSON response - should already be well-structured
            try {
                const parsedResults = JSON.parse(responseText) as QuestRelevanceItem[];
                console.log(`✅ Gemini returned analysis for ${parsedResults.length} quests`);
                return parsedResults;
            } catch (parseError) {
                console.error('❌ Error parsing Gemini response:', parseError);
                console.error('Raw response:', responseText);
                return [];
            }
        } catch (error) {
            console.error('❌ Error analyzing quests with Gemini:', error);
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
            
            // Filter tasks by clerk_id for all quests
           
            // Store all relevant quest data
            let relevantQuestData: QuestRelevanceItem[] = [];

            // First analyze all regular quests together
            if (quests.length > 0) {
                console.log('📋 Analyzing all regular quests');
                const questAnalyses = await this.analyzeRegularQuest(journalContent, quests, userId);
                relevantQuestData.push(...questAnalyses);
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
                    tasks: quest.tasks?.filter(task => task.clerk_id === userId) || [],
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

    // Update signature to accept PersonalityType
    async generateQuestFromVoiceInput(transcript: string, personalityType: PersonalityType, userId: string): Promise<GeneratedQuestData> {
        console.log('🎙️ Generating quest from voice transcript', { personalityType });

        // Fetch the user's current quests and log title + description
        const currentQuests = await getQuestsWithTasks(userId);
        console.log(`✨ Current quests for user ${userId}:`);
        const questList = currentQuests.forEach(q =>
            console.log(`- ${q.title}: ${q.description || 'No description'}`)
        );

        const personalityInfo = personalities[personalityType]; // Get personality info from the imported object
        try {
            // Look up the personality prompt text using the provided type
            // Use the new system prompt provided by the user
            const systemPrompt = `
            ${personalityInfo.prompts.analysis.system}

`;

            // Note: The personalityGuidance fetched earlier is not explicitly used in this new prompt structure.
            // The new prompt defines its own voice ("mythmaker").
            console.log(`[QuestAgent] Using new mythmaker system prompt for quest generation.`);

            // Call DeepSeek API through OpenAI client
            console.log('📤 Sending transcript to DeepSeek AI');
            const result = await this.openai.chat.completions.create({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: transcript
                    },
                    {
                        role: "user",
                        content: `Current Quests: ${questList}`
                    }
                ],
                temperature: 0.8,
                max_tokens: 8000,
                response_format: { type: "json_object" }
            });
            
            const responseContent = result.choices[0]?.message?.content;
            if (!responseContent) {
                throw new Error("Empty response from AI");
            }
            
            const cleanedResponse = this.cleanResponseText(responseContent);
            console.log('📥 Received quest generation response', cleanedResponse);
            
            try {                const questData = JSON.parse(cleanedResponse) as GeneratedQuestData;
                
                // Validate the response format
                if (!questData.name || typeof questData.name !== 'string') {
                    throw new Error("Generated quest data missing valid 'name' field");
                }
                
                if (!questData.description || typeof questData.description !== 'string') {
                    throw new Error("Generated quest data missing valid 'description' field");
                }
                
                return {
                    name: questData.name,
                    description: questData.description,
                    tagline: questData.tagline || '',
                    status: 'Active', // Default value
                    is_main: false,   // Default value
                    tags: []          // Default empty array
                };
            } catch (parseError) {
                console.error('❌ Failed to parse AI response:', parseError);
                throw new Error("Failed to parse the generated quest data. The AI response format was invalid.");
            }
        } catch (error) {
            console.error('❌ Quest generation error:', error);
            throw error;
        }
    }
}

// Export a singleton instance
export const questAgent = new QuestAgent();
