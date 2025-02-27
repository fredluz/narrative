import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator 
} from 'react-native';
import { Card, Checkbox } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import styles, { colors } from '@/app/styles/global';
import { useTasks } from '@/services/tasksService';
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';
import { useTheme } from '@/contexts/ThemeContext';
import { taskStyles } from '@/app/styles/taskStyles';
import type { Task } from '@/app/types';

// Add a taskService for operations that don't fit in the useTasks hook
const taskService = {
  updateTaskStatus: async (taskId: number, completed: boolean): Promise<void> => {
    // This would normally update the task in your database
    console.log(`Updating task ${taskId} to ${completed ? 'completed' : 'not completed'}`);
    // For now this is a mock implementation
    return Promise.resolve();
  }
};

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { shouldUpdate, resetUpdate } = useQuestUpdate();
  const { themeColor } = useTheme();
  
  // Get tasks from the hook
  const { tasks: hookTasks, loading: hookLoading, error: hookError, reload: loadTasks } = useTasks();

  // Keep our local tasks state in sync with the hook
  useEffect(() => {
    setTasks(hookTasks);
    setLoading(hookLoading);
    if (hookError) setError(hookError);
  }, [hookTasks, hookLoading, hookError]);
  
  // Generate a secondary color for our cyberpunk UI
  const getSecondaryColor = (baseColor: string) => {
    // If the color is red-ish, make secondary color blue-ish
    if (baseColor.includes('f') || baseColor.includes('e') || baseColor.includes('d')) {
      return '#1D64AB';
    }
    // Otherwise, make secondary color red-ish
    return '#D81159';
  };
  
  const secondaryColor = getSecondaryColor(themeColor);

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

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (shouldUpdate) {
      loadTasks();
      resetUpdate();
    }
  }, [shouldUpdate]);

  const toggleTaskCompletion = async (taskId: number, currentState: boolean) => {
    try {
      await taskService.updateTaskStatus(taskId, !currentState);
      
      // Update the local state
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, completed: !currentState } : task
      );
      
      setTasks(updatedTasks);
    } catch (err) {
      console.error("Failed to update task status:", err);
      setError("Failed to update task status");
    }
  };

  return (
    <View style={styles.column}>
      <Card style={{ borderLeftWidth: 3, borderLeftColor: themeColor, overflow: 'hidden' }}>
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

        {/* Glitch line - very cyberpunk */}
        <View style={{
          position: 'absolute',
          top: '70%',
          left: -10,
          width: '120%',
          height: 1,
          backgroundColor: secondaryColor,
          opacity: 0.15,
          transform: [{ rotate: '-1deg' }],
        }} />
        
        <View style={{ 
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          paddingHorizontal: 15,
          paddingVertical: 15,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ 
              fontSize: 18,
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
              padding: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(30, 30, 30, 0.9)',
              borderWidth: 1,
              borderColor: themeColor,
            }}
          >
            <MaterialIcons name="refresh" size={20} color={brightAccent} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={themeColor} />
          </View>
        ) : error ? (
          <View style={{ 
            margin: 15,
            padding: 10, 
            backgroundColor: 'rgba(200, 0, 0, 0.1)', 
            borderRadius: 5,
            borderLeftWidth: 2,
            borderLeftColor: colors.error,
          }}>
            <Text style={{ color: colors.error }}>{error}</Text>
            <TouchableOpacity onPress={loadTasks}>
              <Text style={{ color: colors.error, textDecorationLine: 'underline', marginTop: 5 }}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : tasks.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <MaterialIcons name="check-circle-outline" size={40} color="rgba(255,255,255,0.1)" />
            <Text style={{ fontSize: 16, color: '#999', textAlign: 'center' }}>No active tasks</Text>
          </View>
        ) : (
          <ScrollView style={{ padding: 10 }}>
            {tasks.map((task) => (
              <View 
                key={task.id} 
                style={{ 
                  backgroundColor: 'rgba(25, 25, 25, 0.7)',
                  borderLeftWidth: 2,
                  borderLeftColor: task.completed ? secondaryColor : themeColor,
                  marginBottom: 8,
                  padding: 10,
                  borderRadius: 4,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Checkbox
                    status={task.completed ? 'checked' : 'unchecked'}
                    onPress={() => toggleTaskCompletion(task.id, task.completed)}
                    color={task.completed ? secondaryColor : themeColor}
                  />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={{ 
                      fontSize: 16,
                      color: task.completed ? '#AAA' : '#FFF',
                      textDecorationLine: task.completed ? 'line-through' : 'none',
                      opacity: task.completed ? 0.7 : 1,
                    }}>
                      {task.title}
                    </Text>
                    {task.description ? (
                      <Text style={{ 
                        fontSize: 14,
                        color: '#999',
                        marginTop: 4,
                        opacity: task.completed ? 0.5 : 0.8, 
                      }}>
                        {task.description}
                      </Text>
                    ) : null}
                    {task.quest?.title ? (
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        marginTop: 3 
                      }}>
                        <MaterialIcons 
                          name="assignment" 
                          size={12} 
                          color={task.completed ? '#888' : secondaryColor} 
                          style={{ marginRight: 4 }} 
                        />
                        <Text style={{ 
                          fontSize: 12,
                          color: task.completed ? '#888' : secondaryColor,
                        }}>
                          {task.quest.title}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </Card>
    </View>
  );
}
