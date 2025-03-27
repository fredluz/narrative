import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuests } from '@/services/questsService';
import { colors } from '@/app/styles/global';
import { format, startOfWeek, addDays } from 'date-fns';
interface SprintBoardProps {
  themeColor: string;
  textColor: string;
  fullColumnMode?: boolean;
  userId: string;
}

export function SprintBoard({ themeColor, textColor, fullColumnMode, userId }: SprintBoardProps) {
  const { secondaryColor } = useTheme();
  const { quests } = useQuests();
  const activeQuests = quests.filter(q => q.status === 'Active');
  
  // Calculate sprint dates (assuming 2-week sprints)
  const today = new Date();
  const sprintStart = startOfWeek(today);
  const sprintEnd = addDays(sprintStart, 13);
  
  // Calculate sprint progress
  const totalDays = 14;
  const daysPassed = Math.min(Math.floor((today.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24)), 14);
  const progressPercentage = (daysPassed / totalDays) * 100;

  // Define accent colors for various elements
  const accentColors = {
    progress: '#4CAF50',
    projects: '#FF9800',
    tasks: '#2196F3',
    completed: '#4CAF50'
  };

  return (
    <View style={{ 
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 2,
      borderWidth: 1,
      borderColor: '#333333'
    }}>
      {/* Sprint Header */}
      <View style={{ 
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: '#252525',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ 
              fontSize: 20,
              color: '#FFF',
              fontWeight: 'bold',
            }}>
              Current Sprint
            </Text>
            <View style={{
              height: 3,
              width: 24,
              backgroundColor: themeColor,
              marginLeft: 8,
              borderRadius: 2,
            }} />
          </View>
          <TouchableOpacity 
            style={{
              backgroundColor: 'rgba(30, 30, 30, 0.9)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: themeColor,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <MaterialIcons name="settings" size={16} color={themeColor} style={{ marginRight: 4 }} />
            <Text style={{ color: themeColor, fontSize: 13, fontWeight: '600' }}>
              Sprint Settings
            </Text>
          </TouchableOpacity>
        </View>
        
        <Text style={{ color: '#AAA', marginTop: 5, fontSize: 14 }}>
          {format(sprintStart, 'MMM d')} - {format(sprintEnd, 'MMM d, yyyy')}
        </Text>
        
        {/* Sprint Progress */}
        <View style={{ marginTop: 15 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ color: '#AAA', fontSize: 12 }}>Sprint Progress</Text>
            <Text style={{ color: progressPercentage > 75 ? accentColors.completed : accentColors.progress, fontSize: 12, fontWeight: '600' }}>{Math.round(progressPercentage)}%</Text>
          </View>
          <View style={{ 
            height: 6, 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            borderRadius: 3,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#333333'
          }}>
            <View style={{ 
              width: `${progressPercentage}%`,
              height: '100%',
              backgroundColor: progressPercentage > 75 ? accentColors.completed : accentColors.progress,
              borderRadius: 3,
            }} />
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        {/* Sprint Stats */}
        <View style={{ 
          flexDirection: 'row', 
          padding: 15,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          backgroundColor: '#1E1E1E'
        }}>
          <View style={{ 
            flex: 1, 
            alignItems: 'center',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            padding: 10,
            borderRadius: 8,
            marginRight: 5,
            borderLeftWidth: 2,
            borderLeftColor: accentColors.projects
          }}>
            <Text style={{ color: accentColors.projects, fontSize: 24, fontWeight: 'bold' }}>
              {activeQuests.length}
            </Text>
            <Text style={{ color: '#AAA', fontSize: 12 }}>Active Projects</Text>
          </View>
          <View style={{
            flex: 1, 
            alignItems: 'center',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            padding: 10,
            borderRadius: 8,
            marginHorizontal: 5,
            borderLeftWidth: 2,
            borderLeftColor: accentColors.tasks
          }}>
            <Text style={{ color: accentColors.tasks, fontSize: 24, fontWeight: 'bold' }}>
              {activeQuests.reduce((sum, quest) => sum + (quest.tasks?.length || 0), 0)}
            </Text>
            <Text style={{ color: '#AAA', fontSize: 12 }}>Total Tasks</Text>
          </View>
          <View style={{
            flex: 1, 
            alignItems: 'center',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            padding: 10,
            borderRadius: 8,
            marginLeft: 5,
            borderLeftWidth: 2,
            borderLeftColor: accentColors.completed
          }}>
            <Text style={{ color: accentColors.completed, fontSize: 24, fontWeight: 'bold' }}>
              {activeQuests.reduce((sum, quest) => 
                sum + (quest.tasks?.filter(t => t.status === 'Done').length || 0), 0)}
            </Text>
            <Text style={{ color: '#AAA', fontSize: 12 }}>Completed</Text>
          </View>
        </View>

        {/* Sprint Projects */}
        <View style={{ padding: 15 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ 
              color: '#FFF',
              fontSize: 16,
              fontWeight: '600',
            }}>
              Sprint Projects
            </Text>
            <View style={{
              height: 3,
              width: 24,
              backgroundColor: secondaryColor,
              marginLeft: 8,
              borderRadius: 2,
            }} />
          </View>
          
          {activeQuests.length === 0 ? (
            <View style={{ 
              alignItems: 'center', 
              padding: 20, 
              backgroundColor: '#252525', 
              borderRadius: 8, 
              borderLeftWidth: 3,
              borderLeftColor: '#555555'
            }}>
              <MaterialIcons name="info-outline" size={30} color="#555555" />
              <Text style={{ color: '#AAAAAA', marginTop: 10 }}>No active projects in this sprint</Text>
            </View>
          ) : (
            activeQuests.map(quest => (
              <View 
                key={quest.id}
                style={{
                  backgroundColor: 'rgba(30, 30, 30, 0.7)',
                  borderRadius: 6,
                  padding: 12,
                  marginBottom: 10,
                  borderLeftWidth: 2,
                  borderLeftColor: quest.is_main ? secondaryColor : themeColor,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '500' }}>
                    {quest.title}
                  </Text>
                  <View style={{ 
                    backgroundColor: 'rgba(40, 40, 40, 0.7)',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: '#333333',
                  }}>
                    <Text style={{ color: '#AAA', fontSize: 12 }}>
                      {quest.tasks?.filter(t => t.status === 'Done').length || 0}/{quest.tasks?.length || 0} Tasks
                    </Text>
                  </View>
                </View>
                
                {quest.tasks && quest.tasks.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <View style={{ 
                      height: 4, 
                      backgroundColor: 'rgba(255,255,255,0.1)', 
                      borderRadius: 2,
                      overflow: 'hidden',
                      borderWidth: 0.5,
                      borderColor: '#333333'
                    }}>
                      <View style={{ 
                        width: `${(quest.tasks.filter(t => t.status === 'Done').length / quest.tasks.length) * 100}%`,
                        height: '100%',
                        backgroundColor: (quest.tasks.filter(t => t.status === 'Done').length / quest.tasks.length) >= 1 
                          ? accentColors.completed 
                          : quest.is_main ? secondaryColor : '#64B5F6',
                        borderRadius: 2,
                      }} />
                    </View>
                  </View>
                )}
                
                {/* Task status indicators */}
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                  {quest.tasks && (
                    <>
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center',
                        backgroundColor: 'rgba(233, 30, 99, 0.1)',
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        borderRadius: 4,
                        marginRight: 8,
                        borderLeftWidth: 2,
                        borderLeftColor: '#E91E63'
                      }}>
                        <MaterialIcons name="radio-button-unchecked" size={12} color="#E91E63" style={{ marginRight: 3 }} />
                        <Text style={{ color: '#AAAAAA', fontSize: 11 }}>
                          {quest.tasks.filter(t => t.status === 'ToDo').length || 0}
                        </Text>
                      </View>
                      
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        borderRadius: 4,
                        marginRight: 8,
                        borderLeftWidth: 2,
                        borderLeftColor: '#2196F3'
                      }}>
                        <MaterialIcons name="timelapse" size={12} color="#2196F3" style={{ marginRight: 3 }} />
                        <Text style={{ color: '#AAAAAA', fontSize: 11 }}>
                          {quest.tasks.filter(t => t.status === 'InProgress').length || 0}
                        </Text>
                      </View>
                      
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        paddingHorizontal: 6,
                        paddingVertical: 3,
                        borderRadius: 4,
                        borderLeftWidth: 2,
                        borderLeftColor: '#4CAF50'
                      }}>
                        <MaterialIcons name="check-circle" size={12} color="#4CAF50" style={{ marginRight: 3 }} />
                        <Text style={{ color: '#AAAAAA', fontSize: 11 }}>
                          {quest.tasks.filter(t => t.status === 'Done').length || 0}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}