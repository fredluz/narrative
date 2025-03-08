import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { supabase } from '../../lib/supabase';
import type { Quest } from '@/app/types';

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
    private readonly MISC_QUEST_ID = -1;
    
    constructor() {
      this.genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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

    private async analyzeMiscQuestTasks(journalContent: string, miscQuest: Quest): Promise<QuestRelevanceItem | null> {
        console.log('🔍 Analyzing Misc quest tasks specifically');
        
        if (!miscQuest.tasks || miscQuest.tasks.length === 0) {
            console.log('❌ No tasks found in Misc quest');
            return null;
        }

        const prompt = `You are analyzing ONLY the tasks from a miscellaneous quest collection to see if they're relevant to a journal entry.
DO NOT consider the quest's description or context - ONLY look at each task individually.

Journal Entry: "${journalContent}"

Tasks to analyze:
${miscQuest.tasks.map(task => `ID: ${task.id}
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

    private async analyzeRegularQuest(journalContent: string, quest: Quest): Promise<QuestRelevanceItem | null> {
        console.log(`\n🔎 Analyzing regular quest: "${quest.title}"`);
        
        const prompt = `You are analyzing if this quest is relevant to a journal entry. Reply ONLY with a JSON object.

Journal Entry: "${journalContent}"

Quest Details:
Title: ${quest.title}
Description: ${quest.description || 'No description yet'}
Tasks:
${quest.tasks?.map(task => `- ${task.title}: ${task.description || 'No description'}`).join('\n') || 'No tasks'}

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

    async findRelevantQuests(journalContent: string): Promise<Quest[]> {
      try {
        console.log('🔍 QuestAgent: Finding relevant quests for journal entry');
        
        const { data: quests, error: questError } = await supabase
          .from('quests')
          .select(`
            id,
            title,
            analysis,
            status,
            tagline,
            description,
            is_main,
            created_at,
            updated_at,
            tags,
            start_date,
            end_date,
            parent_quest_id,
            tasks (*)
          `)
          .order('created_at', { ascending: false });

        if (questError) throw questError;

        if (!quests || quests.length === 0) {
          console.log('❌ No quests found in database');
          return [];
        }

        console.log(`📋 Found ${quests.length} total quests to analyze`);
        
        // Separate misc quest from regular quests using ID instead of title
        const miscQuest = quests.find(q => q.id === this.MISC_QUEST_ID);
        const regularQuests = quests.filter(q => q.id !== this.MISC_QUEST_ID);

        // Store all relevant quest data
        const relevantQuestData: QuestRelevanceItem[] = [];

        // First analyze misc quest tasks if it exists
        let miscTaskIds: number[] = [];
        if (miscQuest) {
            console.log('📋 Analyzing Misc quest tasks first');
            const miscAnalysis = await this.analyzeMiscQuestTasks(journalContent, miscQuest);
            if (miscAnalysis?.isRelevant) {
                miscTaskIds = miscAnalysis.relevantTasks.map(task => task.taskId);
                relevantQuestData.push(miscAnalysis);
            }
        }

        // Then analyze regular quests
        console.log(`📋 Analyzing ${regularQuests.length} regular quests`);
        for (const quest of regularQuests) {
            const questAnalysis = await this.analyzeRegularQuest(journalContent, quest);
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
                            miscQuestData.relevance = null;
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
                relevance: finalQuestData.find(data => data.questId === quest.id)?.relevance || null,
                relevantTasks: finalQuestData.find(data => data.questId === quest.id)?.relevantTasks || []
            })) as Quest[];

        console.log(`\n✨ Found ${relevantQuests.length} relevant quests:`, 
            relevantQuests.map(q => ({ title: q.title, taskCount: q.relevantTasks?.length })));
        return relevantQuests;

      } catch (error) {
        console.error('❌ Error in findRelevantQuests:', error);
        throw error;
      }
    }
}