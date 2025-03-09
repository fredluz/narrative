import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Quest } from '@/app/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useSupabase } from '@/contexts/SupabaseContext';

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
  user_id: string;
}

interface QuestInput extends Omit<Quest, 'id' | 'created_at' | 'updated_at' | 'tasks'> {
  description?: string;
  user_id: string;
}

type QuestRealtimePayload = RealtimePostgresChangesPayload<QuestUpdate>;

// Database operations
export async function fetchQuests(userId: string): Promise<Quest[]> {
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
      user_id,
      tasks (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quests:', error);
    throw error;
  }

  return data || [];
}

async function createQuest(questData: QuestInput): Promise<Quest> {
  const cleanedFields = Object.fromEntries(
    Object.entries(questData).map(([key, value]) => {
      if ((key === 'start_date' || key === 'end_date') && value === '') {
        return [key, null];
      }
      return [key, value];
    })
  );

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
  // First verify ownership
  const { data: quest, error: fetchError } = await supabase
    .from('quests')
    .select('user_id')
    .eq('id', questId)
    .single();

  if (fetchError) {
    console.error('Error verifying quest ownership:', fetchError);
    throw new Error(`Failed to verify quest ownership: ${fetchError.message}`);
  }

  if (!quest || quest.user_id !== questData.user_id) {
    console.error('Cannot update quest: User does not own this quest');
    throw new Error('You do not have permission to update this quest');
  }

  const cleanedFields = Object.fromEntries(
    Object.entries(questData).map(([key, value]) => {
      if ((key === 'start_date' || key === 'end_date') && value === '') {
        return [key, null];
      }
      return [key, value];
    })
  );

  const { error: questError } = await supabase
    .from('quests')
    .update({
      ...cleanedFields,
      updated_at: new Date().toISOString()
    })
    .eq('id', questId)
    .eq('user_id', questData.user_id);

  if (questError) throw questError;
}

async function updateMainQuest(questId: number, userId: string): Promise<void> {
  // First verify ownership
  const { data: quest, error: fetchError } = await supabase
    .from('quests')
    .select('user_id')
    .eq('id', questId)
    .single();

  if (fetchError) {
    console.error('Error verifying quest ownership:', fetchError);
    throw new Error(`Failed to verify quest ownership: ${fetchError.message}`);
  }

  if (!quest || quest.user_id !== userId) {
    console.error('Cannot update main quest: User does not own this quest');
    throw new Error('You do not have permission to update this quest');
  }

  const { error } = await supabase.rpc('update_main_quest', { 
    p_quest_id: questId,
    p_user_id: userId
  });
  
  if (error) {
    console.error('Error updating main quest via RPC:', error);
    throw error;
  }
}

export { createQuest, updateQuest };

// React Hook
export function useQuests() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useSupabase();

  const loadQuests = async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      const allQuests = await fetchQuests(session.user.id);
      setQuests(allQuests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    
    loadQuests();

    const subscription = supabase
      .channel('quests_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'quests',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload: QuestRealtimePayload) => {
          console.log('Quest change received:', payload);
          loadQuests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user?.id]);

  return {
    mainQuest: quests.find(q => q.is_main) || null,
    quests,
    setQuestAsMain: async (questId: number) => {
      if (!session?.user?.id) return;
      try {
        setQuests(currentQuests => 
          currentQuests.map(quest => ({
            ...quest,
            is_main: quest.id === questId
          }))
        );
        
        await updateMainQuest(questId, session.user.id);
      } catch (err) {
        console.error('Failed to set main quest:', err);
        setError(err instanceof Error ? err.message : 'Failed to update main quest');
        await loadQuests();
      }
    },
    loading,
    error,
    reload: loadQuests
  };
}
