import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { formatDateTime } from '@/utils/dateFormatters';
import { useTasks } from '@/services/tasksService';
import { useTheme } from '@/contexts/ThemeContext';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { taskStyles } from '@/app/styles/taskStyles';
import styles from '@/app/styles/global';

export function TaskList() {
  const { themeColor } = useTheme();
  const { tasks, taskListVisible, setTaskListVisible, loading, error } = useTasks();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{
      scaleY: withSpring(taskListVisible ? 1 : 0, {
        damping: 50,
        stiffness: 90
      })
    }],
    opacity: withSpring(taskListVisible ? 1 : 0, {
      damping: 55,
      stiffness: 100
    }),
    transformOrigin: 'top',
  }));

  const isDarkColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  const textColor = isDarkColor(themeColor) ? '#fff' : '#000';

  if (loading) {
    return (
      <View style={styles.column}>
        <LoadingSpinner />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.column, taskStyles.errorContainer]}>
        <Text style={taskStyles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!tasks.length) {
    return <View style={styles.column} />;
  }

  return (
    <View style={styles.column}>
      <TouchableOpacity 
        onPress={() => setTaskListVisible(!taskListVisible)} 
        style={[taskStyles.toggleButton, { backgroundColor: themeColor }]}
      >
        <Text style={[taskStyles.toggleButtonText, { color: textColor }]}>
          {taskListVisible ? "Hide Tasks" : "Show Upcoming Tasks"}
        </Text>
      </TouchableOpacity>
      
      <Animated.View style={[taskStyles.container, animatedStyle]}>
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Card style={[taskStyles.taskCard, { borderColor: themeColor, borderWidth: 2 }]}> 
              <Text style={taskStyles.cardTitle}>{item.title}</Text>
              <Text style={taskStyles.cardDetails}>
                Start: {formatDateTime(item.scheduled_for)}
              </Text>
              <Text style={taskStyles.location}>Location: {item.location}</Text>
              {item.deadline && (
                <Text style={taskStyles.deadline}>
                  Deadline: {formatDateTime(item.deadline)}
                </Text>
              )}
              <Text style={taskStyles.questReference}>
                Quest: {item.quest?.title || 'No Quest Assigned'}
              </Text>
            </Card>
          )}
        />
      </Animated.View>
    </View>
  );
}
