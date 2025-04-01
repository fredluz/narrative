import React, { useState } from 'react';
import { View } from 'react-native';
import { TaskSuggestion } from '@/services/agents/SuggestionAgent';
import { CreateTaskModal } from '@/components/modals/CreateTaskModal';
import CompactTaskSuggestion from '@/components/suggestions/CompactTaskSuggestion';
import { useSuggestions } from '@/contexts/SuggestionContext';

interface TaskSuggestionOverlayProps {
  taskSuggestion: TaskSuggestion | null;
  userId: string;
  onSuggestionHandled?: () => void;
}

export function TaskSuggestionOverlay({ 
  taskSuggestion, 
  userId,
  onSuggestionHandled 
}: TaskSuggestionOverlayProps) {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { acceptTaskSuggestion, rejectTaskSuggestion, upgradeTaskToQuest } = useSuggestions();

  // Handle expanding the suggestion to show full task modal
  const handleExpandSuggestion = () => {
    setShowTaskModal(true);
  };

  // Handle rejecting the suggestion
  const handleRejectSuggestion = () => {
    if (taskSuggestion) {
      rejectTaskSuggestion(taskSuggestion.id);
      if (onSuggestionHandled) {
        onSuggestionHandled();
      }
    }
  };

  // Handle accepting the suggestion directly from compact view
  const handleAcceptSuggestion = async () => {
    if (!userId || !taskSuggestion) return;
    
    setIsSubmitting(true);
    try {
      const task = await acceptTaskSuggestion(taskSuggestion); // Use suggestion data directly
      if (onSuggestionHandled) {
        onSuggestionHandled();
      }
    } catch (error) {
      console.error('Error accepting task suggestion:', error);
      // If direct acceptance fails, fall back to showing modal
      handleExpandSuggestion();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle creating a task from the suggestion via modal
  const handleCreateTaskFromSuggestion = async (formData: any) => {
    if (!userId || !taskSuggestion) return;
    
    setIsSubmitting(true);
    try {
      // Merge the form data with the suggestion to preserve the quest_id
      const mergedData = {
        ...taskSuggestion,  // Keep original suggestion data including quest_id
        ...formData,        // Override with form values
        quest_id: taskSuggestion.quest_id  // Ensure quest_id is preserved
      };
      
      const task = await acceptTaskSuggestion(mergedData);
      setShowTaskModal(false);
      if (onSuggestionHandled) {
        onSuggestionHandled();
      }
    } catch (error) {
      console.error('Error creating task from suggestion:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle upgrading task to quest
  const handleUpgradeToQuest = async () => {
    if (!taskSuggestion) return;
    
    try {
      await upgradeTaskToQuest(taskSuggestion);
      if (onSuggestionHandled) {
        onSuggestionHandled();
      }
    } catch (error) {
      console.error('Error upgrading task to quest:', error);
    }
  };

  if (!taskSuggestion) return null;

  return (
    <>
      {/* Show compact suggestion as an overlay */}
      <View style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 1000,
      }}>
        <CompactTaskSuggestion
          suggestion={taskSuggestion}
          onAccept={handleAcceptSuggestion}
          onReject={handleRejectSuggestion}
          onExpand={handleExpandSuggestion}
          onUpgradeToQuest={handleUpgradeToQuest}
          isSubmitting={isSubmitting}
        />
      </View>
      
      {/* Full modal for task creation */}
      <CreateTaskModal
        visible={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          // Clear after a delay to prevent UI flicker
          setTimeout(() => handleRejectSuggestion(), 500);
        }}
        onSubmit={handleCreateTaskFromSuggestion}
        isSubmitting={isSubmitting}
        userId={userId}
        initialData={{
          title: taskSuggestion.title || "",
          description: taskSuggestion.description || "",
          scheduled_for: taskSuggestion.scheduled_for || "",
          deadline: taskSuggestion.deadline,
          location: taskSuggestion.location,
          status: 'ToDo',
          priority: taskSuggestion.priority || 'medium',
          subtasks: taskSuggestion.subtasks,
          quest_id: taskSuggestion.quest_id, // Add quest_id to initialData
          clerk_id: userId
        }}
      />
    </>
  );
}