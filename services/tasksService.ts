import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/app/types';

// Define types for status
export type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

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

// New function to update task status in Supabase
export async function updateTaskStatus(taskId: number, newStatus: TaskStatus): Promise<void> {
  console.log(`Updating task ${taskId} to ${newStatus} in Supabase`);
  
  const { error } = await supabase
    .from('tasks')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', taskId);
  
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
