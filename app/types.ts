export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
  user_id: string;
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  scheduled_for: string;
  location: string;
  quest_id: number;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  subtasks?: string;
  status: 'ToDo' | 'InProgress' | 'Done';
  quest?: Quest;
}

export interface JournalEntry extends BaseEntity {
  title: string;
  user_entry: string;
  ai_analysis: string;
  ai_response: string;
}

export interface CheckupEntry extends BaseEntity {
  content: string;  
  daily_entry_id?: number;
  ai_checkup_response?: string;
}

export interface Quest extends BaseEntity {
  title: string;
  tagline: string;
  description?: string;
  is_main: boolean;
  status: 'Active' | 'On-Hold' | 'Completed';
  tasks?: Task[];
  analysis?: string;
  parent_quest_id?: number;
  start_date?: string;
  end_date?: string;
  relevance?: string;
  relevantTasks?: {
    taskId: number;
    name: string;
    description: string;
    relevance: string;
  }[];
  memos?: {
    id: string;
    content: string;
    created_at: string;
    source: string;
    context?: string;
  }[];
}

export interface ChatMessage extends BaseEntity {
  message: string;
  is_user: boolean;
  chat_session_id?: string;
}

export interface ChatSession extends BaseEntity {
  summary: string;
  tags: string[];
}
