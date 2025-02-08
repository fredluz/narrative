import React from 'react';
import { View, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { useTheme } from '@/contexts/ThemeContext';
import { Task } from '@/app/types';
import styles from '@/app/styles/global';

type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

interface KanbanBoardProps {
  tasks: Task[];
}

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  const { themeColor } = useTheme();
  
  // Initialize empty columns
  const groupedTasks: Record<TaskStatus, Task[]> = {
    ToDo: [],
    InProgress: [],
    Done: []
  };

  // Group tasks by status, handling undefined or invalid status
  (tasks || []).forEach(task => {
    const status = task.status as TaskStatus;
    if (status in groupedTasks) {
      groupedTasks[status].push(task);
    } else {
      groupedTasks.ToDo.push(task); // Default to ToDo if status is invalid
    }
  });

  return (
    <View style={styles.kanbanContainer}>
      {(Object.keys(groupedTasks) as TaskStatus[]).map((status) => (
        <View key={status} style={styles.kanbanColumn}>
          <Text style={[styles.kanbanTitle, { color: 'white' }]}>
            {status.replace(/([A-Z])/g, ' $1').trim()}
          </Text>
          {groupedTasks[status].map((task) => (
            <Card 
              key={task.id} 
              style={[styles.kanbanTaskCard, { borderColor: themeColor, borderWidth: 1 }]}
            >
              <Text style={styles.kanbanTask}>{task.title}</Text>
              {task.deadline && (
                <Text style={[styles.cardDetails, { color: '#FF4444', fontSize: 12 }]}>
                  Due: {task.deadline}
                </Text>
              )}
            </Card>
          ))}
        </View>
      ))}
    </View>
  );
}
