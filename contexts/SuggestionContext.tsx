import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SuggestionAgent } from '@/services/agents/SuggestionAgent';
import { useSupabase } from './SupabaseContext';
import { Quest, Task } from '@/app/types';

// Re-export the suggestion types for easier consumption
export interface TaskSuggestion {
  id: string;
  sourceContent: string;
  sourceType: 'chat' | 'journal';
  timestamp: string;
  type: 'task';
  title: string;
  description: string;
  scheduled_for: string;
  deadline?: string;
  location?: string;
  status: 'ToDo';
  tags?: string[];
  quest_id?: number;
  priority: 'high' | 'medium' | 'low';
  subtasks?: string;
}

export interface QuestSuggestion {
  id: string;
  sourceContent: string;
  sourceType: 'chat' | 'journal';
  timestamp: string;
  type: 'quest';
  title: string;
  tagline: string;
  description: string;
  status: 'Active';
  start_date?: string;
  end_date?: string;
  is_main: boolean;
  relatedTasks?: TaskSuggestion[];
}

export type Suggestion = TaskSuggestion | QuestSuggestion;

// Define the shape of our context
interface SuggestionContextType {
  taskSuggestions: TaskSuggestion[];
  questSuggestions: QuestSuggestion[];
  currentTaskSuggestion: TaskSuggestion | null;
  currentQuestSuggestion: QuestSuggestion | null;
  combinedSuggestionActive: boolean;
  isAnalyzing: boolean;
  
  // Analysis methods
  analyzeMessage: (message: string) => Promise<void>;
  analyzeJournalEntry: (entry: string) => Promise<void>;
  
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
  
  // Misc methods
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
  
  analyzeMessage: async () => {},
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
  
  // Set up state for suggestions first
  const [taskSuggestions, setTaskSuggestions] = useState<TaskSuggestion[]>([]);
  const [questSuggestions, setQuestSuggestions] = useState<QuestSuggestion[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(-1);
  const [currentQuestIndex, setCurrentQuestIndex] = useState<number>(-1);
  const [combinedSuggestionActive, setCombinedSuggestionActive] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  // IMPORTANT: Compute these values BEFORE they're used in the context value
  const currentTaskSuggestion = currentTaskIndex >= 0 && taskSuggestions.length > currentTaskIndex 
    ? taskSuggestions[currentTaskIndex] 
    : null;
    
  const currentQuestSuggestion = currentQuestIndex >= 0 && questSuggestions.length > currentQuestIndex 
    ? questSuggestions[currentQuestIndex] 
    : null;
  
  // Create the suggestion agent instance with the update handler integrated at creation time
  const [agent] = useState(() => {
    console.log("🔧 Creating new SuggestionAgent instance with integrated handlers");
    const newAgent = new SuggestionAgent();
    
    // Define the update handler function that will be used by the agent
    const handleSuggestionUpdate = (taskSugs: TaskSuggestion[], questSugs: QuestSuggestion[]) => {
      console.log("🔄 CRITICAL: Direct update handler called with:", {
        taskCount: taskSugs.length,
        questCount: questSugs.length
      });
      
      // Always set state directly without comparing
      setTaskSuggestions([...taskSugs]);
      setQuestSuggestions([...questSugs]);
      
      // Handle index updates
      if (taskSugs.length > 0) {
        setCurrentTaskIndex(prev => prev >= 0 ? prev : 0);
      }
      
      if (questSugs.length > 0) {
        setCurrentQuestIndex(prev => prev >= 0 ? prev : 0);
      }
    };
    
    // Register handlers immediately on agent creation, not in a useEffect
    newAgent.registerUpdateHandlers({
      onSuggestionUpdate: handleSuggestionUpdate
    });
    console.log("✅ Handlers registered during agent creation");
    
    return newAgent;
  });
  
  // Remove the old useEffect for handler registration, as we now do it during agent creation
  // But keep the initial sync with agent
  useEffect(() => {
    console.log("🔄 Running initial sync with agent");
    const initialTaskSuggestions = agent.getTaskSuggestions();
    const initialQuestSuggestions = agent.getQuestSuggestions();
    
    console.log("🔍 Initial sync found:", {
      taskCount: initialTaskSuggestions.length,
      questCount: initialQuestSuggestions.length
    });
    
    if (initialTaskSuggestions.length > 0) {
      setTaskSuggestions(initialTaskSuggestions);
      setCurrentTaskIndex(0);
    }
    
    if (initialQuestSuggestions.length > 0) {
      setQuestSuggestions(initialQuestSuggestions);
      setCurrentQuestIndex(0);
    }
  }, [agent]);
  
  // Analysis methods
  const analyzeMessage = async (message: string) => {
    if (!session?.user?.id) return;
    
    try {
      setIsAnalyzing(true);
      await agent.analyzeMessage(message, session.user.id);
    } catch (error) {
      console.error('Error analyzing message:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const analyzeJournalEntry = async (entry: string) => {
    if (!session?.user?.id) return;
    
    try {
      setIsAnalyzing(true);
      await agent.analyzeJournalEntry(entry, session.user.id);
    } catch (error) {
      console.error('Error analyzing journal entry:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Navigation methods
  const nextTaskSuggestion = () => {
    if (taskSuggestions.length > 0) {
      const nextIndex = (currentTaskIndex + 1) % taskSuggestions.length;
      setCurrentTaskIndex(nextIndex);
    }
  };
  
  const prevTaskSuggestion = () => {
    if (taskSuggestions.length > 0) {
      const prevIndex = (currentTaskIndex - 1 + taskSuggestions.length) % taskSuggestions.length;
      setCurrentTaskIndex(prevIndex);
    }
  };
  
  const nextQuestSuggestion = () => {
    if (questSuggestions.length > 0) {
      const nextIndex = (currentQuestIndex + 1) % questSuggestions.length;
      setCurrentQuestIndex(nextIndex);
    }
  };
  
  const prevQuestSuggestion = () => {
    if (questSuggestions.length > 0) {
      const prevIndex = (currentQuestIndex - 1 + questSuggestions.length) % questSuggestions.length;
      setCurrentQuestIndex(prevIndex);
    }
  };
  
  // Action methods
  const acceptTaskSuggestion = async (task: TaskSuggestion) => {
    if (!session?.user?.id) return null;
    
    try {
      const createdTask = await agent.acceptTaskSuggestion(task, session.user.id);
      
      // Remove the suggestion from our local state
      setTaskSuggestions(prev => prev.filter(t => t.id !== task.id));
      
      // Adjust current index if needed
      if (currentTaskIndex >= taskSuggestions.length - 1) {
        setCurrentTaskIndex(Math.max(0, taskSuggestions.length - 2));
      }
      
      return createdTask;
    } catch (error) {
      console.error('Error accepting task suggestion:', error);
      return null;
    }
  };
  
  const rejectTaskSuggestion = (taskId: string) => {
    agent.removeTaskSuggestion(taskId);
    setTaskSuggestions(prev => prev.filter(t => t.id !== taskId));
    
    // Adjust current index if needed
    if (currentTaskIndex >= taskSuggestions.length - 1) {
      setCurrentTaskIndex(Math.max(0, taskSuggestions.length - 2));
    }
  };
  
  const acceptQuestSuggestion = async (quest: QuestSuggestion) => {
    if (!session?.user?.id) return null;
    
    try {
      const createdQuest = await agent.acceptQuestSuggestion(quest, session.user.id);
      
      // Remove the suggestion from our local state
      setQuestSuggestions(prev => prev.filter(q => q.id !== quest.id));
      
      // Adjust current index if needed
      if (currentQuestIndex >= questSuggestions.length - 1) {
        setCurrentQuestIndex(Math.max(0, questSuggestions.length - 2));
      }
      
      return createdQuest;
    } catch (error) {
      console.error('Error accepting quest suggestion:', error);
      return null;
    }
  };
  
  const rejectQuestSuggestion = (questId: string) => {
    agent.removeQuestSuggestion(questId);
    setQuestSuggestions(prev => prev.filter(q => q.id !== questId));
    
    // Adjust current index if needed
    if (currentQuestIndex >= questSuggestions.length - 1) {
      setCurrentQuestIndex(Math.max(0, questSuggestions.length - 2));
    }
  };
  
  const upgradeTaskToQuest = async (task: TaskSuggestion) => {
    try {
      const upgradedQuest = await agent.upgradeTaskToQuest(task);
      
      if (upgradedQuest) {
        // Remove the original task suggestion
        agent.removeTaskSuggestion(task.id);
        setTaskSuggestions(prev => prev.filter(t => t.id !== task.id));
        
        // Add the new quest suggestion
        agent.addSuggestionToQueue(upgradedQuest);
        setQuestSuggestions(prev => [...prev, upgradedQuest]);
        
        // Set the current quest index to show the new quest
        setCurrentQuestIndex(questSuggestions.length);
        
        // Show the combined suggestion view
        setCombinedSuggestionActive(true);
      }
    } catch (error) {
      console.error('Error upgrading task to quest:', error);
    }
  };
  
  const clearSuggestions = () => {
    agent.clearSuggestionQueue();
    setTaskSuggestions([]);
    setQuestSuggestions([]);
    setCurrentTaskIndex(-1);
    setCurrentQuestIndex(-1);
    setCombinedSuggestionActive(false);
  };
  
  // Provide the context values
  const contextValue: SuggestionContextType = {
    taskSuggestions,
    questSuggestions,
    currentTaskSuggestion, // Now these are defined before use
    currentQuestSuggestion, // Now these are defined before use
    combinedSuggestionActive,
    isAnalyzing,
    
    analyzeMessage,
    analyzeJournalEntry,
    
    nextTaskSuggestion,
    prevTaskSuggestion,
    nextQuestSuggestion,
    prevQuestSuggestion,
    
    acceptTaskSuggestion,
    rejectTaskSuggestion,
    acceptQuestSuggestion,
    rejectQuestSuggestion,
    upgradeTaskToQuest,
    
    clearSuggestions,
  };
  
  return (
    <SuggestionContext.Provider value={contextValue}>
      {children}
    </SuggestionContext.Provider>
  );
};

// Create a custom hook for easy access to the context
export const useSuggestions = () => useContext(SuggestionContext);

export default SuggestionContext;