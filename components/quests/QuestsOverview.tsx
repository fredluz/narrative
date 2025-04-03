import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView, Dimensions, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import styles, { colors } from '@/app/styles/global';
import { useQuests, createQuest, updateQuest } from '@/services/questsService';
import { Quest, Task } from '@/app/types';
import { updateTaskStatus, getNextStatus, createTask } from '@/services/tasksService';
import { supabase } from '@/lib/supabase';
import { CreateQuestModal } from '../modals/CreateQuestModal';
import { EditQuestModal } from '../modals/EditQuestModal';
import { CreateTaskModal } from '../modals/CreateTaskModal';
import { EditTaskModal } from '../modals/EditTaskModal';
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk

type QuestStatus = 'Active' | 'On-Hold' | 'Completed';
type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

interface QuestsOverviewProps {
  quests: Quest[];
  onSelectQuest: (questId: number) => void;
  currentMainQuest: Quest | null;
}

interface TaskFormData {
  title: string;
  description: string;
  scheduled_for: string;
  deadline?: string;
  location?: string;
  status: TaskStatus;
  tags?: string[];
}

interface QuestFormData {
  title: string;
  tagline: string;
  description: string;
  status: QuestStatus;
  start_date?: string;
  end_date?: string;
  is_main: boolean;
  clerk_id: string;  // Made optional since it's added in handleCreateQuest
  created_at?: string;
  updated_at?: string;
}

export function QuestsOverview({ quests, onSelectQuest, currentMainQuest }: QuestsOverviewProps) {
  const { themeColor, secondaryColor } = useTheme();
  const [activeTab, setActiveTab] = useState<QuestStatus>('Active');
  // Initialize selectedQuest with currentMainQuest
  const [selectedQuest, setSelectedQuest] = useState<Quest | undefined>(currentMainQuest || undefined);
  const windowHeight = Dimensions.get('window').height;
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const { reload } = useQuests(); // Get the reload function from useQuests
  const { userId } = useAuth(); // Get userId from Clerk

  // Update selectedQuest when currentMainQuest changes
  React.useEffect(() => {
    if (currentMainQuest) {
      setSelectedQuest(currentMainQuest);
    }
  }, [currentMainQuest]);
  
  // Task form state
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [taskBeingEdited, setTaskBeingEdited] = useState<Task | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    scheduled_for: format(new Date(), 'yyyy-MM-dd'),
    status: 'ToDo',
    location: ''
  });
  
  // Quest form state
  const [isCreateQuestModalVisible, setCreateQuestModalVisible] = useState(false);
  const [isEditQuestModalVisible, setEditQuestModalVisible] = useState(false);
  const [questBeingEdited, setQuestBeingEdited] = useState<Quest | undefined>();
  const [questFormData, setQuestFormData] = useState<QuestFormData>({
    title: '',
    tagline: '',
    description: '', // Initialize description field
    status: 'Active',
    is_main: false,
    clerk_id: userId || ''  // Initialize clerk_id field with Clerk userId
  });

  const filteredQuests = quests.filter(q => q.status === activeTab);
  const tabs: QuestStatus[] = ['Active', 'On-Hold', 'Completed'];

  
  // Make text more visible against dark backgrounds
  const getBrightAccent = (baseColor: string) => {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    if (r + g + b > 500) {
      return '#FFFFFF';
    }
    
    const brightR = Math.min(255, r + 100);
    const brightG = Math.min(255, g + 100);
    const brightB = Math.min(255, b + 100);
    
    return `#${brightR.toString(16).padStart(2, '0')}${
      brightG.toString(16).padStart(2, '0')}${
      brightB.toString(16).padStart(2, '0')}`;
  };
  
  const brightAccent = getBrightAccent(themeColor);

  // Reset form data for new task
  const openCreateTaskModal = () => {
    setFormData({
      title: '',
      description: '',
      scheduled_for: format(new Date(), 'yyyy-MM-dd'),
      status: 'ToDo',
      location: '',
      tags: []
    });
    setCreateModalVisible(true);
  };

  // Open edit task modal and populate with existing task data
  const openEditTaskModal = (task: Task) => {
    // Use Clerk userId for check
    if (!userId) {
      console.warn("User not logged in (Clerk). Cannot edit task.");
      return;
    }

    // Verify task ownership using Clerk userId
    if (task.clerk_id !== userId) {
      console.error("Cannot edit task: User does not own this task (Clerk check)");
      return;
    }

    setTaskBeingEdited(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      scheduled_for: task.scheduled_for,
      deadline: task.deadline,
      location: task.location || '',
      status: task.status as TaskStatus,
      tags: task.tags || []
    });
    setEditModalVisible(true);
  };

  // Create a new task
  const handleCreateTask = async (data: any) => {
    // Use Clerk userId for check
    if (!selectedQuest || !userId) {
        console.error("Cannot create task: No selected quest or user not logged in (Clerk).");
        return;
    }

    try {
      setIsSubmitting(true);
      const taskData = {
        ...data,
        quest_id: selectedQuest.id,
        clerk_id: userId // Use Clerk userId
      };

      const newTask = await createTask(taskData);
      
      // Update local state
      if (selectedQuest && selectedQuest.tasks) {
        selectedQuest.tasks = [...selectedQuest.tasks, newTask];
        setSelectedQuest({...selectedQuest});
      }
      
      setCreateModalVisible(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update an existing task
  const handleUpdateTask = async (data: any) => {
     // Use Clerk userId for check
    if (!taskBeingEdited || !userId) {
        console.error("Cannot update task: No task selected or user not logged in (Clerk).");
        return;
    }

    try {
      setIsSubmitting(true);
      const updatedTask = {
        ...data,
        clerk_id: userId, // Use Clerk userId
        updated_at: new Date().toISOString()
      };

      // Ensure the service function `updateTask` (or similar) is used,
      // passing the userId for RLS. Avoid direct supabase calls here if possible.
      // Assuming an updateTask function exists similar to createTask:
      // await updateTask(taskBeingEdited.id, updatedTask, userId);

      // Fallback to direct Supabase call if service function isn't ready/available
      // Note: This requires passing the Clerk JWT in the service layer or modifying supabase client globally (less ideal)
      const { error } = await supabase
        .from('tasks')
        .update(updatedTask)
        .eq('id', taskBeingEdited.id)
        .eq('clerk_id', userId) // Use Clerk userId for RLS check
        .select();

      if (error) throw error;
      
      // Update local state
      if (selectedQuest && selectedQuest.tasks) {
        selectedQuest.tasks = selectedQuest.tasks.map(t => 
          t.id === taskBeingEdited.id 
            ? { ...t, ...data } 
            : t
        );
        setSelectedQuest({...selectedQuest});
      }
      
      setEditModalVisible(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add function to handle task status toggle
  const toggleTaskCompletion = async (task: Task) => {
     // Use Clerk userId for check
    if (!userId) {
        console.error("Cannot toggle task completion: User not logged in (Clerk).");
        return;
    }
     // Verify ownership before attempting update
    if (task.clerk_id !== userId) {
        console.error("Cannot toggle task completion: User does not own this task (Clerk check).");
        return;
    }

    try {
      setUpdatingTaskId(task.id);
      const newStatus = getNextStatus(task.status);

      await updateTaskStatus(task.id, newStatus, userId); // Use Clerk userId

      // Update local state
      if (selectedQuest && selectedQuest.tasks) {
        selectedQuest.tasks = selectedQuest.tasks.map(t => 
          t.id === task.id ? { ...t, status: newStatus } : t
        );
      }
      
      setSelectedQuest({...selectedQuest!});
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Add handler for task deletion
  const handleDeleteTask = () => {
    console.log('[QuestsOverview] Starting handleDeleteTask');
    if (selectedQuest && selectedQuest.tasks && taskBeingEdited) {
      console.log('[QuestsOverview] Removing task from selectedQuest.tasks:', {
        questId: selectedQuest.id,
        taskId: taskBeingEdited.id,
        currentTaskCount: selectedQuest.tasks.length
      });
      
      // Update local state by removing the deleted task
      selectedQuest.tasks = selectedQuest.tasks.filter(t => t.id !== taskBeingEdited.id);
      console.log('[QuestsOverview] Tasks after removal:', selectedQuest.tasks.length);
      
      setSelectedQuest({...selectedQuest});
      console.log('[QuestsOverview] Updated selectedQuest state');
      
      // Reset task being edited
      setTaskBeingEdited(undefined);
      console.log('[QuestsOverview] Reset taskBeingEdited');
    } else {
      console.warn('[QuestsOverview] Could not update local state:', {
        hasSelectedQuest: !!selectedQuest,
        hasTasksArray: !!(selectedQuest?.tasks),
        hasTaskBeingEdited: !!taskBeingEdited
      });
    }
    
    console.log('[QuestsOverview] Calling reload() to refresh quests');
    reload(); // Reload quests to reflect the change
  };

  // Reset form data for new quest
  const openCreateQuestModal = () => {
    // Use Clerk userId for check
    if (!userId) {
      console.warn("User not logged in (Clerk). Cannot create quest.");
      return;
    }
    setQuestFormData({
      title: '',
      tagline: '',
      description: '',
      status: 'Active',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      is_main: false,
      clerk_id: userId // Use Clerk userId
    });
    setCreateQuestModalVisible(true);
  };

  // Open edit quest modal and populate with existing quest data
  const openEditQuestModal = (quest: Quest) => {
     // Use Clerk userId for check
    if (!userId) {
      console.warn("User not logged in (Clerk). Cannot edit quest.");
      return;
    }

    // Verify quest ownership using Clerk userId
    if (quest.clerk_id !== userId) {
      console.error("Cannot edit quest: User does not own this quest (Clerk check)");
      return;
    }

    setQuestBeingEdited(quest);
    setQuestFormData({
      title: quest.title,
      tagline: quest.tagline || '',
      description: quest.description || '',
      status: quest.status,
      start_date: quest.start_date || '',
      end_date: quest.end_date || '',
      is_main: quest.is_main,
      clerk_id: userId // Use Clerk userId
    });
    setEditQuestModalVisible(true);
  };

  // Create a new quest
  const handleCreateQuest = async (data: QuestFormData) => {
     // Use Clerk userId for check
    if (!userId) {
      console.error("User not logged in (Clerk). Cannot create quest.");
      return;
    }

    try {
      setIsSubmitting(true);
      const questData = {
        ...data,
        // clerk_id is already set in the form data from Clerk userId
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Pass userId as first parameter
      await createQuest(userId, questData); // Use Clerk userId
      setCreateQuestModalVisible(false);
      reload();
    } catch (error) {
      console.error('Failed to create quest:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update an existing quest
  const handleUpdateQuest = async (data: QuestFormData) => {
     // Use Clerk userId for check
    if (!questBeingEdited || !userId) {
      console.error("User not logged in (Clerk) or no quest selected. Cannot update quest.");
      return;
    }
     // Verify ownership before attempting update
    if (questBeingEdited.clerk_id !== userId) {
        console.error("Cannot update quest: User does not own this quest (Clerk check).");
        return;
    }

    try {
      setIsSubmitting(true);
      const questData = {
        ...data,
        // clerk_id is already set in the form data from Clerk userId
        updated_at: new Date().toISOString()
      };

      // Pass all required parameters: questId, userId, and questData
      await updateQuest(questBeingEdited.id, userId, questData); // Use Clerk userId
      setEditQuestModalVisible(false);
      reload();
    } catch (error) {
      console.error('Failed to update quest:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add handler for quest deletion
  const handleDeleteQuest = () => {
    console.log('[QuestsOverview] Starting handleDeleteQuest');
    if (questBeingEdited) {
      // Reset states
      setQuestBeingEdited(undefined);
      setSelectedQuest(undefined);
      console.log('[QuestsOverview] Reset quest states');
    }
    
    console.log('[QuestsOverview] Calling reload() to refresh quests');
    reload(); // Reload quests to reflect the change
  };

  return (
    <View style={[styles.container, { backgroundColor: '#121212', height: windowHeight }]}>
      <View style={styles.column}>
        <Card style={[{ 
          borderColor: '#333333', 
          borderWidth: 1,
          borderLeftWidth: 3,
          height: windowHeight * 0.95,
          backgroundColor: '#1E1E1E',
          overflow: 'hidden'
        }]}>
          {/* Background with dark theme elements */}
          <View style={{ 
            position: 'absolute', 
            width: '100%', 
            height: '100%',
            backgroundColor: '#1A1A1A',
          }} />
          
          {/* Subtle accent line */}
          <View style={{
            position: 'absolute',
            top: 0,
            height: '100%',
            width: 3,
            right: 30,
            opacity: 0.05,
            backgroundColor: themeColor,
          }} />

          {/* Subtle divider lines */}
          <View style={{
            position: 'absolute',
            top: '30%',
            left: -10,
            width: '120%',
            height: 1,
            backgroundColor: '#333333',
            opacity: 0.2,
          }} />
          
          <View style={{
            position: 'absolute',
            top: '70%',
            left: -10,
            width: '120%',
            height: 1,
            backgroundColor: '#333333',
            opacity: 0.15,
          }} />

          <View style={{ padding: 20, zIndex: 1 }}>
            {/* Header */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#333333',
              paddingBottom: 15
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ 
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: '#EEEEEE',
                }}>
                  Quests
                </Text>
                <View style={{
                  height: 3,
                  width: 30,
                  backgroundColor: themeColor,
                  marginLeft: 10,
                  borderRadius: 2,
                }} />
              </View>
              
              {/* Create Quest Button */}
              <TouchableOpacity 
                onPress={openCreateQuestModal}
                style={{
                  backgroundColor: '#333333',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#444444',
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons 
                  name="add" 
                  size={16} 
                  color="#EEEEEE"
                  style={{ marginRight: 6 }}
                />
                <Text style={{ 
                  color: '#EEEEEE',
                  fontWeight: '600',
                  fontSize: 14,
                }}>
                  New Quest
                </Text>
              </TouchableOpacity>
            </View>

            {/* Status Tabs */}
            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
              {tabs.map(tab => (
                <TouchableOpacity 
                  key={tab} 
                  onPress={() => setActiveTab(tab)}
                  style={[
                    {
                      flex: 1,
                      marginRight: 10,
                      paddingVertical: 10,
                      paddingHorizontal: 15,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: activeTab === tab ? '#252525' : '#1E1E1E',
                      borderWidth: 1,
                      borderColor: activeTab === tab ? themeColor : '#333333',
                    }
                  ]}
                >
                  <MaterialIcons 
                    name={
                      tab === 'Active' ? 'play-arrow' :
                      tab === 'On-Hold' ? 'pause' : 'check-circle'
                    }
                    size={16}
                    color={activeTab === tab ? themeColor : '#777777'}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[
                    { 
                      color: activeTab === tab ? '#EEEEEE' : '#777777',
                      fontWeight: '600',
                      fontSize: 14,
                    }
                  ]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flex: 1 }}>
              {/* Quest List */}
              <View style={{ flex: 1, marginRight: 20, maxHeight: windowHeight * 0.8 }}>
                <FlatList
                  style={{ flex: 1 }}
                  data={filteredQuests}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      onPress={() => setSelectedQuest(item)}
                      style={{ marginBottom: 10 }}
                    >
                      <Card style={[
                        {
                          backgroundColor: '#252525',
                          padding: 15,
                          borderRadius: 6,
                          borderLeftWidth: 3,
                          borderLeftColor: item.is_main ? secondaryColor : themeColor,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.2,
                          shadowRadius: 2,
                          elevation: 1,
                        },
                        selectedQuest?.id === item.id && {
                          backgroundColor: '#2C2C2C',
                          borderWidth: 1,
                          borderColor: '#444444',
                        }
                      ]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {item.is_main && (
                            <MaterialIcons 
                              name="star" 
                              size={16} 
                              color={secondaryColor}
                              style={{ marginRight: 8 }}
                            />
                          )}
                          <Text style={{ 
                            fontSize: 16, 
                            color: item.is_main ? '#EEEEEE' : '#DDDDDD',
                            fontWeight: item.is_main ? 'bold' : 'normal',
                          }}>
                            {item.title}
                          </Text>
                        </View>
                        {item.tagline && (
                          <Text style={{
                            fontSize: 13,
                            color: '#AAAAAA',
                            marginTop: 4,
                            marginLeft: item.is_main ? 24 : 0
                          }}>
                            {item.tagline}
                          </Text>
                        )}
                      </Card>
                    </TouchableOpacity>
                  )}
                />
              </View>

              {/* Quest Details */}
              <View style={{ flex: 1, maxHeight: windowHeight * 0.8 }}>
                {selectedQuest ? (
                  <ScrollView style={{ flex: 1 }} bounces={false}>
                    <Card style={[{ 
                      backgroundColor: '#252525',
                      borderRadius: 8,
                      borderLeftWidth: 3,
                      borderLeftColor: selectedQuest.is_main ? secondaryColor : themeColor,
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                      elevation: 1,
                    }]}>
                      {/* Quest Details Header */}
                      <View style={{ 
                        padding: 20,
                        borderBottomWidth: 1,
                        borderBottomColor: '#333333'
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <Text style={{ 
                            fontSize: 20,
                            color: '#EEEEEE',
                            fontWeight: 'bold',
                          }}>
                            {selectedQuest.title}
                          </Text>
                          <View style={{ flexDirection: 'row' }}>
                            {/* Edit Quest Button */}
                            <TouchableOpacity 
                              onPress={() => openEditQuestModal(selectedQuest)}
                              style={{
                                backgroundColor: '#333333',
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: '#444444',
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginRight: 10,
                              }}
                            >
                              <MaterialIcons 
                                name="edit" 
                                size={14} 
                                color="#BBBBBB"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={{ 
                                color: '#BBBBBB',
                                fontWeight: '600',
                                fontSize: 12,
                              }}>
                                Edit
                              </Text>
                            </TouchableOpacity>
                            
                            {/* Set as Main Quest Button */}
                            <TouchableOpacity 
                              onPress={() => {
                                onSelectQuest(selectedQuest.id);
                                setSelectedQuest({ ...selectedQuest, is_main: true });
                              }}
                              style={{
                                backgroundColor: selectedQuest.id === currentMainQuest?.id ? 
                                  '#2C2C2C' : '#333333',
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: selectedQuest.id === currentMainQuest?.id ? 
                                  secondaryColor : '#444444',
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}
                            >
                              <MaterialIcons 
                                name={selectedQuest.id === currentMainQuest?.id ? "star" : "star-outline"} 
                                size={14} 
                                color={selectedQuest.id === currentMainQuest?.id ? secondaryColor : '#BBBBBB'}
                                style={{ marginRight: 4 }}
                              />
                              <Text style={{ 
                                color: selectedQuest.id === currentMainQuest?.id ? secondaryColor : '#BBBBBB',
                                fontWeight: '600',
                                fontSize: 12,
                              }}>
                                {selectedQuest.id === currentMainQuest?.id ? 'Main Quest' : 'Set as Main'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        {selectedQuest.tagline && (
                          <Text style={{ 
                            fontSize: 15,
                            color: '#AAAAAA',
                            marginBottom: 8,
                          }}>
                            {selectedQuest.tagline}
                          </Text>
                        )}
                      </View>

                      <View style={{ padding: 20 }}>
                        {/* Display the quest description */}
                        {selectedQuest.description && (
                          <View style={{
                            backgroundColor: '#2A2A2A',
                            borderRadius: 6,
                            padding: 15,
                            marginBottom: 15,
                            borderLeftWidth: 2,
                            borderLeftColor: '#444444',
                          }}>
                            <Text style={{ 
                              fontSize: 14,
                              color: '#BBBBBB',
                              lineHeight: 20
                            }}>
                              {selectedQuest.description}
                            </Text>
                          </View>
                        )}

                        {/* Tasks Section */}
                        <View style={{ marginTop: 15 }}>
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 10
                          }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <MaterialIcons name="assignment" size={18} color="#DDDDDD" style={{ marginRight: 8 }} />
                              <Text style={{ 
                                fontSize: 16,
                                color: '#DDDDDD',
                                fontWeight: '600'
                              }}>
                                Tasks ({selectedQuest.tasks?.length || 0})
                              </Text>
                            </View>

                            {/* Create Task Button */}
                            <TouchableOpacity 
                              onPress={openCreateTaskModal}
                              style={{
                                backgroundColor: '#333333',
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: '#444444',
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}
                            >
                              <MaterialIcons 
                                name="add" 
                                size={14} 
                                color="#BBBBBB"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={{ 
                                color: '#BBBBBB',
                                fontWeight: '600',
                                fontSize: 12,
                              }}>
                                New Task
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* Group and sort tasks by status */}
                          {(['InProgress', 'ToDo', 'Done'] as TaskStatus[]).map(statusGroup => {
                            const tasksInGroup = selectedQuest.tasks?.filter(t => t.status === statusGroup) || [];
                            if (tasksInGroup.length === 0) return null;

                            return (
                              <View key={statusGroup}>
                                {tasksInGroup.map((task) => (
                                  <View 
                                    key={task.id}
                                    style={{
                                      backgroundColor: '#2A2A2A',
                                      borderRadius: 6,
                                      padding: 12,
                                      marginBottom: 10,
                                      borderLeftWidth: 3,
                                      borderLeftColor: task.status === 'Done' ? '#4CAF50' : 
                                                    task.status === 'InProgress' ? '#2196F3' : '#9E9E9E',
                                      shadowColor: '#000',
                                      shadowOffset: { width: 0, height: 1 },
                                      shadowOpacity: 0.1,
                                      shadowRadius: 1,
                                      elevation: 1,
                                    }}
                                  >
                                    <Text style={{ 
                                      fontSize: 15,
                                      color: task.status === 'Done' ? '#AAAAAA' : '#DDDDDD',
                                      textDecorationLine: task.status === 'Done' ? 'line-through' : 'none',
                                      marginBottom: 5,
                                      fontWeight: '500',
                                    }}>
                                      {task.title}
                                    </Text>
                                    
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                      <MaterialIcons 
                                        name="schedule" 
                                        size={12} 
                                        color="#888888"
                                        style={{ marginRight: 4 }}
                                      />
                                      <Text style={{ fontSize: 12, color: '#888888' }}>
                                        Start: {task.scheduled_for}
                                      </Text>
                                      
                                      {task.location && (
                                        <>
                                          <MaterialIcons 
                                            name="place" 
                                            size={12} 
                                            color="#888888"
                                            style={{ marginLeft: 12, marginRight: 4 }}
                                          />
                                          <Text style={{ fontSize: 12, color: "#888888" }}>
                                            {task.location}
                                          </Text>
                                        </>
                                      )}
                                    </View>

                                    <View style={{ 
                                      flexDirection: 'row', 
                                      alignItems: 'center',
                                      marginTop: 4,
                                      justifyContent: 'space-between'
                                    }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {task.deadline && (
                                          <View style={{ 
                                            flexDirection: 'row', 
                                            alignItems: 'center',
                                            marginRight: 10,
                                            backgroundColor: '#3A2222',
                                            paddingHorizontal: 6,
                                            paddingVertical: 2,
                                            borderRadius: 4,
                                          }}>
                                            <MaterialIcons 
                                              name="warning" 
                                              size={12} 
                                              color="#FF6B6B"
                                              style={{ marginRight: 4 }}
                                            />
                                            <Text style={{ fontSize: 12, color: "#FF6B6B" }}>
                                              {task.deadline}
                                            </Text>
                                          </View>
                                        )}
                                        
                                        {/* Add Edit Task Button */}
                                        <TouchableOpacity 
                                          onPress={() => openEditTaskModal(task)}
                                          style={{
                                            backgroundColor: '#333333',
                                            paddingHorizontal: 6,
                                            paddingVertical: 3,
                                            borderRadius: 4,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                          }}
                                        >
                                          <MaterialIcons 
                                            name="edit" 
                                            size={12} 
                                            color="#AAAAAA"
                                          />
                                          <Text style={{ 
                                            color: '#AAAAAA',
                                            fontSize: 11,
                                            marginLeft: 2
                                          }}>
                                            Edit
                                          </Text>
                                        </TouchableOpacity>
                                      </View>
                                      
                                      {/* Task Status Button */}
                                      <TouchableOpacity 
                                        onPress={() => toggleTaskCompletion(task)}
                                        disabled={updatingTaskId === task.id}
                                        style={{ padding: 4 }}
                                      >
                                        {updatingTaskId === task.id ? (
                                          <ActivityIndicator size="small" color={task.status === 'Done' ? '#4CAF50' : '#2196F3'} />
                                        ) : task.status === 'Done' ? (
                                          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                                        ) : task.status === 'InProgress' ? (
                                          <MaterialIcons name="timelapse" size={20} color="#2196F3" />
                                        ) : (
                                          <MaterialIcons name="radio-button-unchecked" size={20} color="#9E9E9E" />
                                        )}
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    </Card>
                  </ScrollView>
                ) : (
                  <View style={{ 
                    flex: 1,
                    backgroundColor: '#252525',
                    borderRadius: 8,
                    padding: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#333333',
                  }}>
                    <MaterialIcons name="assignment" size={40} color="#444444" />
                    <Text style={{ 
                      color: '#AAAAAA',
                      marginTop: 10,
                      fontSize: 16,
                      textAlign: 'center'
                    }}>
                      Select a quest to view details
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Card>
      </View>

      {/* Modal Components - Only render if we have a valid user ID from Clerk */}
      {userId && (
        <>
          <CreateQuestModal
            visible={isCreateQuestModalVisible}
            onClose={() => setCreateQuestModalVisible(false)}
            onSubmit={handleCreateQuest}
            isSubmitting={isSubmitting}
            userId={userId} // Pass Clerk userId
          />

          <EditQuestModal
            visible={isEditQuestModalVisible}
            onClose={() => {
              setEditQuestModalVisible(false);
              setQuestBeingEdited(undefined);
            }}
            onSubmit={handleUpdateQuest}
            onDelete={handleDeleteQuest}
            isSubmitting={isSubmitting}
            quest={questBeingEdited}
            userId={userId} // Pass Clerk userId
          />

          <CreateTaskModal
            visible={isCreateModalVisible}
            onClose={() => setCreateModalVisible(false)}
            onSubmit={handleCreateTask}
            isSubmitting={isSubmitting}
            userId={userId} // Pass Clerk userId
          />

          <EditTaskModal
            visible={isEditModalVisible}
            onClose={() => {
              setEditModalVisible(false);
              setTaskBeingEdited(undefined);
            }}
            onSubmit={handleUpdateTask}
            onDelete={handleDeleteTask}
            isSubmitting={isSubmitting}
            task={taskBeingEdited}
            userId={userId} // Pass Clerk userId
          />
        </>
      )}
    </View>
  );
}
