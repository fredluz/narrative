export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  scheduled_for: string;  // Changed from scheduledFor
  location: string;
  quest_id: number;      // Changed from questId
  deadline?: string;
  status: 'ToDo' | 'InProgress' | 'Done';
  quest?: Quest;         // For joined data
}

export interface JournalEntry extends BaseEntity {
  title: string;
  userEntry: string;
  aiAnalysis: string;
}

// Keeping QuestDescription for historical records
export interface QuestDescriptionHistory extends BaseEntity {
  message: string;
  timestamp: string;
  quest_id: number;  // Changed from questId to match naming convention
  is_current: boolean;  // Changed from isCurrent to match naming convention
}

export interface QuestDescription extends BaseEntity {
  message: string;
  quest_id: number;
  is_current: boolean;
  tags?: string[];     // Make tags optional as it might be null
}

export interface Quest extends BaseEntity {
  title: string;
  tagline: string;
  is_main: boolean;
  status: 'Active' | 'On-Hold' | 'Completed';
  tasks?: Task[];
  analysis?: string;
  parent_quest_id?: number;
  start_date?: string;
  end_date?: string;
  current_description?: QuestDescription; // For joined data
  description_history?: QuestDescription[];
}

export interface ChatMessage extends BaseEntity {
  message: string;
  is_user: boolean;  // Changed from isUser to match database schema
  chat_session_id?: string;  // Added to link messages to sessions
}

export interface ChatSession extends BaseEntity {
  summary: string;
  tags: string[];  // Added tags array
}
