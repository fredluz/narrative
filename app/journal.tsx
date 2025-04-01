import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card } from 'react-native-paper';
import { JournalPanel } from '@/components/journal/JournalPanel';
import { ThemedText } from '@/components/ui/ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { journalStyles } from '@/app/styles/journalStyles';
import { useJournal } from '@/hooks/useJournal';
import { createTask } from '@/services/tasksService';
import { fetchQuests } from '@/services/questsService';
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk

export default function JournalScreen() {
  const { userId } = useAuth(); // Get userId from Clerk
  const { themeColor, secondaryColor } = useTheme();
  const {
    currentDate, 
    latestAiResponse, 
    checkups, 
    refreshEntries,
    goToNextDay,
    goToPreviousDay,
    dailyEntry
  } = useJournal();
  
  const [selectedSection, setSelectedSection] = useState<'entries' | 'analysis'>('entries');
  const [quests, setQuests] = useState<Array<{ id: number; title: string }>>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [expandedCheckupId, setExpandedCheckupId] = useState<string | null>(null);

  // Load quests on mount with user ID
  useEffect(() => {
    const loadQuests = async () => {
      // Use Clerk userId for check
      if (!userId) {
        console.warn("Cannot load quests: User not logged in (Clerk)");
        setQuests([]); // Clear quests if logged out
        return;
      }

      try {
        const loadedQuests = await fetchQuests(userId); // Use Clerk userId
        setQuests(loadedQuests.map(q => ({ id: q.id, title: q.title })));
      } catch (err) {
        console.error('Error loading quests:', { error: err, userId: userId });
      }
    };
    loadQuests();
  }, [userId]); // Depend on Clerk userId

  // Handle task creation from recommendations with user ID
  const handleCreateTask = useCallback(async (taskData: any) => {
    // Use Clerk userId for check
    if (!userId) {
      console.warn("Cannot create task: User not logged in (Clerk)");
      return;
    }

    try {
      await createTask({
        ...taskData,
        created_at: new Date().toISOString(),
        user_id: userId // Use Clerk userId
      });
    } catch (err) {
      console.error('Error creating task:', { error: err, userId: userId });
    }
  }, [userId]); // Depend on Clerk userId

  // Get dates for the quick date selector
  const getDatesForSelector = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date);
    }
    return dates;
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    if (date.getTime() < currentDate.getTime()) {
      const daysDiff = Math.floor((currentDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = 0; i < daysDiff; i++) {
        goToPreviousDay();
      }
    } else if (date.getTime() > currentDate.getTime()) {
      const daysDiff = Math.floor((date.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      for (let i = 0; i < daysDiff; i++) {
        goToNextDay();
      }
    }
  };

  // Toggle checkup expansion
  const toggleCheckupExpansion = useCallback((id: string) => {
    setExpandedCheckupId(prevId => prevId === id ? null : id);
  }, []);

  // Format date display
  const formattedSelectedDate = selectedDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  // Generate a bright accent color for cyberpunk text effect
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

  // Keep useJournal in sync with selectedDate
  useEffect(() => {
    if (currentDate.toDateString() !== selectedDate.toDateString()) {
      setSelectedDate(currentDate);
    }
  }, [currentDate]);

  return (
    <SafeAreaView style={journalStyles.container}>
      {/* Use Clerk userId for login check */}
      {!userId ? (
        <View style={journalStyles.contentContainer}>
          <Card style={[journalStyles.insightCard, { borderLeftColor: secondaryColor }]}>
            <ThemedText style={journalStyles.insightText}>
              Please log in to view your journal entries.
            </ThemedText>
          </Card>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }}>
          <View style={journalStyles.contentContainer}>
            {/* Header Section */}
            <View style={[journalStyles.headerContainer, { borderLeftColor: themeColor }]}>
              <MaterialIcons name="auto-stories" size={24} color={themeColor} style={{ marginRight: 10 }} />
              <ThemedText style={[journalStyles.headerTitle, {
                textShadowColor: themeColor,
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 5
              }]}>JOURNAL ARCHIVE</ThemedText>
            </View>

            {/* Quick Date Selector */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={journalStyles.dateList}
            >
              {getDatesForSelector().map((date, index) => (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={[
                    journalStyles.dateButton,
                    date.toDateString() === selectedDate.toDateString() && {
                      borderColor: themeColor,
                      backgroundColor: 'rgba(30, 30, 30, 0.9)',
                    }
                  ]}
                  onPress={() => handleDateSelect(date)}
                >
                  <ThemedText style={[
                    journalStyles.dateText,
                    date.toDateString() === selectedDate.toDateString() && {
                      color: themeColor,
                    }
                  ]}>
                    {date.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tab Selector */}
            <View style={{
              flexDirection: 'row',
              marginBottom: 20,
              backgroundColor: 'rgba(20, 20, 20, 0.7)',
              borderRadius: 8,
              padding: 4
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 6,
                  backgroundColor: selectedSection === 'entries' ? 'rgba(30, 30, 30, 0.9)' : 'transparent',
                  borderWidth: 1,
                  borderColor: selectedSection === 'entries' ? themeColor : 'transparent',
                }}
                onPress={() => setSelectedSection('entries')}
              >
                <ThemedText style={{
                  color: selectedSection === 'entries' ? themeColor : '#AAA',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>DAILY ENTRIES</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 6,
                  backgroundColor: selectedSection === 'analysis' ? 'rgba(30, 30, 30, 0.9)' : 'transparent',
                  borderWidth: 1,
                  borderColor: selectedSection === 'analysis' ? secondaryColor : 'transparent',
                }}
                onPress={() => setSelectedSection('analysis')}
              >
                <ThemedText style={{
                  color: selectedSection === 'analysis' ? secondaryColor : '#AAA',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>AI ANALYSIS</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Description Card */}
            <Card style={[journalStyles.insightCard, { borderLeftColor: secondaryColor }]}>
              <View style={journalStyles.insightHeader}>
                <MaterialIcons name="psychology" size={20} color={secondaryColor} style={{ marginRight: 8 }} />
                <ThemedText style={[journalStyles.insightTitle, { color: secondaryColor }]}>
                  {selectedSection === 'entries' ? "TODAY'S JOURNAL" : "SILVERHAND'S INSIGHT"}
                </ThemedText>
              </View>
              <ThemedText style={journalStyles.insightText}>
                {selectedSection === 'entries' 
                  ? "Review and reflect on your daily checkups and entries. Each entry captures your thoughts and progress throughout the day."
                  : "Explore patterns and insights from your journal entries. I analyze your entries to help you understand your journey better."}
              </ThemedText>
            </Card>

            {/* Date display */}
            <View style={[journalStyles.headerContainer, { 
              marginTop: 20, 
              marginBottom: 20,
              borderLeftColor: selectedSection === 'entries' ? themeColor : secondaryColor
            }]}>
              <MaterialIcons 
                name={selectedSection === 'entries' ? "event" : "analytics"} 
                size={20} 
                color={selectedSection === 'entries' ? themeColor : secondaryColor} 
                style={{ marginRight: 8 }} 
              />
              <ThemedText style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: selectedSection === 'entries' ? themeColor : secondaryColor,
                textShadowColor: selectedSection === 'entries' ? themeColor : secondaryColor,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 5
              }}>
                {formattedSelectedDate}
              </ThemedText>
            </View>

            {loading ? (
              <View style={{ padding: 30, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={selectedSection === 'entries' ? themeColor : secondaryColor} />
              </View>
            ) : (
              <>
                {/* Journal Content Based on Selected Tab */}
                {selectedSection === 'entries' ? (
                  <View>
                    {/* Daily Entry */}
                    {dailyEntry && (
                      <Card style={[journalStyles.entryContainer, { borderLeftColor: themeColor }]}>
                        <View style={journalStyles.entryScrollView}>
                          <ThemedText style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: '#FFF',
                            marginBottom: 15,
                            textShadowColor: themeColor,
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 4
                          }}>
                            Daily Journal
                          </ThemedText>
                          <ThemedText style={journalStyles.entryText}>
                            {dailyEntry.user_entry || "No daily entry yet."}
                          </ThemedText>
                          
                          <View style={{
                            backgroundColor: 'rgba(15, 15, 15, 0.8)',
                            borderRadius: 5,
                            borderLeftWidth: 3,
                            borderColor: secondaryColor,
                            padding: 10,
                            marginTop: 20,
                          }}>
                            <View style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              padding: 8,
                              borderBottomWidth: 1,
                              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                              marginBottom: 10
                            }}>
                              <MaterialIcons name="psychology" size={20} color={secondaryColor} style={{ marginRight: 8 }} />
                              <ThemedText style={{
                                fontSize: 16,
                                fontWeight: 'bold',
                                color: secondaryColor,
                              }}>
                                SILVERHAND
                              </ThemedText>
                            </View>
                            <ThemedText style={{
                              fontSize: 16,
                              color: '#E0E0E0',
                              fontStyle: 'italic',
                              lineHeight: 24,
                              textShadowColor: secondaryColor,
                              textShadowOffset: { width: 0, height: 0 },
                              textShadowRadius: 2
                            }}>
                              {dailyEntry.ai_response || "No response yet."}
                            </ThemedText>
                          </View>
                        </View>
                      </Card>
                    )}

                    {/* Checkups */}
                    {checkups.length > 0 && (
                      <View style={{ marginTop: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                          <MaterialIcons name="history" size={16} color={themeColor} style={{ marginRight: 8 }} />
                          <ThemedText style={{ 
                            color: themeColor, 
                            fontWeight: 'bold', 
                            fontSize: 16 
                          }}>
                            CHECKUPS ({checkups.length})
                          </ThemedText>
                        </View>

                        {checkups.map(checkup => {
                          const checkupTime = new Date(checkup.created_at).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false
                          });
                          const isExpanded = expandedCheckupId === checkup.id;
                          
                          return (
                            <TouchableOpacity
                              key={checkup.id}
                              onPress={() => toggleCheckupExpansion(checkup.id)}
                              style={{
                                padding: 15,
                                backgroundColor: 'rgba(20, 20, 20, 0.7)',
                                borderRadius: 4,
                                marginBottom: 12,
                                borderLeftWidth: 2,
                                borderLeftColor: themeColor,
                              }}
                            >
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <ThemedText style={{ color: '#AAA', fontSize: 14, fontWeight: 'bold' }}>
                                  {checkupTime}
                                </ThemedText>
                                <MaterialIcons
                                  name={isExpanded ? "expand-less" : "expand-more"}
                                  size={20}
                                  color="#AAA"
                                />
                              </View>
                              
                              {isExpanded ? (
                                <View style={{ marginTop: 10 }}>
                                  <ThemedText style={{ 
                                    color: '#FFB74D',
                                    fontSize: 16,
                                    marginBottom: 15,
                                    lineHeight: 24
                                  }}>
                                    {checkup.content}
                                  </ThemedText>
                                  
                                  {checkup.ai_checkup_response && (
                                    <View style={{
                                      marginTop: 15,
                                      backgroundColor: 'rgba(15, 15, 15, 0.8)',
                                      borderRadius: 5,
                                      borderLeftWidth: 3,
                                      borderColor: secondaryColor,
                                    }}>
                                      <View style={{ 
                                        flexDirection: 'row', 
                                        alignItems: 'center', 
                                        padding: 10,
                                        borderBottomWidth: 1,
                                        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                                      }}>
                                        <MaterialIcons 
                                          name="psychology" 
                                          size={16} 
                                          color={secondaryColor}
                                          style={{ marginRight: 8 }} 
                                        />
                                        <ThemedText style={{
                                          fontSize: 14,
                                          fontWeight: 'bold',
                                          color: secondaryColor,
                                        }}>
                                          SILVERHAND
                                        </ThemedText>
                                      </View>
                                      
                                      <ScrollView style={{ padding: 10, maxHeight: 200 }}>
                                        <ThemedText style={{
                                          fontSize: 15,
                                          color: secondaryColor,
                                          fontStyle: 'italic',
                                          lineHeight: 22,
                                          textShadowColor: secondaryColor,
                                          textShadowOffset: { width: 0, height: 0 },
                                          textShadowRadius: 3
                                        }}>
                                          {checkup.ai_checkup_response}
                                        </ThemedText>
                                      </ScrollView>
                                    </View>
                                  )}
                                </View>
                              ) : (
                                <ThemedText style={{ 
                                  color: '#FFB74D',
                                  marginTop: 6,
                                  fontSize: 15,
                                }} numberOfLines={2}>
                                  {checkup.content}
                                </ThemedText>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {!dailyEntry && checkups.length === 0 && (
                      <Card style={[journalStyles.insightCard, { marginTop: 20 }]}>
                        <ThemedText style={{ color: '#AAA', textAlign: 'center' }}>
                          No journal entries for this date.
                        </ThemedText>
                      </Card>
                    )}
                  </View>
                ) : (
                  /* AI Analysis View */
                  <View>
                    {dailyEntry && dailyEntry.ai_analysis ? (
                      <Card style={[journalStyles.entryContainer, { borderLeftColor: secondaryColor }]}>
                        <View style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center',
                          marginBottom: 15
                        }}>
                          <MaterialIcons 
                            name="analytics" 
                            size={20} 
                            color={secondaryColor}
                            style={{ marginRight: 8 }} 
                          />
                          <ThemedText style={{
                            fontSize: 18,
                            fontWeight: 'bold',
                            color: secondaryColor,
                            textShadowColor: secondaryColor,
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 4
                          }}>
                            JOHNNY'S ANALYSIS
                          </ThemedText>
                        </View>
                        
                        <ThemedText style={{
                          fontSize: 17,
                          lineHeight: 26,
                          color: '#E0E0E0',
                          fontStyle: 'italic',
                          textShadowColor: 'rgba(255, 100, 100, 0.3)',
                          textShadowOffset: { width: 0, height: 0 },
                          textShadowRadius: 3
                        }}>
                          {dailyEntry.ai_analysis}
                        </ThemedText>
                        
                        <View style={{
                          backgroundColor: 'rgba(25, 25, 25, 0.9)',
                          marginTop: 25,
                          padding: 15,
                          borderRadius: 5,
                          borderLeftWidth: 3,
                          borderLeftColor: themeColor
                        }}>
                          <ThemedText style={{
                            fontSize: 16,
                            fontWeight: 'bold',
                            color: themeColor,
                            marginBottom: 8
                          }}>
                            YOUR JOURNAL ENTRY
                          </ThemedText>
                          
                          <ThemedText style={{
                            fontSize: 15,
                            color: '#BBB',
                            fontStyle: 'normal',
                          }}>
                            {dailyEntry.user_entry}
                          </ThemedText>
                        </View>
                      </Card>
                    ) : (
                      <Card style={[journalStyles.insightCard, { marginTop: 20 }]}>
                        <ThemedText style={{ color: '#AAA', textAlign: 'center' }}>
                          No analysis available for this date.
                        </ThemedText>
                      </Card>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
