import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import Animated from 'react-native-reanimated';
import { useTasks } from '@/services/tasksService';
import { useTheme } from '@/contexts/ThemeContext';
import { LoadingSpinner } from './ui/LoadingSpinner';
import styles from '@/app/styles/global';

export function TaskList() {
  const { themeColor } = useTheme();
  const { tasks, taskListVisible, animatedHeight, toggleTaskList, loading, error } = useTasks();

  if (loading) return <LoadingSpinner />;
  if (error) return <Text style={{ color: 'red' }}>{error}</Text>;
  if (!tasks.length) return null;

  const isDarkColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  const textColor = isDarkColor(themeColor) ? '#fff' : '#000';

  return (
    <View style={styles.column}>
      <TouchableOpacity 
        onPress={toggleTaskList} 
        style={[styles.toggleButton, { backgroundColor: themeColor }]}>
        <Text style={[styles.toggleButtonText, { color: textColor }]}>
          {taskListVisible ? "Hide Tasks" : "Show Upcoming Tasks"}
        </Text>
      </TouchableOpacity>
      
      <Animated.View style={[
        styles.taskContainer,
        {
          maxHeight: animatedHeight.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%']
          }),
          opacity: animatedHeight
        }
      ]}>
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Card style={[styles.taskCard, { borderColor: themeColor, borderWidth: 2 }]}> 
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDetails}>
                Start: {item.scheduled_for} ({item.location})
              </Text>
              {item.deadline && (
                <Text style={[styles.cardDetails, { color: '#FF4444' }]}>
                  Deadline: {item.deadline}
                </Text>
              )}
              <Text style={styles.cardQuest}>
                Quest: {item.quest?.title || 'No Quest Assigned'}
              </Text>
            </Card>
          )}
        />
      </Animated.View>
    </View>
  );
}
