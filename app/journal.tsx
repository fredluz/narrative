import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { Card } from 'react-native-paper';
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
    goToNextDay,
    goToPreviousDay,
    goToDate, // Add the new function
    dailyEntry,
    loading: journalLoading, // Use loading state from useJournal
    error: journalError, // Use error state from useJournal
  } = useJournal();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // Removed loading state (using journalLoading)
  // Removed expandedCheckupId state

  // State for AI content toggle
  const [aiViewMode, setAiViewMode] = useState<'response' | 'analysis'>('response');

  // New: State for month/year in date picker
  const [pickerMonth, setPickerMonth] = useState(() => {
    // Start with the month of the selected/current date
    return selectedDate.getMonth();
  });
  const [pickerYear, setPickerYear] = useState(() => {
    return selectedDate.getFullYear();
  });

  // Helper: Get days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Helper: Get first day of week (0=Sun, 1=Mon, ...)
  const getFirstDayOfWeek = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Helper: Generate grid of dates for the month
  const getMonthGrid = (month: number, year: number) => {
    const daysInMonth = getDaysInMonth(month, year);
    const firstDay = getFirstDayOfWeek(month, year);
    const grid: (Date | null)[] = [];
    // Fill leading empty slots
    for (let i = 0; i < firstDay; i++) grid.push(null);
    // Fill days
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(new Date(year, month, d));
    }
    // Optionally fill trailing empty slots to complete the last week
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  };

  // New: Month navigation handlers
  const handlePrevMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear(y => y - 1);
    } else {
      setPickerMonth(m => m - 1);
    }
  };
  const handleNextMonth = () => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear(y => y + 1);
    } else {
      setPickerMonth(m => m + 1);
    }
  };

  // When currentDate changes, update picker to match
  useEffect(() => {
    setPickerMonth(currentDate.getMonth());
    setPickerYear(currentDate.getFullYear());
  }, [currentDate]);

  // Format date display
  const formattedSelectedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

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

  // Add this function before the return statement
  const handleDateSelect = (date: Date) => {
    // Prevent unnecessary updates if the date is already selected
    if (date.toDateString() === selectedDate.toDateString()) {
      return;
    }
    setSelectedDate(date);
    goToDate(date);
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
        {/* Left Pane: Date Picker */}
        <View style={{
          width: 220,
          borderRightWidth: 1,
          borderRightColor: '#333333',
          backgroundColor: '#1E1E1E',
          paddingTop: 10,
          paddingHorizontal: 6,
        }}>
          {/* Month navigation */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <TouchableOpacity onPress={handlePrevMonth} style={{ padding: 6 }}>
              <MaterialIcons name="chevron-left" size={22} color={themeColor} />
            </TouchableOpacity>
            <Text style={{ color: themeColor, fontWeight: 'bold', fontSize: 15 }}>
              {new Date(pickerYear, pickerMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={{ padding: 6 }}>
              <MaterialIcons name="chevron-right" size={22} color={themeColor} />
            </TouchableOpacity>
          </View>
          {/* Weekday headers */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <Text key={i} style={{ color: '#888', fontSize: 12, width: 24, textAlign: 'center' }}>{d}</Text>
            ))}
          </View>
          {/* Calendar grid */}
          <View>
            {(() => {
              const grid = getMonthGrid(pickerMonth, pickerYear);
              const rows = [];
              for (let i = 0; i < grid.length; i += 7) {
                rows.push(grid.slice(i, i + 7));
              }
              return rows.map((week, rowIdx) => (
                <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: 2 }}>
                  {week.map((date, colIdx) => {
                    if (!date) {
                      return <View key={colIdx} style={{ width: 24, height: 32, margin: 2 }} />;
                    }
                    const isActive = date.toDateString() === selectedDate.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <TouchableOpacity
                        key={colIdx}
                        onPress={() => handleDateSelect(date)}
                        style={{
                          width: 24,
                          height: 32,
                          margin: 2,
                          borderRadius: 6,
                          backgroundColor: isActive ? themeColor : isToday ? '#333' : 'transparent',
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderWidth: isActive ? 2 : 0,
                          borderColor: isActive ? secondaryColor : 'transparent',
                        }}
                      >
                        <Text style={{
                          color: isActive ? '#1A1A1A' : isToday ? themeColor : '#DDD',
                          fontWeight: isActive || isToday ? 'bold' : 'normal',
                          fontSize: 15,
                        }}>
                          {date.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ));
            })()}
          </View>
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
