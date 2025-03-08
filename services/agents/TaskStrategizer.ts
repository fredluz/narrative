import { OpenAI } from 'openai';
import { TaskRecommendation } from '@/services/TaskRecommendationParser';
import { ChatAgent } from './ChatAgent';

function validateUserId(userId: string | undefined): string {
  if (!userId) {
    throw new Error('User ID is required but was not provided');
  }
  return userId;
}

export class TaskStrategizer extends ChatAgent {
  async generateRecommendations(
    checkups: { content: string; created_at: string }[],
    aiAnalysis: string,
    userId: string
  ): Promise<TaskRecommendation[]> {
    const validUserId = validateUserId(userId);
    
    try {
      const prompt = this.createTaskRecommendationsPrompt(checkups, aiAnalysis, validUserId);
      
      const response = await this.openai.chat.completions.create({
        model: "deepseek-reasoner",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant analyzing daily journal entries and checkups to generate strategic task recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 2000
      });

      const responseText = response.choices[0].message?.content;
      if (!responseText) throw new Error('No response from AI');

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        return [];
      }
    } catch (error) {
      console.error('Error generating task recommendations:', error);
      return [];
    }
  }

  private createTaskRecommendationsPrompt(
    checkups: { content: string; created_at: string }[],
    aiAnalysis: string,
    userId: string
  ): string {
    const validUserId = validateUserId(userId);
    return `Generate strategic task recommendations based on the following context:

CHECKUPS AND MOOD:
${checkups.map(c => c.content).join('\n')}

AI ANALYSIS:
${aiAnalysis}

Based on this context, generate 3-4 strategic tasks for tomorrow that will help the user make meaningful progress.
Focus on tasks that:
1. Address any blockers or challenges mentioned
2. Maintain momentum on successful areas
3. Align with active quest objectives
4. Balance short-term needs with long-term goals

Format your response as a JSON array following this structure:
[
  {
    "title": "Task title",
    "description": "Detailed task description",
    "category": "area/category this task belongs to",
    "priority": "high|medium|low",
    "estimated_time": "estimated time in minutes",
    "impact": "expected impact/benefit",
    "quest_alignment": "related quest if any"
  }
]`;
  }
}