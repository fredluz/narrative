import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { JournalPanel } from '@/components/journal/JournalPanel';
import { ThemedText } from '@/components/ui/ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { journalStyles } from '@/app/styles/journalStyles';
import { useJournal } from '@/hooks/useJournal';
import { createTask } from '@/services/tasksService';
import { fetchQuests } from '@/services/questsService';

export default function JournalScreen() {
  const { themeColor, secondaryColor } = useTheme();
  const { currentDate, getAiResponses } = useJournal();
  const [selectedSection, setSelectedSection] = useState<'entries' | 'analysis'>('entries');
  const [quests, setQuests] = useState<Array<{ id: number; title: string }>>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Load quests on mount
  useEffect(() => {
    const loadQuests = async () => {
      try {
        const loadedQuests = await fetchQuests();
        setQuests(loadedQuests.map(q => ({ id: q.id, title: q.title })));
      } catch (err) {
        console.error('Error loading quests:', err);
      }
    };
    loadQuests();
  }, []);

  // Handle task creation from recommendations
  const handleCreateTask = useCallback(async (taskData: any) => {
    try {
      await createTask({
        ...taskData,
        created_at: new Date().toISOString(),
      });
      // Could add a success notification here
    } catch (err) {
      console.error('Error creating task:', err);
    }
  }, []);

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
  };

  return (
    <SafeAreaView style={journalStyles.container}>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}