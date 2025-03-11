// filepath: c:\Users\ThinkPad\Code\QuestLogMockupsWL\QuestLog\components\suggestions\TaskSuggestionPopup.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import SuggestionPopup, { SuggestionPopupProps } from './SuggestionPopup';
import { TaskSuggestion, useSuggestions } from '@/contexts/SuggestionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { taskStyles } from '@/app/styles/taskStyles';
import { colors } from '@/app/styles/global';
import { Card } from 'react-native-paper';


interface ValidationErrors {
  title?: string;
  description?: string;
  scheduled_for?: string;
}

const TaskSuggestionPopup: React.FC = () => {
  const { 
    taskSuggestions, 
    currentTaskSuggestion, 
    acceptTaskSuggestion, 
    rejectTaskSuggestion, 
    nextTaskSuggestion,
    prevTaskSuggestion,
    upgradeTaskToQuest
  } = useSuggestions();
  
  const { themeColor } = useTheme();
  
  // Local editable state for the current suggestion
  const [editedSuggestion, setEditedSuggestion] = useState<TaskSuggestion | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValid, setIsValid] = useState(true);
  
  // Update the local state when the current suggestion changes
  React.useEffect(() => {
    if (currentTaskSuggestion) {
      setEditedSuggestion({ ...currentTaskSuggestion });
    } else {
      setEditedSuggestion(null);
    }
  }, [currentTaskSuggestion]);
  
  if (!currentTaskSuggestion || !editedSuggestion) return null;
  
  // Calculate the current index
  const currentIndex = taskSuggestions.findIndex(t => t.id === currentTaskSuggestion.id);
  
  // Validate a date string
  const isValidDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  };
  
  // Validate the entire form
  const validateForm = () => {
    const newErrors: ValidationErrors = {};
    let valid = true;
    
    if (!editedSuggestion) return false;
    
    // Title validation
    if (!editedSuggestion.title.trim()) {
      newErrors.title = 'Title is required';
      valid = false;
    } else if (editedSuggestion.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
      valid = false;
    }
    
    // Description validation
    if (!editedSuggestion.description.trim()) {
      newErrors.description = 'Description is required';
      valid = false;
    }
    
    // Date validation
    if (!editedSuggestion.scheduled_for) {
      newErrors.scheduled_for = 'Start date is required';
      valid = false;
    } else if (!isValidDate(editedSuggestion.scheduled_for)) {
      newErrors.scheduled_for = 'Invalid date format (use YYYY-MM-DD)';
      valid = false;
    }
    
    setErrors(newErrors);
    setIsValid(valid);
    return valid;
  };
  
  // Validate on any field change
  useEffect(() => {
    if (editedSuggestion) {
      validateForm();
    }
  }, [editedSuggestion]);

  // Handle field changes
  const handleChange = (field: keyof TaskSuggestion, value: any) => {
    setEditedSuggestion(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    
    // Clear error for the changed field
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };
  
  const handleAccept = () => {
    if (!editedSuggestion) return;
    
    if (validateForm()) {
      acceptTaskSuggestion(editedSuggestion);
    }
  };
  
  const handleReject = () => {
    if (currentTaskSuggestion) {
      rejectTaskSuggestion(currentTaskSuggestion.id);
    }
  };
  
  const handleUpgrade = () => {
    if (editedSuggestion) {
      upgradeTaskToQuest(editedSuggestion);
    }
  };
  
  // Format the source type for display
  const sourceType = editedSuggestion.sourceType === 'chat' ? 'Chat Message' : 'Journal Entry';
  
  return (
    <Card style={[styles.container, { borderColor: themeColor, borderLeftWidth: 3 }]}>
      {/* Add background overlay */}
      <View style={[styles.background, { backgroundColor: colors.background }]} />
      
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColor }]}>Task Suggestion</Text>
        <TouchableOpacity onPress={handleReject} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: themeColor }]}>×</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={[styles.label, { color: themeColor }]}>Title</Text>
        <TextInput
          style={[styles.input, { color: themeColor, borderColor: themeColor }]}
          value={editedSuggestion.title}
          onChangeText={(text) => handleChange('title', text)}
          placeholder="Task title"
          placeholderTextColor="#666"
        />
        {errors.title && (
          <Text style={taskStyles.errorText}>{errors.title}</Text>
        )}

        <Text style={[styles.label, { color: themeColor }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline, { color: themeColor, borderColor: themeColor }]}
          value={editedSuggestion.description}
          onChangeText={(text) => handleChange('description', text)}
          multiline
          numberOfLines={3}
          placeholder="Task description"
          placeholderTextColor="#666"
        />
        {errors.description && (
          <Text style={taskStyles.errorText}>{errors.description}</Text>
        )}

        <View style={styles.dateContainer}>
          <View style={styles.dateField}>
            <Text style={[styles.label, { color: themeColor }]}>Start Date</Text>
            <TextInput
              style={[styles.input, { color: themeColor, borderColor: themeColor }]}
              value={editedSuggestion.scheduled_for}
              onChangeText={(text) => handleChange('scheduled_for', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666"
            />
            {errors.scheduled_for && (
              <Text style={taskStyles.errorText}>{errors.scheduled_for}</Text>
            )}
          </View>

          <View style={styles.dateField}>
            <Text style={[styles.label, { color: themeColor }]}>Deadline</Text>
            <TextInput
              style={[styles.input, { color: themeColor, borderColor: themeColor }]}
              value={editedSuggestion.deadline || ''}
              onChangeText={(text) => handleChange('deadline', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <Text style={[styles.label, { color: themeColor }]}>Location (Optional)</Text>
        <TextInput
          style={[styles.input, { color: themeColor, borderColor: themeColor }]}
          value={editedSuggestion.location || ''}
          onChangeText={(text) => handleChange('location', text)}
          placeholder="Where to do this task"
          placeholderTextColor="#666"
        />

        <View style={taskStyles.suggestionSourceInfo}>
          <Text style={taskStyles.suggestionSourceText}>
            <Text style={taskStyles.suggestionSourceBold}>Source:</Text> {sourceType}
          </Text>
          <Text style={taskStyles.suggestionSourceText}>
            <Text style={taskStyles.suggestionSourceBold}>Detected:</Text> {format(new Date(editedSuggestion.timestamp), 'MMM d, h:mm a')}
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.acceptButton, { backgroundColor: themeColor }]} 
            onPress={handleAccept}
          >
            <Text style={styles.buttonText}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.upgradeButton, { borderColor: themeColor }]} 
            onPress={handleUpgrade}
          >
            <Text style={[styles.buttonText, { color: themeColor }]}>Upgrade to Quest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 400,
    backgroundColor: 'transparent',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.95,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  multiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  dateField: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  upgradeButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default TaskSuggestionPopup;