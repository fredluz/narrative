import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    ScrollView,
    ActivityIndicator,
    Dimensions,
    LayoutChangeEvent
  } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Task } from '@/app/types';
import { taskStyles } from '@/app/styles/taskStyles';
import styles, { colors } from '@/app/styles/global';

import { useTasks, updateTaskStatus, getNextStatus, TaskStatus } from '@/services/tasksService';
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';
import { useSupabase } from '@/contexts/SupabaseContext';

interface TaskListProps {
  compactMode?: boolean;
  userId?: string; // Add userId as a prop
}

export function TaskList({ compactMode = false, userId }: TaskListProps) {
  const { session } = useSupabase();
  const { shouldUpdate, resetUpdate } = useQuestUpdate();
  const { themeColor, secondaryColor } = useTheme();
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [availableSpace, setAvailableSpace] = useState<number>(0);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Pass userId to useTasks hook and ensure it's not undefined
  const { tasks, loading, error, reload: loadTasks } = useTasks(userId || '');
  
  // Clear local error when tasks reload
  useEffect(() => {
    setLocalError(null);
  }, [tasks]);

  // Verify current user has permission to update tasks
  const verifyCurrentUser = React.useMemo(() => {
    if (!session?.user?.id || !userId) return false;
    return session.user.id === userId;
  }, [session?.user?.id, userId]);

  // Reload tasks when quest updates occur
  useEffect(() => {
    if (shouldUpdate && userId) {
      loadTasks();
      resetUpdate();
    }
  }, [shouldUpdate, userId, loadTasks, resetUpdate]);

  const toggleTaskCompletion = async (taskId: number, currentStatus: string, taskUserId: string) => {
    if (!userId || !verifyCurrentUser) {
      setLocalError("Please log in to update tasks.");
      return;
    }

    // Verify task ownership
    if (taskUserId !== userId) {
      setLocalError("You don't have permission to update this task.");
      return;
    }
    
    try {
      const newStatus = getNextStatus(currentStatus);
      await updateTaskStatus(taskId, newStatus, userId);
      await loadTasks(); // Added await to ensure tasks are reloaded after update
    } catch (err) {
      console.error("Failed to update task status:", { error: err, userId: userId });
      setLocalError("Failed to update task status");
    }
  };

  const windowHeight = Dimensions.get('window').height;
  const maxTaskListHeight = compactMode ? windowHeight * 0.25 : windowHeight * 0.6; 

  // Measure parent container to determine available space
  const onContainerLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setContainerHeight(height);
    
    // Calculate available space for the task list itself (minus header)
    const headerHeight = compactMode ? 50 : 60; // Approximate header height
    setAvailableSpace(Math.max(0, height - headerHeight));
  };

  return (
    <Card 
      style={[
        compactMode ? { flex: 1 } : styles.column, 
        { 
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
          marginTop: compactMode ? 10 : 0,
        }
      ]}
      onLayout={onContainerLayout}
    >
      <View style={{ 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: compactMode ? 5 : 10,
        paddingHorizontal: compactMode ? 15 : 15,
        paddingVertical: compactMode ? 15 : 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
        backgroundColor: '#252525',
      }}>
        <Text style={{ 
          fontSize: compactMode ? 16 : 20,
          fontWeight: 'bold',
          color: '#EEEEEE',
        }}>
          Active Tasks
        </Text>
        
        <TouchableOpacity 
          onPress={loadTasks}
          style={{
            padding: compactMode ? 6 : 8,
            borderRadius: 6,
            backgroundColor: '#333333',
            borderWidth: 1,
            borderColor: '#444444',
          }}
        >
          <MaterialIcons name="refresh" size={compactMode ? 18 : 20} color="#AAAAAA" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: compactMode ? 10 : 20, alignItems: 'center' }}>
          <ActivityIndicator size={compactMode ? "small" : "large"} color={themeColor} />
        </View>
      ) : error ? (
        <View style={{ 
          margin: compactMode ? 10 : 15,
          padding: compactMode ? 8 : 10, 
          backgroundColor: '#3A2222', 
          borderRadius: 5,
          borderLeftWidth: 2,
          borderLeftColor: '#FF6B6B',
        }}>
          <Text style={{ color: '#FF6B6B', fontSize: compactMode ? 14 : 16 }}>{error}</Text>
          <TouchableOpacity onPress={loadTasks}>
            <Text style={{ color: '#FF6B6B', textDecorationLine: 'underline', marginTop: compactMode ? 3 : 5, fontSize: compactMode ? 13 : 14 }}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      ) : tasks.length === 0 ? (
        <View style={{ padding: compactMode ? 10 : 20, alignItems: 'center' }}>
          <MaterialIcons name="check-circle-outline" size={compactMode ? 30 : 40} color="#444444" />
          <Text style={{ fontSize: compactMode ? 14 : 16, color: '#AAAAAA', textAlign: 'center' }}>No active tasks</Text>
        </View>
      ) : (
        <ScrollView 
          style={{ 
            padding: compactMode ? 10 : 15,
            backgroundColor: '#1A1A1A',
            height: availableSpace > 0 ? availableSpace : undefined,
            flexGrow: 1
          }}
          contentContainerStyle={{
            paddingBottom: 10
          }}
        >
          {(['InProgress', 'ToDo', 'Done'] as TaskStatus[]).map(statusGroup => {
            const tasksInGroup = tasks.filter(t => t.status === statusGroup);
            if (tasksInGroup.length === 0) return null;

            return (
              <View key={statusGroup}>
                {tasksInGroup.map((task) => (
                  <View 
                    key={task.id} 
                    style={{ 
                      backgroundColor: '#252525',
                      borderRadius: 6,
                      marginBottom: compactMode ? 8 : 10,
                      padding: compactMode ? 12 : 14,
                      borderLeftWidth: 3,
                      borderLeftColor: task.status === 'Done' ? '#4CAF50' :
                                    task.status === 'InProgress' ? '#2196F3' : '#9E9E9E',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={() => toggleTaskCompletion(task.id, task.status, task.user_id)}
                        style={{ padding: compactMode ? 4 : 8 }}
                        disabled={!verifyCurrentUser || task.user_id !== userId}
                      >
                        <MaterialIcons 
                          name={
                            task.status === 'Done' ? 'check-circle' :
                            task.status === 'InProgress' ? 'timelapse' :
                            'radio-button-unchecked'
                          }
                          size={compactMode ? 18 : 22}
                          color={
                            !verifyCurrentUser || task.user_id !== userId ? '#444444' :
                            task.status === 'Done' ? '#4CAF50' :
                            task.status === 'InProgress' ? '#2196F3' :
                            '#9E9E9E'
                          }
                        />
                      </TouchableOpacity>
                      <View style={{ marginLeft: compactMode ? 8 : 10, flex: 1 }}>
                        <Text style={{ 
                          fontSize: compactMode ? 15 : 16,
                          color: task.status === 'Done' ? '#AAAAAA' : '#DDDDDD',
                          textDecorationLine: task.status === 'Done' ? 'line-through' : 'none',
                          opacity: task.status === 'Done' ? 0.7 : 1,
                          fontWeight: '500',
                        }}>
                          {task.title}
                        </Text>
                        {!compactMode && task.description ? (
                          <Text style={{ 
                            fontSize: 14,
                            color: task.status === 'Done' ? '#888888' : '#AAAAAA',
                            marginTop: 4,
                            opacity: task.status === 'Done' ? 0.6 : 0.9, 
                          }}>
                            {task.description}
                          </Text>
                        ) : null}
                        {task.quest?.title ? (
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            marginTop: compactMode ? 4 : 6,
                            backgroundColor: '#333333',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            alignSelf: 'flex-start',
                          }}>
                            <MaterialIcons 
                              name="folder" 
                              size={compactMode ? 12 : 14}
                              color={task.status === 'Done' ? '#888888' : '#BBBBBB'} 
                              style={{ marginRight: 4 }} 
                            />
                            <Text style={{ 
                              fontSize: compactMode ? 12 : 13,
                              color: task.status === 'Done' ? '#888888' : '#BBBBBB',
                            }}>
                              {task.quest.title}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </Card>
  );
}
