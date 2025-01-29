export interface Task {
  id: string;
  title: string;
  location: string;
  scheduledFor: string;
  deadline?: string;  // Make deadline optional
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
  sender: string;
  message: string;
}

export default {};
