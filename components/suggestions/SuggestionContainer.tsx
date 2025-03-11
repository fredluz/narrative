import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useSuggestions } from '@/contexts/SuggestionContext';
import TaskSuggestionPopup from './TaskSuggestionPopup';
import QuestSuggestionPopup from './QuestSuggestionPopup';
import CombinedSuggestionPopup from './CombinedSuggestionPopup';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Simplified suggestion container that directly renders content
 * No nested components to avoid any positioning issues
 */
const SuggestionContainer: React.FC = () => {
  const { 
    taskSuggestions,
    questSuggestions,
    combinedSuggestionActive,
    currentTaskSuggestion,
    currentQuestSuggestion,
    isAnalyzing
  } = useSuggestions();
  
  const { themeColor } = useTheme();

  // Add extensive logging to trace rendering and state updates
  useEffect(() => {
    console.log('SuggestionContainer MOUNTED');
    return () => console.log('SuggestionContainer UNMOUNTED');
  }, []);

  useEffect(() => {
    console.log('SUGGESTION DATA CHANGED:', {
      taskCount: taskSuggestions.length,
      questCount: questSuggestions.length,
      hasCurrentTask: !!currentTaskSuggestion,
      hasCurrentQuest: !!currentQuestSuggestion,
      analyzing: isAnalyzing
    });
  }, [taskSuggestions, questSuggestions, currentTaskSuggestion, currentQuestSuggestion, isAnalyzing]);

  console.log('SuggestionContainer RENDER:', {
    currentTaskTitle: currentTaskSuggestion?.title || 'none',
    currentQuestTitle: currentQuestSuggestion?.title || 'none',
  });

  return (
    <View style={styles.container}>
      {/* Debug panel */}
      {/* Loading indicator */}
      {isAnalyzing ? (
        <View style={styles.loadingIndicator}>
          <Text style={{ color: themeColor }}>Analyzing content...</Text>
        </View>
      ) : null}

      {/* Suggestion popups - Fix by ensuring all branches return a single component or null */}
      {!combinedSuggestionActive && currentTaskSuggestion ? <TaskSuggestionPopup /> : null}
      {!combinedSuggestionActive && currentQuestSuggestion ? <QuestSuggestionPopup /> : null}
      {combinedSuggestionActive ? <CombinedSuggestionPopup /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 1000,
    width: 300, // Fixed width to make debugging easier
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    pointerEvents: 'box-none',
  },
  debugPanel: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#ff0',
  },
  debugText: {
    color: '#ff0',
    marginBottom: 4,
  },
  loadingIndicator: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 8,
    padding: 12,
    alignSelf: 'stretch',
  },
});

export default SuggestionContainer;