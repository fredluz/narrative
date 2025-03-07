import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Quest } from '@/app/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Update interface to match QuestInput structure
interface QuestUpdate {
  id: number;
  title: string;
  tagline: string;
  description?: string;
  is_main: boolean;
  status: 'Active' | 'On-Hold' | 'Completed';
  analysis?: string;
  parent_quest_id?: number;
  start_date?: string;
  end_date?: string;
  tags?: string[];
}

// Define input types
interface QuestInput extends Omit<Quest, 'id' | 'created_at' | 'updated_at' | 'tasks'> {
  description?: string;
}

type QuestRealtimePayload = RealtimePostgresChangesPayload<QuestUpdate>;

// Database operations
async function fetchQuests(): Promise<Quest[]> {
  console.log('Fetching quests...');
  const { data, error } = await supabase
    .from('quests')
    .select(`
      id,
      created_at,
      updated_at,
      tags,
      title,
      tagline,
      description,
      is_main,
      status,
      start_date,
      end_date,
      analysis,
      parent_quest_id,
      tasks (*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quests:', error);
    throw error;
  }

  return data || [];
}

async function createQuest(questData: QuestInput): Promise<Quest> {
  // Clean up empty timestamps
  const cleanedFields = Object.fromEntries(
    Object.entries(questData).map(([key, value]) => {
      // If it's a date field and the value is an empty string, return null
      if ((key === 'start_date' || key === 'end_date') && value === '') {
        return [key, null];
      }
      return [key, value];
    })
  );

  // Create the quest with description directly in the quest table
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .insert({
      ...cleanedFields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (questError) throw questError;
  return quest;
}

async function updateQuest(questId: number, questData: QuestInput): Promise<void> {
  // Clean up empty timestamps
  const cleanedFields = Object.fromEntries(
    Object.entries(questData).map(([key, value]) => {
      // If it's a date field and the value is an empty string, return null
      if ((key === 'start_date' || key === 'end_date') && value === '') {
        return [key, null];
      }
      return [key, value];
    })
  );

  // Update quest with description directly in the quest table
  const { error: questError } = await supabase
    .from('quests')
    .update({
      ...cleanedFields,
      updated_at: new Date().toISOString()
    })
    .eq('id', questId);

  if (questError) throw questError;
}

async function updateMainQuest(questId: number): Promise<void> {
  console.log('Calling RPC to update main quest:', questId);
  const { error } = await supabase.rpc('update_main_quest', { p_quest_id: questId });
  if (error) {
    console.error('Error updating main quest via RPC:', error);
    throw error;
  }
  console.log('Successfully updated main quest via RPC');
}

// Export quest operations
export { createQuest, updateQuest };

// React Hook
export function useQuests() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuests = async () => {
    try {
      setLoading(true);
      const allQuests = await fetchQuests();
      setQuests(allQuests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuests();
  }, []);

  return {
    mainQuest: quests.find(q => q.is_main) || null,
    quests,
    setQuestAsMain: async (questId: number) => {
      try {
        // Update local state first (optimistic update)
        setQuests(currentQuests => 
          currentQuests.map(quest => ({
            ...quest,
            is_main: quest.id === questId
          }))
        );
        
        // Then update the database
        await updateMainQuest(questId);
      } catch (err) {
        // If the update fails, reload from DB to get correct state
        console.error('Failed to set main quest:', err);
        setError(err instanceof Error ? err.message : 'Failed to update main quest');
        await loadQuests();
      }
    },
    loading,
    error,
    reload: loadQuests  // Expose reload function
  };
}
