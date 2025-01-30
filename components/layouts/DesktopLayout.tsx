import React from 'react';
import { View, Text, FlatList, TouchableOpacity, Animated } from 'react-native';
import { Card } from 'react-native-paper';
import { ChatInterface } from '@/components/ChatInterface';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { useChatData } from '@/hooks/useChatData';
import { useTaskData } from '@/hooks/useTaskData';
import { useQuestData } from '@/hooks/useQuestData';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import styles from '@/app/styles/global';

export function DesktopLayout() {
  const router = useRouter();
  const { themeColor } = useTheme();
  const { messages } = useChatData();
  const { tasks, taskListVisible, animatedHeight, toggleTaskList } = useTaskData();
  const { mainQuest } = useQuestData();

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
    <View style={[styles.container, { backgroundColor: '#181818' }]}> 
      <View style={styles.column}>
        <Card style={[styles.mainQuestCard, { borderColor: themeColor, borderWidth: 2 }]}> 
          <Text style={styles.mainQuestTitle}>{mainQuest.title}</Text>
          <Text style={styles.cardDetails}>Progress: {mainQuest.progress}</Text>
          <TouchableOpacity 
            onPress={() => router.push('/quests')}
            style={[styles.viewAllQuests, { backgroundColor: themeColor }]}
          >
            <Text style={[styles.viewAllQuestsText, { color: textColor }]}>
              View All Quests
            </Text>
          </TouchableOpacity>
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
