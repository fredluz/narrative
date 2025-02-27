import React, { useEffect } from 'react';
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
import styles, { colors } from '@/app/styles/global';
import { formatDateTime } from '@/utils/dateFormatters';
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';
import { JournalPanel } from '@/components/JournalPanel';
import { questStyles } from '@/app/styles/questStyles';

export function DesktopLayout() {
  const router = useRouter();
  const { themeColor } = useTheme();
  const { messages } = useChatData();
  const { mainQuest, loading, error, reload } = useQuests();  // Updated hook name and added reload
  const { shouldUpdate, resetUpdate } = useQuestUpdate();

  console.log("DesktopLayout mainQuest:", mainQuest); // Add log to check main quest

  // Simple mount-time load
  useEffect(() => {
    reload();
  }, []);

  // Add effect to check for updates
  useEffect(() => {
    if (shouldUpdate) {
      console.log('Update triggered, reloading quests');
      reload();
      resetUpdate();
    }
  }, [shouldUpdate]);

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
    <View style={[styles.container]}> 
      <View style={styles.column}>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <Text style={[styles.errorText]}>{error}</Text>
        ) : !mainQuest ? (
          <View>
            <Text style={questStyles.mainQuestTitle}>No main quest selected</Text>
            <TouchableOpacity 
              onPress={() => router.push('/quests')}
              style={[questStyles.viewAllQuests, { backgroundColor: themeColor }]}
            >
              <Text style={[questStyles.viewAllQuestsText, { color: textColor }]}>
                Select Main Quest
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Card style={[questStyles.mainQuestCard, { borderColor: themeColor, borderWidth: 2 }]}>
              {/* Main quest header section */}
              <Text style={questStyles.mainQuestTitle}>{mainQuest.title}</Text>
              {mainQuest.start_date && (
                <Text style={questStyles.questDetails}>
                  Started: {formatDateTime(mainQuest.start_date)}
                </Text>
              )}
              {mainQuest.end_date && (
                <Text style={questStyles.questDetails}>
                  Target completion: {formatDateTime(mainQuest.end_date)}
                </Text>
              )}
              <TouchableOpacity 
                onPress={() => router.push('/quests')}
                style={[questStyles.viewAllQuests, { backgroundColor: themeColor }]}
              >
                <Text style={[questStyles.viewAllQuestsText, { color: textColor }]}>
                  View All Quests
                </Text>
              </TouchableOpacity>
              <KanbanBoard tasks={mainQuest.tasks || []} />
            </Card>

            {/* Journal panel as separate card */}
            <JournalPanel themeColor={themeColor} textColor={textColor} />
          </>
        )}
      </View>

      <View style={styles.column}>
        <ChatInterface themeColor={themeColor} recentMessages={messages} />
      </View>
      
      <TaskList />
      <SettingsButton />
    </View>
  );
}
