import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/contexts/ThemeContext'; // Import useTheme
import { IconSymbol } from '@/components/ui/IconSymbol';

// Mock data for journal entries (replace with actual data fetching)
interface JournalEntry {
  date: string; // YYYY-MM-DD format
  userEntry: string;
  aiGeneratedEntry: string;
}

const getMockJournalEntries = (): JournalEntry[] => {
  const today = new Date();
  const entries: JournalEntry[] = [];

  for (let i = -6; i <= 0; i++) { // Last 7 days, including today
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateString = date.toISOString().split('T')[0];

    let userEntry = '';
    let aiGeneratedEntry = `AI summary for ${dateString}.`;
    if (i === -2) {
      userEntry = "I felt really productive today! Finished the Kanban board UI and started working on the chat integration.";
      aiGeneratedEntry = "[SILVERHAND]: Not bad, samurai. You're crushing it with that UI work. Keep pushing those boundaries and stick it to the corporate code.";
    } else if (i === -5) {
      userEntry = "[NO USER ENTRY]";
      aiGeneratedEntry = "[SILVERHAND]: Wake the fuck up, samurai. Can't build digital revolution by staring at blank screens. Time to make some noise.";
    } else if (i === 0) {
        userEntry = "Today, I missed the deadline and it was a big bummer. I also forgot to plan today, so I feel lost";
        aiGeneratedEntry = "[SILVERHAND]: Listen up - deadlines are just corpo bullshit anyway. Tomorrow's another day to raise hell. Get your shit together and show them what you're made of.";
    }

    entries.push({
      date: dateString,
      userEntry,
      aiGeneratedEntry,
    });
  }
  return entries;
};


const JournalScreen: React.FC = () => {
  const { themeColor } = useTheme(); // Use the themeColor
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [userEntry, setUserEntry] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isNewEntry, setIsNewEntry] = useState<boolean>(false);
  const windowHeight = Dimensions.get('window').height;


  useEffect(() => {
    // Replace with actual data fetching from your backend/local storage
    const fetchedEntries = getMockJournalEntries();
    setEntries(fetchedEntries);

    // Set today's date as the initially selected date
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);

    // Load the user entry for today
    const todaysEntry = fetchedEntries.find((entry) => entry.date === today);
    setUserEntry(todaysEntry?.userEntry || '');
  }, []);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    const selectedEntry = entries.find((entry) => entry.date === date);
    setUserEntry(selectedEntry?.userEntry || '');
    setIsEditing(false); // Exit edit mode when switching dates
    setIsNewEntry(false);
  };

  const handleSaveEntry = () => {
    // Replace with actual data saving to your backend/local storage
    if (selectedDate) {
      const updatedEntries = entries.map((entry) =>
        entry.date === selectedDate ? { ...entry, userEntry } : entry
      );

      if (isNewEntry) { //add new entry to entries array
        updatedEntries.push({
            date: selectedDate,
            userEntry,
            aiGeneratedEntry: 'AI summary will appear after saving.'
        })
      }
      setEntries(updatedEntries);
      setIsEditing(false);
      setIsNewEntry(false)
      console.log('Saving entry:', { date: selectedDate, userEntry });
    }
  };

  const handleNewEntry = () => {
    setIsEditing(true)
    setIsNewEntry(true)
    setUserEntry('');
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }

  const selectedEntry = selectedDate ? entries.find((entry) => entry.date === selectedDate) : null;
  const isDarkColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  const textColor = isDarkColor(themeColor) ? '#fff' : '#000';


  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#181818', height: windowHeight }}>
        <ThemedView style={[styles.container, { backgroundColor: '#181818', height: windowHeight }]}  >
            <View style={styles.header}>
                <ThemedText type="title">Journal</ThemedText>
                <TouchableOpacity style={[styles.newEntryButton, {backgroundColor: themeColor}]} onPress={handleNewEntry}>
                <IconSymbol name="plus" size={20} color={textColor} />
                <ThemedText style={[styles.newEntryButtonText, {color: textColor}]}>New Entry</ThemedText>
                </TouchableOpacity>
            </View>

            <View style={styles.contentContainer}>
                <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateList}
                >
                {entries.map((entry) => (
                    <TouchableOpacity
                    key={entry.date}
                    style={[
                        styles.dateButton,
                        selectedDate === entry.date && { backgroundColor: themeColor },
                    ]}
                    onPress={() => handleDateSelect(entry.date)}
                    >
                    <ThemedText style={[styles.dateText, selectedDate === entry.date && { color: textColor } ]}>
                        {entry.date}
                    </ThemedText>
                    </TouchableOpacity>
                ))}
                </ScrollView>

                <ThemedView style={[styles.entryContainer, { borderColor: themeColor, borderWidth: 2, backgroundColor: '#333333' } ]}>
                {selectedEntry ? (
                    <ScrollView style={styles.entryScrollView} >
                        {isEditing ? (
                            <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ flex: 1 }}
                            >
                            <TextInput
                                style={[styles.entryInput, {color: textColor}]}
                                multiline
                                value={userEntry}
                                onChangeText={setUserEntry}
                                placeholder="Write your entry..."
                                placeholderTextColor="#AAA"
                            />
                            </KeyboardAvoidingView>
                        ) : (
                            <>
                            <ThemedText style={styles.entryText}>
                                {selectedEntry.userEntry || 'No personal entry for this day.'}
                            </ThemedText>
                            <ThemedText style={styles.aiEntryText}>
                                {selectedEntry.aiGeneratedEntry}
                            </ThemedText>
                            </>
                        )}
                    </ScrollView>
                ) : (
                    <ThemedText style={styles.noEntryText}>Select a date to view the entry.</ThemedText>
                )}

                {!isEditing && selectedEntry ? (
                    <TouchableOpacity
                    style={[styles.editButton, {backgroundColor: themeColor }]}
                    onPress={() => setIsEditing(true)}
                    >
                    <IconSymbol name="pencil" size={20} color={textColor} />
                    <ThemedText style={[styles.buttonText, {color: textColor}]}>Edit Entry</ThemedText>
                    </TouchableOpacity>
                ) : isEditing ? (
                    <TouchableOpacity
                    style={[styles.saveButton, {backgroundColor: themeColor}]}
                    onPress={handleSaveEntry}
                    >
                    <IconSymbol name="checkmark" size={20} color={textColor} />
                    <ThemedText style={[styles.buttonText, {color: textColor}]}>Save Entry</ThemedText>
                    </TouchableOpacity>
                ) : null}
              </ThemedView>
            </View>
        </ThemedView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  contentContainer: {
    flex: 1,
  },
  dateList: {
    flexDirection: 'row',
    paddingBottom: 10,
  },
  dateButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#444', // Default date button color
  },
  dateText: {
    fontSize: 16,
    color: '#FFF',
  },
  entryContainer: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: '#333'
  },
  entryScrollView:{
    flex: 1
  },
  entryText: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 20,
    fontFamily: 'Inter_400Regular',
  },
  aiEntryText: {
    fontSize: 14,
    color: '#AAA',
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
  },
  noEntryText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Inter_400Regular',
  },
  entryInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    fontFamily: 'Inter_400Regular',
    minHeight: 250,
    textAlignVertical: 'top',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 20,
    marginTop: 10,
    backgroundColor: '#007BFF', // Edit button color
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 20,
    marginTop: 10,
     // Save button color
  },
  buttonText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
    newEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  newEntryButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  }
});

export default JournalScreen;