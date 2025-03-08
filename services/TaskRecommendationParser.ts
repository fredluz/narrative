import { Task } from '@/app/types';

export interface TaskRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  suggestedQuestTags: string[];
  originalText: string;
}

export class TaskRecommendationParser {
  static parseAnalysis(analysisText: string): TaskRecommendation[] {
    const recommendations: TaskRecommendation[] = [];
    
    // Look for the "Tomorrow's Battle Plan" section or similar task sections
    const battlePlanMatch = analysisText.match(/###\s*.*Battle Plan\*\*([\s\S]*?)(?=###|$)/i);
    if (!battlePlanMatch) return recommendations;

    const taskSection = battlePlanMatch[1];
    const taskItems = taskSection.split(/\n-\s*/).filter(item => item.trim());

    taskItems.forEach(item => {
      const title = item.match(/\*\*(.*?)\*\*:\s*/);
      if (!title) return;

      const taskTitle = title[1].trim();
      const description = item.replace(/\*\*(.*?)\*\*:\s*/, '').trim();
      
      // Infer priority based on language and formatting
      const priority = this.inferPriority(item);
      
      // Extract potential quest tags from the task description
      const suggestedQuestTags = this.extractQuestTags(description);

      recommendations.push({
        title: taskTitle,
        description,
        priority,
        suggestedQuestTags,
        originalText: item.trim()
      });
    });

    return recommendations;
  }

  private static inferPriority(taskText: string): 'high' | 'medium' | 'low' {
    const text = taskText.toLowerCase();
    
    // High priority indicators
    if (
      text.includes('now') ||
      text.includes('immediate') ||
      text.includes('urgent') ||
      text.includes('zero hour') ||
      text.includes('critical')
    ) {
      return 'high';
    }
    
    // Medium priority indicators
    if (
      text.includes('should') ||
      text.includes('important') ||
      text.includes('needed')
    ) {
      return 'medium';
    }
    
    return 'low';
  }

  private static extractQuestTags(description: string): string[] {
    const tags = new Set<string>();
    
    // Common quest categories based on the text
    if (description.match(/\b(code|develop|implement|bug|fix|patch)\b/i)) {
      tags.add('development');
    }
    if (description.match(/\b(learn|study|understand)\b/i)) {
      tags.add('learning');
    }
    if (description.match(/\b(block|limit|restrict)\b/i)) {
      tags.add('discipline');
    }
    if (description.match(/\b(prepare|draft|plan)\b/i)) {
      tags.add('planning');
    }
    
    return Array.from(tags);
  }
}