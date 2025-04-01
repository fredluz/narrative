import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { supabase } from '@/lib/supabase';
import type { Task } from '@/app/types';
// import { useSupabase } from '@/contexts/SupabaseContext'; // Removed Supabase session
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk

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
    .eq('clerk_id', userId) // Use clerk_id
    .order('scheduled_for', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  console.log('Fetched tasks:', data);
  return data as Task[];
}

export async function fetchTasksByQuest(questId: number, userId: string): Promise<Task[]> { // userId is now Clerk ID (text)
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('quest_id', questId)
    .eq('clerk_id', userId) // Use clerk_id
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
    .eq('clerk_id', userId) // Use clerk_id
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

  // Ownership check removed - RLS handles this based on the JWT

  // Add updated_at timestamp if not provided
  if (!updateData.updated_at) {
    updateData.updated_at = new Date().toISOString();
  }

  // Perform the update - RLS policy will enforce ownership
  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    // .eq('clerk_id', userId) // This check is now handled by RLS using clerk_id
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
    .select('clerk_id')
    .eq('id', taskId)
    .single();

  if (fetchError) {
    console.error('Error verifying task ownership:', fetchError);
    throw new Error(`Failed to verify task ownership: ${fetchError.message}`);
  }

  if (!task || task.clerk_id !== userId) {
    console.error('Cannot update task: User does not own this task');
    throw new Error('You do not have permission to update this task');
  }
  
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('clerk_id', userId);
  
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
  clerk_id: string; // This is the Clerk ID (text) coming from the app
}): Promise<Task> {
  console.log('Creating new task:', taskData);

  // Map the incoming clerk_id (Clerk ID) to the clerk_id column
  // Omit the clerk_id field from the object being inserted into the DB
  const { clerk_id: clerkId, ...restData } = taskData;

  const newTask = {
    ...restData,
    clerk_id: clerkId, // Insert Clerk ID into the correct column
    // clerk_id: undefined, // Explicitly ensure the old uuid column isn't set (or let default handle if applicable)
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
export async function fetchQuestTasks(questId: number, userId: string) { // userId is now Clerk ID (text)
  // First verify quest ownership
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('clerk_id')
    .eq('id', questId)
    .single();

  if (questError) {
    console.error('Error verifying quest ownership:', questError);
    throw new Error(`Failed to verify quest ownership: ${questError.message}`);
  }

  if (!quest || quest.clerk_id !== userId) {
    console.error('Cannot fetch tasks: User does not own this quest');
    throw new Error('You do not have permission to view these tasks');
  }

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('quest_id', questId)
    .eq('clerk_id', userId) // Use clerk_id
    .order('scheduled_for', { ascending: true });

  if (error) throw error;
  return tasks || [];
}

// Delete task function
export async function deleteTask(taskId: number, userId: string): Promise<void> {
  console.log('[tasksService] Starting task deletion process', { taskId, userId });

  // Ownership check removed - RLS handles this based on the JWT

  console.log('[tasksService] Proceeding with deletion (RLS will verify ownership)');

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
    // .eq('clerk_id', userId); // This check is now handled by RLS using clerk_id

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
    .eq('clerk_id', userId)
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
  const { userId: authUserId } = useAuth(); // Get userId from Clerk

  // Use provided userId if available, otherwise fall back to Clerk user
  const userId = providedUserId || authUserId;

  // Load tasks - wrapped in useCallback
  const loadTasks = useCallback(async () => {
    if (!userId) {
      console.warn("useTasks: No userId provided, skipping task load");
      setTasks([]); // Clear tasks if no user
      setLoading(false); // Ensure loading stops
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
  }, [userId]); // Depend on the resolved userId

  // Initial load and subscription setup
  useEffect(() => {
    if (!userId) {
        setTasks([]); // Clear tasks if user logs out or isn't available initially
        return; // Exit if no userId
    }

    loadTasks(); // Initial load

    // Set up real-time subscription for this user's tasks
    const subscription = supabase
      .channel('tasks_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `clerk_id=eq.${userId}` // Use clerk_id in filter
        },
        (payload) => {
          console.log('Task change received:', payload);
          loadTasks(); // Reload all tasks when any change occurs
        }
      )
      .subscribe((status, err) => { // Add error handling for subscription
        if (err) {
          console.error('Supabase subscription error in useTasks:', err);
          setError('Subscription error: ' + err.message);
        }
      });

    // Cleanup function
    return () => {
      subscription.unsubscribe();
    };
  }, [userId, loadTasks]); // Depend on userId and loadTasks callback

  return {
    tasks,
    taskListVisible,
    setTaskListVisible,
    loading,
    error,
    reload: loadTasks
  };
}
