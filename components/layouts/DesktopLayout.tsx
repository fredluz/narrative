import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
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
import { formatDateTime } from '@/utils/dateFormatters';
import { useQuestUpdate } from '@/contexts/QuestUpdateContext';
import { JournalPanel } from '@/components/JournalPanel';
import { questStyles } from '@/app/styles/questStyles';
import { MaterialIcons } from '@expo/vector-icons';

export function DesktopLayout() {
  const router = useRouter();
  const { themeColor } = useTheme();
  const { messages } = useChatData();
  const { mainQuest, loading, error, reload } = useQuests();
  const { shouldUpdate, resetUpdate } = useQuestUpdate();

  // Generate a secondary color for our cyberpunk UI
  const getSecondaryColor = (baseColor: string) => {
    // If the color is red-ish, make secondary color blue-ish
    if (baseColor.includes('f') || baseColor.includes('e') || baseColor.includes('d')) {
      return '#1D64AB';
    }
    // Otherwise, make secondary color red-ish
    return '#D81159';
  };
  
  const secondaryColor = getSecondaryColor(themeColor);
  
  // Make text more visible against dark backgrounds
  const getBrightAccent = (baseColor: string) => {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // If already bright, make it even brighter
    if (r + g + b > 500) {
      return '#FFFFFF';
    }
    
    // Otherwise create a bright neon version
    const brightR = Math.min(255, r + 100);
    const brightG = Math.min(255, g + 100);
    const brightB = Math.min(255, b + 100);
    
    return `#${brightR.toString(16).padStart(2, '0')}${
      brightG.toString(16).padStart(2, '0')}${
      brightB.toString(16).padStart(2, '0')}`;
  };
  
  const brightAccent = getBrightAccent(themeColor);

  const isDarkColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  const textColor = isDarkColor(themeColor) ? '#fff' : '#000';

  console.log("DesktopLayout mainQuest:", mainQuest);

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
        backgroundColor: secondaryColor,
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
            <LoadingSpinner color={themeColor} />
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
        ) : !mainQuest ? (
          <View style={{ 
            padding: 20, 
            alignItems: 'center', 
            backgroundColor: 'rgba(25, 25, 25, 0.9)',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}>
            <MaterialIcons name="assignment-late" size={50} color="rgba(255, 255, 255, 0.15)" />
            <Text style={[
              questStyles.mainQuestTitle, 
              { 
                color: '#FFFFFF',
                textAlign: 'center', 
                marginTop: 15,
                textShadowColor: themeColor,
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 3
              }
            ]}>
              No Main Quest Selected
            </Text>
            <TouchableOpacity 
              onPress={() => router.push('/quests')}
              style={[
                questStyles.viewAllQuests, 
                { 
                  backgroundColor: themeColor,
                  marginTop: 15,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  shadowColor: themeColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 5,
                  elevation: 5
                }
              ]}
            >
              <Text style={[questStyles.viewAllQuestsText, { color: textColor }]}>
                Select Main Quest
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Card style={[
              questStyles.mainQuestCard, 
              { 
                borderColor: themeColor, 
                borderWidth: 1,
                borderLeftWidth: 3,
                overflow: 'hidden'
              }
            ]}>
              {/* Background with cyberpunk elements */}
              <View style={{ 
                position: 'absolute', 
                width: '100%', 
                height: '100%',
                backgroundColor: '#151515',
              }} />
              
              {/* Digital noise effect */}
              <View style={{
                position: 'absolute',
                top: 0,
                height: '100%',
                width: 40,
                right: 20,
                opacity: 0.05,
                backgroundColor: themeColor,
              }} />

              {/* Glitch line */}
              <View style={{
                position: 'absolute',
                top: '50%',
                left: -10,
                width: '120%',
                height: 1,
                backgroundColor: secondaryColor,
                opacity: 0.15,
                transform: [{ rotate: '0.3deg' }],
              }} />
              
              {/* Main quest header section */}
              <View style={[styles.cardHeader, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[
                    questStyles.mainQuestTitle, 
                    { 
                      color: '#FFFFFF',
                      textShadowColor: themeColor,
                      textShadowOffset: { width: 1, height: 1 },
                      textShadowRadius: 4
                    }
                  ]}>
                    MAIN QUEST
                  </Text>
                  <View style={{
                    height: 3,
                    width: 20,
                    backgroundColor: themeColor,
                    marginLeft: 8,
                    borderRadius: 2,
                  }} />
                </View>
              </View>
              
              <View style={{ padding: 15 }}>
                <Text style={[
                  questStyles.questTitle, 
                  { 
                    color: brightAccent,
                    marginBottom: 5,
                    fontSize: 22,
                    fontWeight: 'bold',
                    textShadowColor: themeColor,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 4
                  }
                ]}>
                  {mainQuest.title}
                </Text>
                
                {mainQuest.start_date && (
                  <Text style={[
                    questStyles.questDetails, 
                    { 
                      color: '#AAA',
                      marginBottom: 3
                    }
                  ]}>
                    Started: {formatDateTime(mainQuest.start_date)}
                  </Text>
                )}
                
                {mainQuest.end_date && (
                  <Text style={[
                    questStyles.questDetails,
                    {
                      color: '#AAA',
                      marginBottom: 10
                    }
                  ]}>
                    Target completion: {formatDateTime(mainQuest.end_date)}
                  </Text>
                )}
                
                <TouchableOpacity 
                  onPress={() => router.push('/quests')}
                  style={[
                    questStyles.viewAllQuests, 
                    { 
                      backgroundColor: 'rgba(30, 30, 30, 0.9)',
                      borderWidth: 1, 
                      borderColor: themeColor,
                      marginBottom: 15,
                    }
                  ]}
                >
                  <MaterialIcons name="assignment" size={18} color={brightAccent} style={{ marginRight: 6 }} />
                  <Text style={[
                    questStyles.viewAllQuestsText, 
                    { 
                      color: brightAccent,
                    }
                  ]}>
                    View All Quests
                  </Text>
                </TouchableOpacity>
                
                <KanbanBoard tasks={mainQuest.tasks || []} />
              </View>
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
