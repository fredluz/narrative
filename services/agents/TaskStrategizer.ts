import { TaskRecommendation } from '@/services/TaskRecommendationParser';
import { ChatAgent } from './ChatAgent';

function validateUserId(userId: string | undefined): string {
  if (!userId) {
    throw new Error('User ID is required but was not provided');
  }
  return userId;
}

export class TaskStrategizer extends ChatAgent {
  async generateRecommendations(context: {
    dailyEntry: any;
    checkups: any[];
    currentTasks: any[];
    quests: any[];
    aiAnalysis: string;
    userId: string; // Add userId to context
  }): Promise<TaskRecommendation[]> {
    const validUserId = validateUserId(context.userId);
        3. Make progress on key quests
        4. Help achieve longer-term goals

        Format your response as a JSON array of task recommendations, with each task having:
        - title: A clear, action-oriented title
        - description: More detailed explanation and context
        - priority: "high", "medium", or "low"
        - suggestedQuestTags: Array of keywords that match potential quests
        - originalText: The actual text from analysis that inspired this task`
      },
      {
        role: 'user',
        content: prompt
      }
    ]);

    // Parse the JSON response into TaskRecommendation objects
    try {
      const recommendations = JSON.parse(response);
      return recommendations.map((rec: any) => ({
        title: rec.title,
        description: rec.description,
        priority: rec.priority,
        suggestedQuestTags: rec.suggestedQuestTags,
        originalText: rec.originalText
      }));
    } catch (error) {
      console.error('Error parsing task recommendations:', error);
      return [];
    }
  }

  private buildStrategizerPrompt(context: {
    dailyEntry: any;
    checkups: any[];
    currentTasks: any[];
    quests: any[];
    aiAnalysis: string;
  }): string {
    const {
      dailyEntry,
      checkups,
      currentTasks,
      quests,
      aiAnalysis
    } = context;

    return `
Here's the context for generating task recommendations:

CURRENT QUESTS:
${quests.map(q => `- ${q.title}: ${q.tagline}`).join('\n')}

TODAY'S PROGRESS:
${currentTasks.map(t => `- [${t.status}] ${t.title}`).join('\n')}

CHECKUPS AND MOOD:
${checkups.map(c => `- ${c.content}`).join('\n')}

AI ANALYSIS:
${aiAnalysis}

Based on this context, generate 3-4 strategic tasks for tomorrow that will help the user make meaningful progress.
Focus on tasks that:
1. Address any blockers or challenges mentioned
2. Maintain momentum on successful areas
3. Align with active quest objectives
4. Balance short-term needs with long-term goals

Format your response as a JSON array following the specified structure.
`;
  }
}