import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TaskSuggestion, QuestSuggestion, SuggestionAgent } from '@/services/agents/SuggestionAgent';
import { Quest, Task } from '@/app/types';
import { globalSuggestionStore } from '@/services/globalSuggestionStore';
import { useSupabase } from './SupabaseContext';
import { QuestAgent } from '@/services/agents/QuestAgent';
import { updateTask } from '@/services/tasksService';
import { fetchQuests } from '@/services/questsService';
import { eventsService, EVENT_NAMES } from '@/services/eventsService';

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
  const handleJournalAnalysis = useCallback((data: JournalAnalysisEventData) => {
    // Only process if we're not already analyzing to prevent recursion
    if (isAnalyzing) {
      console.log('🚫 Already analyzing, skipping duplicate event');
      return;
    }

    console.log('📢 [SuggestionContext] Processing journal analysis');
    setIsAnalyzing(true);
      
    // Process using async IIFE to handle async operations
    (async () => {
      try {
        // 1. First generate the basic task suggestion
        console.log('🎯 Generating initial task suggestion');
        const suggestion = await suggestionAgent.generateTaskSuggestion(data.entry, data.userId, {
          sourceMessage: data.entry,
          relatedMessages: [],
          confidence: 0.7,
          timing: 'short-term'
        });

        if (!suggestion) {
          console.log('No task suggestion generated');
          return;
        }

        // 2. Check for similar existing tasks
        console.log('🔍 Checking for similar existing tasks');
        const similarityResult = await suggestionAgent.checkForDuplicatesBeforeShowing(suggestion, data.userId);

        // 3. Handle the result based on similarity and continuation
        if (similarityResult.isMatch && similarityResult.existingTask) {
          if (similarityResult.isContinuation) {
            // This is a continuation of an existing task
            console.log('🔄 Task identified as continuation:', similarityResult.continuationReason);
            
            // Mark the previous task as done
            const updateData = {
              status: 'Done' as const,
              updated_at: new Date().toISOString()
            };
            await updateTask(similarityResult.existingTask.id, updateData, data.userId);
            
            // Get quest context if available
            const questContext = similarityResult.existingTask.quest_id ? 
              await fetchQuests(data.userId).then(quests => 
                quests.find(q => q.id === similarityResult.existingTask?.quest_id)
              ) : undefined;
            
            // Regenerate the suggestion with continuation context
            const enhancedSuggestion = await suggestionAgent.regenerateTaskWithContinuationContext(
              suggestion,
              similarityResult.existingTask,
              questContext
            );
            
            if (enhancedSuggestion) {
              // Add the enhanced suggestion to queue
              console.log('✨ Adding continuation task suggestion to queue');
              addSuggestionToQueue(enhancedSuggestion);
            }
          } else if (similarityResult.matchConfidence > 0.7) {
            // If we found a very similar task with high confidence, convert to edit suggestion
            console.log(`Found similar existing task (${similarityResult.matchConfidence.toFixed(2)} confidence). Converting to edit suggestion.`);
            const editSuggestion = await suggestionAgent.convertToEditSuggestion(suggestion, similarityResult.existingTask);
            addSuggestionToQueue(editSuggestion);
          }
        } else {
          // 4. If no similar task found, find the best quest for this task
          console.log('🔄 Finding best quest match for new task');
          const questId = await suggestionAgent.findBestQuestForTask(suggestion, data.userId);
          
          // 5. Update the suggestion with the found quest ID
          const finalSuggestion = {
            ...suggestion,
            quest_id: questId
          };

          // 6. Add the suggestion to the queue
          console.log('✨ Adding new task suggestion to queue');
          addSuggestionToQueue(finalSuggestion);
        }
      } catch (error) {
        console.error('❌ Error in analyzeJournalEntry:', error);
      } finally {
        setIsAnalyzing(false);
      }
    })();
  }, [suggestionAgent, addSuggestionToQueue, isAnalyzing]);

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
    
    // Analysis methods - these still use SuggestionAgent for LLM operations
    analyzeJournalEntry: async (entry: string, userId: string) => {
      // Only emit event if not already analyzing to prevent recursion
      if (!isAnalyzing) {
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