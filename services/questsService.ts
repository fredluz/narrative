import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Quest } from '@/app/types';

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

  console.log('Fetched quests:', data);
  return data || [];
}

async function updateMainQuest(questId: number): Promise<void> {
  console.log('Updating main quest:', questId);
  
  // First, unset any existing main quest
  const { error: error1 } = await supabase
    .from('quests')
    .update({ is_main: false })
    .not('id', 'eq', questId); // Don't update the quest we're setting as main

  if (error1) {
    console.error('Error unsetting main quest:', error1);
    throw error1;
  }

  // Then set the new main quest
  const { error: error2 } = await supabase
    .from('quests')
    .update({ is_main: true })
    .eq('id', questId);

  if (error2) {
    console.error('Error setting main quest:', error2);
    throw error2;
  }

  console.log('Successfully updated main quest');
}

// React Hook
export function useQuests() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuests();
  }, []);

  async function loadQuests() {
    try {
      setLoading(true);
      const allQuests = await fetchQuests();
      console.log('Loaded quests:', allQuests);
      setQuests(allQuests);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load quests';
      console.error('Error loading quests:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const mainQuest = quests.find(q => q.is_main) || null;
  console.log('Current main quest:', mainQuest);

  return {
    mainQuest,
    quests,
    setQuestAsMain: async (questId: number) => {
      try {
        await updateMainQuest(questId);
        await loadQuests();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update main quest');
      }
    },
    loading,
    error,
    reload: loadQuests
  };
}
