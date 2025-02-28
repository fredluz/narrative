export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
  tags?: string[];
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  scheduledFor: string;
  location: string;
  questId: number;
  deadline?: string;
  quest?: Quest; // For joined data
}

export interface JournalEntry extends BaseEntity {
  title: string;
  userEntry: string;
  aiAnalysis: string;
}

export interface QuestDescription extends BaseEntity {
  message: string;
  timestamp: string;
  questId: number;
  isCurrent: boolean
}

export interface Quest extends BaseEntity {
  title: string;
  tagline: string;
  is_main: boolean;  // Changed from isMain
  status: 'Active' | 'On-Hold' | 'Completed';
  questStatus?: string;
  description?: QuestDescription;
  tasks?: Task[];  // Added as optional since it's a joined field
  analysis?: string;
  parent_quest_id?: number;  // Changed from parentQuestId
  start_date?: string;  // Changed from startDate
  end_date?: string;   // Changed from endDate
  descriptionHistory?: Record<string, QuestDescription>;
}

export interface Memo extends BaseEntity {
  title: string;
  content: string;
  questId: number;
}

export interface MainQuest {
  id: number;
  title: string;
  progress: string;
  kanban: Record<string, string[]>;
}
