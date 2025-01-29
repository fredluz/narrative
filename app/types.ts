export interface Task {
  id: string;
  title: string;
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