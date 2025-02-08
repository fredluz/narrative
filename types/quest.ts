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

export interface QuestStatus extends BaseEntity {
  message: string;
  timestamp: string;
  questId: number;
}

export interface Quest extends BaseEntity {
  title: string;
  shortDescription: string;
  isMain: boolean;
  status: 'Active' | 'On-Hold' | 'Completed';
  progress: string;
  questStatus?: string;
  currentStatus?: QuestStatus;
  tasks: Task[];
  kanban?: Record<string, string[]>;
  analysis?: string;
  parentQuestId?: number;
  startDate?: string;
  endDate?: string;
  StatusHistory?: Record<string, QuestStatus>;
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
