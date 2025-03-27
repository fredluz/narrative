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

  return (
    <View style={{ 
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      overflow: 'hidden'
    }}>
      {/* Sprint Header */}
      <View style={{ 
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ 
            fontSize: 20,
            color: '#FFF',
            fontWeight: 'bold',
          }}>
            Current Sprint
          </Text>
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
            <Text style={{ color: '#AAA', fontSize: 12 }}>{Math.round(progressPercentage)}%</Text>
          </View>
          <View style={{ 
            height: 4, 
            backgroundColor: 'rgba(255,255,255,0.1)', 
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <View style={{ 
              width: `${progressPercentage}%`,
              height: '100%',
              backgroundColor: themeColor,
              borderRadius: 2,
            }} />
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Sprint Stats */}
        <View style={{ 
          flexDirection: 'row', 
          padding: 15,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: themeColor, fontSize: 24, fontWeight: 'bold' }}>
              {activeQuests.length}
            </Text>
            <Text style={{ color: '#AAA', fontSize: 12 }}>Active Projects</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: secondaryColor, fontSize: 24, fontWeight: 'bold' }}>
              {activeQuests.reduce((sum, quest) => sum + (quest.tasks?.length || 0), 0)}
            </Text>
            <Text style={{ color: '#AAA', fontSize: 12 }}>Total Tasks</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: '#4CAF50', fontSize: 24, fontWeight: 'bold' }}>
              {activeQuests.reduce((sum, quest) => 
                sum + (quest.tasks?.filter(t => t.status === 'Done').length || 0), 0)}
            </Text>
            <Text style={{ color: '#AAA', fontSize: 12 }}>Completed</Text>
          </View>
        </View>

        {/* Sprint Projects */}
        <View style={{ padding: 15 }}>
          <Text style={{ 
            color: '#FFF',
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 10
          }}>
            Sprint Projects
          </Text>
          
          {activeQuests.map(quest => (
            <View 
              key={quest.id}
              style={{
                backgroundColor: 'rgba(30, 30, 30, 0.7)',
                borderRadius: 6,
                padding: 12,
                marginBottom: 10,
                borderLeftWidth: 2,
                borderLeftColor: quest.is_main ? secondaryColor : themeColor,
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
                    overflow: 'hidden'
                  }}>
                    <View style={{ 
                      width: `${(quest.tasks.filter(t => t.status === 'Done').length / quest.tasks.length) * 100}%`,
                      height: '100%',
                      backgroundColor: quest.is_main ? secondaryColor : '#FFFFFF',
                      borderRadius: 2,
                    }} />
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}