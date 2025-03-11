import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { format } from 'date-fns';
import { QuestSuggestion, useSuggestions } from '@/contexts/SuggestionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from 'react-native-paper';
import { colors } from '@/app/styles/global';
import { questStyles } from '@/app/styles/questStyles';

interface ValidationErrors {
  title?: string;
  tagline?: string;
  description?: string;
  start_date?: string;
}

const QuestSuggestionPopup: React.FC = () => {
  const { 
    questSuggestions,
    currentQuestSuggestion,
    acceptQuestSuggestion,
    rejectQuestSuggestion,
    nextQuestSuggestion,
    prevQuestSuggestion
  } = useSuggestions();
  
  const { themeColor } = useTheme();
  
  // Local editable state for the current suggestion
  const [editedSuggestion, setEditedSuggestion] = useState<QuestSuggestion | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValid, setIsValid] = useState(true);
  
  // Update local state when current suggestion changes
  React.useEffect(() => {
    if (currentQuestSuggestion) {
      setEditedSuggestion({ ...currentQuestSuggestion });
    } else {
      setEditedSuggestion(null);
    }
  }, [currentQuestSuggestion]);
  
  if (!currentQuestSuggestion || !editedSuggestion) return null;

  // Calculate current index
  const currentIndex = questSuggestions.findIndex(q => q.id === currentQuestSuggestion.id);
  
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
    
    // Tagline validation
    if (!editedSuggestion.tagline.trim()) {
      newErrors.tagline = 'Tagline is required';
      valid = false;
    }
    
    // Description validation
    if (!editedSuggestion.description.trim()) {
      newErrors.description = 'Description is required';
      valid = false;
    }
    
    // Date validation
    if (!editedSuggestion.start_date) {
      newErrors.start_date = 'Start date is required';
      valid = false;
    } else if (!isValidDate(editedSuggestion.start_date)) {
      newErrors.start_date = 'Invalid date format (use YYYY-MM-DD)';
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
  const handleChange = (field: keyof QuestSuggestion, value: any) => {
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
      acceptQuestSuggestion(editedSuggestion);
    }
  };
  
  const handleReject = () => {
    if (currentQuestSuggestion) {
      rejectQuestSuggestion(currentQuestSuggestion.id);
    }
  };

  // Format the source type for display
  const sourceType = editedSuggestion.sourceType === 'chat' ? 'Chat Message' : 'Journal Entry';
  
  return (
    <Card style={[questStyles.suggestionPopupContainer, questStyles.suggestionPopupTopRight]}>
      <View style={[questStyles.suggestionPopupHeader]}>
        <Text style={[questStyles.suggestionPopupHeaderTitle, { color: themeColor }]}>Quest Suggestion</Text>
        <TouchableOpacity onPress={handleReject}>
          <Text style={[questStyles.suggestionPopupHeaderTitle, { color: themeColor }]}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={questStyles.suggestionPopupContent}>
        <Text style={[questStyles.label, { color: themeColor }]}>Title</Text>
        <TextInput
          style={[questStyles.input, { color: themeColor, borderColor: themeColor }]}
          value={editedSuggestion.title}
          onChangeText={(text) => handleChange('title', text)}
          placeholder="Quest title"
          placeholderTextColor="#666"
        />
        {errors.title && (
          <Text style={questStyles.errorText}>{errors.title}</Text>
        )}

        <Text style={[questStyles.label, { color: themeColor }]}>Tagline</Text>
        <TextInput
          style={[questStyles.input, { color: themeColor, borderColor: themeColor }]}
          value={editedSuggestion.tagline}
          onChangeText={(text) => handleChange('tagline', text)}
          placeholder="Short description"
          placeholderTextColor="#666"
        />
        {errors.tagline && (
          <Text style={questStyles.errorText}>{errors.tagline}</Text>
        )}

        <Text style={[questStyles.label, { color: themeColor }]}>Description</Text>
        <TextInput
          style={[questStyles.input, questStyles.multilineInput, { color: themeColor, borderColor: themeColor }]}
          value={editedSuggestion.description}
          onChangeText={(text) => handleChange('description', text)}
          multiline
          numberOfLines={4}
          placeholder="Quest description"
          placeholderTextColor="#666"
        />
        {errors.description && (
          <Text style={questStyles.errorText}>{errors.description}</Text>
        )}

        <View style={questStyles.dateContainer}>
          <View style={questStyles.dateField}>
            <Text style={[questStyles.label, { color: themeColor }]}>Start Date</Text>
            <TextInput
              style={[questStyles.input, { color: themeColor, borderColor: themeColor }]}
              value={editedSuggestion.start_date}
              onChangeText={(text) => handleChange('start_date', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666"
            />
            {errors.start_date && (
              <Text style={questStyles.errorText}>{errors.start_date}</Text>
            )}
          </View>

          <View style={questStyles.dateField}>
            <Text style={[questStyles.label, { color: themeColor }]}>End Date</Text>
            <TextInput
              style={[questStyles.input, { color: themeColor, borderColor: themeColor }]}
              value={editedSuggestion.end_date || ''}
              onChangeText={(text) => handleChange('end_date', text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        {editedSuggestion.relatedTasks && editedSuggestion.relatedTasks.length > 0 && (
          <>
            <Text style={[questStyles.label, { color: themeColor }]}>Related Tasks</Text>
            <View style={questStyles.relatedTasksContainer}>
              {editedSuggestion.relatedTasks.map((task, index) => (
                <View key={task.id} style={questStyles.relatedTaskItem}>
                  <Text style={[questStyles.relatedTaskTitle, { color: themeColor }]}>
                    {index + 1}. {task.title}
                  </Text>
                  <Text style={questStyles.relatedTaskDescription}>{task.description}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={questStyles.suggestionSourceInfo}>
          <Text style={questStyles.suggestionSourceText}>
            <Text style={questStyles.suggestionSourceBold}>Source:</Text> {sourceType}
          </Text>
          <Text style={questStyles.suggestionSourceText}>
            <Text style={questStyles.suggestionSourceBold}>Detected:</Text> {format(new Date(editedSuggestion.timestamp), 'MMM d, h:mm a')}
          </Text>
        </View>

        <View style={questStyles.suggestionActionButtons}>
          <TouchableOpacity 
            style={[
              questStyles.suggestionActionButton, 
              { backgroundColor: themeColor },
              !isValid && questStyles.disabledButton
            ]} 
            onPress={handleAccept}
            disabled={!isValid}
          >
            <Text style={questStyles.suggestionActionButtonText}>Accept Quest</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Card>
  );
};

export default QuestSuggestionPopup;