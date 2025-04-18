import { supabase } from '@/lib/supabase';
import type { PersonalityType } from './agents/PersonalityPrompts';

export const personalityService = {
  async getUserPersonality(userId: string): Promise<PersonalityType> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_personality')
        .eq('clerk_id', userId) // Use clerk_id for lookup
        .single();

      if (error) throw error;
      
      return (data?.ai_personality as PersonalityType) || 'narrator';
    } catch (error) {
      console.error('Error getting personality:', error);
      return 'narrator'; // Default to narrator if there's an error
    }
  },

  async setUserPersonality(userId: string, personality: PersonalityType): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ai_personality: personality })
        .eq('clerk_id', userId); // Use clerk_id for update condition

      if (error) throw error;
    } catch (error) {
      console.error('Error setting personality:', error);
      throw error;
    }
  }
};
