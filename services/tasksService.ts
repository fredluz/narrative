import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/app/types';
import { useSupabase } from '@/contexts/SupabaseContext';

// Define types for status
export type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

// Database operations
async function fetchTasks(userId: string): Promise<Task[]> {
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
    .eq('user_id', userId)
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  console.log('Fetched tasks:', data);
  return data as Task[];
}

async function fetchTasksByQuest(questId: number, userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .order('scheduled_for', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getTasksByDate(date: string, userId: string): Promise<Task[]> {
  console.log('Fetching tasks for date:', date);
  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

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
    .eq('user_id', userId)
    .gte('scheduled_for', startOfDay)
    .lte('scheduled_for', endOfDay)
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('Error fetching tasks by date:', error);
    throw error;
  }

  return data || [];
}

// New function to update task status in Supabase
export async function updateTaskStatus(taskId: number, newStatus: TaskStatus, userId: string): Promise<void> {
  console.log(`Updating task ${taskId} to ${newStatus} in Supabase`);
  
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error updating task status:', error);
    throw new Error(`Failed to update task status: ${error.message}`);
  }
  
  return Promise.resolve();
}

// New function to create a task in Supabase
export async function createTask(taskData: {
  title: string;
  description?: string;
  status: TaskStatus;
  quest_id: number;
  scheduled_for: string;
  deadline?: string;
  location?: string;
  priority: 'high' | 'medium' | 'low';
  subtasks?: string;
  tags?: string[];
  user_id: string;
}): Promise<Task> {
  console.log('Creating new task:', taskData);
  
  const newTask = {
    ...taskData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(newTask)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating task:', error);
    throw new Error(`Failed to create task: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('Failed to retrieve created task');
  }
  
  return data as Task;
}

// Helper function to get the next status in the cycle
export function getNextStatus(currentStatus: string): TaskStatus {
  switch (currentStatus) {
    case 'ToDo':
      return 'InProgress';
    case 'InProgress':
      return 'Done';
    case 'Done':
    default:
      return 'ToDo';
  }
}

// New function to fetch quest tasks in Supabase
export async function fetchQuestTasks(questId: number, userId: string) {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('quest_id', questId)
      .eq('user_id', userId)
      .order('scheduled_for', { ascending: true });

    if (error) {
      console.error('Error fetching quest tasks:', error);
      throw error;
    }

    return tasks || [];
  } catch (err) {
    console.error('Error in fetchQuestTasks:', err);
    throw err;
  }
}

// React Hook
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskListVisible, setTaskListVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useSupabase();

  // Load tasks
  const loadTasks = async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      const data = await fetchTasks(session.user.id);
      setTasks(data);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  // Initial load and subscription setup
  useEffect(() => {
    if (!session?.user?.id) return;
    
    loadTasks();

    // Set up real-time subscription for this user's tasks
    const subscription = supabase
      .channel('tasks_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          console.log('Task change received:', payload);
          loadTasks(); // Reload all tasks when any change occurs
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user?.id]);

  return {
    tasks,
    taskListVisible,
    setTaskListVisible,
    loading,
    error,
    reload: loadTasks
  };
}
