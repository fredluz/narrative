import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Quest, QuestDescription } from '@/app/types';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Explicitly define the payload structure
interface QuestUpdate {
  id: number;
  is_main: boolean;
  title?: string;
  tagline?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  analysis?: string;
  parent_quest_id?: number;
  tags?: string[];
}

// Define input types
interface QuestInput extends Omit<Quest, 'id' | 'created_at' | 'updated_at' | 'current_description' | 'description_history' | 'tasks'> {
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
      is_main,
      status,
      start_date,
      end_date,
      analysis,
      parent_quest_id,
      tasks (*),
      current_description:quest_description!quest_id(
        id,
        message,
        quest_id,
        is_current,
        created_at,
        updated_at,
        tags
      )
    `)
    .eq('quest_description.is_current', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching quests:', error);
    throw error;
  }

  // Transform the data to ensure current_description is either undefined or a single object
  const transformedData = (data || []).map(quest => ({
    ...quest,
    current_description: Array.isArray(quest.current_description) ? quest.current_description[0] : quest.current_description
  }));

  return transformedData;
}

async function createQuest(questData: QuestInput): Promise<Quest> {
  const { description, ...questFields } = questData;
  
  // Clean up empty timestamps
  const cleanedFields = Object.fromEntries(
    Object.entries(questFields).map(([key, value]) => {
      // If it's a date field and the value is an empty string, return null
      if ((key === 'start_date' || key === 'end_date') && value === '') {
        return [key, null];
      }
      return [key, value];
    })
  );

  // First create the quest
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

  if (description) {
    const timestamp = new Date().toISOString();
    // Then create the description
    const { error: descError } = await supabase
      .from('quest_description')
      .insert({
        message: description,
        quest_id: quest.id,
        is_current: true,
        created_at: timestamp,
        updated_at: timestamp,
        tags: [] // Initialize with empty array since it's optional
      });

    if (descError) throw descError;
  }

  return quest;
}

async function updateQuest(questId: number, questData: QuestInput): Promise<void> {
  const { description, ...questFields } = questData;

  // Clean up empty timestamps
  const cleanedFields = Object.fromEntries(
    Object.entries(questFields).map(([key, value]) => {
      // If it's a date field and the value is an empty string, return null
      if ((key === 'start_date' || key === 'end_date') && value === '') {
        return [key, null];
      }
      return [key, value];
    })
  );

  // Update quest fields
  const { error: questError } = await supabase
    .from('quests')
    .update({
      ...cleanedFields,
      updated_at: new Date().toISOString()
    })
    .eq('id', questId);

  if (questError) throw questError;

  if (description) {
    console.log('Updating quest description for quest:', questId);
    const timestamp = new Date().toISOString();
    
    // First check if there's an existing current description
    const { data: existingDesc, error: checkError } = await supabase
      .from('quest_description')
      .select('*')
      .eq('quest_id', questId)
      .eq('is_current', true)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is ok
      console.error('Error checking existing description:', checkError);
      throw checkError;
    }

    // If there's an existing current description and it's different
    if (existingDesc && existingDesc.message !== description) {
      console.log('Updating existing description status');
      const { error: updateError } = await supabase
        .from('quest_description')
        .update({ 
          is_current: false,
          updated_at: timestamp
        })
        .eq('quest_id', questId)
        .eq('is_current', true);

      if (updateError) {
        console.error('Error updating existing description:', updateError);
        throw updateError;
      }
    }

    // Only create new description if it's different from existing or there is no existing
    if (!existingDesc || existingDesc.message !== description) {
      console.log('Creating new description');
      const { data: newDesc, error: insertError } = await supabase
        .from('quest_description')
        .insert({
          message: description,
          quest_id: questId,
          is_current: true,
          created_at: timestamp,
          updated_at: timestamp,
          tags: [] // Initialize with empty array since it's optional
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating new description:', insertError);
        throw insertError;
      }

      console.log('Successfully created new description:', newDesc);
    }
  }
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
