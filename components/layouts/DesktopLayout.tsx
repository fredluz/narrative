import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { KanbanBoard } from '@/components/quests/KanbanBoard';
import { TaskList } from '@/components/tasks/TaskList';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { useQuests } from '@/services/questsService';
import styles from '@/app/styles/global';
import { colors } from '@/app/styles/global';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useChatData } from '@/hooks/useChatData';
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';
import { JournalPanel } from '@/components/journal/JournalPanel';
import { useSupabase } from '@/contexts/SupabaseContext';

export function DesktopLayout() {
  const { session } = useSupabase();
  const router = useRouter();
  const { themeColor, secondaryColor } = useTheme();
  const { 
    messages, 
    sendMessage, 
    handleTyping, 
    endSession, 
    isTyping, 
    sessionEnded,
    checkupCreated // Get the new checkupCreated state
  } = useChatData();
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

  // Simple mount-time load with auth check
  useEffect(() => {
    if (!session?.user?.id) {
      console.warn("Please log in to view content");
      return;
    }
    reload();
  }, [session?.user?.id]);

  // Add effect to check for updates with auth check
  useEffect(() => {
    if (!session?.user?.id) return;
    
    if (shouldUpdate) {
      console.log('Update triggered, reloading quests');
      reload();
      resetUpdate();
    }
  }, [shouldUpdate, session?.user?.id]);

  if (!session?.user?.id) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.column}>
          <Text style={{ color: '#AAA', textAlign: 'center' }}>
            Please log in to view your dashboard.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
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
              userId={session.user.id}
            />

            {/* TaskList now appears in the first column after KanbanBoard */}
            <TaskList compactMode={true} />
          </>
        )}
      </View>

      <View style={styles.column}>
        <ChatInterface 
          recentMessages={messages} 
          onSendMessage={sendMessage}
          handleTyping={handleTyping}
          onEndSession={endSession}
          isTyping={isTyping}
          sessionEnded={sessionEnded}
          checkupCreated={checkupCreated} // Pass the new prop
          userId={session.user.id}
        />
      </View>
      
      {/* JournalPanel moved to its own column for more vertical space */}
      <View style={styles.column}>
        <JournalPanel 
          themeColor={themeColor} 
          textColor={textColor} 
          fullColumnMode={true} 
          userId={session.user.id}
        />
      </View>
      
      <SettingsButton />
    </View>
  );
}
