import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/app/types';

// Database operations
async function fetchTasks(): Promise<Task[]> {
  console.log('Fetching tasks...');
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      quest:quests!quest_id (
        id,
        title,
        tagline,
        is_main,
        status,
        start_date,
        end_date
      )
    `)
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  console.log('Fetched tasks:', data);
  return data as Task[];
}

async function fetchTasksByQuest(questId: number): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('quest_id', questId)
    .order('scheduled_for', { ascending: true });

  if (error) throw error;
  return data || [];
}

// React Hook
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskListVisible, setTaskListVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      const data = await fetchTasks();
      console.log('Loaded tasks:', data);
      setTasks(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
      console.error('Error loading tasks:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return {
    tasks,
    taskListVisible,
    setTaskListVisible,
    loading,
    error,
    reload: loadTasks
  };
}
