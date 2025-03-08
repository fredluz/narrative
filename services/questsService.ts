import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Quest } from '@/app/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useSupabase } from '@/contexts/SupabaseContext';

// Helper function to validate userId
function validateUserId(userId: string | undefined): string {
  if (!userId) {
    throw new Error('User ID is required but was not provided');
  }
  return userId;
}

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
  user_id: string;
}

// Define input types
interface QuestInput extends Omit<Quest, 'id' | 'created_at' | 'updated_at' | 'tasks'> {
  description?: string;
  user_id: string;
}

type QuestRealtimePayload = RealtimePostgresChangesPayload<QuestUpdate>;

// Database operations
export async function fetchQuests(userId: string): Promise<Quest[]> {
  const validUserId = validateUserId(userId);
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
      user_id,
      tasks (*)
    `)
    .eq('user_id', validUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quests:', error);
    throw error;
  }

  return data || [];
}

async function createQuest(questData: QuestInput, userId: string): Promise<Quest> {
  const validUserId = validateUserId(userId);
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
      user_id: validUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (questError) throw questError;
  return quest;
}

async function updateQuest(questId: number, questData: QuestInput, userId: string): Promise<void> {
  const validUserId = validateUserId(userId);
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
    .eq('id', questId)
    .eq('user_id', validUserId);  // Ensure user owns the quest

  if (questError) throw questError;
}

async function updateMainQuest(questId: number, userId: string): Promise<void> {
  const validUserId = validateUserId(userId);
  console.log('Calling RPC to update main quest:', questId);
  const { error } = await supabase.rpc('update_main_quest', { 
    p_quest_id: questId,
    p_user_id: validUserId  // Added user_id parameter to RPC call
  });
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
  const { session } = useSupabase(); // Add session from SupabaseContext

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

    // Set up real-time subscription for this user's quests
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
          loadQuests(); // Reload all quests when any change occurs
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user?.id]); // Add session.user.id as dependency

  return {
    mainQuest: quests.find(q => q.is_main) || null,
    quests,
    setQuestAsMain: async (questId: number) => {
      if (!session?.user?.id) return;
      try {
        // Update local state first (optimistic update)
        setQuests(currentQuests => 
          currentQuests.map(quest => ({
            ...quest,
            is_main: quest.id === questId
          }))
        );
        
        // Then update the database
        await updateMainQuest(questId, session.user.id);
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
