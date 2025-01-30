export interface Task {
  id: number;  // Changed from string to number
  title: string;
  location: string;
  scheduledFor: string;
  deadline?: string;
  quest?: string;  // Add quest field
}

export interface KanbanBoard {
  ToDo: string[];
  InProgress: string[];
  Done: string[];
}

export interface MainQuest {
  title: string;
  progress: string;
  kanban: KanbanBoard;
}

export interface ChatMessage {
  isUser: boolean;  // Replace sender string with boolean
  message: string;
}

export interface Quest {
  id: number;
  title: string;
  status: 'Active' | 'On-Hold' | 'Completed';
  shortDescription: string;
  questStatus: string;
  analysis: string; // Add this field for structured XML data
  progress: string;
  tasks: Task[];
  kanban?: KanbanBoard;
  isMain?: boolean;
}

export default {};
