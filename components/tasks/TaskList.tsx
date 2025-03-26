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

  // Make text more visible against dark backgrounds
  const getBrightAccent = (baseColor: string) => {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // If already bright, make it even brighter
    if (r + g + b > 500) {
      return '#FFFFFF';
    }
    
    // Otherwise create a bright neon version
    const brightR = Math.min(255, r + 100);
    const brightG = Math.min(255, g + 100);
    const brightB = Math.min(255, b + 100);
    
    return `#${brightR.toString(16).padStart(2, '0')}${
      brightG.toString(16).padStart(2, '0')}${
      brightB.toString(16).padStart(2, '0')}`;
  };
  
  const brightAccent = getBrightAccent(themeColor);

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
          borderLeftWidth: 3, 
          borderLeftColor: themeColor, 
          overflow: 'hidden',
          marginTop: compactMode ? 10 : 0,
        }
      ]}
      onLayout={onContainerLayout}
    >
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

      
      <View style={{ 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: compactMode ? 5 : 10,
        paddingHorizontal: compactMode ? 10 : 15,
        paddingVertical: compactMode ? 10 : 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ 
            fontSize: compactMode ? 16 : 18,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textShadowColor: themeColor,
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 4
          }}>
            ACTIVE TASKS
          </Text>
          <View style={{
            height: 3,
            width: 20,
            backgroundColor: themeColor,
            marginLeft: 8,
            borderRadius: 2,
          }} />
        </View>
        
        <TouchableOpacity 
          onPress={loadTasks}
          style={{
            padding: compactMode ? 6 : 8,
            borderRadius: 4,
            backgroundColor: 'rgba(30, 30, 30, 0.9)',
            borderWidth: 1,
            borderColor: themeColor,
          }}
        >
          <MaterialIcons name="refresh" size={compactMode ? 18 : 20} color={brightAccent} />
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
          backgroundColor: 'rgba(200, 0, 0, 0.1)', 
          borderRadius: 5,
          borderLeftWidth: 2,
          borderLeftColor: colors.error,
        }}>
          <Text style={{ color: colors.error, fontSize: compactMode ? 14 : 16 }}>{error}</Text>
          <TouchableOpacity onPress={loadTasks}>
            <Text style={{ color: colors.error, textDecorationLine: 'underline', marginTop: compactMode ? 3 : 5, fontSize: compactMode ? 13 : 14 }}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      ) : tasks.length === 0 ? (
        <View style={{ padding: compactMode ? 10 : 20, alignItems: 'center' }}>
          <MaterialIcons name="check-circle-outline" size={compactMode ? 30 : 40} color="rgba(255,255,255,0.1)" />
          <Text style={{ fontSize: compactMode ? 14 : 16, color: '#999', textAlign: 'center' }}>No active tasks</Text>
        </View>
      ) : (
        <ScrollView 
          style={{ 
            padding: compactMode ? 5 : 10,
            height: availableSpace > 0 ? availableSpace : undefined,
            flexGrow: 1
          }}
          contentContainerStyle={{
            paddingBottom: 5
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
                      backgroundColor: 'rgba(25, 25, 25, 0.7)',
                      borderLeftWidth: 2,
                      borderLeftColor: task.status === 'Done' ? secondaryColor : 
                                    task.status === 'InProgress' ? themeColor : '#666',
                      marginBottom: compactMode ? 5 : 8,
                      padding: compactMode ? 8 : 10,
                      borderRadius: 4,
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
                          size={compactMode ? 18 : 24}
                          color={
                            !verifyCurrentUser || task.user_id !== userId ? '#444' :
                            task.status === 'Done' ? secondaryColor :
                            task.status === 'InProgress' ? themeColor :
                            '#666'
                          }
                        />
                      </TouchableOpacity>
                      <View style={{ marginLeft: compactMode ? 4 : 8, flex: 1 }}>
                        <Text style={{ 
                          fontSize: compactMode ? 16 : 18,  // Increased from 14/16
                          color: task.status === 'Done' ? '#AAA' : '#FFF',
                          textDecorationLine: task.status === 'Done' ? 'line-through' : 'none',
                          opacity: task.status === 'Done' ? 0.7 : 1,
                          fontWeight: '600',  // Added to match KanbanBoard style
                        }}>
                          {task.title}
                        </Text>
                        {!compactMode && task.description ? (
                          <Text style={{ 
                            fontSize: 15, // Increased from 14
                            color: '#999',
                            marginTop: 4,
                            opacity: task.status === 'Done' ? 0.5 : 0.8, 
                          }}>
                            {task.description}
                          </Text>
                        ) : null}
                        {task.quest?.title ? (
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            marginTop: compactMode ? 2 : 3 
                          }}>
                            <MaterialIcons 
                              name="assignment" 
                              size={compactMode ? 12 : 14} // Increased from 10/12
                              color={task.status === 'Done' ? '#888' : secondaryColor} 
                              style={{ marginRight: 4 }} 
                            />
                            <Text style={{ 
                              fontSize: compactMode ? 12 : 14, // Increased from 10/12
                              color: task.status === 'Done' ? '#888' : secondaryColor,
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
