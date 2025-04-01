import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { supabase } from '@/lib/supabase';
import type { Quest } from '@/app/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
// import { useSupabase } from '@/contexts/SupabaseContext'; // Removed Supabase session
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk

interface QuestUpdate {
  id: number;
  title: string;
  tagline: string;
  description?: string;
  description_sugg?: string;
  is_main: boolean;
  status: 'Active' | 'On-Hold' | 'Completed';
  analysis?: string;
  analysis_sugg?: string;
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

// Update type definition for update operations to allow partial data
type QuestUpdateInput = Partial<Omit<QuestInput, 'user_id'>> & {
  description_sugg?: string;
  analysis_sugg?: string;
};

type QuestRealtimePayload = RealtimePostgresChangesPayload<QuestUpdate>;


// Database operations
export async function fetchQuests(userId: string): Promise<Quest[]> {
  if (!userId) {
    console.error('fetchQuests called without userId');
    return [];
  }

  console.log(`[questsService] Fetching quests for user: ${userId}`);
  
  try {
    // Verify supabase client is initialized
    if (!supabase) {
      console.error('[questsService] Supabase client not initialized');
      return [];
    }

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
        description_sugg,
        is_main,
        status,
        start_date,
        end_date,
        analysis,
        analysis_sugg,
        parent_quest_id,
        user_id,
        tasks (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[questsService] Error fetching quests:', error);
      throw error;
    }

    console.log(`[questsService] Successfully fetched ${data?.length || 0} quests`);
    return data || [];
  } catch (error) {
    console.error('[questsService] Unexpected error in fetchQuests:', error);
    
    // In production, return empty array instead of throwing to prevent UI crashes
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    throw error;
  }
}

// Renamed function to be more descriptive of what it returns
async function getQuestsWithTasks(userId: string): Promise<Quest[]> {
  return fetchQuests(userId);
}

// Remove the export keyword here since we'll export at the bottom
async function createQuest(userId: string, questData: Omit<QuestInput, 'user_id'>): Promise<Quest> {
  const fullQuestData: QuestInput = {
    ...questData,
    user_id: userId
  };

  const cleanedFields = Object.fromEntries(
    Object.entries(fullQuestData).map(([key, value]) => {
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

// Remove the export keyword here since we'll export at the bottom
// Update to accept partial data for updates
async function updateQuest(questId: number, userId: string, questData: QuestUpdateInput): Promise<Quest> {
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
    console.error('Cannot update quest: User does not own this quest');
    throw new Error('You do not have permission to update this quest');
  }

  const fullQuestData = {
    ...questData,
    user_id: userId
  };

  const cleanedFields = Object.fromEntries(
    Object.entries(fullQuestData).map(([key, value]) => {
      if ((key === 'start_date' || key === 'end_date') && value === '') {
        return [key, null];
      }
      return [key, value];
    })
  );

  const { data, error: updateError } = await supabase
    .from('quests')
    .update({
      ...cleanedFields,
      updated_at: new Date().toISOString()
    })
    .eq('id', questId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (updateError) throw updateError;
  return data;
}

// New function to delete a quest
async function deleteQuest(questId: number, userId: string): Promise<void> {
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
    console.error('Cannot delete quest: User does not own this quest');
    throw new Error('You do not have permission to delete this quest');
  }

  // Delete the quest
  const { error } = await supabase
    .from('quests')
    .delete()
    .eq('id', questId)
    .eq('user_id', userId);

  if (error) throw error;
}

// Add functions to handle misc quests
async function getMiscQuest(userId: string): Promise<Quest | null> {
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
      description_sugg,
      is_main,
      status,
      start_date,
      end_date,
      analysis,
      analysis_sugg,
      parent_quest_id,
      user_id,
      tasks (*)
    `)
    .eq('user_id', userId)
    .eq('title', 'Misc')
    .single();

  if (error) {
    if (error.code === 'PGSQL_ERROR_NO_DATA_FOUND') {
      return null;
    }
    throw error;
  }

  return data;
}

async function createMiscQuest(userId: string): Promise<Quest> {
  const miscQuest = await createQuest(userId, {
    title: 'Misc',
    tagline: 'Miscellaneous tasks',
    description: 'A collection of tasks that don\'t belong to any specific quest',
    status: 'Active',
    is_main: false
  });

  return miscQuest;
}

async function getOrCreateMiscQuest(userId: string): Promise<Quest> {
  let miscQuest = await getMiscQuest(userId);
  
  if (!miscQuest) {
    miscQuest = await createMiscQuest(userId);
  }

  return miscQuest;
}

// Update the moveTasksToQuest function to handle moving to misc quest
async function moveTasksToQuest(fromQuestId: number, toQuestId: number | null, userId: string, taskIds?: number[]): Promise<void> {
  // If toQuestId is null, we need to move to the misc quest
  const actualToQuestId = toQuestId ?? (await getOrCreateMiscQuest(userId)).id;

  let query = supabase
    .from('tasks')
    .update({ quest_id: actualToQuestId })
    .eq('quest_id', fromQuestId)
    .eq('user_id', userId);

  // If specific taskIds are provided, only move those tasks
  if (taskIds && taskIds.length > 0) {
    query = query.in('id', taskIds);
  }

  const { error } = await query;
  if (error) throw error;
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

  console.log('Calling update_main_quest RPC with questId:', questId);
  
  // Modified to only pass the questId parameter as the database function expects
  const { data, error } = await supabase.rpc('update_main_quest', { 
    p_quest_id: questId
  });
  
  console.log('RPC result:', { data, error });
  
  if (error) {
    console.error('Error updating main quest via RPC:', error);
    throw error;
  }
  
  return;
}


// Export all database operation functions together
export { 
  createQuest, 
  updateQuest, 
  deleteQuest, 
  moveTasksToQuest, 
  updateMainQuest, 
  getQuestsWithTasks,
  getOrCreateMiscQuest,
};

// React Hook
export function useQuests() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuth(); // Get userId from Clerk
  // Flag to track when we're in the middle of setting a main quest
  const [isSettingMainQuest, setIsSettingMainQuest] = useState(false);

  const loadQuests = useCallback(async () => { // Wrap in useCallback
    if (!userId) { // Use Clerk userId
        setQuests([]); // Clear quests if no user
        setLoading(false);
        return;
    }
    try {
      setLoading(true);
      const allQuests = await fetchQuests(userId); // Use Clerk userId
      setQuests(allQuests);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quests');
    } finally {
      setLoading(false);
    }
  }, [userId]); // Depend on Clerk userId

  useEffect(() => {
    if (!userId) { // Use Clerk userId
        setQuests([]); // Clear quests if user logs out
        return;
    }

    loadQuests(); // Initial load

    const subscription = supabase
      .channel('quests_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public',
          table: 'quests',
          filter: `user_id=eq.${userId}` // Use Clerk userId in filter
        },
        (payload: QuestRealtimePayload) => {
          console.log('Quest change received:', payload);
          
          // If we're in the middle of a main quest update, don't reload automatically
          // for 'UPDATE' events, as they might override our optimistic update
          if (isSettingMainQuest && payload.eventType === 'UPDATE') {
            console.log('Skipping automatic reload during main quest update');
            return;
          }
          
          loadQuests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, isSettingMainQuest, loadQuests]); // Depend on Clerk userId and loadQuests

  return {
    mainQuest: quests.find(q => q.is_main) || null,
    quests,
    setQuestAsMain: async (questId: number) => {
      if (!userId) return; // Use Clerk userId
      try {
        // Set flag to prevent realtime subscription from triggering during this operation
        setIsSettingMainQuest(true);

        // Optimistically update UI - do this first for better UX
        setQuests(currentQuests => 
          currentQuests.map(quest => ({
            ...quest,
            is_main: quest.id === questId
          }))
        );

        // Then update the database
        await updateMainQuest(questId, userId); // Use Clerk userId

        // Wait a bit before allowing automatic reloads again
        // This delay helps prevent race conditions with Supabase realtime updates
        setTimeout(() => setIsSettingMainQuest(false), 1000);
      } catch (err) {
        console.error('Failed to set main quest:', err);
        setError(err instanceof Error ? err.message : 'Failed to update main quest');
        
        // On error, reload quests after a short delay
        setTimeout(() => {
          loadQuests();
          setIsSettingMainQuest(false);
        }, 500);
      }
    },
    loading,
    error,
    reload: loadQuests
  };
}
