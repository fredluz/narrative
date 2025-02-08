import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { ChatInterface } from '@/components/ChatInterface';
import { TaskList } from '@/components/TaskList';
import { KanbanBoard } from '@/components/KanbanBoard';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useChatData } from '@/hooks/useChatData';
import { useQuests } from '@/services/questsService';  // Updated import path
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import styles from '@/app/styles/global';

export function DesktopLayout() {
  const router = useRouter();
  const { themeColor } = useTheme();
  const { messages } = useChatData();
  const { mainQuest, loading, error } = useQuests();  // Updated hook name
  
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
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <Text style={[styles.errorText, { color: '#FF4444' }]}>{error}</Text>
          ) : !mainQuest ? (
            <View>
              <Text style={styles.mainQuestTitle}>No main quest selected</Text>
              <TouchableOpacity 
                onPress={() => router.push('/quests')}
                style={[styles.viewAllQuests, { backgroundColor: themeColor }]}
              >
                <Text style={[styles.viewAllQuestsText, { color: textColor }]}>
                  Select Main Quest
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.mainQuestTitle}>{mainQuest.title}</Text>
              <TouchableOpacity 
                onPress={() => router.push('/quests')}
                style={[styles.viewAllQuests, { backgroundColor: themeColor }]}
              >
                <Text style={[styles.viewAllQuestsText, { color: textColor }]}>
                  View All Quests
                </Text>
              </TouchableOpacity>
              <KanbanBoard tasks={mainQuest.tasks || []} />
            </>
          )}
        </Card>
      </View>

      <View style={styles.column}>
        <ChatInterface themeColor={themeColor} recentMessages={messages} />
      </View>
      
      <TaskList />
      <SettingsButton />
    </View>
  );
}
