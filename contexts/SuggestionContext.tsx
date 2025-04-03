import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Removed duplicate import line
import { TaskSuggestion, QuestSuggestion, SuggestionAgent } from '@/services/agents/SuggestionAgent';
import { Quest, Task } from '@/app/types';
import { globalSuggestionStore } from '@/services/globalSuggestionStore';
// import { useSupabase } from './SupabaseContext'; // Removed Supabase auth context
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk
import { QuestAgent } from '@/services/agents/QuestAgent';
import { fetchQuests } from '@/services/questsService';
import { eventsService, EVENT_NAMES } from '@/services/eventsService';
import { updateTask, createTask } from '@/services/tasksService'; // Ensure you are importing createTask
import { ActivityIndicator } from 'react-native'; // Import ActivityIndicator


type Suggestion = TaskSuggestion | QuestSuggestion ;

// Define the shape of our context
interface SuggestionContextType {
  taskSuggestions: TaskSuggestion[];
  questSuggestions: QuestSuggestion[];
  currentTaskSuggestion: TaskSuggestion | null;
  currentQuestSuggestion: QuestSuggestion | null;
  combinedSuggestionActive: boolean;
  isAnalyzing: boolean;

  // Add the isAcceptingTask and isAcceptingQuest properties to the interface
  isAcceptingTask: string | null;
  isAcceptingQuest: string | null;

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
  isAcceptingTask: null,
  isAcceptingQuest: null,
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
  // Get auth state and userId from Clerk
  const { userId, isSignedIn } = useAuth(); // userId can be null if not signed in

  // Set up state for suggestions and tracking
  const [taskSuggestions, setTaskSuggestions] = useState<TaskSuggestion[]>([]);
  const [questSuggestions, setQuestSuggestions] = useState<QuestSuggestion[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(-1);
  const [currentQuestIndex, setCurrentQuestIndex] = useState<number>(-1);
  const [combinedSuggestionActive, setCombinedSuggestionActive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isAcceptingTask, setIsAcceptingTask] = useState<string | null>(null); // Track specific task ID being accepted
  const [isAcceptingQuest, setIsAcceptingQuest] = useState<string | null>(null); // Track specific quest ID being accepted


  // Get singleton instances
  const suggestionAgent = SuggestionAgent.getInstance();
  const questAgent = new QuestAgent();
  
  // Internal helper functions moved from SuggestionAgent
  const addSuggestionToQueue = useCallback((suggestion: Suggestion) => {
    console.log('\n=== SuggestionContext.addSuggestionToQueue ===');

    // MODIFY this console.log section:
    console.log('Adding suggestion:', {
      type: suggestion.type,
      id: suggestion.id,
      // Use conditional access based on type
      quest_id: suggestion.type === 'task' ? suggestion.quest_id : undefined,
      title: suggestion.type === 'task' ? suggestion.title :
             suggestion.type === 'quest' ? (suggestion as QuestSuggestion).title :
             null,
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

  const updateSuggestionsInStore = useCallback((taskId: string, updates: Partial<TaskSuggestion>) => {
    console.log(`🔄 [SuggestionContext] Updating task suggestion ${taskId} in store with:`, updates);
    // This is tricky with a singleton store. The store itself needs an update method,
    // or we need to remove and re-add. For simplicity, let's remove and re-add if ID doesn't change.
    const currentTasks = globalSuggestionStore.getTaskSuggestions();
    const taskIndex = currentTasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1) {
        const updatedTask = { ...currentTasks[taskIndex], ...updates };
        // Ideally, the store would have an update method. Workaround:
        globalSuggestionStore.removeTaskSuggestion(taskId);
        globalSuggestionStore.addTaskSuggestion(updatedTask); // Add updated version
    } else {
        console.warn(`[SuggestionContext] Task ${taskId} not found in store for update.`);
    }
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
  
  // Event handler type definitions
  type JournalAnalysisHandler = (data: { entry: string; userId: string }) => void;
  type SuggestionsHandler = (data: { suggestions: Suggestion[] }) => void;

  // Event handler types with proper typing
  type JournalAnalysisEventData = {
    entry: string;
    userId: string;
  };

  type NewSuggestionsEventData = {
    suggestions: Suggestion[];
  };

  // Create stable references to handlers using useCallback with proper types
  // REPLACE the ENTIRE handleJournalAnalysis callback

  const handleJournalAnalysis = useCallback(async (data: JournalAnalysisEventData) => {
    if (isAnalyzing) {
      console.log('🚫 Already analyzing, skipping duplicate event');
      return;
    }
    // Ensure userId exists before proceeding with analysis that requires it
    if (!data.userId) {
        console.warn('🚫 [SuggestionContext] handleJournalAnalysis - No userId available, cannot process.');
        return;
    }

    console.log(`📢 [SuggestionContext] Processing journal analysis/chat message for user ${data.userId}`);
    setIsAnalyzing(true);

    try {
      console.log('🎯 [SuggestionContext] handleJournalAnalysis - Further processing (if any)...');
      // Example: Pass userId to suggestionAgent if needed
      // await suggestionAgent.processEntry(data.entry, data.userId);

    } catch (error) {
      console.error('❌ Error in handleJournalAnalysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [suggestionAgent, addSuggestionToQueue, isAnalyzing]); // Removed userId dependency here as it's passed in data


  const handleNewSuggestions = useCallback((data: NewSuggestionsEventData) => {
    console.log('📢 [SuggestionContext] Received new suggestions:', data.suggestions);
    data.suggestions.forEach((suggestion: Suggestion) => {
      addSuggestionToQueue(suggestion);
    });
  }, [addSuggestionToQueue]);

  // Subscribe to events with proper cleanup
  useEffect(() => {
    console.log('🔌 [SuggestionContext] Setting up event subscriptions');
    
    // Add listeners and store the returned EventEmitter instances
    const journalListener = eventsService.addListener(
      EVENT_NAMES.ANALYZE_JOURNAL_ENTRY, 
      handleJournalAnalysis
    );
    
    const suggestionsListener = eventsService.addListener(
      EVENT_NAMES.NEW_SUGGESTIONS, 
      handleNewSuggestions
    );
    
    // Cleanup function uses the stored listeners
    return () => {
      console.log('🧹 [SuggestionContext] Cleaning up event subscriptions');
      eventsService.removeListener(EVENT_NAMES.ANALYZE_JOURNAL_ENTRY, handleJournalAnalysis);
      eventsService.removeListener(EVENT_NAMES.NEW_SUGGESTIONS, handleNewSuggestions);
    };
  }, [handleJournalAnalysis, handleNewSuggestions]);

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
    isAcceptingTask, // Expose loading state
    isAcceptingQuest,
    
    // Analysis methods - these still use SuggestionAgent for LLM operations
    analyzeJournalEntry: async (entry: string, userId: string) => {
      if (!isAnalyzing) {
         handleJournalAnalysis({ entry, userId });
         console.log('📢 [SuggestionContext] Emitting ANALYZE_JOURNAL_ENTRY event.');
         eventsService.emit(EVENT_NAMES.ANALYZE_JOURNAL_ENTRY, { entry, userId });
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
      console.log(`✅ [SuggestionContext] Accepting task suggestion: ${task.title} (ID: ${task.id})`);
      // Get current userId from Clerk hook inside the function
      const currentUserId = userId;
      if (!currentUserId) {
        console.error('No user ID available (Clerk). Cannot accept task.');
        return null;
      }
      // **NEW: Check if task is pending quest creation**
      if (task.pendingQuestClientId) {
          console.warn(`🚫 Task "${task.title}" cannot be accepted yet. Associated quest (Client ID: ${task.pendingQuestClientId}) must be accepted first.`);
          // Optionally: Show feedback to the user (e.g., toast message)
          alert(`Please accept the related quest suggestion first before accepting this task.`);
          return null; // Prevent acceptance
      }

      setIsAcceptingTask(task.id); // Set loading state for this specific task

      try {
          // Handle continuation task logic (mark previous as done)
          if (task.continuesFromTask && task.continuesFromTask.id && task.continuesFromTask.status !== 'Done') {
              console.log(`🔄 Marking previous task ${task.continuesFromTask.id} as Done before accepting continuation.`);
              await updateTask(task.continuesFromTask.id, {
                  status: 'Done' as const,
                  updated_at: new Date().toISOString()
              }, currentUserId); // Pass currentUserId
          }

          // Call SuggestionAgent's accept logic (which handles create/update)
          const result = await suggestionAgent.acceptTaskSuggestion(task, currentUserId); // Pass currentUserId

          if (result) {
              console.log(`✅ Task "${task.title}" accepted successfully (DB ID: ${result.id}). Removing suggestion.`);
              removeTaskSuggestion(task.id); // Remove from store on success
          } else {
               console.error(`❌ Failed to accept task "${task.title}" in SuggestionAgent.`);
               // Suggestion remains for retry or rejection
          }
          return result; // Return the created/updated task or null

      } catch (error) {
          console.error(`❌ Error accepting task suggestion ${task.title}:`, error);
          return null;
      } finally {
          setIsAcceptingTask(null); // Clear loading state
      }
    },
    
    rejectTaskSuggestion: (taskId: string) => {
      console.log('❌ [SuggestionContext] Rejecting task suggestion:', taskId);
      removeTaskSuggestion(taskId);
    },
    
    acceptQuestSuggestion: async (quest: QuestSuggestion) => {
      console.log(`✅ [SuggestionContext] Accepting quest suggestion: ${quest.title} (Client ID: ${quest.id})`);
      // Get current userId from Clerk hook inside the function
      const currentUserId = userId;
      if (!currentUserId) {
          console.error('No user ID available (Clerk). Cannot accept quest.');
          return null;
      }

      setIsAcceptingQuest(quest.id); // Set loading state

      try {
          // Call SuggestionAgent's accept logic to create the quest in DB
          const createdQuest = await suggestionAgent.acceptQuestSuggestion(quest, currentUserId); // Pass currentUserId

          if (createdQuest && createdQuest.id) {
              console.log(`✅ Quest "${quest.title}" created in DB (ID: ${createdQuest.id}). Updating associated tasks...`);

              // **NEW: Update pending tasks**
              const taskClientIdsToUpdate = quest.pendingTaskClientIds || [];
              if (taskClientIdsToUpdate.length > 0) {
                  console.log(`Found ${taskClientIdsToUpdate.length} tasks to link to Quest ID ${createdQuest.id}`);
                  const currentTasks = globalSuggestionStore.getTaskSuggestions(); // Get current tasks

                  taskClientIdsToUpdate.forEach(taskId => {
                      const taskToUpdate = currentTasks.find(t => t.id === taskId && t.pendingQuestClientId === quest.id);
                      if (taskToUpdate) {
                          console.log(`Updating task ${taskId} (${taskToUpdate.title}) with quest_id ${createdQuest.id}`);
                          // Update the task suggestion in the store/state
                          updateSuggestionsInStore(taskId, {
                              quest_id: createdQuest.id,
                              pendingQuestClientId: undefined // Clear the pending flag
                          });
                      } else {
                          console.warn(`Task with client ID ${taskId} not found or not pending for quest ${quest.id}.`);
                      }
                  });
                   // Ensure the store notifies listeners after batch update (might need explicit notify call depending on store impl)
                   globalSuggestionStore['notifyHandlers'](); // Assuming notifyHandlers is accessible or store updates trigger it
              }

              removeQuestSuggestion(quest.id); // Remove quest suggestion from store on success
              return createdQuest; // Return the created quest

          } else {
              console.error(`❌ Failed to accept quest "${quest.title}" in SuggestionAgent.`);
              // Suggestion remains
              return null;
          }
      } catch (error) {
          console.error(`❌ Error accepting quest suggestion ${quest.title}:`, error);
          return null;
      } finally {
           setIsAcceptingQuest(null); // Clear loading state
      }
  },
    
    rejectQuestSuggestion: (questId: string) => {
      console.log(`❌ [SuggestionContext] Rejecting quest suggestion: ${questId}`);
      const quest = questSuggestions.find(q => q.id === questId);

      // **NEW: Remove associated pending tasks**
      if (quest && quest.pendingTaskClientIds && quest.pendingTaskClientIds.length > 0) {
          console.log(`🗑️ Also removing ${quest.pendingTaskClientIds.length} associated pending tasks.`);
          quest.pendingTaskClientIds.forEach(taskId => {
              // Check if the task still exists and is linked
              const taskExists = taskSuggestions.some(t => t.id === taskId && t.pendingQuestClientId === questId);
              if(taskExists) {
                  removeTaskSuggestion(taskId);
              }
          });
      }

      removeQuestSuggestion(questId); // Remove the quest suggestion itself
  },

    upgradeTaskToQuest: async (task: TaskSuggestion) => {
      console.log('⬆️ [SuggestionContext] Upgrading task to quest:', task.title);
      // Get current userId from Clerk hook inside the function
      const currentUserId = userId;
       if (!currentUserId) {
          console.error('No user ID available (Clerk). Cannot upgrade task.');
          return; // Or throw error
      }
      const quest = await suggestionAgent.upgradeTaskToQuest(task, currentUserId); // Pass currentUserId
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
