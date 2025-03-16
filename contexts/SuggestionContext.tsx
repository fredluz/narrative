import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TaskSuggestion, QuestSuggestion, SuggestionAgent } from '@/services/agents/SuggestionAgent';
import { Quest, Task } from '@/app/types';
import { globalSuggestionStore } from '@/services/globalSuggestionStore';
import { useSupabase } from './SupabaseContext';
import { QuestAgent } from '@/services/agents/QuestAgent';

type Suggestion = TaskSuggestion | QuestSuggestion ;

// Define the shape of our context
interface SuggestionContextType {
  taskSuggestions: TaskSuggestion[];
  questSuggestions: QuestSuggestion[];
  currentTaskSuggestion: TaskSuggestion | null;
  currentQuestSuggestion: QuestSuggestion | null;
  combinedSuggestionActive: boolean;
  isAnalyzing: boolean;
  
  // Analysis methods
  analyzeJournalEntry: (entry: string, userId: string) => Promise<void>;
  
  // Navigation methods
  nextTaskSuggestion: () => void;
  prevTaskSuggestion: () => void;
  nextQuestSuggestion: () => void;
  prevQuestSuggestion: () => void;
  
  // Action methods
  acceptTaskSuggestion: (task: TaskSuggestion) => Promise<Task | null>;
  rejectTaskSuggestion: (taskId: string) => void;
  acceptQuestSuggestion: (quest: QuestSuggestion) => Promise<Quest | null>;
  rejectQuestSuggestion: (questId: string) => void;
  upgradeTaskToQuest: (task: TaskSuggestion) => Promise<void>;
  
  clearSuggestions: () => void;
}

// Create the context with default values
const SuggestionContext = createContext<SuggestionContextType>({
  taskSuggestions: [],
  questSuggestions: [],
  currentTaskSuggestion: null,
  currentQuestSuggestion: null,
  combinedSuggestionActive: false,
  isAnalyzing: false,
  
  analyzeJournalEntry: async () => {},
  
  nextTaskSuggestion: () => {},
  prevTaskSuggestion: () => {},
  nextQuestSuggestion: () => {},
  prevQuestSuggestion: () => {},
  
  acceptTaskSuggestion: async () => null,
  rejectTaskSuggestion: () => {},
  acceptQuestSuggestion: async () => null,
  rejectQuestSuggestion: () => {},
  upgradeTaskToQuest: async () => {},
  
  clearSuggestions: () => {},
});

// Create the context provider component
export const SuggestionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Access the session for userId
  const { session } = useSupabase();
  
  // Get the userId if available
  const userId = session?.user?.id || '';
  
  // Set up state for suggestions and tracking
  const [taskSuggestions, setTaskSuggestions] = useState<TaskSuggestion[]>([]);
  const [questSuggestions, setQuestSuggestions] = useState<QuestSuggestion[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(-1);
  const [currentQuestIndex, setCurrentQuestIndex] = useState<number>(-1);
  const [combinedSuggestionActive, setCombinedSuggestionActive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // Get singleton instances
  const suggestionAgent = SuggestionAgent.getInstance();
  const questAgent = new QuestAgent();

  // Internal helper functions moved from SuggestionAgent
  const addSuggestionToQueue = useCallback((suggestion: Suggestion) => {
    console.log('\n=== SuggestionContext.addSuggestionToQueue ===');
    console.log('Adding suggestion:', {
      type: suggestion.type,
      id: suggestion.id,
      title: suggestion.type === 'task' ? suggestion.title : 
            suggestion.type === 'quest' ? (suggestion as QuestSuggestion).title : 
            null,
      sourceType: suggestion.sourceType,
      timestamp: suggestion.timestamp
    });
    
    // Add the suggestion to the global store
    globalSuggestionStore.addSuggestion(suggestion);
  }, []);

  const clearSuggestionQueue = useCallback(() => {
    console.log('🧹 [SuggestionContext] Clearing suggestion queue');
    globalSuggestionStore.clearSuggestions();
  }, []);

  const removeTaskSuggestion = useCallback((id: string) => {
    console.log('🗑️ [SuggestionContext] Removing task suggestion:', id);
    globalSuggestionStore.removeTaskSuggestion(id);
  }, []);

  const removeQuestSuggestion = useCallback((id: string) => {
    console.log('🗑️ [SuggestionContext] Removing quest suggestion:', id);
    globalSuggestionStore.removeQuestSuggestion(id);
  }, []);

  // Subscribe to changes in the globalSuggestionStore
  useEffect(() => {
    console.log('🔌 [SuggestionContext] Setting up subscription to globalSuggestionStore');
    
    // Register an update handler with the global store
    const unsubscribe = globalSuggestionStore.registerUpdateHandler((tasks, quests) => {
      console.log('📢 [SuggestionContext] Received update from globalSuggestionStore:', {
        taskCount: tasks.length,
        questCount: quests.length,
      });
      
      setTaskSuggestions(tasks);
      setQuestSuggestions(quests);
      
      // Update indices if needed
      if (tasks.length > 0 && currentTaskIndex < 0) {
        setCurrentTaskIndex(0);
      } else if (tasks.length === 0) {
        setCurrentTaskIndex(-1);
      }
      
      if (quests.length > 0 && currentQuestIndex < 0) {
        setCurrentQuestIndex(0);
      } else if (quests.length === 0) {
        setCurrentQuestIndex(-1);
      }
    });
    
    // Clean up subscription on unmount
    return () => {
      console.log('🔌 [SuggestionContext] Cleaning up subscription to globalSuggestionStore');
      unsubscribe();
    };
  }, [currentTaskIndex, currentQuestIndex]);
  
  // Add event listener for new suggestions from ChatAgent
  useEffect(() => {
    const handleNewSuggestions = (event: CustomEvent<{ suggestions: TaskSuggestion[] }>) => {
      console.log('📢 [SuggestionContext] Received new suggestions from ChatAgent:', event.detail.suggestions);
      event.detail.suggestions.forEach(suggestion => {
        addSuggestionToQueue(suggestion);
      });
    };

    // Add event listener with type assertion
    window.addEventListener('newSuggestions', handleNewSuggestions as EventListener);
    
    return () => {
      window.removeEventListener('newSuggestions', handleNewSuggestions as EventListener);
    };
  }, [addSuggestionToQueue]);

  // Compute current suggestions based on indices
  const currentTaskSuggestion = 
    currentTaskIndex >= 0 && taskSuggestions.length > 0 ? 
    taskSuggestions[currentTaskIndex % taskSuggestions.length] : null;
  
  const currentQuestSuggestion = 
    currentQuestIndex >= 0 && questSuggestions.length > 0 ? 
    questSuggestions[currentQuestIndex % questSuggestions.length] : null;
  
  // Log when current selections change
  useEffect(() => {
    console.log('🔄 [SuggestionContext] Current selections updated:', {
      currentTask: currentTaskSuggestion?.title || 'None',
      currentQuest: currentQuestSuggestion?.title || 'None'
    });
  }, [currentTaskSuggestion, currentQuestSuggestion]);

  const value: SuggestionContextType = {
    taskSuggestions,
    questSuggestions,
    currentTaskSuggestion,
    currentQuestSuggestion,
    combinedSuggestionActive,
    isAnalyzing,
    
    // Analysis methods - these still use SuggestionAgent for LLM operations
    analyzeJournalEntry: async (entry: string, userId: string) => {
      console.log('📝 [SuggestionContext] Analyzing journal entry');
      setIsAnalyzing(true);
      try {
        const result = await suggestionAgent.analyzeJournalEntry(entry, userId);
        if (result) {
          addSuggestionToQueue(result);
        }
      } finally {
        setIsAnalyzing(false);
      }
    },
    
    // Navigation methods
    nextTaskSuggestion: () => {
      console.log('⏭️ [SuggestionContext] Moving to next task suggestion');
      if (taskSuggestions.length > 0) {
        setCurrentTaskIndex((prev) => (prev + 1) % taskSuggestions.length);
      }
    },
    
    prevTaskSuggestion: () => {
      console.log('⏮️ [SuggestionContext] Moving to previous task suggestion');
      if (taskSuggestions.length > 0) {
        setCurrentTaskIndex((prev) => {
          if (prev <= 0) return taskSuggestions.length - 1;
          return prev - 1;
        });
      }
    },
    
    nextQuestSuggestion: () => {
      console.log('⏭️ [SuggestionContext] Moving to next quest suggestion');
      if (questSuggestions.length > 0) {
        setCurrentQuestIndex((prev) => (prev + 1) % questSuggestions.length);
      }
    },
    
    prevQuestSuggestion: () => {
      console.log('⏮️ [SuggestionContext] Moving to previous quest suggestion');
      if (questSuggestions.length > 0) {
        setCurrentQuestIndex((prev) => {
          if (prev <= 0) return questSuggestions.length - 1;
          return prev - 1;
        });
      }
    },
    
    // Action methods that use both local state and SuggestionAgent
    acceptTaskSuggestion: async (task: TaskSuggestion) => {
      console.log('✅ [SuggestionContext] Accepting task suggestion:', task.title);
      if (!userId) {
        console.error('No user ID available to accept task');
        return null;
      }
      const result = await suggestionAgent.acceptTaskSuggestion(task, userId);
      if (result) {
        removeTaskSuggestion(task.id);
      }
      return result;
    },
    
    rejectTaskSuggestion: (taskId: string) => {
      console.log('❌ [SuggestionContext] Rejecting task suggestion:', taskId);
      removeTaskSuggestion(taskId);
    },
    
    acceptQuestSuggestion: async (quest: QuestSuggestion) => {
      console.log('✅ [SuggestionContext] Accepting quest suggestion:', quest.title);
      if (!userId) {
        console.error('No user ID available to accept quest');
        return null;
      }
      const result = await suggestionAgent.acceptQuestSuggestion(quest, userId);
      if (result) {
        removeQuestSuggestion(quest.id);
      }
      return result;
    },
    
    rejectQuestSuggestion: (questId: string) => {
      console.log('❌ [SuggestionContext] Rejecting quest suggestion:', questId);
      removeQuestSuggestion(questId);
    },

    upgradeTaskToQuest: async (task: TaskSuggestion) => {
      console.log('⬆️ [SuggestionContext] Upgrading task to quest:', task.title);
      const quest = await suggestionAgent.upgradeTaskToQuest(task);
      if (quest) {
        addSuggestionToQueue(quest);
        removeTaskSuggestion(task.id);
      }
    },
    
    clearSuggestions: clearSuggestionQueue,
  };

  return (
    <SuggestionContext.Provider value={value}>
      {children}
    </SuggestionContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useSuggestions = () => useContext(SuggestionContext);

export default SuggestionContext;