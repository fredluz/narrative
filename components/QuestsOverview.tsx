import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView, Dimensions } from 'react-native';
import { Card } from 'react-native-paper';
import { useTheme } from '@/contexts/ThemeContext';
import styles from '@/app/styles/global';
import { useQuestData } from '@/hooks/useQuestData';
import { Quest } from '@/app/types';

type QuestStatus = 'Active' | 'On-Hold' | 'Completed';

export function QuestsOverview() {
  const { quests, setQuestAsMain } = useQuestData();
  const { themeColor } = useTheme();
  const [activeTab, setActiveTab] = useState<QuestStatus>('Active');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const windowHeight = Dimensions.get('window').height;

  const filteredQuests = quests.filter(q => q.status === activeTab);

  const tabs: QuestStatus[] = ['Active', 'On-Hold', 'Completed'];

  const getQuestCardColor = (quest: Quest) => {
    if (quest.isMain) {
      // Create a less saturated version of themeColor
      const hex = themeColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const desaturate = 0.5; // 50% desaturation
      const gray = (r + g + b) / 3;
      const newR = Math.round(r * (1 - desaturate) + gray * desaturate);
      const newG = Math.round(g * (1 - desaturate) + gray * desaturate);
      const newB = Math.round(b * (1 - desaturate) + gray * desaturate);
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
    return themeColor;
  };

  return (
    <View style={[styles.container, { backgroundColor: '#181818', height: windowHeight }]}>
      <View style={styles.column}>
        <Card style={[styles.mainQuestCard, { borderColor: themeColor, borderWidth: 2, height: windowHeight * 0.95 }]}>
          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            {tabs.map(tab => (
              <TouchableOpacity 
                key={tab} 
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.toggleButton,
                  { 
                    backgroundColor: activeTab === tab ? themeColor : '#333',
                    marginRight: 10,
                    flex: 1
                  }
                ]}
              >
                <Text style={[
                  styles.toggleButtonText,
                  { color: activeTab === tab ? '#fff' : '#aaa' }
                ]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flex: 1 }}>
            <View style={{ flex: 1, marginRight: 20, maxHeight: windowHeight * 0.8 }}>
              <FlatList
                style={{ flex: 1 }}
                data={filteredQuests}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => setSelectedQuest(item)}>
                    <Card style={[
                      styles.taskCard,
                      { 
                        borderColor: item.isMain ? getQuestCardColor(item) : themeColor,
                        borderWidth: item.isMain ? 3 : selectedQuest?.id === item.id ? 2 : 0,
                        backgroundColor: item.isMain ? `${getQuestCardColor(item)}22` : '#444',
                        // Add shadow for main quest
                        ...(item.isMain && {
                          shadowColor: getQuestCardColor(item),
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.5,
                          shadowRadius: 8,
                          elevation: 6,
                        })
                      }
                    ]}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardDetails}>Tasks: {item.tasks.length}</Text>
                      <Text style={styles.cardDetails}>Progress: {item.progress}</Text>
                    </Card>
                  </TouchableOpacity>
                )}
              />
            </View>

            <View style={{ flex: 1, maxHeight: windowHeight * 0.8 }}>
              {selectedQuest ? (
                <ScrollView style={{ flex: 1 }} bounces={false}>
                  <Card style={[styles.mainQuestCard, { 
                    borderColor: themeColor, 
                    borderWidth: 2 
                  }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.mainQuestTitle}>{selectedQuest.title}</Text>
                      <TouchableOpacity 
                        onPress={() => setQuestAsMain(selectedQuest.id)}
                        style={[
                          styles.setMainQuestButton,
                          { 
                            backgroundColor: selectedQuest.isMain ? '#666' : themeColor,
                            opacity: selectedQuest.isMain ? 0.7 : 1
                          }
                        ]}
                      >
                        <Text style={styles.setMainQuestButtonText}>
                          {selectedQuest.isMain ? 'Main Quest' : 'Set as Main Quest'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cardDetails}>{selectedQuest.shortDescription}</Text>
                    
                    <Card style={[styles.taskCard, { borderColor: themeColor, borderWidth: 1 }]}>
                      <Text style={styles.statusTimestamp}>[{selectedQuest.currentStatus.timestamp}]</Text>
                      <Text style={styles.cardDetails}>{selectedQuest.currentStatus.message}</Text>
                    </Card>

                    <Card style={[styles.taskCard, { borderColor: themeColor, borderWidth: 1 }]}>
                      <Text style={styles.cardDetails}>{selectedQuest.questStatus}</Text>
                    </Card>
                    
                    <View style={styles.questTasksContainer}>
                      <Text style={[styles.cardTitle, { marginTop: 10 }]}>
                        Current Tasks ({selectedQuest.tasks.length})
                      </Text>
                      {selectedQuest.tasks.map((task) => (
                        <Card 
                          key={task.id} 
                          style={[styles.taskCard, { borderColor: themeColor, borderWidth: 1 }]}
                        >
                          <Text style={styles.cardTitle}>{task.title}</Text>
                          <Text style={styles.cardDetails}>
                            Start: {task.scheduledFor} ({task.location})
                          </Text>
                          {task.deadline && (
                            <Text style={[styles.cardDetails, { color: '#FF4444' }]}>
                              Deadline: {task.deadline}
                            </Text>
                          )}
                        </Card>
                      ))}
                    </View>
                  </Card>
                </ScrollView>
              ) : (
                <Card style={[styles.mainQuestCard, { borderColor: themeColor, borderWidth: 2 }]}>
                  <Text style={styles.cardDetails}>Select a quest to view details</Text>
                </Card>
              )}
            </View>
          </View>
        </Card>
      </View>
    </View>
  );
}