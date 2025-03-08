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

interface KanbanProps {
  mainQuest: Quest | null;
  onViewAllQuests?: () => void;
}

type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

export function KanbanBoard({ mainQuest, onViewAllQuests }: KanbanProps) {
  const router = useRouter();
  const { themeColor, secondaryColor } = useTheme();
  const { session } = useSupabase();
  const [activeColumn, setActiveColumn] = useState<TaskStatus | 'all' | 'active'>('active');
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);

  // Make text more visible against dark backgrounds
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

  // Add function to handle task status toggle
  const toggleTaskCompletion = async (task: Task) => {
    if (!session?.user?.id) return;

    try {
      setUpdatingTaskId(task.id);
      const userId = validateUserId(session.user.id);
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

  // Extract tasks from mainQuest
  const tasks = mainQuest?.tasks || [];

  // Filter tasks based on activeColumn
  const filteredTasks = 
    activeColumn === 'all' ? tasks :
    activeColumn === 'active' ? tasks.filter((task) => task.status === 'ToDo' || task.status === 'InProgress') :
    tasks.filter((task) => task.status === activeColumn);

  // No tasks UI
  if (tasks.length === 0) {
    return (
      <Card
        style={[
          questStyles.mainQuestCard,
          {
            borderColor: themeColor,
            borderWidth: 1,
            borderLeftWidth: 3,
            overflow: 'hidden',
          },
        ]}
      >
        {/* Background with cyberpunk elements */}
        <View
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backgroundColor: '#151515',
          }}
        />

        {/* Digital noise effect */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            height: '100%',
            width: 40,
            right: 20,
            opacity: 0.05,
            backgroundColor: themeColor,
          }}
        />


        {/* Main quest header section */}
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
            <View
              style={{
                height: 3,
                width: 20,
                backgroundColor: themeColor,
                marginLeft: 8,
                borderRadius: 2,
              }}
            />
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
    >
      {/* Background with cyberpunk elements */}
      <View
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundColor: '#151515',
        }}
      />

      {/* Digital noise effect */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          height: '100%',
          width: 40,
          right: 20,
          opacity: 0.05,
          backgroundColor: themeColor,
        }}
      />


      {/* Main quest header section */}
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
          <View
            style={{
              height: 3,
              width: 20,
              backgroundColor: themeColor,
              marginLeft: 8,
              borderRadius: 2,
            }}
          />
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

        <View style={{ marginTop: 15 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 10 }}
            contentContainerStyle={{ paddingHorizontal: 5 }}
          >
            <TouchableOpacity
              style={[
                questStyles.columnFilter,
                activeColumn === 'active'
                  ? {
                      backgroundColor: 'rgba(30, 30, 30, 0.9)',
                      borderBottomWidth: 2,
                      borderBottomColor: brightAccent,
                    }
                  : { backgroundColor: 'rgba(20, 20, 20, 0.7)' },
              ]}
              onPress={() => setActiveColumn('active')}
            >
              <MaterialIcons
                name="pending-actions"
                size={16}
                color={activeColumn === 'active' ? brightAccent : '#AAA'}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  questStyles.columnFilterText,
                  { color: activeColumn === 'active' ? brightAccent : '#AAA', fontFamily: 'Inter_500Medium' },
                ]}
              >
                To Do & In Progress
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                questStyles.columnFilter,
                activeColumn === 'Done'
                  ? {
                      backgroundColor: 'rgba(30, 30, 30, 0.9)',
                      borderBottomWidth: 2,
                      borderBottomColor: brightAccent,
                    }
                  : { backgroundColor: 'rgba(20, 20, 20, 0.7)' },
              ]}
              onPress={() => setActiveColumn('Done')}
            >
              <MaterialIcons
                name="check-circle-outline"
                size={16}
                color={activeColumn === 'Done' ? brightAccent : '#AAA'}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  questStyles.columnFilterText,
                  { color: activeColumn === 'Done' ? brightAccent : '#AAA', fontFamily: 'Inter_500Medium' },
                ]}
              >
                Completed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                questStyles.columnFilter,
                activeColumn === 'all'
                  ? {
                      backgroundColor: 'rgba(30, 30, 30, 0.9)',
                      borderBottomWidth: 2,
                      borderBottomColor: brightAccent,
                    }
                  : { backgroundColor: 'rgba(20, 20, 20, 0.7)' },
              ]}
              onPress={() => setActiveColumn('all')}
            >
              <MaterialIcons
                name="format-list-bulleted"
                size={16}
                color={activeColumn === 'all' ? brightAccent : '#AAA'}
                style={{ marginRight: 5 }}
              />
              <Text
                style={[
                  questStyles.columnFilterText,
                  { color: activeColumn === 'all' ? brightAccent : '#AAA', fontFamily: 'Inter_500Medium' },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <ScrollView style={{ maxHeight: 300 }}>
            {filteredTasks.length === 0 ? (
              <View style={questStyles.emptyColumn}>
                <Text style={[questStyles.emptyColumnText, { fontFamily: 'Inter_400Regular' }]}>
                  No tasks in this category
                </Text>
              </View>
            ) : (
              filteredTasks.map((task) => (
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

                      {task.description ? (
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
                      ) : null}

                      {/* Task metadata row */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: 8,
                          opacity: task.status === 'Done' ? 0.6 : 0.8,
                        }}
                      >
                        <MaterialIcons
                          name="schedule"
                          size={12}
                          color="#888"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={{ fontSize: 12, color: '#888', fontFamily: 'Inter_400Regular' }}>
                          {formatDateTime(task.scheduled_for)}
                        </Text>

                        {task.location && (
                          <>
                            <MaterialIcons
                              name="place"
                              size={12}
                              color="#888"
                              style={{ marginLeft: 8, marginRight: 4 }}
                            />
                            <Text style={{ fontSize: 12, color: '#888', fontFamily: 'Inter_400Regular' }}>
                              {task.location}
                            </Text>
                          </>
                        )}

                        {task.deadline && (
                          <>
                            <MaterialIcons
                              name="warning"
                              size={12}
                              color="#FF4444"
                              style={{ marginLeft: 8, marginRight: 4 }}
                            />
                            <Text style={{ fontSize: 12, color: '#FF4444', fontFamily: 'Inter_400Regular' }}>
                              {formatDateTime(task.deadline)}
                            </Text>
                          </>
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
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Card>
  );
}