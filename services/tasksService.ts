import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/app/types';
import { useSupabase } from '@/contexts/SupabaseContext';

// Define types for status
export type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

// Database operations
export async function fetchTasks(userId: string): Promise<Task[]> {
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

export async function fetchTasksByQuest(questId: number, userId: string): Promise<Task[]> {
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

/**
 * Update a task with specified fields
 * @param taskId ID of the task to update
 * @param updateData Object containing fields to update
 * @param userId User ID for ownership verification
 * @returns The updated task
 */
export async function updateTask(taskId: number, updateData: Record<string, any>, userId: string): Promise<Task> {
  console.log('[tasksService] Updating task:', { taskId, fields: Object.keys(updateData) });
  
  // First verify ownership
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('user_id')
    .eq('id', taskId)
    .single();

  if (fetchError) {
    console.error('[tasksService] Error verifying task ownership:', fetchError);
    throw new Error(`Failed to verify task ownership: ${fetchError.message}`);
  }

  if (!task || task.user_id !== userId) {
    console.error('[tasksService] Cannot update task: User does not own this task');
    throw new Error('You do not have permission to update this task');
  }
  
  // Add updated_at timestamp if not provided
  if (!updateData.updated_at) {
    updateData.updated_at = new Date().toISOString();
  }
  
  // Perform the update
  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) {
    console.error('[tasksService] Error updating task:', error);
    throw new Error(`Failed to update task: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('Failed to retrieve updated task data');
  }
  
  return data as Task;
}

// New function to update task status in Supabase
export async function updateTaskStatus(taskId: number, newStatus: TaskStatus, userId: string): Promise<void> {
  // First verify ownership
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('user_id')
    .eq('id', taskId)
    .single();

  if (fetchError) {
    console.error('Error verifying task ownership:', fetchError);
    throw new Error(`Failed to verify task ownership: ${fetchError.message}`);
  }

  if (!task || task.user_id !== userId) {
    console.error('Cannot update task: User does not own this task');
    throw new Error('You do not have permission to update this task');
  }
  
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
  // First verify quest ownership
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('user_id')
    .eq('id', questId)
    .single();

  if (questError) {
    console.error('Error verifying quest ownership:', questError);
    throw new Error(`Failed to verify quest ownership: ${questError.message}`);
  }

  if (!quest || quest.user_id !== userId) {
    console.error('Cannot fetch tasks: User does not own this quest');
    throw new Error('You do not have permission to view these tasks');
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .order('scheduled_for', { ascending: true });

  if (error) throw error;
  return tasks || [];
}

// Delete task function
export async function deleteTask(taskId: number, userId: string): Promise<void> {
  console.log('[tasksService] Starting task deletion process', { taskId, userId });
  
  // First verify ownership
  console.log('[tasksService] Verifying task ownership');
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('user_id')
    .eq('id', taskId)
    .single();

  if (fetchError) {
    console.error('[tasksService] Error verifying task ownership:', fetchError);
    throw new Error(`Failed to verify task ownership: ${fetchError.message}`);
  }

  if (!task) {
    console.error('[tasksService] No task found with ID:', taskId);
    throw new Error('Task not found');
  }

  if (task.user_id !== userId) {
    console.error('[tasksService] Task ownership verification failed', { 
      taskUserId: task.user_id, 
      requestingUserId: userId 
    });
    throw new Error('You do not have permission to delete this task');
  }

  console.log('[tasksService] Task ownership verified, proceeding with deletion');
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('[tasksService] Error during task deletion:', error);
    throw new Error(`Failed to delete task: ${error.message}`);
  }
  
  console.log('[tasksService] Task deleted successfully');
  return Promise.resolve();
}

// New function to fetch tasks by status
export async function fetchTasksByStatus(userId: string, statuses: TaskStatus[]): Promise<Task[]> {
  console.log('Fetching tasks with statuses:', statuses);
  
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
    .in('status', statuses)
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('Error fetching tasks by status:', error);
    throw error;
  }

  return data || [];
}

// Helper function to get only active tasks (ToDo and InProgress)
export async function fetchActiveTasks(userId: string): Promise<Task[]> {
  return fetchTasksByStatus(userId, ['ToDo', 'InProgress']);
}

// React Hook
export function useTasks(providedUserId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskListVisible, setTaskListVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useSupabase();

  // Use provided userId if available, otherwise fall back to session user
  const userId = providedUserId || session?.user?.id;

  // Load tasks
  const loadTasks = async () => {
    if (!userId) {
      console.warn("useTasks: No userId provided, skipping task load");
      return;
    }
    
    try {
      setLoading(true);
      const data = await fetchTasks(userId);
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
    if (!userId) return;
    
    loadTasks();

    // Set up real-time subscription for this user's tasks
    const subscription = supabase
      .channel('tasks_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'tasks',
          filter: `user_id=eq.${userId}`
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
  }, [userId]);

  return {
    tasks,
    taskListVisible,
    setTaskListVisible,
    loading,
    error,
    reload: loadTasks
  };
}
