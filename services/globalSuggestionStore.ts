import { TaskSuggestion, QuestSuggestion, MemoSuggestion } from '@/services/agents/SuggestionAgent';

/**
 * GlobalSuggestionStore provides a centralized singleton for storing and accessing
 * task and quest suggestions across the application. This ensures that both the
 * SuggestionAgent and UI components like ChatInterface are always working with
 * the same data.
 */
class GlobalSuggestionStore {
  private static instance: GlobalSuggestionStore;
  
  // The actual suggestion arrays
  private taskSuggestions: TaskSuggestion[] = [];
  private questSuggestions: QuestSuggestion[] = [];
  private memoSuggestions: MemoSuggestion[] = [];
  
  // Callback handlers for data changes
  private updateHandlers: Array<(
    tasks: TaskSuggestion[], 
    quests: QuestSuggestion[],
    memos: MemoSuggestion[]
  ) => void> = [];
  
  // Private constructor to prevent direct instantiation
  private constructor() {
    console.log('🌐 [GlobalSuggestionStore] Created global suggestion store');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): GlobalSuggestionStore {
    if (!GlobalSuggestionStore.instance) {
      GlobalSuggestionStore.instance = new GlobalSuggestionStore();
    }
    return GlobalSuggestionStore.instance;
  }
  
  /**
   * Register a handler to be called whenever suggestions change
   */
  registerUpdateHandler(
    handler: (tasks: TaskSuggestion[], quests: QuestSuggestion[], memos: MemoSuggestion[]) => void
  ): () => void {
    console.log('🌐 [GlobalSuggestionStore] Registering new update handler');
    this.updateHandlers.push(handler);
    
    // Call the handler immediately with current data
    handler([...this.taskSuggestions], [...this.questSuggestions], [...this.memoSuggestions]);
    
    // Return a function to unregister this handler
    return () => {
      console.log('🌐 [GlobalSuggestionStore] Unregistering update handler');
      this.updateHandlers = this.updateHandlers.filter(h => h !== handler);
    };
  }
  
  /**
   * Notify all handlers that data has changed
   */
  private notifyHandlers(): void {
    console.log('🌐 [GlobalSuggestionStore] Notifying handlers of update:', {
      taskCount: this.taskSuggestions.length,
      questCount: this.questSuggestions.length,
      memoCount: this.memoSuggestions.length
    });
    
    for (const handler of this.updateHandlers) {
      try {
        handler([...this.taskSuggestions], [...this.questSuggestions], [...this.memoSuggestions]);
      } catch (error) {
        console.error('🌐 [GlobalSuggestionStore] Error in update handler:', error);
      }
    }
  }
  
  /**
   * Add a task suggestion to the store
   */
  addTaskSuggestion(task: TaskSuggestion): void {
    console.log('🌐 [GlobalSuggestionStore] Adding task suggestion:', task.title);
    this.taskSuggestions = [...this.taskSuggestions, task];
    this.notifyHandlers();
  }
  
  /**
   * Add a quest suggestion to the store
   */
  addQuestSuggestion(quest: QuestSuggestion): void {
    console.log('🌐 [GlobalSuggestionStore] Adding quest suggestion:', quest.title);
    this.questSuggestions = [...this.questSuggestions, quest];
    this.notifyHandlers();
  }

  /**
   * Add a memo suggestion to the store
   */
  addMemoSuggestion(memo: MemoSuggestion): void {
    console.log('🌐 [GlobalSuggestionStore] Adding memo suggestion:', memo.content.substring(0, 30) + '...');
    this.memoSuggestions = [...this.memoSuggestions, memo];
    this.notifyHandlers();
  }
  
  /**
   * Remove a task suggestion by ID
   */
  removeTaskSuggestion(taskId: string): void {
    console.log('🌐 [GlobalSuggestionStore] Removing task suggestion:', taskId);
    this.taskSuggestions = this.taskSuggestions.filter(task => task.id !== taskId);
    this.notifyHandlers();
  }
  
  /**
   * Remove a quest suggestion by ID
   */
  removeQuestSuggestion(questId: string): void {
    console.log('🌐 [GlobalSuggestionStore] Removing quest suggestion:', questId);
    this.questSuggestions = this.questSuggestions.filter(quest => quest.id !== questId);
    this.notifyHandlers();
  }

  /**
   * Remove a memo suggestion by ID
   */
  removeMemoSuggestion(memoId: string): void {
    console.log('🌐 [GlobalSuggestionStore] Removing memo suggestion:', memoId);
    this.memoSuggestions = this.memoSuggestions.filter(memo => memo.id !== memoId);
    this.notifyHandlers();
  }
  
  /**
   * Get all task suggestions
   */
  getTaskSuggestions(): TaskSuggestion[] {
    return [...this.taskSuggestions];
  }
  
  /**
   * Get all quest suggestions
   */
  getQuestSuggestions(): QuestSuggestion[] {
    return [...this.questSuggestions];
  }

  /**
   * Get all memo suggestions
   */
  getMemoSuggestions(): MemoSuggestion[] {
    return [...this.memoSuggestions];
  }
  
  /**
   * Clear all suggestions
   */
  clearSuggestions(): void {
    console.log('🌐 [GlobalSuggestionStore] Clearing all suggestions');
    this.taskSuggestions = [];
    this.questSuggestions = [];
    this.memoSuggestions = [];
    this.notifyHandlers();
  }
  
  /**
   * Add a suggestion (either task, quest, or memo)
   */
  addSuggestion(suggestion: TaskSuggestion | QuestSuggestion | MemoSuggestion): void {
    if (suggestion.type === 'task') {
      this.addTaskSuggestion(suggestion as TaskSuggestion);
    } else if (suggestion.type === 'quest') {
      this.addQuestSuggestion(suggestion as QuestSuggestion);
    } else if (suggestion.type === 'memo') {
      this.addMemoSuggestion(suggestion as MemoSuggestion);
    }
  }
}

// Export the singleton instance
export const globalSuggestionStore = GlobalSuggestionStore.getInstance();