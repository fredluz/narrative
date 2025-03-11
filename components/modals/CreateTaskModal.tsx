import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { Task } from '@/app/types';
import { fetchQuests } from '@/services/questsService';
import { useSupabase } from '@/contexts/SupabaseContext';

type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

interface TaskFormData {
  title: string;
  description: string;
  scheduled_for: string;
  deadline?: string;
  location?: string;
  status: TaskStatus;
  tags?: string[];
  quest_id?: number;
  priority: 'high' | 'medium' | 'low';
  subtasks?: string;
  user_id: string;
}

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  isSubmitting: boolean;
  quests?: Array<{ id: string; title: string; }>;
  userId: string;
  initialData?: Partial<TaskFormData>; // Optional prop for task suggestions
}

export function CreateTaskModal({ 
  visible, 
  onClose, 
  onSubmit,
  isSubmitting,
  quests: propsQuests = [],
  userId,
  initialData // Can be undefined
}: CreateTaskModalProps) {
  const { themeColor, secondaryColor } = useTheme();
  const { session } = useSupabase();
  const [localQuests, setLocalQuests] = useState<Array<{ id: number; title: string }>>([]);
  
  // Create default form data that doesn't depend on initialData
  const getDefaultFormData = () => ({
    title: '',
    description: '',
    scheduled_for: format(new Date(), 'yyyy-MM-dd'),
    status: 'ToDo' as TaskStatus,
    location: '',
    tags: [],
    priority: 'medium' as 'high' | 'medium' | 'low',
    subtasks: '',
    user_id: userId
  });

  // Initialize with default form data
  const [formData, setFormData] = useState<TaskFormData>(getDefaultFormData());
  
  // Apply initialData when it exists and component becomes visible
  useEffect(() => {
    if (visible) {
      if (initialData) {
        // Apply initialData over default values
        setFormData({
          ...getDefaultFormData(),
          ...initialData,
          user_id: userId // Always ensure user_id is set
        });
      } else {
        // Reset to default values if no initialData
        setFormData(getDefaultFormData());
      }
    }
  }, [visible, initialData, userId]);

  // Load quests directly if none provided via props
  useEffect(() => {
    const loadQuests = async () => {
      if (!session?.user?.id) return;
      try {
        const loadedQuests = await fetchQuests(session.user.id);
        setLocalQuests(loadedQuests);
      } catch (err) {
        console.error('Error loading quests:', err);
      }
    };
    
    if (visible) {
      loadQuests();
    }
  }, [visible, session?.user?.id]);

  const handleSubmit = async () => {
    await onSubmit({
      ...formData,
      user_id: userId
    });
    // Reset form after submission
    setFormData(getDefaultFormData());
  };

  // Use loaded quests
  const displayQuests = localQuests;

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
            <View>
              <Text style={{ 
                color: '#FFF', 
                fontSize: 18, 
                fontWeight: 'bold',
                textShadowColor: themeColor,
                textShadowOffset: { width: 0.5, height: 0.5 },
                textShadowRadius: 2
              }}>
                {initialData?.title ? "Task Suggestion" : "Create New Task"}
              </Text>
              
              {/* Only show this text when it's a suggestion */}
              {initialData?.title && (
                <Text style={{ 
                  color: '#AAA', 
                  fontSize: 12, 
                  fontStyle: 'italic'
                }}>
                  Based on your conversation
                </Text>
              )}
            </View>
            
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#AAA" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: '100%' }}>
            {/* Quest Selection - New Section */}
            <Text style={{ color: '#AAA', fontSize: 14, marginBottom: 5 }}>Quest *</Text>
            <View style={{
              backgroundColor: '#2A2A2A',
              borderRadius: 4,
              marginBottom: 15,
              maxHeight: 200,
              overflow: 'hidden'
            }}>
              {displayQuests.length > 0 ? (
                <ScrollView style={{ maxHeight: 200 }}>
                  {displayQuests.map(quest => (
                    <TouchableOpacity
                      key={quest.id}
                      style={{
                        padding: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                        backgroundColor: formData.quest_id === quest.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                        flexDirection: 'row',
                        alignItems: 'center'
                      }}
                      onPress={() => setFormData({ ...formData, quest_id: quest.id })}
                    >
                      <MaterialIcons 
                        name={formData.quest_id === quest.id ? 'radio-button-checked' : 'radio-button-unchecked'} 
                        size={20} 
                        color={formData.quest_id === quest.id ? themeColor : '#AAA'}
                        style={{ marginRight: 10 }}
                      />
                      <Text style={{ color: '#FFF' }}>{quest.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={{ padding: 15, alignItems: 'center' }}>
                  <Text style={{ color: '#AAA', fontStyle: 'italic' }}>
                    {visible ? 'Loading quests...' : 'No quests available. Create a quest first.'}
                  </Text>
                </View>
              )}
            </View>

            {/* Title field */}
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

            {/* Description field */}
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

            {/* Subtasks field */}
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

            {/* Start Date field */}
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

            {/* Remaining fields */}
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

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
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
                disabled={!formData.title || !formData.scheduled_for || isSubmitting || !formData.quest_id}
                style={{
                  backgroundColor: !formData.title || !formData.scheduled_for || !formData.quest_id ? 
                    'rgba(40, 40, 40, 0.8)' : themeColor,
                  borderRadius: 4,
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  opacity: !formData.title || !formData.scheduled_for || !formData.quest_id ? 0.5 : 1,
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF' }}>{initialData ? "Accept" : "Create"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}