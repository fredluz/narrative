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
import { useSupabase } from '@/contexts/SupabaseContext';
import { validateUserId } from '@/utils/authHelpers';

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
}

export function QuestsOverview({ quests, onSelectQuest, currentMainQuest }: QuestsOverviewProps) {
  const { themeColor, secondaryColor } = useTheme();
  const [activeTab, setActiveTab] = useState<QuestStatus>('Active');
  // Initialize selectedQuest with currentMainQuest
  const [selectedQuest, setSelectedQuest] = useState<Quest | undefined>(currentMainQuest || undefined);
  const windowHeight = Dimensions.get('window').height;
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const { reload } = useQuests(); // Get the reload function from useQuests
  const { session } = useSupabase();
  
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
    is_main: false
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
    if (!selectedQuest || !session?.user?.id) return;
    
    try {
      setIsSubmitting(true);
      const userId = validateUserId(session.user.id);
      
      const taskData = {
        ...data,
        quest_id: selectedQuest.id,
        user_id: userId
      };
      
      const newTask = await createTask(taskData);
      
      // Update local state
      if (selectedQuest && selectedQuest.tasks) {
        selectedQuest.tasks = [...selectedQuest.tasks, newTask];
        
        // Force a re-render
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
    
    if (!taskBeingEdited || !session?.user?.id) return;
    
    try {
      setIsSubmitting(true);
      const userId = validateUserId(session.user.id);
      
      // Ensure location is never undefined for the database
      const updatedTask = {
        ...data,
        user_id: userId,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('tasks')
        .update(updatedTask)
        .eq('id', taskBeingEdited.id)
        .eq('user_id', userId)
        .select();
      
      if (error) throw error;
      
      // Update local state
      if (selectedQuest && selectedQuest.tasks) {
        selectedQuest.tasks = selectedQuest.tasks.map(t => 
          t.id === taskBeingEdited.id 
            ? { ...t, ...data } 
            : t
        );
        
        // Force a re-render
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
  const toggleTaskCompletion = async (task: any) => {
    if (!session?.user?.id) return;

    try {
      setUpdatingTaskId(task.id);
      const userId = validateUserId(session.user.id);
      const newStatus = getNextStatus(task.status);
      
      await updateTaskStatus(task.id, newStatus, userId);
      
      // Update local state
      if (selectedQuest && selectedQuest.tasks) {
        selectedQuest.tasks = selectedQuest.tasks.map(t => 
          t.id === task.id ? { ...t, status: newStatus } : t
        );
      }
      
      // Force a re-render
      setSelectedQuest({...selectedQuest!});
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Reset form data for new quest
  const openCreateQuestModal = () => {
    setQuestFormData({
      title: '',
      tagline: '',
      description: '', // Initialize description field
      status: 'Active',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      is_main: false
    });
    setCreateQuestModalVisible(true);
  };

  // Open edit quest modal and populate with existing quest data
  const openEditQuestModal = (quest: Quest) => {
    setQuestBeingEdited(quest);
    setQuestFormData({
      title: quest.title,
      tagline: quest.tagline || '',
      description: quest.description || '',
      status: quest.status,
      start_date: quest.start_date || '',
      end_date: quest.end_date || '',
      is_main: quest.is_main
    });
    setEditQuestModalVisible(true);
  };

  // Create a new quest
  const handleCreateQuest = async (data: QuestFormData) => {
    if (!session?.user?.id) return;

    try {
      setIsSubmitting(true);
      const userId = validateUserId(session.user.id);
      
      const questData = {
        ...data,
        user_id: userId
      };
      
      await createQuest(questData);
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
    if (!questBeingEdited || !session?.user?.id) return;
    
    try {
      setIsSubmitting(true);
      const userId = validateUserId(session.user.id);
      
      const questData = {
        ...data,
        user_id: userId
      };
      
      await updateQuest(questBeingEdited.id, questData);
      setEditQuestModalVisible(false);
      reload();
    } catch (error) {
      console.error('Failed to update quest:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, height: windowHeight }]}>
      <View style={styles.column}>
        <Card style={[{ 
          borderColor: themeColor, 
          borderWidth: 1,
          borderLeftWidth: 3,
          height: windowHeight * 0.95,
          backgroundColor: colors.backgroundSecondary,
          overflow: 'hidden'
        }]}>
          {/* Background with cyberpunk elements */}
          <View style={{ 
            position: 'absolute', 
            width: '100%', 
            height: '100%',
            backgroundColor: '#151515',
          }} />
          
          {/* Digital noise effect */}
          <View style={{
            position: 'absolute',
            top: 0,
            height: '100%',
            width: 40,
            right: 20,
            opacity: 0.05,
            backgroundColor: themeColor,
          }} />

          {/* Glitch lines */}
          <View style={{
            position: 'absolute',
            top: '30%',
            left: -10,
            width: '120%',
            height: 1,
            backgroundColor: secondaryColor,
            opacity: 0.15,
            transform: [{ rotate: '0.3deg' }],
          }} />
          
          <View style={{
            position: 'absolute',
            top: '70%',
            left: -10,
            width: '120%',
            height: 1,
            backgroundColor: themeColor,
            opacity: 0.1,
            transform: [{ rotate: '-0.2deg' }],
          }} />

          <View style={{ padding: 20, zIndex: 1 }}>
            {/* Header */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
              paddingBottom: 15
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ 
                  fontSize: 28,
                  fontWeight: 'bold',
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  textShadowColor: themeColor,
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 4
                }}>
                  QUESTS
                </Text>
                <View style={{
                  height: 4,
                  width: 40,
                  backgroundColor: themeColor,
                  marginLeft: 10,
                  borderRadius: 2,
                }} />
              </View>
              
              {/* Create Quest Button */}
              <TouchableOpacity 
                onPress={openCreateQuestModal}
                style={{
                  backgroundColor: 'rgba(30, 30, 30, 0.9)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: themeColor,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons 
                  name="add" 
                  size={16} 
                  color={brightAccent}
                  style={{ marginRight: 4 }}
                />
                <Text style={{ 
                  color: brightAccent,
                  fontWeight: '600',
                  fontSize: 13,
                }}>
                  NEW QUEST
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
                      backgroundColor: activeTab === tab ? 'rgba(30, 30, 30, 0.9)' : 'rgba(20, 20, 20, 0.7)',
                      borderWidth: 1,
                      borderColor: activeTab === tab ? themeColor : 'rgba(255, 255, 255, 0.1)',
                    }
                  ]}
                >
                  <MaterialIcons 
                    name={
                      tab === 'Active' ? 'play-arrow' :
                      tab === 'On-Hold' ? 'pause' : 'check-circle'
                    }
                    size={18}
                    color={activeTab === tab ? brightAccent : '#777'}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[
                    { 
                      color: activeTab === tab ? brightAccent : '#777',
                      fontWeight: '600',
                      fontSize: 14,
                    }
                  ]}>
                    {tab.toUpperCase()}
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
                          backgroundColor: 'rgba(25, 25, 25, 0.7)',
                          padding: 15,
                          borderRadius: 6,
                          borderLeftWidth: 2,
                          borderLeftColor: item.is_main ? secondaryColor : themeColor,
                          ...(item.is_main && {
                            shadowColor: secondaryColor,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.5,
                            shadowRadius: 8,
                            elevation: 6,
                          })
                        },
                        selectedQuest?.id === item.id && {
                          backgroundColor: 'rgba(35, 35, 35, 0.9)',
                          borderLeftWidth: 3,
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
                            color: item.is_main ? '#FFF' : '#DDD',
                            fontWeight: item.is_main ? 'bold' : 'normal',
                            textShadowColor: item.is_main ? secondaryColor : 'transparent',
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: item.is_main ? 4 : 0,
                          }}>
                            {item.title}
                          </Text>
                        </View>
                        {item.tagline && (
                          <Text style={{
                            fontSize: 13,
                            color: '#999',
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
                      backgroundColor: 'rgba(25, 25, 25, 0.8)',
                      borderRadius: 8,
                      borderLeftWidth: 3,
                      borderLeftColor: selectedQuest.is_main ? secondaryColor : themeColor,
                      overflow: 'hidden'
                    }]}>
                      {/* Quest Details Header */}
                      <View style={{ 
                        padding: 20,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255, 255, 255, 0.1)'
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <Text style={{ 
                            fontSize: 22,
                            color: '#FFF',
                            fontWeight: 'bold',
                            textShadowColor: secondaryColor,
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 3
                          }}>
                            {selectedQuest.title}
                          </Text>
                          <View style={{ flexDirection: 'row' }}>
                            {/* Edit Quest Button */}
                            <TouchableOpacity 
                              onPress={() => openEditQuestModal(selectedQuest)}
                              style={{
                                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: themeColor,
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginRight: 10,
                              }}
                            >
                              <MaterialIcons 
                                name="edit" 
                                size={16} 
                                color={brightAccent}
                                style={{ marginRight: 4 }}
                              />
                              <Text style={{ 
                                color: brightAccent,
                                fontWeight: '600',
                                fontSize: 13,
                              }}>
                                EDIT
                              </Text>
                            </TouchableOpacity>
                            
                            {/* Set as Main Quest Button */}
                            <TouchableOpacity 
                              onPress={() => onSelectQuest(selectedQuest.id)}
                              style={{
                                backgroundColor: selectedQuest.id === currentMainQuest?.id ? 
                                  'rgba(30, 30, 30, 0.9)' : 'rgba(25, 25, 25, 0.9)',
                                paddingHorizontal: 15,
                                paddingVertical: 8,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: selectedQuest.id === currentMainQuest?.id ? 
                                  secondaryColor : themeColor,
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}
                            >
                              <MaterialIcons 
                                name={selectedQuest.id === currentMainQuest?.id ? "star" : "star-outline"} 
                                size={18} 
                                color={selectedQuest.id === currentMainQuest?.id ? secondaryColor : brightAccent}
                                style={{ marginRight: 6 }}
                              />
                              <Text style={{ 
                                color: selectedQuest.id === currentMainQuest?.id ? secondaryColor : brightAccent,
                                fontWeight: '600',
                              }}>
                                {selectedQuest.id === currentMainQuest?.id ? 'MAIN QUEST' : 'SET AS MAIN'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        
                        {selectedQuest.tagline && (
                          <Text style={{ 
                            fontSize: 18,
                            color: '#BBB',
                            marginBottom: 15,
                            fontStyle: 'italic',
                            textShadowColor: secondaryColor,
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 3
                          }}>
                            {selectedQuest.tagline}
                          </Text>
                        )}
                      </View>

                      <View style={{ padding: 20 }}>
                        {/* Display the quest description */}
                        {selectedQuest.description && (
                          <View style={{
                            backgroundColor: 'rgba(20, 20, 20, 0.7)',
                            borderRadius: 6,
                            padding: 15,
                            marginBottom: 15,
                            borderLeftWidth: 2,
                            borderLeftColor: themeColor,
                          }}>
                            <Text style={{ 
                              fontSize: 15,
                              color: '#BBB',
                              fontStyle: 'italic',
                              textShadowColor: secondaryColor,
                              textShadowOffset: { width: 0, height: 0 },
                              textShadowRadius: 3,
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
                              <MaterialIcons name="assignment" size={20} color={brightAccent} style={{ marginRight: 8 }} />
                              <Text style={{ 
                                fontSize: 18,
                                color: '#FFF',
                                fontWeight: '600'
                              }}>
                                Tasks ({selectedQuest.tasks?.length || 0})
                              </Text>
                            </View>

                            {/* Create Task Button */}
                            <TouchableOpacity 
                              onPress={openCreateTaskModal}
                              style={{
                                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: themeColor,
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}
                            >
                              <MaterialIcons 
                                name="add" 
                                size={16} 
                                color={brightAccent}
                                style={{ marginRight: 4 }}
                              />
                              <Text style={{ 
                                color: brightAccent,
                                fontWeight: '600',
                                fontSize: 13,
                              }}>
                                NEW TASK
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {selectedQuest.tasks?.map((task) => (
                            <View 
                              key={task.id}
                              style={{
                                backgroundColor: 'rgba(30, 30, 30, 0.7)',
                                borderRadius: 6,
                                padding: 15,
                                marginBottom: 10,
                                borderLeftWidth: 2,
                                borderLeftColor: task.status === 'Done' ? secondaryColor : themeColor,
                              }}
                            >
                              <Text style={{ 
                                fontSize: 16,
                                color: task.status === 'Done' ? '#AAA' : '#FFF',
                                textDecorationLine: task.status === 'Done' ? 'line-through' : 'none',
                                marginBottom: 5,
                              }}>
                                {task.title}
                              </Text>
                              
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                <MaterialIcons 
                                  name="schedule" 
                                  size={14} 
                                  color="#888"
                                  style={{ marginRight: 4 }}
                                />
                                <Text style={{ fontSize: 13, color: '#888' }}>
                                  Start: {task.scheduled_for}
                                </Text>
                                
                                {task.location && (
                                  <>
                                    <MaterialIcons 
                                      name="place" 
                                      size={14} 
                                      color="#888"
                                      style={{ marginLeft: 12, marginRight: 4 }}
                                    />
                                    <Text style={{ fontSize: 13, color: "#888" }}>
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
                                      marginRight: 10
                                    }}>
                                      <MaterialIcons 
                                        name="warning" 
                                        size={14} 
                                        color={colors.error}
                                        style={{ marginRight: 4 }}
                                      />
                                      <Text style={{ fontSize: 13, color: colors.error }}>
                                        Deadline: {task.deadline}
                                      </Text>
                                    </View>
                                  )}
                                  
                                  {/* Add Edit Task Button */}
                                  <TouchableOpacity 
                                    onPress={() => openEditTaskModal(task)}
                                    style={{
                                      backgroundColor: 'rgba(40, 40, 40, 0.7)',
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 4,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <MaterialIcons 
                                      name="edit" 
                                      size={14} 
                                      color="#AAA"
                                    />
                                    <Text style={{ 
                                      color: '#AAA',
                                      fontSize: 12,
                                      marginLeft: 2
                                    }}>
                                      EDIT
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                                
                                {/* Task Status Button */}
                                <TouchableOpacity 
                                  onPress={() => toggleTaskCompletion(task)}
                                  disabled={updatingTaskId === task.id}
                                  style={{ padding: 8 }}
                                >
                                  {updatingTaskId === task.id ? (
                                    <ActivityIndicator size="small" color={task.status === 'Done' ? secondaryColor : themeColor} />
                                  ) : task.status === 'Done' ? (
                                    <MaterialIcons name="check-circle" size={20} color={secondaryColor} />
                                  ) : task.status === 'InProgress' ? (
                                    <MaterialIcons name="timelapse" size={20} color={themeColor} />
                                  ) : (
                                    <MaterialIcons name="radio-button-unchecked" size={20} color="#666" />
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    </Card>
                  </ScrollView>
                ) : (
                  <View style={{ 
                    flex: 1,
                    backgroundColor: 'rgba(25, 25, 25, 0.8)',
                    borderRadius: 8,
                    padding: 20,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MaterialIcons name="assignment" size={40} color="rgba(255,255,255,0.1)" />
                    <Text style={{ 
                      color: '#777',
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

      <CreateQuestModal
        visible={isCreateQuestModalVisible}
        onClose={() => setCreateQuestModalVisible(false)}
        onSubmit={handleCreateQuest}
        isSubmitting={isSubmitting}
      />

      <EditQuestModal
        visible={isEditQuestModalVisible}
        onClose={() => {
          setEditQuestModalVisible(false);
          setQuestBeingEdited(undefined);
        }}
        onSubmit={handleUpdateQuest}
        isSubmitting={isSubmitting}
        quest={questBeingEdited}
        userId={session?.user?.id}
      />

      <CreateTaskModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreateTask}
        isSubmitting={isSubmitting}
        userId={session?.user?.id}
      />

      <EditTaskModal
        visible={isEditModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setTaskBeingEdited(undefined);
        }}
        onSubmit={handleUpdateTask}
        isSubmitting={isSubmitting}
        task={taskBeingEdited} // Remove non-null assertion
        userId={session?.user?.id}
      />
    </View>
  );
}