import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { questStyles } from '@/app/styles/questStyles';
import { Task, Quest } from '@/app/types';
import { useRouter } from 'expo-router';
import { formatDateTime } from '@/utils/dateFormatters';
import { updateTaskStatus, getNextStatus } from '@/services/tasksService';
import { useSupabase } from '@/contexts/SupabaseContext';
import { Session } from '@supabase/supabase-js';

interface KanbanProps {
  mainQuest: Quest | null;
  onViewAllQuests?: () => void;
  userId: string;
}

type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

// Helper function to make text more visible against dark backgrounds
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

  return `#${brightR.toString(16).padStart(2, '0')}${brightG
    .toString(16).padStart(2, '0')}${brightB.toString(16).padStart(2, '0')}`;
};

export function KanbanBoard({ mainQuest, onViewAllQuests, userId }: KanbanProps) {
  const router = useRouter();
  const { themeColor, secondaryColor } = useTheme();
  const { session } = useSupabase() as { session: Session }; // Assert session exists
  const [activeColumn, setActiveColumn] = useState<TaskStatus | 'all' | 'active'>('active');
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

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

  // Verify current user
  const verifyCurrentUser = React.useMemo(() => {
    if (!session?.user?.id || !userId) return false;
    return session.user.id === userId;
  }, [session?.user?.id, userId]);

  if (!verifyCurrentUser) {
    return (
      <View style={{
        padding: 20,
        alignItems: 'center',
        backgroundColor: 'rgba(25, 25, 25, 0.9)',
        borderRadius: 8,
      }}>
        <Text style={{ color: '#AAA' }}>Unauthorized access</Text>
      </View>
    );
  }

  if (!mainQuest) {
    return (
      <View
        style={{
          padding: 20,
          alignItems: 'center',
          backgroundColor: 'rgba(25, 25, 25, 0.9)',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <MaterialIcons name="assignment-late" size={50} color="rgba(255, 255, 255, 0.15)" />
        <Text
          style={[
            questStyles.mainQuestTitle,
            {
              color: '#FFFFFF',
              textAlign: 'center',
              marginTop: 15,
              textShadowColor: themeColor,
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 3,
            },
          ]}
        >
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
              elevation: 5,
            },
          ]}
        >
          <Text style={[questStyles.viewAllQuestsText, { color: textColor }]}>
            Select Main Quest
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Handle task status toggle
  const toggleTaskCompletion = async (task: Task) => {
    if (!verifyCurrentUser || task.user_id !== userId) {
      console.warn("Unauthorized task update attempt");
      return;
    }

    try {
      setUpdatingTaskId(task.id);
      const userId = session.user.id;
      const newStatus = getNextStatus(task.status);
      await updateTaskStatus(task.id, newStatus, userId);
      
      // Update local state
      if (mainQuest && mainQuest.tasks) {
        mainQuest.tasks = mainQuest.tasks.map(t => 
          t.id === task.id ? { ...t, status: newStatus } : t
        );
      }
      
      // Force a re-render
      setActiveColumn(prev => prev);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Extract and filter tasks
  const tasks = mainQuest?.tasks || [];
  const filteredTasks = 
    activeColumn === 'all' ? tasks :
    activeColumn === 'active' ? tasks.filter((task) => task.status === 'ToDo' || task.status === 'InProgress') :
    tasks.filter((task) => task.status === activeColumn);

  // No tasks UI
  if (tasks.length === 0) {
    return (
      <Card style={[questStyles.mainQuestCard, {
        borderColor: themeColor,
        borderWidth: 1,
        borderLeftWidth: 3,
        overflow: 'hidden',
      }]}>
        <View style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundColor: '#151515',
        }}/><View style={{
          position: 'absolute',
          top: 0,
          height: '100%',
          width: 40,
          right: 20,
          opacity: 0.05,
          backgroundColor: themeColor,
        }}/>
        <View style={[questStyles.cardHeader, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[questStyles.mainQuestTitle, {
              color: '#FFFFFF',
              textShadowColor: themeColor,
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 4,
            }]}>MAIN QUEST</Text>
            <View style={{
              height: 3,
              width: 20,
              backgroundColor: themeColor,
              marginLeft: 8,
              borderRadius: 2,
            }}/>
          </View>
        </View>
        <View style={{ padding: 15 }}>
          <Text
            style={[
              questStyles.questTitle,
              {
                color: brightAccent,
                marginBottom: 5,
                fontSize: 22,
                fontWeight: 'bold',
                textShadowColor: themeColor,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 4,
              },
            ]}
          >
            {mainQuest.title}
          </Text>

          {mainQuest.start_date && (
            <Text
              style={[questStyles.questDetails, { color: '#AAA', marginBottom: 3 }]}
            >
              Started: {formatDateTime(mainQuest.start_date)}
            </Text>
          )}

          {mainQuest.end_date && (
            <Text
              style={[questStyles.questDetails, { color: '#AAA', marginBottom: 10 }]}
            >
              Target completion: {formatDateTime(mainQuest.end_date)}
            </Text>
          )}

          <TouchableOpacity
            onPress={() => (onViewAllQuests ? onViewAllQuests() : router.push('/quests'))}
            style={[
              questStyles.viewAllQuests,
              {
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                borderWidth: 1,
                borderColor: themeColor,
                marginBottom: 15,
              },
            ]}
          >
            <MaterialIcons
              name="assignment"
              size={18}
              color={brightAccent}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[questStyles.viewAllQuestsText, { color: brightAccent }]}
            >
              View All Quests
            </Text>
          </TouchableOpacity>

          <View style={questStyles.emptyBoard}>
            <MaterialIcons name="dashboard" size={30} color="rgba(255,255,255,0.1)" />
            <Text style={questStyles.emptyBoardText}>No tasks assigned to this quest</Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card
      style={[
        questStyles.mainQuestCard,
        { borderColor: themeColor, borderWidth: 1, borderLeftWidth: 3, overflow: 'hidden' },
      ]}
    >{/* Background elements */}
      <View style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: '#151515',
      }}/><View style={{
        position: 'absolute',
        top: 0,
        height: '100%',
        width: 40,
        right: 20,
        opacity: 0.05,
        backgroundColor: themeColor,
      }}/>
      <View style={[questStyles.cardHeader, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={[
              questStyles.mainQuestTitle,
              {
                color: '#FFFFFF',
                textShadowColor: themeColor,
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 4,
              },
            ]}
          >
            MAIN QUEST
          </Text>
          <View style={{
            height: 3,
            width: 20,
            backgroundColor: themeColor,
            marginLeft: 8,
            borderRadius: 2,
          }}/>
        </View>
      </View>
      <View style={{ padding: 15 }}>
        <Text
          style={[
            questStyles.questTitle,
            {
              color: brightAccent,
              marginBottom: 5,
              fontSize: 22,
              fontWeight: 'bold',
              textShadowColor: themeColor,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 4,
            },
          ]}
        >
          {mainQuest.title}
        </Text>
        {mainQuest.start_date && (
          <Text style={[questStyles.questDetails, { color: '#AAA', marginBottom: 3 }]}>
            Started: {formatDateTime(mainQuest.start_date)}
          </Text>
        )}

        {mainQuest.end_date && (
          <Text style={[questStyles.questDetails, { color: '#AAA', marginBottom: 10 }]}>
            Target completion: {formatDateTime(mainQuest.end_date)}
          </Text>
        )}

        <TouchableOpacity
          onPress={() => (onViewAllQuests ? onViewAllQuests() : router.push('/quests'))}
          style={[
            questStyles.viewAllQuests,
            {
              backgroundColor: 'rgba(30, 30, 30, 0.9)',
              borderWidth: 1,
              borderColor: themeColor,
              marginBottom: 15,
            },
          ]}
        >
          <MaterialIcons name="assignment" size={18} color={brightAccent} style={{ marginRight: 6 }} />
          <Text style={[questStyles.viewAllQuestsText, { color: brightAccent }]}>
            View All Quests
          </Text>
        </TouchableOpacity>

        <ScrollView style={{ maxHeight: 300 }}>
          {(['InProgress', 'ToDo', 'Done'] as TaskStatus[]).map(statusGroup => {
            const tasksInGroup = filteredTasks.filter(t => t.status === statusGroup);
            if (tasksInGroup.length === 0) return null;

            return (
              <View key={statusGroup}>
                {tasksInGroup.map((task) => (
                  <Card
                    key={task.id}
                    style={[
                      questStyles.taskItem,
                      task.status === 'Done'
                        ? {
                            backgroundColor: 'rgba(20, 20, 20, 0.7)',
                            borderLeftWidth: 2,
                            borderLeftColor: secondaryColor,
                          }
                        : task.status === 'InProgress'
                        ? {
                            backgroundColor: 'rgba(25, 25, 25, 0.8)',
                            borderLeftWidth: 2,
                            borderLeftColor: themeColor,
                          }
                        : {
                            backgroundColor: 'rgba(30, 30, 30, 0.9)',
                            borderLeftWidth: 2,
                            borderLeftColor: '#666',
                          },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            questStyles.taskTitle,
                            {
                              color: task.status === 'Done' ? '#AAA' : '#FFF',
                              textDecorationLine: task.status === 'Done' ? 'line-through' : 'none',
                              opacity: task.status === 'Done' ? 0.7 : 1,
                              fontFamily: 'Poppins_600SemiBold',
                            },
                          ]}
                        >
                          {task.title}
                        </Text>

                        {task.description && (
                          <Text
                            style={[
                              questStyles.taskDescription,
                              {
                                color: task.status === 'Done' ? '#888' : '#BBB',
                                opacity: task.status === 'Done' ? 0.6 : 0.9,
                                fontFamily: 'Inter_400Regular',
                              },
                            ]}
                          >
                            {task.description}
                          </Text>
                        )}

                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 8,
                            opacity: task.status === 'Done' ? 0.6 : 0.8,
                          }}
                        >
                          {task.scheduled_for && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <MaterialIcons
                                name="schedule"
                                size={12}
                                color="#888"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={{ fontSize: 12, color: '#888', fontFamily: 'Inter_400Regular' }}>
                                {formatDateTime(task.scheduled_for)}
                              </Text>
                            </View>
                          )}

                          {task.location && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                              <MaterialIcons
                                name="place"
                                size={12}
                                color="#888"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={{ fontSize: 12, color: '#888', fontFamily: 'Inter_400Regular' }}>
                                {task.location}
                              </Text>
                            </View>
                          )}

                          {task.deadline && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                              <MaterialIcons
                                name="warning"
                                size={12}
                                color="#FF4444"
                                style={{ marginRight: 4 }}
                              />
                              <Text style={{ fontSize: 12, color: '#FF4444', fontFamily: 'Inter_400Regular' }}>
                                {formatDateTime(task.deadline)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <TouchableOpacity 
                        style={questStyles.taskStatusIcon}
                        onPress={() => toggleTaskCompletion(task)}
                        disabled={updatingTaskId === task.id}
                      >
                        {updatingTaskId === task.id ? (
                          <ActivityIndicator size="small" color={task.status === 'Done' ? secondaryColor : themeColor} />
                        ) : task.status === 'Done' ? (
                          <MaterialIcons name="check-circle" size={20} color={secondaryColor} />
                        ) : task.status === 'InProgress' ? (
                          <MaterialIcons name="timelapse" size={20} color={themeColor} />
                        ) : (
                          <MaterialIcons name="radio-button-unchecked" size={20} color="#666" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Card>
  );
}