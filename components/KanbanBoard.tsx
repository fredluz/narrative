import React from 'react';
import { View, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { useTheme } from '@/contexts/ThemeContext';
import { Task } from '@/app/types';
import { formatDateTime } from '@/utils/dateFormatters';
import { questStyles } from '@/app/styles/questStyles';

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
    <View style={questStyles.kanbanContainer}>
      {(Object.keys(groupedTasks) as TaskStatus[]).map((status) => (
        <View key={status} style={questStyles.kanbanColumn}>
          <Text style={questStyles.kanbanTitle}>
            {status.replace(/([A-Z])/g, ' $1').trim()}
          </Text>
          {groupedTasks[status].map((task) => (
            <Card 
              key={task.id} 
              style={[questStyles.kanbanTaskCard, { borderColor: themeColor, borderWidth: 1 }]}
            >
              <Text style={questStyles.kanbanTask}>{task.title}</Text>
              <Text style={questStyles.statusTimestamp}>
                {formatDateTime(task.scheduled_for, 'compact')}
              </Text>
              {task.deadline && (
                <Text style={questStyles.deadline}>
                  {formatDateTime(task.deadline, 'deadline')}
                </Text>
              )}
            </Card>
          ))}
        </View>
      ))}
    </View>
  );
}
