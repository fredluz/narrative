import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { Task } from '@/app/types';
import { fetchQuests } from '@/services/questsService';
import { useSupabase } from '@/contexts/SupabaseContext';
import { deleteTask } from '@/services/tasksService';

type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

interface TaskFormData {
  title: string;
  description: string;
  scheduled_for: string;
  deadline?: string;
  location?: string;
  status: TaskStatus;
  tags?: string[];
  quest_id?: number;  // Changed from string to number
  priority: 'high' | 'medium' | 'low';
  subtasks?: string;
  user_id: string; // Add user_id field
}

interface EditTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  isSubmitting: boolean;
  task?: Task; // Make task optional
  userId: string; // Add userId prop
  onDelete?: () => void; // Add onDelete prop
}

export function EditTaskModal({ 
  visible, 
  onClose, 
  onSubmit,
  isSubmitting,
  task,
  userId,
  onDelete
}: EditTaskModalProps) {
  const { session } = useSupabase();
  const { themeColor } = useTheme();
  const [quests, setQuests] = useState<Array<{ id: number; title: string }>>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showQuestDropdown, setShowQuestDropdown] = useState(false);
  const [isLoadingQuests, setIsLoadingQuests] = useState(false);
  const [formData, setFormData] = React.useState<TaskFormData>({
    title: '',
    description: '',
    scheduled_for: format(new Date(), 'yyyy-MM-dd'),
    status: 'ToDo',
    location: '',
    tags: [],
    priority: 'medium',
    subtasks: '',
    user_id: userId // Initialize with userId
  });

  // Improved quest loading logic
  useEffect(() => {
    const loadQuests = async () => {
      if (!visible) return;
      
      // Use provided userId instead of relying on session
      if (!userId) {
        console.error('No userId available for loading quests');
        return;
      }
      
      try {
        setIsLoadingQuests(true);
        console.log('Loading quests for userId:', userId);
        const loadedQuests = await fetchQuests(userId);
        console.log(`Loaded ${loadedQuests.length} quests`);
        setQuests(loadedQuests);
      } catch (err) {
        console.error('Error loading quests:', err);
      } finally {
        setIsLoadingQuests(false);
      }
    };
    
    loadQuests();
  }, [visible, userId]);

  React.useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        scheduled_for: task.scheduled_for,
        deadline: task.deadline,
        location: task.location || '',
        status: task.status as TaskStatus,
        tags: task.tags || [],
        priority: task.priority || 'medium', // Changed from 'Medium' to 'medium'
        subtasks: task.subtasks || '',
        quest_id: task.quest_id,
        user_id: userId // Set user_id when loading task data
      });
    }
  }, [task, userId]);

  // Update handleSubmit to include user_id
  const handleSubmit = async () => {
    const processedTags = formData.tags || []; // Handle undefined tags
    await onSubmit({
      ...formData,
      tags: processedTags,
      user_id: userId // Add user_id to submission
    });
  };

  const handleDelete = async () => {
    console.log('[EditTaskModal] Starting delete process for task:', task?.id);
    if (!task?.id) {
      console.warn('[EditTaskModal] No task ID available for deletion');
      return;
    }

    try {
      setIsDeleting(true);
      console.log('[EditTaskModal] Calling deleteTask with taskId:', task.id, 'userId:', userId);
      await deleteTask(task.id, userId);
      console.log('[EditTaskModal] Task deleted successfully, calling onDelete callback');
      onDelete?.();
      console.log('[EditTaskModal] Closing modal');
      onClose();
    } catch (err) {
      console.error('[EditTaskModal] Error in delete process:', err);
      Alert.alert('Error', 'Failed to delete task');
    } finally {
      console.log('[EditTaskModal] Resetting delete state');
      setIsDeleting(false);
    }
  };

  // Don't render the modal if there's no task to edit
  if (!task) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      }}>
        <View style={{
          width: '80%',
          backgroundColor: '#1A1A1A',
          borderRadius: 8,
          padding: 20,
          borderWidth: 1,
          borderColor: themeColor,
          maxHeight: '80%',
        }}>
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.1)',
            paddingBottom: 10
          }}>
            <Text style={{ 
              color: '#FFF', 
              fontSize: 18, 
              fontWeight: 'bold',
              textShadowColor: themeColor,
              textShadowOffset: { width: 0.5, height: 0.5 },
              textShadowRadius: 2
            }}>
              Edit Task
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#AAA" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: '100%' }}>
            {/* Quest Selection - Added Section */}
            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Quest</Text>
            <View style={{
              backgroundColor: '#2A2A2A',
              borderRadius: 4,
              marginBottom: 15,
              overflow: 'hidden'
            }}>
              <TouchableOpacity
                style={{
                  padding: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onPress={() => setShowQuestDropdown(!showQuestDropdown)}
              >
                <Text style={{ color: '#FFF' }}>
                  {isLoadingQuests 
                    ? 'Loading projects...' 
                    : formData.quest_id 
                      ? quests.find(q => q.id === formData.quest_id)?.title || 'Select project'
                      : 'Select project'}
                </Text>
                {isLoadingQuests ? (
                  <ActivityIndicator size="small" color="#AAA" />
                ) : (
                  <MaterialIcons 
                    name={showQuestDropdown ? 'expand-less' : 'expand-more'} 
                    size={24} 
                    color="#AAA"
                  />
                )}
              </TouchableOpacity>

              {/* Dropdown options */}
              {showQuestDropdown && (
                <View style={{ 
                  maxHeight: 200,
                  borderTopWidth: 1,
                  borderTopColor: 'rgba(255, 255, 255, 0.1)'
                }}>
                  <ScrollView>
                    {quests.map(quest => (
                      <TouchableOpacity
                        key={quest.id}
                        style={{
                          padding: 10,
                          backgroundColor: formData.quest_id === quest.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                          borderBottomWidth: 1,
                          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                        }}
                        onPress={() => {
                          setFormData({ ...formData, quest_id: quest.id });
                          setShowQuestDropdown(false);
                        }}
                      >
                        <Text style={{ color: '#FFF' }}>{quest.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Title *</Text>
            <TextInput
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 4,
                padding: 10,
                marginBottom: 15,
                color: '#FFF',
              }}
              placeholderTextColor="#666"
              placeholder="Enter task title"
            />

            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Description</Text>
            <TextInput
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 4,
                padding: 10,
                marginBottom: 15,
                color: '#FFF',
                height: 80,
                textAlignVertical: 'top',
              }}
              multiline={true}
              placeholderTextColor="#666"
              placeholder="Enter task description"
            />

            {/* Priority Selection */}
            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Priority</Text>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              marginBottom: 15 
            }}>
              {(['high', 'medium', 'low'] as const).map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={{
                    backgroundColor: formData.priority === priority 
                      ? priority === 'high' 
                        ? '#D32F2F'
                        : priority === 'medium'
                          ? '#FB8C00'
                          : '#388E3C'
                      : '#2A2A2A',
                    paddingHorizontal: 15,
                    paddingVertical: 8,
                    borderRadius: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => setFormData({ ...formData, priority })}
                >
                  <MaterialIcons 
                    name={
                      priority === 'high' ? 'priority-high' :
                      priority === 'medium' ? 'remove-circle-outline' :
                      'arrow-downward'
                    }
                    size={16}
                    color={formData.priority === priority ? '#FFF' : '#AAA'}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={{ 
                    color: formData.priority === priority ? '#FFF' : '#AAA',
                    textTransform: 'capitalize'
                  }}>
                    {priority}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Subtasks */}
            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Subtasks</Text>
            <TextInput
              value={formData.subtasks || ''}
              onChangeText={(text) => setFormData({ ...formData, subtasks: text })}
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 4,
                padding: 10,
                marginBottom: 15,
                color: '#FFF',
                height: 80,
                textAlignVertical: 'top',
              }}
              multiline={true}
              placeholderTextColor="#666"
              placeholder="Enter subtasks (one per line)"
            />

            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Start Date *</Text>
            <TextInput
              value={formData.scheduled_for}
              onChangeText={(text) => setFormData({ ...formData, scheduled_for: text })}
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 4,
                padding: 10,
                marginBottom: 15,
                color: '#FFF',
              }}
              placeholderTextColor="#666"
              placeholder="YYYY-MM-DD"
            />

            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Deadline</Text>
            <TextInput
              value={formData.deadline || ''}
              onChangeText={(text) => setFormData({ ...formData, deadline: text })}
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 4,
                padding: 10,
                marginBottom: 15,
                color: '#FFF',
              }}
              placeholderTextColor="#666"
              placeholder="YYYY-MM-DD (Optional)"
            />

            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Location</Text>
            <TextInput
              value={formData.location || ''}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 4,
                padding: 10,
                marginBottom: 15,
                color: '#FFF',
              }}
              placeholderTextColor="#666"
              placeholder="Enter location (Optional)"
            />

            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Tags</Text>
            <TextInput
              value={(formData.tags || []).join(', ')}
              onChangeText={(text) => {
                const tags = text.split(',').map(t => t.trim()).filter(t => t !== '');
                setFormData({ ...formData, tags });
              }}
              style={{
                backgroundColor: '#2A2A2A',
                borderRadius: 4,
                padding: 10,
                marginBottom: 15,
                color: '#FFF',
              }}
              placeholderTextColor="#666"
              placeholder="Enter tags separated by commas (Optional)"
            />

            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Status *</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
              {['ToDo', 'InProgress', 'Done'].map((status) => (
                <TouchableOpacity 
                  key={status}
                  style={{
                    backgroundColor: formData.status === status ? themeColor : '#2A2A2A',
                    paddingHorizontal: 15,
                    paddingVertical: 8,
                    borderRadius: 4,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => setFormData({ ...formData, status: status as TaskStatus })}
                >
                  <MaterialIcons 
                    name={
                      status === 'Done' ? 'check-circle' :
                      status === 'InProgress' ? 'timelapse' :
                      'radio-button-unchecked'
                    }
                    size={16} 
                    color={formData.status === status ? '#FFF' : '#AAA'}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={{ color: formData.status === status ? '#FFF' : '#AAA' }}>
                    {status === 'ToDo' ? 'To Do' : 
                     status === 'InProgress' ? 'In Progress' : 
                     'Done'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={isDeleting}
                style={{
                  backgroundColor: '#D32F2F',
                  borderRadius: 4,
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  opacity: isDeleting ? 0.5 : 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <MaterialIcons name="delete" size={16} color="#FFF" style={{ marginRight: 5 }} />
                    <Text style={{ color: '#FFF' }}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    backgroundColor: 'rgba(50, 50, 50, 0.8)',
                    borderRadius: 4,
                    paddingHorizontal: 15,
                    paddingVertical: 8,
                    marginRight: 10,
                  }}
                >
                  <Text style={{ color: '#AAA' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!formData.title || !formData.scheduled_for || isSubmitting}
                  style={{
                    backgroundColor: !formData.title || !formData.scheduled_for ? 'rgba(40, 40, 40, 0.8)' : themeColor,
                    borderRadius: 4,
                    paddingHorizontal: 15,
                    paddingVertical: 8,
                    opacity: !formData.title || !formData.scheduled_for ? 0.5 : 1,
                  }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={{ color: '#FFF' }}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}