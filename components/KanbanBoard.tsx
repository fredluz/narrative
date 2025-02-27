import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { questStyles } from '@/app/styles/questStyles';
import { Task } from '@/app/types';  // Updated import

interface KanbanProps {
  tasks: Task[];
}

type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

export function KanbanBoard({ tasks }: KanbanProps) {
  const { themeColor } = useTheme();
  const [activeColumn, setActiveColumn] = useState<TaskStatus | 'all'>('all');
  
  // Generate a secondary color for our cyberpunk UI
  const getSecondaryColor = (baseColor: string) => {
    if (baseColor.includes('f') || baseColor.includes('e') || baseColor.includes('d')) {
      return '#1D64AB';
    }
    return '#D81159';
  };
  
  const secondaryColor = getSecondaryColor(themeColor);
  
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
    
    return `#${brightR.toString(16).padStart(2, '0')}${
      brightG.toString(16).padStart(2, '0')}${
      brightB.toString(16).padStart(2, '0')}`;
  };
  
  const brightAccent = getBrightAccent(themeColor);

  if (!tasks || tasks.length === 0) {
    return (
      <View style={questStyles.emptyBoard}>
        <MaterialIcons name="dashboard" size={30} color="rgba(255,255,255,0.1)" />
        <Text style={questStyles.emptyBoardText}>No tasks assigned</Text>
      </View>
    );
  }
  
  // Filter tasks based on activeColumn
  const filteredTasks = activeColumn === 'all' 
    ? tasks 
    : tasks.filter(task => task.status === activeColumn);

  return (
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
            activeColumn === 'all' 
              ? { 
                  backgroundColor: 'rgba(30, 30, 30, 0.9)', 
                  borderBottomWidth: 2,
                  borderBottomColor: brightAccent, 
                } 
              : { backgroundColor: 'rgba(20, 20, 20, 0.7)' }
          ]}
          onPress={() => setActiveColumn('all')}
        >
          <MaterialIcons name="format-list-bulleted" 
            size={16} 
            color={activeColumn === 'all' ? brightAccent : '#AAA'} 
            style={{ marginRight: 5 }}
          />
          <Text style={[
            questStyles.columnFilterText,
            { color: activeColumn === 'all' ? brightAccent : '#AAA' }
          ]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            questStyles.columnFilter,
            activeColumn === 'ToDo' 
              ? { 
                  backgroundColor: 'rgba(30, 30, 30, 0.9)', 
                  borderBottomWidth: 2,
                  borderBottomColor: brightAccent, 
                } 
              : { backgroundColor: 'rgba(20, 20, 20, 0.7)' }
          ]}
          onPress={() => setActiveColumn('ToDo')}
        >
          <MaterialIcons name="hourglass-empty" 
            size={16} 
            color={activeColumn === 'ToDo' ? brightAccent : '#AAA'} 
            style={{ marginRight: 5 }}
          />
          <Text style={[
            questStyles.columnFilterText,
            { color: activeColumn === 'ToDo' ? brightAccent : '#AAA' }
          ]}>
            To Do
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            questStyles.columnFilter,
            activeColumn === 'InProgress' 
              ? { 
                  backgroundColor: 'rgba(30, 30, 30, 0.9)', 
                  borderBottomWidth: 2,
                  borderBottomColor: brightAccent, 
                } 
              : { backgroundColor: 'rgba(20, 20, 20, 0.7)' }
          ]}
          onPress={() => setActiveColumn('InProgress')}
        >
          <MaterialIcons name="timelapse" 
            size={16} 
            color={activeColumn === 'InProgress' ? brightAccent : '#AAA'} 
            style={{ marginRight: 5 }}
          />
          <Text style={[
            questStyles.columnFilterText,
            { color: activeColumn === 'InProgress' ? brightAccent : '#AAA' }
          ]}>
            In Progress
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
              : { backgroundColor: 'rgba(20, 20, 20, 0.7)' }
          ]}
          onPress={() => setActiveColumn('Done')}
        >
          <MaterialIcons name="check-circle-outline" 
            size={16} 
            color={activeColumn === 'Done' ? brightAccent : '#AAA'} 
            style={{ marginRight: 5 }}
          />
          <Text style={[
            questStyles.columnFilterText,
            { color: activeColumn === 'Done' ? brightAccent : '#AAA' }
          ]}>
            Completed
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView style={{ maxHeight: 300 }}>
        {filteredTasks.length === 0 ? (
          <View style={questStyles.emptyColumn}>
            <Text style={questStyles.emptyColumnText}>No tasks in this category</Text>
          </View>
        ) : (
          filteredTasks.map(task => (
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
                      }
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    questStyles.taskTitle,
                    { 
                      color: task.status === 'Done' ? '#AAA' : '#FFF',
                      textDecorationLine: task.status === 'Done' ? 'line-through' : 'none',
                      opacity: task.status === 'Done' ? 0.7 : 1,
                    }
                  ]}>
                    {task.title}
                  </Text>
                  
                  {task.description ? (
                    <Text style={[
                      questStyles.taskDescription,
                      { 
                        color: task.status === 'Done' ? '#888' : '#BBB',
                        opacity: task.status === 'Done' ? 0.6 : 0.9,
                      }
                    ]}>
                      {task.description}
                    </Text>
                  ) : null}

                  {/* Task metadata row */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    marginTop: 8,
                    opacity: task.status === 'Done' ? 0.6 : 0.8
                  }}>
                    <MaterialIcons 
                      name="schedule" 
                      size={12} 
                      color="#888"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={{ fontSize: 12, color: '#888' }}>
                      {task.scheduled_for}
                    </Text>

                    {task.location && (
                      <>
                        <MaterialIcons 
                          name="place" 
                          size={12} 
                          color="#888"
                          style={{ marginLeft: 8, marginRight: 4 }}
                        />
                        <Text style={{ fontSize: 12, color: '#888' }}>
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
                        <Text style={{ fontSize: 12, color: '#FF4444' }}>
                          {task.deadline}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                
                <View style={questStyles.taskStatusIcon}>
                  {task.status === 'Done' ? (
                    <MaterialIcons name="check-circle" size={20} color={secondaryColor} />
                  ) : task.status === 'InProgress' ? (
                    <MaterialIcons name="timelapse" size={20} color={themeColor} />
                  ) : (
                    <MaterialIcons name="radio-button-unchecked" size={20} color="#666" />
                  )}
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}
