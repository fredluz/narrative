import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import type { Task } from '@/app/types';

interface TaskProgressProps {
  tasks: Task[];
  themeColor: string;
  secondaryColor: string;
}


export function TaskProgress({ tasks, themeColor, secondaryColor }: TaskProgressProps) {
    // Group tasks by status
    const taskGroups: TaskGroup[] = [
      {
        title: 'COMPLETED',
        tasks: tasks.filter(t => t.status === 'Done'),
        icon: 'check-circle',
        color: '#4CAF50'
      },
      {
        title: 'IN PROGRESS',
        tasks: tasks.filter(t => t.status === 'InProgress'),
        icon: 'pending',
        color: secondaryColor
      },
      {
        title: 'NOT STARTED',
        tasks: tasks.filter(t => t.status === 'ToDo'),
        icon: 'schedule',
        color: themeColor
      }
    ];
  
    // Calculate overall progress
    const totalTasks = tasks.length;
    const completedTasks = taskGroups[0].tasks.length;
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialIcons name="assessment" size={20} color={themeColor} />
          <ThemedText style={[styles.headerText, { color: themeColor }]}>
            TASK PROGRESS
          </ThemedText>
        </View>
  
        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progressPercentage}%`,
                  backgroundColor: progressPercentage >= 75 ? '#4CAF50' :
                                 progressPercentage >= 50 ? '#FFC107' :
                                 progressPercentage >= 25 ? '#FF9800' : '#F44336'
                }
              ]} 
            />
          </View>
          <ThemedText style={styles.progressText}>
            {completedTasks} of {totalTasks} tasks completed ({Math.round(progressPercentage)}%)
          </ThemedText>
        </View>
  
        {/* Task Groups */}
        <View style={styles.groupsContainer}>
          {taskGroups.map((group, index) => (
            <View key={group.title} style={styles.group}>
              <View style={[styles.groupHeader, { borderLeftColor: group.color }]}>
                <MaterialIcons name={group.icon} size={18} color={group.color} />
                <ThemedText style={[styles.groupTitle, { color: group.color }]}>
                  {group.title} ({group.tasks.length})
                </ThemedText>
              </View>
              
              {group.tasks.map(task => (
                <View 
                  key={task.id} 
                  style={[styles.taskItem, { borderLeftColor: group.color }]}
                >
                  <ThemedText style={styles.taskTitle}>{task.title}</ThemedText>
                  {task.quest_id && (
                    <View style={[styles.questTag, { backgroundColor: themeColor }]}>
                      <MaterialIcons name="flag" size={12} color="#FFF" style={{ marginRight: 4 }} />
                      <ThemedText style={styles.questText}>Quest Task</ThemedText>
                    </View>
                  )}
                </View>
              ))}
  
              {group.tasks.length === 0 && (
                <ThemedText style={styles.emptyText}>
                  No tasks {group.title.toLowerCase()}
                </ThemedText>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }
  
  const styles = StyleSheet.create({
    container: {
      backgroundColor: 'rgba(20, 20, 20, 0.7)',
      borderRadius: 8,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerText: {
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    progressSection: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    progressBar: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressText: {
      color: '#AAA',
      fontSize: 12,
      textAlign: 'center',
    },
    groupsContainer: {
      padding: 15,
    },
    group: {
      marginBottom: 20,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      backgroundColor: 'rgba(30, 30, 30, 0.7)',
      padding: 8,
      borderRadius: 4,
      borderLeftWidth: 3,
    },
    groupTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    taskItem: {
      backgroundColor: 'rgba(30, 30, 30, 0.7)',
      padding: 12,
      borderRadius: 4,
      marginBottom: 8,
      borderLeftWidth: 3,
    },
    taskTitle: {
      color: '#E0E0E0',
      fontSize: 14,
      marginBottom: 4,
    },
    questTag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 3,
      alignSelf: 'flex-start',
    },
    questText: {
      color: '#FFF',
      fontSize: 10,
    },
    emptyText: {
      color: '#666',
      fontStyle: 'italic',
      fontSize: 12,
      textAlign: 'center',
      padding: 10,
    },
  });