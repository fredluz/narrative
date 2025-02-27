import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView, Dimensions } from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import styles, { colors } from '@/app/styles/global';
import { useQuests } from '@/services/questsService';
import { Quest } from '@/app/types';

type QuestStatus = 'Active' | 'On-Hold' | 'Completed';

interface QuestsOverviewProps {
  quests: Quest[];
  onSelectQuest: (questId: number) => void;
  currentMainQuest: Quest | null;
}

export function QuestsOverview({ quests, onSelectQuest, currentMainQuest }: QuestsOverviewProps) {
  const { themeColor } = useTheme();
  const [activeTab, setActiveTab] = useState<QuestStatus>('Active');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const windowHeight = Dimensions.get('window').height;

  const filteredQuests = quests.filter(q => q.status === activeTab);
  const tabs: QuestStatus[] = ['Active', 'On-Hold', 'Completed'];

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background, height: windowHeight }]}>
      <View style={styles.column}>
        <Card style={[{ 
          borderColor: themeColor, 
          borderWidth: 1,
          borderLeftWidth: 3,
          height: windowHeight * 0.95,
          backgroundColor: colors.backgroundSecondary,
          overflow: 'hidden'
        }]}>
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

          {/* Glitch lines */}
          <View style={{
            position: 'absolute',
            top: '30%',
            left: -10,
            width: '120%',
            height: 1,
            backgroundColor: secondaryColor,
            opacity: 0.15,
            transform: [{ rotate: '0.3deg' }],
          }} />
          
          <View style={{
            position: 'absolute',
            top: '70%',
            left: -10,
            width: '120%',
            height: 1,
            backgroundColor: themeColor,
            opacity: 0.1,
            transform: [{ rotate: '-0.2deg' }],
          }} />

          <View style={{ padding: 20, zIndex: 1 }}>
            {/* Header */}
            <View style={{ 
              flexDirection: 'row', 
              alignItems: 'center',
              marginBottom: 20,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
              paddingBottom: 15
            }}>
              <Text style={{ 
                fontSize: 28,
                fontWeight: 'bold',
                color: '#FFFFFF',
                textTransform: 'uppercase',
                textShadowColor: themeColor,
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 4
              }}>
                QUESTS
              </Text>
              <View style={{
                height: 4,
                width: 40,
                backgroundColor: themeColor,
                marginLeft: 10,
                borderRadius: 2,
              }} />
            </View>

            {/* Status Tabs */}
            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
              {tabs.map(tab => (
                <TouchableOpacity 
                  key={tab} 
                  onPress={() => setActiveTab(tab)}
                  style={[
                    {
                      flex: 1,
                      marginRight: 10,
                      paddingVertical: 10,
                      paddingHorizontal: 15,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: activeTab === tab ? 'rgba(30, 30, 30, 0.9)' : 'rgba(20, 20, 20, 0.7)',
                      borderWidth: 1,
                      borderColor: activeTab === tab ? themeColor : 'rgba(255, 255, 255, 0.1)',
                    }
                  ]}
                >
                  <MaterialIcons 
                    name={
                      tab === 'Active' ? 'play-arrow' :
                      tab === 'On-Hold' ? 'pause' : 'check-circle'
                    }
                    size={18}
                    color={activeTab === tab ? brightAccent : '#777'}
                    style={{ marginRight: 5 }}
                  />
                  <Text style={[
                    { 
                      color: activeTab === tab ? brightAccent : '#777',
                      fontWeight: '600',
                      fontSize: 14,
                    }
                  ]}>
                    {tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flex: 1 }}>
              {/* Quest List */}
              <View style={{ flex: 1, marginRight: 20, maxHeight: windowHeight * 0.8 }}>
                <FlatList
                  style={{ flex: 1 }}
                  data={filteredQuests}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      onPress={() => setSelectedQuest(item)}
                      style={{ marginBottom: 10 }}
                    >
                      <Card style={[
                        {
                          backgroundColor: 'rgba(25, 25, 25, 0.7)',
                          padding: 15,
                          borderRadius: 6,
                          borderLeftWidth: 2,
                          borderLeftColor: item.is_main ? secondaryColor : themeColor,
                          ...(item.is_main && {
                            shadowColor: secondaryColor,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.5,
                            shadowRadius: 8,
                            elevation: 6,
                          })
                        },
                        selectedQuest?.id === item.id && {
                          backgroundColor: 'rgba(35, 35, 35, 0.9)',
                          borderLeftWidth: 3,
                        }
                      ]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {item.is_main && (
                            <MaterialIcons 
                              name="star" 
                              size={16} 
                              color={secondaryColor}
                              style={{ marginRight: 8 }}
                            />
                          )}
                          <Text style={{ 
                            fontSize: 16, 
                            color: item.is_main ? '#FFF' : '#DDD',
                            fontWeight: item.is_main ? 'bold' : 'normal',
                            textShadowColor: item.is_main ? secondaryColor : 'transparent',
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: item.is_main ? 4 : 0,
                          }}>
                            {item.title}
                          </Text>
                        </View>
                        {item.tagline && (
                          <Text style={{
                            fontSize: 13,
                            color: '#999',
                            marginTop: 4,
                            marginLeft: item.is_main ? 24 : 0
                          }}>
                            {item.tagline}
                          </Text>
                        )}
                      </Card>
                    </TouchableOpacity>
                  )}
                />
              </View>

              {/* Quest Details */}
              <View style={{ flex: 1, maxHeight: windowHeight * 0.8 }}>
                {selectedQuest ? (
                  <ScrollView style={{ flex: 1 }} bounces={false}>
                    <Card style={[{ 
                      backgroundColor: 'rgba(25, 25, 25, 0.8)',
                      borderRadius: 8,
                      borderLeftWidth: 3,
                      borderLeftColor: selectedQuest.is_main ? secondaryColor : themeColor,
                      overflow: 'hidden'
                    }]}>
                      {/* Quest Details Header */}
                      <View style={{ 
                        padding: 20,
                        borderBottomWidth: 1,
                        borderBottomColor: 'rgba(255, 255, 255, 0.1)'
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <Text style={{ 
                            fontSize: 22,
                            color: '#FFF',
                            fontWeight: 'bold',
                            textShadowColor: themeColor,
                            textShadowOffset: { width: 1, height: 1 },
                            textShadowRadius: 3
                          }}>
                            {selectedQuest.title}
                          </Text>
                          <TouchableOpacity 
                            onPress={() => onSelectQuest(selectedQuest.id)}
                            style={{
                              backgroundColor: selectedQuest.id === currentMainQuest?.id ? 
                                'rgba(30, 30, 30, 0.9)' : 'rgba(25, 25, 25, 0.9)',
                              paddingHorizontal: 15,
                              paddingVertical: 8,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: selectedQuest.id === currentMainQuest?.id ? 
                                secondaryColor : themeColor,
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}
                          >
                            <MaterialIcons 
                              name={selectedQuest.id === currentMainQuest?.id ? "star" : "star-outline"} 
                              size={18} 
                              color={selectedQuest.id === currentMainQuest?.id ? secondaryColor : brightAccent}
                              style={{ marginRight: 6 }}
                            />
                            <Text style={{ 
                              color: selectedQuest.id === currentMainQuest?.id ? secondaryColor : brightAccent,
                              fontWeight: '600',
                            }}>
                              {selectedQuest.id === currentMainQuest?.id ? 'MAIN QUEST' : 'SET AS MAIN'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        
                        {selectedQuest.tagline && (
                          <Text style={{ 
                            color: '#BBB',
                            fontSize: 15,
                            marginBottom: 15,
                            fontStyle: 'italic'
                          }}>
                            {selectedQuest.tagline}
                          </Text>
                        )}
                      </View>

                      <View style={{ padding: 20 }}>
                        {/* Status Section */}
                        {selectedQuest?.currentStatus && (
                          <View style={{
                            backgroundColor: 'rgba(20, 20, 20, 0.7)',
                            borderRadius: 6,
                            padding: 15,
                            marginBottom: 15,
                            borderLeftWidth: 2,
                            borderLeftColor: secondaryColor,
                          }}>
                            <Text style={{ 
                              color: '#999',
                              fontSize: 12,
                              marginBottom: 4
                            }}>
                              [{selectedQuest.currentStatus.timestamp}]
                            </Text>
                            <Text style={{ color: '#DDD', fontSize: 14 }}>
                              {selectedQuest.currentStatus.message}
                            </Text>
                          </View>
                        )}

                        {/* Tasks Section */}
                        <View style={{ marginTop: 15 }}>
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center',
                            marginBottom: 10
                          }}>
                            <MaterialIcons name="assignment" size={20} color={brightAccent} style={{ marginRight: 8 }} />
                            <Text style={{ 
                              fontSize: 18,
                              color: '#FFF',
                              fontWeight: '600'
                            }}>
                              Tasks ({selectedQuest.tasks?.length || 0})
                            </Text>
                          </View>

                          {selectedQuest.tasks?.map((task) => (
                            <View 
                              key={task.id}
                              style={{
                                backgroundColor: 'rgba(30, 30, 30, 0.7)',
                                borderRadius: 6,
                                padding: 15,
                                marginBottom: 10,
                                borderLeftWidth: 2,
                                borderLeftColor: task.status === 'Done' ? secondaryColor : themeColor,
                              }}
                            >
                              <Text style={{ 
                                fontSize: 16,
                                color: task.status === 'Done' ? '#AAA' : '#FFF',
                                textDecorationLine: task.status === 'Done' ? 'line-through' : 'none',
                                marginBottom: 5,
                              }}>
                                {task.title}
                              </Text>
                              
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                                <MaterialIcons 
                                  name="schedule" 
                                  size={14} 
                                  color="#888"
                                  style={{ marginRight: 4 }}
                                />
                                <Text style={{ fontSize: 13, color: '#888' }}>
                                  Start: {task.scheduled_for}
                                </Text>
                                
                                {task.location && (
                                  <>
                                    <MaterialIcons 
                                      name="place" 
                                      size={14} 
                                      color="#888"
                                      style={{ marginLeft: 12, marginRight: 4 }}
                                    />
                                    <Text style={{ fontSize: 13, color: '#888' }}>
                                      {task.location}
                                    </Text>
                                  </>
                                )}
                              </View>

                              {task.deadline && (
                                <View style={{ 
                                  flexDirection: 'row', 
                                  alignItems: 'center',
                                  marginTop: 4
                                }}>
                                  <MaterialIcons 
                                    name="warning" 
                                    size={14} 
                                    color={colors.error}
                                    style={{ marginRight: 4 }}
                                  />
                                  <Text style={{ fontSize: 13, color: colors.error }}>
                                    Deadline: {task.deadline}
                                  </Text>
                                </View>
                              )}
                            </View>
                          ))}
                        </View>
                      </View>
                    </Card>
                  </ScrollView>
                ) : (
                  <View style={{ 
                    flex: 1,
                    backgroundColor: 'rgba(25, 25, 25, 0.8)',
                    borderRadius: 8,
                    padding: 20,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <MaterialIcons name="assignment" size={40} color="rgba(255,255,255,0.1)" />
                    <Text style={{ 
                      color: '#777',
                      marginTop: 10,
                      fontSize: 16,
                      textAlign: 'center'
                    }}>
                      Select a quest to view details
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Card>
      </View>
    </View>
  );
}