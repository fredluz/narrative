import { supabase } from '@/lib/supabase';
import { journalService, JournalEntry, CheckupEntry } from './journalService';
import { getTasksByDate } from './tasksService';
import type { Task } from '@/app/types';

export interface DailyStats {
  checkupsCount: number;
  tasksCompleted: number;
  tasksInProgress: number;
  questsProgressed: number;
  productivity: number;
  mood: number;
}

export interface DailyReview {
  date: string;
  stats: DailyStats;
  checkups: CheckupEntry[];
  tasks: Task[];
  analysis: string | null;
  recommendations: any[]; // Will be replaced with proper type
  tomorrowTasks: Task[];
}

export class EndOfDayReviewService {
  static async generateDailyStats(date: string): Promise<DailyStats> {
    try {
      // Get all relevant data for the day
      const checkups = await journalService.getCheckupEntries(date);
      const tasks = await getTasksByDate(date);
      
      // Calculate stats
      const tasksCompleted = tasks.filter(t => t.status === 'Done').length;
      const tasksInProgress = tasks.filter(t => t.status === 'InProgress').length;
      
      // Get unique quests that had progress
      const questsProgressed = new Set(tasks.filter(t => t.quest_id).map(t => t.quest_id)).size;
      
      // Calculate productivity based on completed tasks, in-progress tasks, and checkups
      const productivity = Math.min(
        Math.floor(((tasksCompleted * 3) + (tasksInProgress * 1) + (checkups.length * 2)) / 2),
        100
      );
      
      // Calculate mood from checkups content using sentiment analysis
      const mood = await this.calculateMoodScore(checkups);
      
      return {
        checkupsCount: checkups.length,
        tasksCompleted,
        tasksInProgress,
        questsProgressed,
        productivity,
        mood
      };
    } catch (error) {
      console.error('Error generating daily stats:', error);
      throw error;
    }
  }

  private static async calculateMoodScore(checkups: CheckupEntry[]): Promise<number> {
    if (!checkups.length) return 50; // Default neutral mood
    
    // Basic sentiment analysis based on positive/negative word counts
    const positiveWords = ['great', 'good', 'happy', 'excited', 'productive', 'success', 'achieved', 'completed'];
    const negativeWords = ['bad', 'frustrated', 'tired', 'stressed', 'overwhelmed', 'failed', 'worried', 'difficult'];
    
    let totalScore = 50; // Start at neutral
    let validCheckups = 0;
    
    checkups.forEach(checkup => {
      const content = checkup.content.toLowerCase();
      let checkupScore = 50;
      
      // Count positive and negative words
      const posCount = positiveWords.reduce((count, word) => 
        count + (content.match(new RegExp(word, 'g')) || []).length, 0);
      const negCount = negativeWords.reduce((count, word) => 
        count + (content.match(new RegExp(word, 'g')) || []).length, 0);
      
      if (posCount > 0 || negCount > 0) {
        validCheckups++;
        // Calculate score based on ratio of positive to total sentiment words
        const total = posCount + negCount;
        checkupScore = Math.round((posCount / total) * 100);
      }
      
      totalScore += checkupScore;
    });
    
    // Return average mood score, defaulting to 50 if no valid sentiment was found
    return Math.round(validCheckups > 0 ? totalScore / (validCheckups + 1) : 50);
  }

  static async getDailyReview(date: string): Promise<DailyReview> {
    try {
      // Check if we already have a review
      const { data: existingReview } = await supabase
        .from('end_of_day_reviews')
        .select('*')
        .eq('date', date)
        .single();

      if (existingReview) {
        return this.formatReviewData(existingReview, date);
      }

      // Generate new review
      const [stats, checkups, tasks, dailyEntry, tomorrowTasks] = await Promise.all([
        this.generateDailyStats(date),
        journalService.getCheckupEntries(date),
        getTasksByDate(date),
        journalService.getEntry(date),
        getTasksByDate(
          new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0]
        )
      ]);

      const review: DailyReview = {
        date,
        stats,
        checkups,
        tasks,
        analysis: dailyEntry?.ai_analysis || null,
        recommendations: [], // Will be populated by AI
        tomorrowTasks
      };

      // Save the review
      await this.saveDailyReview(review);

      return review;
    } catch (error) {
      console.error('Error getting daily review:', error);
      throw error;
    }
  }

  private static async saveDailyReview(review: DailyReview) {
    try {
      const { error } = await supabase
        .from('end_of_day_reviews')
        .insert({
          date: review.date,
          productivity_score: review.stats.productivity,
          mood_score: review.stats.mood,
          key_insights: [], // Will be populated by AI
          challenges: [], // Will be populated by AI
          wins: [], // Will be populated by AI
          focus_areas: [] // Will be populated by AI
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving daily review:', error);
      throw error;
    }
  }

  private static async formatReviewData(data: any, date: string): Promise<DailyReview> {
    // Get current data for the review
    const [checkups, tasks, dailyEntry, tomorrowTasks] = await Promise.all([
      journalService.getCheckupEntries(date),
      getTasksByDate(date),
      journalService.getEntry(date),
      getTasksByDate(
        new Date(new Date(date).getTime() + 86400000).toISOString().split('T')[0]
      )
    ]);

    return {
      date: data.date,
      stats: {
        checkupsCount: checkups.length,
        tasksCompleted: tasks.filter(t => t.status === 'Done').length,
        tasksInProgress: tasks.filter(t => t.status === 'InProgress').length,
        questsProgressed: new Set(tasks.filter(t => t.quest_id).map(t => t.quest_id)).size,
        productivity: data.productivity_score || 0,
        mood: data.mood_score || 0
      },
      checkups,
      tasks,
      analysis: dailyEntry?.ai_analysis || null,
      recommendations: data.key_insights || [],
      tomorrowTasks
    };
  }
}