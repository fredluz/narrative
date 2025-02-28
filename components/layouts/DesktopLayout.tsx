import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChatInterface } from '@/components/ChatInterface';
import { TaskList } from '@/components/TaskList';
import { KanbanBoard } from '@/components/KanbanBoard';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useChatData } from '@/hooks/useChatData';
import { useQuests } from '@/services/questsService';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import styles, { colors } from '@/app/styles/global';
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';
import { JournalPanel } from '@/components/JournalPanel';

export function DesktopLayout() {
  const router = useRouter();
  const { themeColor, secondaryColor } = useTheme();
  const { messages } = useChatData();
  const { mainQuest, loading, error, reload } = useQuests();
  const { shouldUpdate, resetUpdate } = useQuestUpdate();

  // Remove getSecondaryColor function and use secondaryColor directly from ThemeContext
  
  const getBrightAccent = (baseColor: string) => {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    if (r + g + b > 500) {
      return '#FFFFFF';
    }
    
    const brightR = Math.min(255, r + 100);
    const brightG = Math.min(255, g + 100);
    const brightB = Math.min(255, b + 100);
    
    return `#${brightR.toString(16).padStart(2, '0')}${
      brightG.toString(16).padStart(2, '0')}${
      brightB.toString(16).padStart(2, '0')}`;
  };

  const isDarkColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  const textColor = isDarkColor(themeColor) ? '#fff' : '#000';
  const brightAccent = getBrightAccent(themeColor);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      {/* Cyberpunk-style glitch line */}
      <View style={{
        position: 'absolute',
        top: '35%',
        left: -10,
        width: '120%',
        height: 1,
        backgroundColor: secondaryColor,  // Using secondaryColor from ThemeContext
        opacity: 0.1,
        transform: [{ rotate: '-0.3deg' }],
        zIndex: 1,
      }} />
      
      {/* Vertical accent line */}
      <View style={{
        position: 'absolute',
        top: '10%',
        bottom: '10%',
        width: 1,
        left: '33.3%',
        backgroundColor: themeColor,
        opacity: 0.1,
        zIndex: 1,
      }} />
      
      {/* Vertical accent line */}
      <View style={{
        position: 'absolute',
        top: '10%',
        bottom: '10%',
        width: 1,
        right: '33.3%',
        backgroundColor: themeColor,
        opacity: 0.1,
        zIndex: 1,
      }} />
            
      <View style={styles.column}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <LoadingSpinner/>
          </View>
        ) : error ? (
          <View style={{ 
            padding: 15,
            backgroundColor: 'rgba(200, 0, 0, 0.1)',
            borderRadius: 5,
            borderLeftWidth: 3,
            borderLeftColor: colors.error,
          }}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity onPress={reload}>
              <Text style={{ color: colors.error, textDecorationLine: 'underline', marginTop: 8 }}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Pass the entire mainQuest object to KanbanBoard */}
            <KanbanBoard 
              mainQuest={mainQuest} 
              onViewAllQuests={() => router.push('/quests')}
            />

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
