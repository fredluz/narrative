import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Text,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { journalStyles } from '@/app/styles/journalStyles';
import { journalService, JournalEntry } from '@/services/journalService';
import styles from '@/app/styles/global';
import { MaterialIcons } from '@expo/vector-icons';

const JournalScreen: React.FC = () => {
  const { themeColor } = useTheme();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [userEntry, setUserEntry] = useState<string>('');
  const [entryTitle, setEntryTitle] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isNewEntry, setIsNewEntry] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const windowHeight = Dimensions.get('window').height;

  // Format date to YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Format date for display
  const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const startDate = formatDateString(thirtyDaysAgo);
      const endDate = formatDateString(today);
      
      const journalEntries = await journalService.getEntries(startDate, endDate);
      setEntries(journalEntries);
      
      // Set today's date as default if no date is selected
      if (!selectedDate) {
        const todayString = formatDateString(today);
        setSelectedDate(todayString);
        
        const todaysEntry = journalEntries.find(entry => entry.date === todayString);
        if (todaysEntry) {
          setUserEntry(todaysEntry.user_entry || '');
          setEntryTitle(todaysEntry.title || '');
        }
      }
    } catch (err) {
      setError('Failed to load journal entries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    const selectedEntry = entries.find((entry) => entry.date === date);
    setUserEntry(selectedEntry?.user_entry || '');
    setEntryTitle(selectedEntry?.title || '');
    setIsEditing(false);
    setIsNewEntry(false);
  };

  const handleSaveEntry = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      await journalService.saveEntry(selectedDate, userEntry, entryTitle);
      await fetchEntries(); // Refresh entries list
      setIsEditing(false);
      setIsNewEntry(false);
    } catch (err) {
      setError('Failed to save journal entry');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewEntry = () => {
    setIsEditing(true);
    setIsNewEntry(true);
    setUserEntry('');
    setEntryTitle('');
    const today = formatDateString(new Date());
    setSelectedDate(today);
  };

  const selectedEntryData = selectedDate ? 
    entries.find((entry) => entry.date === selectedDate) : null;
  
  const isDarkColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  const textColor = isDarkColor(themeColor) ? '#fff' : '#000';
  
  // Derive a secondary color from the theme color
  const getSecondaryColor = (baseColor: string) => {
    // If the color is red-ish, make secondary color blue-ish
    if (baseColor.includes('f') || baseColor.includes('e') || baseColor.includes('d')) {
      return '#1D64AB';
    }
    // Otherwise, make secondary color red-ish
    return '#D81159';
  };
  
  const secondaryColor = getSecondaryColor(themeColor);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A', height: windowHeight }}>
      {/* Replaced LinearGradient with a simple View */}
      <View style={{ 
        flex: 1, 
        height: windowHeight,
        backgroundColor: '#121212',
      }}>
        <View style={[journalStyles.container, { backgroundColor: 'transparent' }]}>
          <View style={journalStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText style={{ 
                fontSize: 28, 
                fontWeight: 'bold',
                color: '#F0F0F0',
                textShadowColor: themeColor,
                textShadowOffset: { width: 1, height: 1 },
                textShadowRadius: 3
              }}>
                JOURNAL
              </ThemedText>
              <View style={{
                height: 4,
                width: 40,
                backgroundColor: themeColor,
                marginLeft: 10,
                borderRadius: 2,
              }} />
            </View>
            
            <TouchableOpacity 
              style={[journalStyles.newEntryButton, {
                backgroundColor: 'rgba(30, 30, 30, 0.8)',
                borderWidth: 1,
                borderColor: themeColor,
              }]} 
              onPress={handleNewEntry}
              disabled={loading}
            >
              <MaterialIcons name="add" size={18} color={themeColor} />
              <ThemedText style={[journalStyles.newEntryButtonText, {color: themeColor}]}>NEW ENTRY</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={journalStyles.contentContainer}>
            {loading && !isEditing && (
              <View style={{alignItems: 'center', marginVertical: 20}}>
                <ActivityIndicator size="large" color={themeColor} />
              </View>
            )}
            
            {error && !isEditing && (
              <View style={{ 
                padding: 10, 
                backgroundColor: 'rgba(200, 0, 0, 0.1)', 
                borderRadius: 5, 
                marginBottom: 15,
                borderLeftWidth: 3,
                borderLeftColor: '#D81159'
              }}>
                <ThemedText style={[styles.errorText, { color: '#FF6B6B' }]}>
                  {error} <Text style={{textDecorationLine: 'underline', color: '#FF6B6B'}} onPress={fetchEntries}>Try again</Text>
                </ThemedText>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={journalStyles.dateList}
            >
              {entries.map((entry) => (
                <TouchableOpacity
                  key={entry.date}
                  style={[
                    journalStyles.dateButton,
                    selectedDate === entry.date 
                      ? { 
                          backgroundColor: 'rgba(40, 40, 40, 0.9)', 
                          borderColor: themeColor,
                          borderLeftWidth: 3,
                        } 
                      : { 
                          backgroundColor: 'rgba(20, 20, 20, 0.7)',
                          borderColor: 'rgba(100, 100, 100, 0.3)' 
                        },
                  ]}
                  onPress={() => handleDateSelect(entry.date!)}
                  disabled={loading && isEditing}
                >
                  <ThemedText style={[
                    journalStyles.dateText, 
                    selectedDate === entry.date 
                      ? { color: themeColor } 
                      : { color: '#AAA' }
                  ]}>
                    {formatDateForDisplay(entry.date!)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={[
              journalStyles.entryContainer, 
              { 
                borderColor: themeColor, 
                borderLeftColor: themeColor,
                backgroundColor: 'rgba(25, 25, 25, 0.9)',
                borderWidth: 1,
              }
            ]}>
              {selectedDate ? (
                <ScrollView style={journalStyles.entryScrollView}>
                  {isEditing ? (
                    <KeyboardAvoidingView
                      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                      style={{ flex: 1 }}
                    >
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 15,
                      }}>
                        <View style={{ 
                          height: 15, 
                          width: 4, 
                          backgroundColor: themeColor, 
                          marginRight: 8 
                        }} />
                        <Text style={{ 
                          color: themeColor, 
                          fontWeight: '600'
                        }}>
                          TITLE
                        </Text>
                      </View>
                      <TextInput
                        style={[
                          journalStyles.titleInput, 
                          {
                            color: '#F0F0F0',
                            borderColor: themeColor,
                            borderLeftColor: themeColor,
                          }
                        ]}
                        value={entryTitle}
                        onChangeText={setEntryTitle}
                        placeholder="Entry Title"
                        placeholderTextColor="#666"
                        editable={!loading}
                        blurOnSubmit={true}
                        returnKeyType="next"
                      />
                      
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 15,
                        marginTop: 5,
                      }}>
                        <View style={{ 
                          height: 15, 
                          width: 4, 
                          backgroundColor: themeColor, 
                          marginRight: 8 
                        }} />
                        <Text style={{ 
                          color: themeColor, 
                          fontWeight: '600'
                        }}>
                          ENTRY
                        </Text>
                      </View>
                      <TextInput
                        style={[
                          journalStyles.entryInput, 
                          {
                            borderColor: themeColor,
                            borderLeftColor: themeColor,
                          }
                        ]}
                        multiline
                        value={userEntry}
                        onChangeText={setUserEntry}
                        placeholder="Write your entry..."
                        placeholderTextColor="#666"
                        editable={!loading}
                        blurOnSubmit={false}
                      />
                      <View style={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                        width: 60,
                        height: 60,
                        opacity: 0.1
                      }}>
                        <Text style={{
                          fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                          fontSize: 40,
                          color: themeColor,
                          fontWeight: 'bold'
                        }}>V</Text>
                      </View>
                    </KeyboardAvoidingView>
                  ) : selectedEntryData ? (
                    <>
                      {selectedEntryData.title && (
                        <View style={{ marginBottom: 20 }}>
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 10,
                          }}>
                            <View style={{ 
                              height: 15, 
                              width: 4, 
                              backgroundColor: themeColor, 
                              marginRight: 8 
                            }} />
                            <Text style={{ 
                              color: themeColor, 
                              fontWeight: '600',
                              fontSize: 13
                            }}>
                              ENTRY TITLE
                            </Text>
                          </View>
                          <ThemedText style={[journalStyles.displayedTitle, {
                            color: '#F0F0F0',
                            borderBottomWidth: 1,
                            borderBottomColor: 'rgba(255,255,255,0.1)',
                            paddingBottom: 10
                          }]}>
                            {selectedEntryData.title}
                          </ThemedText>
                        </View>
                      )}
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 15,
                      }}>
                        <View style={{ 
                          height: 15, 
                          width: 4, 
                          backgroundColor: themeColor, 
                          marginRight: 8 
                        }} />
                        <Text style={{ 
                          color: themeColor, 
                          fontWeight: '600',
                          fontSize: 13
                        }}>
                          YOUR WORDS
                        </Text>
                      </View>
                      <ThemedText style={[journalStyles.entryText]}>
                        {selectedEntryData.user_entry || 'No personal entry for this day.'}
                      </ThemedText>
                      <ThemedText style={[journalStyles.aiEntryText, {
                        borderColor: secondaryColor
                      }]}>
                        [SILVERHAND]: {selectedEntryData.ai_analysis || "Your story's writing itself, choom."}
                      </ThemedText>
                    </>
                  ) : (
                    <View style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20,
                    }}>
                      <MaterialIcons name="edit-note" size={60} color="rgba(255,255,255,0.1)" />
                      <ThemedText style={[journalStyles.noEntryText]}>
                        No entry for this date. Create one?
                      </ThemedText>
                    </View>
                  )}
                </ScrollView>
              ) : (
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MaterialIcons name="calendar-today" size={60} color="rgba(255,255,255,0.1)" />
                  <ThemedText style={journalStyles.noEntryText}>Select a date to view the entry.</ThemedText>
                </View>
              )}

              {!isEditing && selectedDate ? (
                <TouchableOpacity
                  style={[journalStyles.editButton, {
                    backgroundColor: 'rgba(30, 30, 30, 0.9)',
                    borderWidth: 1,
                    borderColor: themeColor,
                  }]}
                  onPress={() => setIsEditing(true)}
                  disabled={loading}
                >
                  <MaterialIcons name="edit" size={18} color={themeColor} />
                  <ThemedText style={[journalStyles.buttonText, {color: themeColor}]}>EDIT</ThemedText>
                </TouchableOpacity>
              ) : isEditing ? (
                <TouchableOpacity
                  style={[journalStyles.saveButton, {
                    backgroundColor: themeColor
                  }]}
                  onPress={handleSaveEntry}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={textColor} />
                  ) : (
                    <>
                      <MaterialIcons name="save" size={18} color={textColor} />
                      <ThemedText style={[journalStyles.buttonText, {color: textColor}]}>SAVE</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default JournalScreen;