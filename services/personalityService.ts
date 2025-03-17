import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { PersonalityType } from './agents/PersonalityPrompts';

const PERSONALITY_STORAGE_KEY = '@questlog/user_personality/';

export const personalityService = {
  async getUserPersonality(userId: string): Promise<PersonalityType> {
    try {
      // Try localStorage first
      const stored = await AsyncStorage.getItem(PERSONALITY_STORAGE_KEY + userId);
      if (stored) {
        return stored as PersonalityType;
      }
      
      // If not in localStorage, get from database
      const { data, error } = await supabase
        .from('profiles')
        .select('ai_personality')
        .eq('id', userId)
        .single();
      
      if (error) throw error;

      const personality = (data?.ai_personality as PersonalityType);
      
      // Save to localStorage for next time
      await AsyncStorage.setItem(PERSONALITY_STORAGE_KEY + userId, personality);
      
      return personality;
    } catch (error) {
      console.error('Error getting personality:', error);
      return 'TFRobot';
    }
  },

  async setUserPersonality(userId: string, personality: PersonalityType): Promise<void> {
    try {
      // Update localStorage immediately
      await AsyncStorage.setItem(PERSONALITY_STORAGE_KEY + userId, personality);
      
      // Then update database in background
      const { error } = await supabase
        .from('profiles')
        .update({ ai_personality: personality })
        .eq('id', userId);

      if (error) {
        console.error('Supabase error setting personality:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error setting personality:', error);
      throw error; // Re-throw to handle in the component
    }
  },

  async clearStoredPersonality(userId?: string): Promise<void> {
    try {
      if (userId) {
        // Clear specific user
        await AsyncStorage.removeItem(PERSONALITY_STORAGE_KEY + userId);
      } else {
        // Clear all stored personalities
        const keys = await AsyncStorage.getAllKeys();
        const personalityKeys = keys.filter(key => key.startsWith(PERSONALITY_STORAGE_KEY));
        await AsyncStorage.multiRemove(personalityKeys);
      }
    } catch (error) {
      console.error('Error clearing stored personality:', error);
    }
  }
};