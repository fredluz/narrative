import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { questStyles } from '@/app/styles/questStyles';
import { Task, Quest } from '@/app/types';
import { useRouter } from 'expo-router';
import { formatDateTime } from '@/utils/dateFormatters';
import { updateTaskStatus, getNextStatus } from '@/services/tasksService';
import { useSupabase } from '@/contexts/SupabaseContext';
import { Session } from '@supabase/supabase-js';

interface KanbanProps {
  mainQuest: Quest | null;
  onViewAllQuests?: () => void;
  userId: string;
}

type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

export function KanbanBoard({ mainQuest, onViewAllQuests, userId }: KanbanProps) {
  const router = useRouter();
  const { themeColor, secondaryColor } = useTheme();
  const { session } = useSupabase() as { session: Session }; // Assert session exists
  const [activeColumn, setActiveColumn] = useState<TaskStatus | 'all' | 'active'>('active');
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  // Verify current user
  const verifyCurrentUser = React.useMemo(() => {
    if (!session?.user?.id || !userId) return false;
    return session.user.id === userId;
  }, [session?.user?.id, userId]);

  if (!verifyCurrentUser) {
    return (
      <View style={{
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333333',
      }}>
        <Text style={{ color: '#AAAAAA' }}>Unauthorized access</Text>
      </View>
    );
  }

  if (!mainQuest) {
    return (
      <View
        style={{
          padding: 20,
          alignItems: 'center',
          backgroundColor: '#1E1E1E',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#333333',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <MaterialIcons name="assignment-late" size={50} color="#444444" />
        <Text
          style={{
            color: '#DDDDDD',
            textAlign: 'center',
            marginTop: 15,
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          No Main Project Selected
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/quests')}
          style={{
            backgroundColor: themeColor,
            marginTop: 15,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 2,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
            Select Main Project
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Handle task status toggle
  const toggleTaskCompletion = async (task: Task) => {
    if (!verifyCurrentUser || task.user_id !== userId) {
      console.warn("Unauthorized task update attempt");
      return;
    }

    try {
      setUpdatingTaskId(task.id);
      const userId = session.user.id;
      const newStatus = getNextStatus(task.status);
      await updateTaskStatus(task.id, newStatus, userId);
      
      // Update local state
      if (mainQuest && mainQuest.tasks) {
        mainQuest.tasks = mainQuest.tasks.map(t => 
          t.id === task.id ? { ...t, status: newStatus } : t
        );
      }
      
      // Force a re-render
      setActiveColumn(prev => prev);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Extract and filter tasks
  const tasks = mainQuest?.tasks || [];
  const filteredTasks = 
    activeColumn === 'all' ? tasks :
    activeColumn === 'active' ? tasks.filter((task) => task.status === 'ToDo' || task.status === 'InProgress') :
    tasks.filter((task) => task.status === activeColumn);

  // No tasks UI
  if (tasks.length === 0) {
    return (
      <Card style={{
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
      }}>
        <View style={{
          padding: 15,
          borderBottomWidth: 1,
          borderBottomColor: '#333333',
          backgroundColor: '#252525',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{
              fontSize: 20,
              color: '#EEEEEE',
              fontWeight: 'bold',
            }}>MAIN PROJECT</Text>
          </View>
        </View>
        <View style={{ padding: 15 }}>
          <Text
            style={{
              color: '#DDDDDD',
              marginBottom: 5,
              fontSize: 18,
              fontWeight: '600',
            }}
          >
            {mainQuest.title}
          </Text>

          {mainQuest.start_date && (
            <Text
              style={{ color: '#AAAAAA', marginBottom: 3, fontSize: 14 }}
            >
              Started: {formatDateTime(mainQuest.start_date)}
            </Text>
          )}

          {mainQuest.end_date && (
            <Text
              style={{ color: '#AAAAAA', marginBottom: 10, fontSize: 14 }}
            >
              Target completion: {formatDateTime(mainQuest.end_date)}
            </Text>
          )}

          <TouchableOpacity
            onPress={() => (onViewAllQuests ? onViewAllQuests() : router.push('/quests'))}
            style={{
              backgroundColor: '#333333',
              borderWidth: 1,
              borderColor: '#444444',
              borderRadius: 6,
              paddingVertical: 8,
              paddingHorizontal: 12,
              marginBottom: 15,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialIcons
              name="assignment"
              size={18}
              color="#AAAAAA"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{ color: '#AAAAAA', fontSize: 14, fontWeight: '500' }}
            >
              View All Projects
            </Text>
          </TouchableOpacity>

          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <MaterialIcons name="dashboard" size={30} color="#444444" />
            <Text style={{ color: '#AAAAAA', marginTop: 10, fontSize: 14 }}>No tasks assigned to this project</Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card
      style={{
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <View style={{
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
        backgroundColor: '#252525',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 20,
              color: '#EEEEEE',
              fontWeight: 'bold',
            }}
          >
            MAIN PROJECT
          </Text>
        </View>
      </View>
      <View style={{ padding: 15 }}>
        <Text
          style={{
            color: '#DDDDDD',
            marginBottom: 5,
            fontSize: 18,
            fontWeight: '600',
          }}
        >
          {mainQuest.title}
        </Text>
        {mainQuest.start_date && (
          <Text style={{ color: '#AAAAAA', marginBottom: 3, fontSize: 14 }}>
            Started: {formatDateTime(mainQuest.start_date)}
          </Text>
        )}

        {mainQuest.end_date && (
          <Text style={{ color: '#AAAAAA', marginBottom: 10, fontSize: 14 }}>
            Target completion: {formatDateTime(mainQuest.end_date)}
          </Text>
        )}

        <TouchableOpacity
          onPress={() => (onViewAllQuests ? onViewAllQuests() : router.push('/quests'))}
          style={{
            backgroundColor: '#333333',
            borderWidth: 1,
            borderColor: '#444444',
            borderRadius: 6,
            paddingVertical: 8,
            paddingHorizontal: 12,
            marginBottom: 15,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="assignment" size={18} color="#AAAAAA" style={{ marginRight: 6 }} />
          <Text style={{ color: '#AAAAAA', fontSize: 14, fontWeight: '500' }}>
            View All Projects
          </Text>
        </TouchableOpacity>

        <ScrollView style={{ maxHeight: 300 }}>
          {(['InProgress', 'ToDo', 'Done'] as TaskStatus[]).map(statusGroup => {
            const tasksInGroup = filteredTasks.filter(t => t.status === statusGroup);
            if (tasksInGroup.length === 0) return null;

            return (
              <View key={statusGroup}>
                {tasksInGroup.map((task) => (
                  <Card
                    key={task.id}
                    style={[
                      {
                        marginBottom: 8,
                        borderRadius: 6,
                        backgroundColor: '#252525',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                        elevation: 1,
                      },
                      task.status === 'Done'
                        ? {
                            borderLeftWidth: 3,
                            borderLeftColor: '#4CAF50',
                          }
                        : task.status === 'InProgress'
                        ? {
                            borderLeftWidth: 3,
                            borderLeftColor: '#2196F3',
                          }
                        : {
                            borderLeftWidth: 3,
                            borderLeftColor: '#9E9E9E',
                          },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            {
                              fontSize: 15,
                              fontWeight: '500',
                              marginBottom: 4,
                            },
                            {
                              color: task.status === 'Done' ? '#AAAAAA' : '#DDDDDD',
                              textDecorationLine: task.status === 'Done' ? 'line-through' : 'none',
                              opacity: task.status === 'Done' ? 0.7 : 1,
                            },
                          ]}
                        >
                          {task.title}
                        </Text>

                        {task.description && (
                          <Text
                            style={{
                              color: task.status === 'Done' ? '#888888' : '#AAAAAA',
                              fontSize: 14,
                              opacity: task.status === 'Done' ? 0.6 : 0.9,
                              marginBottom: 8,
                            }}
                          >
                            {task.description}
                          </Text>
                        )}

                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            opacity: task.status === 'Done' ? 0.6 : 0.8,
                          }}
                        >
                          {task.scheduled_for && (
                            <View style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              backgroundColor: '#333333', 
                              paddingHorizontal: 6, 
                              paddingVertical: 3, 
                              borderRadius: 4,
                              marginRight: 8,
                              marginBottom: 4
                            }}>
                              <MaterialIcons
                                name="schedule"
                                size={12}
                                color="#AAAAAA"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={{ fontSize: 12, color: '#AAAAAA' }}>
                                {formatDateTime(task.scheduled_for)}
                              </Text>
                            </View>
                          )}

                          {task.location && (
                            <View style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              backgroundColor: '#333333', 
                              paddingHorizontal: 6, 
                              paddingVertical: 3, 
                              borderRadius: 4,
                              marginRight: 8,
                              marginBottom: 4
                            }}>
                              <MaterialIcons
                                name="place"
                                size={12}
                                color="#AAAAAA"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={{ fontSize: 12, color: '#AAAAAA' }}>
                                {task.location}
                              </Text>
                            </View>
                          )}

                          {task.deadline && (
                            <View style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              backgroundColor: '#3A2222', 
                              paddingHorizontal: 6, 
                              paddingVertical: 3, 
                              borderRadius: 4,
                              marginBottom: 4
                            }}>
                              <MaterialIcons
                                name="warning"
                                size={12}
                                color="#FF6B6B"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={{ fontSize: 12, color: '#FF6B6B' }}>
                                {formatDateTime(task.deadline)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <TouchableOpacity 
                        style={{ padding: 4 }}
                        onPress={() => toggleTaskCompletion(task)}
                        disabled={updatingTaskId === task.id}
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
                  </Card>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Card>
  );
}