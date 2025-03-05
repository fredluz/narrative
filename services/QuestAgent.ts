import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { supabase } from '../lib/supabase';
import type { Quest, QuestDescription } from '@/app/types';

interface QuestRelevanceItem {
  questId: number;
  isRelevant: boolean;
  relevance?: string;
}

export class QuestAgent {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  
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
  "relevance": string | null
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
        if (typeof parsed.questId !== 'number' || typeof parsed.isRelevant !== 'boolean') {
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

  async findRelevantQuests(journalContent: string): Promise<Quest[]> {
    try {
      console.log('🔍 QuestAgent: Finding relevant quests for journal entry');
      
      // First, fetch all quests and join with their current descriptions
      const { data: quests, error: questError } = await supabase
        .from('quests')
        .select(`
          id,
          title,
          analysis,
          status,
          tagline,
          is_main,
          created_at,
          updated_at,
          tags,
          start_date,
          end_date,
          parent_quest_id,
          current_description:quest_description(message)
        `)
        .eq('quest_description.is_current', true);

      if (questError) throw questError;

      if (!quests || quests.length === 0) {
        console.log('❌ No quests found in database');
        return [];
      }

      console.log(`📋 Found ${quests.length} total quests to analyze`);
      
      // Analyze each quest individually
      const relevantQuestData: QuestRelevanceItem[] = [];
      
      for (const quest of quests) {
        console.log(`\n🔎 Analyzing quest: "${quest.title}"`);
        console.log(`📖 Description: ${quest.current_description[0]?.message?.substring(0, 100)}...`);
        
        let validResult: QuestRelevanceItem | null = null;
        let attempts = 0;
        const maxAttempts = 2;

        while (!validResult && attempts < maxAttempts) {
          attempts++;
          console.log(`📝 Attempt ${attempts} of ${maxAttempts} to analyze quest`);

          const prompt = `You are analyzing if this quest is relevant to a journal entry. Reply ONLY with a JSON object.

Journal Entry: "${journalContent}"

Quest Details:
Title: ${quest.title}
Analysis: ${quest.analysis || 'No analysis yet'}
Description: ${quest.current_description[0]?.message || 'No description yet'}

Determine if this specific quest is relevant to the journal entry content. Consider:
1. Direct mentions of the quest title or related keywords
2. Thematic connections to the quest description
3. Related activities or goals mentioned
4. Current quest status relevance

RESPOND ONLY WITH A JSON OBJECT IN THIS EXACT FORMAT:
{
  "questId": ${quest.id},
  "isRelevant": false,
  "relevance": null
}

OR if relevant:
{
  "questId": ${quest.id},
  "isRelevant": true,
  "relevance": "explanation of why this quest is relevant"
}

DO NOT include any other text, only the JSON object.`;

          console.log('📤 Sending quest analysis to AI');
          
          const result = await this.model.generateContent(prompt);
          const aiResponse = result.response.text().trim();
          
          if (!aiResponse) {
            console.log('⚠️ No AI response received for quest');
            continue;
          }

          // Clean the response first
          const cleanedResponse = this.cleanResponseText(aiResponse);
          console.log('🧹 Cleaned response:', cleanedResponse);

          // Try parsing the cleaned response directly first
          try {
            console.log('🔍 Attempting direct JSON parse');
            const parsed = JSON.parse(cleanedResponse) as QuestRelevanceItem;
            
            // Verify the required fields are present and of correct type
            if (typeof parsed.questId === 'number' && typeof parsed.isRelevant === 'boolean') {
              console.log('✅ JSON parsed successfully on first try');
              validResult = parsed;
            } else {
              console.log('⚠️ Parsed JSON missing required fields, will try validation');
              validResult = await this.validateAndRepairJson(cleanedResponse, quest.id);
            }
          } catch (parseError) {
            console.log('⚠️ Direct parse failed, attempting validation');
            // Only use validation if direct parse fails
            validResult = await this.validateAndRepairJson(cleanedResponse, quest.id);
          }
          
          if (validResult) {
            if (validResult.isRelevant) {
              console.log('✅ Quest is relevant:', validResult.relevance);
              relevantQuestData.push(validResult);
            } else {
              console.log('❌ Quest is not relevant');
            }
          } else {
            console.log('⚠️ Invalid response, will retry if attempts remain');
          }
        }

        if (!validResult) {
          console.log('❌ Failed to get valid analysis after all attempts');
        }
      }

      // Filter and map the quests to ensure they match the Quest type
      const relevantQuests = quests
        .filter(quest => relevantQuestData.some(data => data.questId === quest.id))
        .map(quest => ({
          ...quest,
          current_description: quest.current_description[0]
        })) as Quest[];

      console.log(`\n✨ Found ${relevantQuests.length} relevant quests:`, relevantQuests.map(q => q.title));
      return relevantQuests;

    } catch (error) {
      console.error('❌ Error in findRelevantQuests:', error);
      throw error;
    }
  }
}