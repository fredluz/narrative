import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Animated } from 'react-native';
import { Card } from 'react-native-paper';
import { ChatInterface } from '@/components/ChatInterface';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { useChatData } from '@/hooks/useChatData';
import { useTaskData } from '@/hooks/useTaskData';
import { useQuestData } from '@/hooks/useQuestData';
import { useTheme } from '@/contexts/ThemeContext';
import styles from '@/app/styles/global';

export function DesktopLayout() {
  const { themeColor } = useTheme();
  const { messages } = useChatData();
  const { tasks, taskListVisible, animatedHeight, toggleTaskList } = useTaskData();
  const { mainQuest } = useQuestData();

  return (
    <View style={[styles.container, { backgroundColor: '#181818' }]}> 
      <View style={styles.column}>
        <Card style={[styles.mainQuestCard, { borderColor: themeColor, borderWidth: 2 }]}> 
          <Text style={styles.mainQuestTitle}>{mainQuest.title}</Text>
          <Text style={styles.cardDetails}>Progress: {mainQuest.progress}</Text>
          <View style={styles.kanbanContainer}>
            {Object.keys(mainQuest.kanban).map((status) => (
              <View key={status} style={styles.kanbanColumn}>
                <Text style={styles.kanbanTitle}>{status.replace(/([A-Z])/g, ' $1')}</Text>
                {mainQuest.kanban[status as keyof typeof mainQuest.kanban].map((task: string, index: number) => (
                  <Card key={index} style={styles.kanbanTaskCard}>
                    <Text style={styles.kanbanTask}>{task}</Text>
                  </Card>
                ))}
              </View>
            ))}
          </View>
        </Card>
      </View>

      <View style={styles.column}>
        <ChatInterface themeColor={themeColor} recentMessages={messages} />
      </View>
      
      <View style={styles.column}>
        <TouchableOpacity 
          onPress={toggleTaskList} 
          style={[styles.toggleButton, { backgroundColor: themeColor }]}>
          <Text style={styles.toggleButtonText}>
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
                <Text style={styles.cardDetails}>Start: {item.scheduledFor} ({item.location})</Text>
                {item.deadline && (
                  <Text style={[styles.cardDetails, { color: '#FF4444' }]}>
                    Deadline: {item.deadline}
                  </Text>
                )}
                <Text style={styles.cardQuest}>Quest: {item.quest}</Text>
              </Card>
            )}
          />
        </Animated.View>
      </View>
      <SettingsButton />
    </View>
  );
}
