import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Text } from 'react-native'; // Added Text
import { Card } from 'react-native-paper';
// Removed JournalPanel import
import { ThemedText } from '@/components/ui/ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { journalStyles } from '@/app/styles/journalStyles';
import { useJournal } from '@/hooks/useJournal';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router'; // Import useRouter

export default function JournalScreen() {
  const router = useRouter(); // Initialize router
  const { userId } = useAuth();
  const { themeColor, secondaryColor } = useTheme();
  const {
    currentDate,
    // Removed latestAiResponse (part of dailyEntry now)
    // Removed checkups
    // Removed refreshEntries (assuming useJournal handles refresh internally)
    goToNextDay,
    goToPreviousDay,
    goToDate, // Add the new function
    dailyEntry,
    loading: journalLoading, // Use loading state from useJournal
    error: journalError, // Use error state from useJournal
  } = useJournal();

  // Removed selectedSection state
  // Removed quests state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // Removed loading state (using journalLoading)
  // Removed expandedCheckupId state

  // Removed useEffect for loading quests
  // Removed handleCreateTask callback

  // State for AI content toggle
  const [aiViewMode, setAiViewMode] = useState<'response' | 'analysis'>('response');

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

  // Restored date selection logic to update useJournal's currentDate
  const handleDateSelect = (date: Date) => {
    // Prevent unnecessary updates if the date is already selected
    if (date.toDateString() === currentDate.toDateString()) {
      return;
    }

    setSelectedDate(date); // Keep local state for UI highlighting

    // Directly call goToDate from the hook
    goToDate(date);
  };

  // Removed toggleCheckupExpansion callback

  // Format date display
  const formattedSelectedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  // Removed getBrightAccent function

  // Keep selectedDate in sync with currentDate from the hook
  useEffect(() => {
    if (currentDate.toDateString() !== selectedDate.toDateString()) {
      setSelectedDate(currentDate);
    }
  }, [currentDate]);

  // Helper to render AI content based on view mode
  const renderAiContent = () => {
    if (!dailyEntry) return null;

    const content = aiViewMode === 'response' ? dailyEntry.ai_response : dailyEntry.ai_analysis;
    const title = aiViewMode === 'response' ? "SILVERHAND'S RESPONSE" : "SILVERHAND'S ANALYSIS";
    const iconName = aiViewMode === 'response' ? "chat" : "analytics";
    const accentColor = aiViewMode === 'response' ? themeColor : secondaryColor;

    if (!content) {
      return (
        <Card style={[journalStyles.insightCard, { marginTop: 20, borderLeftColor: accentColor }]}>
          <ThemedText style={{ color: '#AAA', textAlign: 'center' }}>
            No {aiViewMode === 'response' ? 'response' : 'analysis'} available for this date.
          </ThemedText>
        </Card>
      );
    }

    return (
      <View style={{
        marginTop: 20,
        backgroundColor: '#252525', // Match Kanban card background
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#333333',
        borderLeftWidth: 4,
        borderLeftColor: accentColor, // Use dynamic accent color
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 1,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <MaterialIcons name={iconName} size={18} color={accentColor} style={{ marginRight: 8 }} />
          <ThemedText style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: accentColor, // Use dynamic accent color
          }}>
            {title}
          </ThemedText>
        </View>
        <ThemedText style={{
          fontSize: 16,
          color: '#E0E0E0',
          lineHeight: 24,
          fontStyle: 'italic', // Keep italic style for AI content
        }}>
          {content}
        </ThemedText>
      </View>
    );
  };

  return (
    <SafeAreaView style={journalStyles.container}>
      {/* Header Section - Moved outside main flex container */}
      <View style={{
        paddingHorizontal: 15, // Keep horizontal padding
        paddingVertical: 10, // Adjust vertical padding if needed
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
        backgroundColor: '#252525', // Match Kanban header
        flexDirection: 'row', // Make header row for button
        alignItems: 'center', // Align items vertically
        justifyContent: 'space-between' // Space out title and button
      }}>
        {/* Title Section */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
          {/* Underline effect container */}
          <View style={{
            paddingBottom: 8,
            borderBottomWidth: 2,
            borderBottomColor: themeColor,
            flexDirection: 'row', // Keep icon and text together
            alignItems: 'center'
          }}>
            <MaterialIcons name="auto-stories" size={24} color={themeColor} style={{ marginRight: 10 }} />
            <Text style={{ // Use standard Text for header consistency
              fontSize: 20,
              color: '#EEEEEE',
              fontWeight: 'bold',
            }}>
              JOURNAL ARCHIVE
            </Text>
            {/* Underline element (optional, could be part of the container's border) */}
            {/* <View style={{ height: 3, width: 24, backgroundColor: themeColor, marginLeft: 8, borderRadius: 2 }} /> */}
          </View>
        </View>

        {/* Dashboard Button */}
        <TouchableOpacity
          onPress={() => router.push('/')} // Navigate to dashboard route
          style={{
            padding: 8,
            borderRadius: 6,
            backgroundColor: '#333333',
            borderWidth: 1,
            borderColor: '#444444',
          }}
        >
          <MaterialIcons name="chevron-left" size={24} color={themeColor} />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#1A1A1A' }}>
        {/* Left Pane: Date List */}
        <View style={{
          width: 150,
          borderRightWidth: 1,
          borderRightColor: '#333333',
          backgroundColor: '#1E1E1E',
          paddingTop: 10,
        }}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {getDatesForSelector().map((date) => {
              const isActive = date.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 15,
                    backgroundColor: isActive ? '#333333' : 'transparent',
                    borderLeftWidth: isActive ? 3 : 0,
                    borderLeftColor: themeColor, // Highlight active date
                    marginBottom: 2, // Spacing between dates
                  }}
                  onPress={() => handleDateSelect(date)}
                >
                  <ThemedText style={{
                    color: isActive ? themeColor : '#AAAAAA',
                    fontSize: 13,
                    fontWeight: isActive ? 'bold' : 'normal',
                  }}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </ThemedText>
                  <ThemedText style={{
                    color: isActive ? themeColor : '#888888',
                    fontSize: 11,
                  }}>
                    {date.toLocaleDateString('en-US', { weekday: 'long' })}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Right Pane: Journal Content */}
        <View style={{ flex: 1, padding: 15 }}>
          {!userId ? (
            <Card style={[journalStyles.insightCard, { borderLeftColor: secondaryColor }]}>
              <ThemedText style={journalStyles.insightText}>
                Please log in to view your journal archive.
              </ThemedText>
            </Card>
          ) : (
            <>
              {/* Selected Date Display */}
              <View style={[journalStyles.headerContainer, {
                marginTop: 0,
                marginBottom: 15,
                paddingLeft: 0,
                borderLeftWidth: 0,
              }]}
              >
                <MaterialIcons
                  name={"event"}
                  size={20}
                  color={themeColor}
                  style={{ marginRight: 8 }}
                />
                <ThemedText style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: themeColor,
                }}>
                  {formattedSelectedDate}
                </ThemedText>
              </View>

              {/* Content Area */}
              {journalLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={themeColor} />
                  <ThemedText style={{ marginTop: 10, color: '#AAA' }}>Loading daily summary...</ThemedText>
                </View>
              ) : journalError ? (
                 <Card style={[journalStyles.insightCard, { borderLeftColor: '#FF6B6B' }]}>
                   <ThemedText style={{ color: '#FF6B6B', textAlign: 'center' }}>
                     Error loading journal entry: {journalError}
                   </ThemedText>
                 </Card>
              ) : dailyEntry ? (
                <View style={{ flex: 1, flexDirection: 'column', backgroundColor: '#1E1E1E', borderRadius: 8, borderWidth: 1, borderColor: '#333333', overflow: 'hidden' }}>
                  {/* Top Section: User Entry */}
                  <View style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: '#333333' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#252525' }}>
                       <MaterialIcons name="notes" size={16} color={themeColor} style={{ marginRight: 8 }} />
                       <ThemedText style={{ fontSize: 14, fontWeight: 'bold', color: themeColor }}>
                         YOUR DAILY SUMMARY
                       </ThemedText>
                     </View>
                    <ScrollView style={{ padding: 10 }}>
                      <ThemedText style={{ fontSize: 15, color: '#DDDDDD', lineHeight: 22 }}>
                        {dailyEntry.user_entry || "No summary text recorded for this day."}
                      </ThemedText>
                    </ScrollView>
                  </View>

                  {/* Separator and Toggle */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 5,
                    paddingHorizontal: 10,
                    backgroundColor: '#252525',
                    borderTopWidth: 1,
                    borderBottomWidth: 1,
                    borderColor: '#333333',
                  }}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 5, opacity: aiViewMode === 'response' ? 1 : 0.6 }}
                      onPress={() => setAiViewMode('response')}
                    >
                      <MaterialIcons name="chat" size={16} color={themeColor} style={{ marginRight: 4 }} />
                      <Text style={{ color: themeColor, fontSize: 13, fontWeight: aiViewMode === 'response' ? 'bold' : 'normal' }}>
                        AI Response
                      </Text>
                    </TouchableOpacity>
                    <View style={{ width: 1, height: '60%', backgroundColor: '#444444', marginHorizontal: 10 }} />
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 5, opacity: aiViewMode === 'analysis' ? 1 : 0.6 }}
                      onPress={() => setAiViewMode('analysis')}
                    >
                      <MaterialIcons name="analytics" size={16} color={secondaryColor} style={{ marginRight: 4 }} />
                      <Text style={{ color: secondaryColor, fontSize: 13, fontWeight: aiViewMode === 'analysis' ? 'bold' : 'normal' }}>
                        AI Analysis
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Bottom Section: AI Content */}
                  <View style={{ flex: 1 }}>
                    <ScrollView style={{ padding: 10 }}>
                      {(() => {
                        if (!dailyEntry) return null;
                        const content = aiViewMode === 'response' ? dailyEntry.ai_response : dailyEntry.ai_analysis;
                        const accentColor = aiViewMode === 'response' ? themeColor : secondaryColor;
                        if (!content) {
                          return (
                            <ThemedText style={{ color: '#AAA', textAlign: 'center', fontStyle: 'italic', paddingTop: 20 }}>
                              No {aiViewMode} available for this date.
                            </ThemedText>
                          );
                        }
                        return (
                          <ThemedText style={{ fontSize: 15, color: '#E0E0E0', lineHeight: 22, fontStyle: 'italic' }}>
                            {content}
                          </ThemedText>
                        );
                      })()}
                    </ScrollView>
                  </View>
                </View>
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialIcons name="find-in-page" size={40} color="#444444" />
                  <ThemedText style={{ color: '#AAA', textAlign: 'center', marginTop: 10 }}>
                    No daily summary available for this date.
                  </ThemedText>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
