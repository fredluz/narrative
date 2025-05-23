import React, { useState, useEffect, useContext } from 'react'; // Added useContext
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
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk
// import { useChatData } from '@/hooks/useChatData'; // Remove direct import
import { useChat } from '@/contexts/ChatContext'; // Import useChat hook

interface TaskListProps {
  compactMode?: boolean;
  // userId prop might become redundant if we always use the logged-in user's ID from Clerk
  // For now, keep it for potential flexibility (e.g., viewing another user's tasks if permissions allow)
  userId?: string; // Keep only one definition
}

export function TaskList({ compactMode = false, userId: propUserId }: TaskListProps) {
  const { userId: authUserId } = useAuth(); // Get logged-in user's ID from Clerk
  const { shouldUpdate, resetUpdate } = useQuestUpdate();
  const { themeColor, secondaryColor } = useTheme();
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [availableSpace, setAvailableSpace] = useState<number>(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [welcomeMessageSentThisSession, setWelcomeMessageSentThisSession] = useState(false); // Add session flag

  // Determine which userId to use: the one from props or the logged-in user's ID
  // Default to the logged-in user if propUserId is not provided
  const targetUserId = propUserId || authUserId;

  // Only call useTasks if we have a valid targetUserId
  const { tasks, loading, error, reload: loadTasks } = useTasks(targetUserId ?? ''); // Pass empty string if null/undefined to satisfy hook, but guard usage
  const { triggerWelcomeMessage, messages } = useChat(); // Get the trigger function and messages from context

  // Clear local error when tasks reload
  useEffect(() => {
    setLocalError(null);
  }, [tasks]);

  // Verify current logged-in user has permission to update tasks shown (if targetUserId is defined)
  const canUpdateTasks = React.useMemo(() => {
    // User must be logged in (authUserId exists) AND
    // they must be viewing their own tasks (targetUserId matches authUserId)
    return !!authUserId && !!targetUserId && authUserId === targetUserId;
  }, [authUserId, targetUserId]);

  // Reload tasks when quest updates occur or targetUserId changes
  useEffect(() => {
    if (shouldUpdate && targetUserId) {
      loadTasks();
      resetUpdate();
    }
  }, [shouldUpdate, targetUserId, loadTasks, resetUpdate]);

  // Effect to trigger welcome message
  useEffect(() => {
    // Ensure we have the user ID, loading is done, tasks AND messages are empty, and message hasn't been sent this session
    if (targetUserId && !loading && tasks.length === 0 && messages.length === 0 && !welcomeMessageSentThisSession) {
      console.log("[TaskList] Conditions met (0 tasks, 0 messages): Triggering welcome message.");
      if (triggerWelcomeMessage) {
        triggerWelcomeMessage(); // Call the function from context
        setWelcomeMessageSentThisSession(true); // Set flag to prevent re-triggering this session
      } else {
        console.error("[TaskList] triggerWelcomeMessage function is not available from useChat.");
      }
    }
  }, [loading, tasks, messages, welcomeMessageSentThisSession, triggerWelcomeMessage, targetUserId]); // Add messages to dependencies


  const toggleTaskCompletion = async (taskId: number, currentStatus: string, taskUserId: string) => {
    // Use canUpdateTasks for permission check
    if (!canUpdateTasks) {
      setLocalError("You don't have permission to update these tasks.");
      return;
    }
    // Ensure the task actually belongs to the target user (redundant check if canUpdateTasks is true, but safe)
    if (taskUserId !== targetUserId) {
       setLocalError("Task ownership mismatch."); // Should ideally not happen if canUpdateTasks is true
       return;
    }

    try {
      const newStatus = getNextStatus(currentStatus);
      // Use authUserId for the update operation, as it's the logged-in user performing the action
      // Ensure authUserId is not null before calling updateTaskStatus
      if (authUserId) {
        await updateTaskStatus(taskId, newStatus, authUserId);
        await loadTasks(); // Reload tasks for the targetUserId
      } else {
         console.error("Cannot update task status: authUserId is null.");
         setLocalError("Authentication error.");
      }
    } catch (err) {
      // Correct variable name here
      console.error("Failed to update task status:", { error: err, userId: authUserId });
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
        paddingHorizontal: compactMode ? 15 : 15,
        paddingVertical: compactMode ? 15 : 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
        backgroundColor: '#252525',
      }}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center',
          paddingBottom: 8,
          borderBottomWidth: 2,
          borderBottomColor: themeColor
        }}>
          <Text style={{ 
            fontSize: compactMode ? 16 : 20,
            fontWeight: 'bold',
            color: '#EEEEEE',
          }}>
            ACTIVE TASKS
          </Text>
          <View style={{
            height: 3,
            width: 24,
            backgroundColor: themeColor,
            marginLeft: 8,
            borderRadius: 2,
          }} />
        </View>
        
        <TouchableOpacity 
          onPress={loadTasks}
          style={{
            padding: compactMode ? 6 : 8,
            borderRadius: 6,
            backgroundColor: '#333333',
            borderWidth: 1,
            borderColor: '#444444',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <MaterialIcons 
            name="refresh" 
            size={compactMode ? 18 : 20} 
            color={themeColor}
            style={{ transform: [{ rotate: '0deg' }] }}
          />
        </TouchableOpacity>
      </View>

      {/* Add check for targetUserId before rendering content */}
      {!targetUserId ? (
         <View style={{ padding: compactMode ? 10 : 20, alignItems: 'center' }}>
           <Text style={{ color: colors.textMuted }}>User not identified.</Text>
         </View>
      ) : loading ? (
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
                      borderLeftWidth: 4,
                      borderLeftColor: task.status === 'Done' ? themeColor :
                                    task.status === 'InProgress' ? secondaryColor : '#9E9E9E',
                      borderRightWidth: 1,
                      borderRightColor: '#333333',
                      borderTopWidth: 1,
                      borderTopColor: '#333333',
                      borderBottomWidth: 1,
                      borderBottomColor: '#333333',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={() => toggleTaskCompletion(task.id, task.status, task.clerk_id)}
                        style={{ padding: compactMode ? 4 : 8 }}
                        disabled={!canUpdateTasks} // Disable based on canUpdateTasks
                      >
                        <MaterialIcons
                          name={
                            task.status === 'Done' ? 'check-circle' :
                            task.status === 'InProgress' ? 'timelapse' :
                            'radio-button-unchecked'
                          }
                          size={compactMode ? 18 : 22}
                          color={
                            !canUpdateTasks ? '#444444' : // Use canUpdateTasks for color logic
                            task.status === 'Done' ? themeColor :
                            task.status === 'InProgress' ? secondaryColor :
                            '#9E9E9E'
                          }
                        />
                      </TouchableOpacity>
                      <View style={{ marginLeft: compactMode ? 8 : 10, flex: 1 }}>
                        <Text style={{ 
                          fontSize: compactMode ? 15 : 16,
                          color: task.status === 'Done' ? '#AAAAAA' : '#DDDDDD',
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
                            paddingVertical: 3,
                            borderRadius: 4,
                            alignSelf: 'flex-start',
                          }}>
                            <MaterialIcons 
                              name="folder" 
                              size={compactMode ? 12 : 14}
                              color="#BBBBBB"
                              style={{ marginRight: 4 }} 
                            />
                            <Text style={{ 
                              fontSize: compactMode ? 12 : 13,
                              color: task.quest.is_main ? secondaryColor : '#BBBBBB',
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
