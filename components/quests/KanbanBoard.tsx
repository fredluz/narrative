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
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk

interface KanbanProps {
  mainQuest: Quest | null;
  onViewAllQuests?: () => void;
  userId: string;
}

type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

export function KanbanBoard({ mainQuest, onViewAllQuests, userId: propUserId }: KanbanProps) { // Renamed prop for clarity
  const router = useRouter();
  const { themeColor, secondaryColor } = useTheme();
  const { userId: authUserId } = useAuth(); // Get logged-in user's ID from Clerk
  const [activeColumn, setActiveColumn] = useState<TaskStatus | 'all' | 'active'>('active');
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  // Define status colors
  const statusColors = {
    ToDo: '#9E9E9E',
    InProgress: '#2196F3',
    Done: '#4CAF50'
  };

  // Verify current logged-in user matches the userId prop for this board
  // This assumes the Kanban board is intended only for the user identified by the `userId` prop.
  const isCurrentUserBoard = React.useMemo(() => {
    // User must be logged in (authUserId exists) AND
    // their ID must match the userId prop passed to this component.
    return !!authUserId && !!propUserId && authUserId === propUserId;
  }, [authUserId, propUserId]);

  // If the logged-in user doesn't match the board's intended user, show unauthorized.
  // Also check if authUserId exists at all (i.e., user is logged in).
  if (!authUserId || !isCurrentUserBoard) {
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
    // Use isCurrentUserBoard for permission check
    if (!isCurrentUserBoard) {
      console.warn("Unauthorized task update attempt (Kanban)");
      return;
    }
     // Ensure the task actually belongs to the user (redundant check if isCurrentUserBoard is true, but safe)
    if (task.clerk_id !== authUserId) {
       console.warn("Task ownership mismatch (Kanban)");
       return;
    }

    try {
      setUpdatingTaskId(task.id);
      // const userId = authUserId; // Already have authUserId from useAuth
      const newStatus = getNextStatus(task.status);
      await updateTaskStatus(task.id, newStatus, authUserId); // Use authUserId

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
            <View style={{
              height: 3,
              width: 24,
              backgroundColor: themeColor,
              marginLeft: 8,
              borderRadius: 2,
            }} />
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
          <View style={{
            height: 3,
            width: 24,
            backgroundColor: themeColor,
            marginLeft: 8,
            borderRadius: 2,
          }} />
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

        {/* Status Filters */}
        <View style={{ 
          flexDirection: 'row', 
          marginBottom: 15, 
          justifyContent: 'space-between',
          backgroundColor: '#1A1A1A',
          borderRadius: 8,
          padding: 5
        }}>
          {[
            { key: 'active', label: 'Active', icon: 'bolt' },
            { key: 'ToDo', label: 'To Do', icon: 'radio-button-unchecked' },
            { key: 'InProgress', label: 'In Progress', icon: 'timelapse' },
            { key: 'Done', label: 'Done', icon: 'check-circle' },
            { key: 'all', label: 'All', icon: 'dashboard' }
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 6,
                backgroundColor: activeColumn === item.key ? '#333333' : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => setActiveColumn(item.key as TaskStatus | 'all' | 'active')}
            >
              <MaterialIcons 
                name={item.icon as any} 
                size={14} 
                color={activeColumn === item.key 
                  ? (item.key === 'ToDo' 
                    ? statusColors.ToDo 
                    : item.key === 'InProgress' 
                    ? statusColors.InProgress 
                    : item.key === 'Done' 
                    ? statusColors.Done 
                    : secondaryColor)
                  : '#888888'} 
                style={{ marginRight: 4 }} 
              />
              <Text style={{ 
                color: activeColumn === item.key 
                  ? (item.key === 'ToDo' 
                    ? statusColors.ToDo 
                    : item.key === 'InProgress' 
                    ? statusColors.InProgress 
                    : item.key === 'Done' 
                    ? statusColors.Done 
                    : '#DDDDDD')
                  : '#888888',
                fontSize: 12,
                fontWeight: activeColumn === item.key ? '500' : 'normal'
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
                            borderLeftColor: statusColors.Done,
                          }
                        : task.status === 'InProgress'
                        ? {
                            borderLeftWidth: 3,
                            borderLeftColor: statusColors.InProgress,
                          }
                        : {
                            borderLeftWidth: 3,
                            borderLeftColor: statusColors.ToDo,
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
                              marginBottom: 4,
                              borderLeftWidth: 2,
                              borderLeftColor: '#64B5F6',
                            }}>
                              <MaterialIcons
                                name="schedule"
                                size={12}
                                color="#64B5F6"
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
                              marginBottom: 4,
                              borderLeftWidth: 2,
                              borderLeftColor: '#BA68C8',
                            }}>
                              <MaterialIcons
                                name="place"
                                size={12}
                                color="#BA68C8"
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
                              marginBottom: 4,
                              borderLeftWidth: 2,
                              borderLeftColor: '#FF6B6B',
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
                        style={{ 
                          padding: 6, 
                          backgroundColor: task.status === 'Done' ? 'rgba(76, 175, 80, 0.1)' : 
                                          task.status === 'InProgress' ? 'rgba(33, 150, 243, 0.1)' : 
                                          'rgba(158, 158, 158, 0.1)',
                          borderRadius: 20
                        }}
                        onPress={() => toggleTaskCompletion(task)}
                        disabled={updatingTaskId === task.id}
                      >
                        {updatingTaskId === task.id ? (
                          <ActivityIndicator size="small" color={
                            task.status === 'Done' ? statusColors.Done : 
                            task.status === 'InProgress' ? statusColors.InProgress : 
                            statusColors.ToDo
                          } />
                        ) : task.status === 'Done' ? (
                          <MaterialIcons name="check-circle" size={20} color={statusColors.Done} />
                        ) : task.status === 'InProgress' ? (
                          <MaterialIcons name="timelapse" size={20} color={statusColors.InProgress} />
                        ) : (
                          <MaterialIcons name="radio-button-unchecked" size={20} color={statusColors.ToDo} />
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
