// File: components/journal/JournalPanel.tsx
import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ui/ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
import styles from '@/app/styles/global';
import { useJournal } from '@/hooks/useJournal';
import { journalStyles } from '@/app/styles/journalStyles';
import { questStyles } from '@/app/styles/questStyles';
import { journalService } from '@/services/journalService';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@clerk/clerk-expo';
import { useSuggestions } from '@/contexts/SuggestionContext';

import { CheckupItem } from './CheckupItem';
import { AIResponse } from './AIResponse';

const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export function JournalPanel({
  themeColor,
  textColor,
  fullColumnMode = false,
  showAnalysis = false,
  userId
}: {
  themeColor: string;
  textColor: string;
  fullColumnMode?: boolean;
  showAnalysis?: boolean;
  userId: string;
}) {
  const { secondaryColor } = useTheme();
  const statusColors = {
    info: '#64B5F6',
    warning: '#FFB74D',
    error: '#FF6B6B',
    success: '#81C784'
  };
  const router = useRouter();
  const { userId: authUserId } = useAuth();
  const { analyzeJournalEntry } = useSuggestions();

  const {
    currentDate,
    localEntryText,
    checkups,
    latestAiResponse,
    updateLocalEntryText,
    saveCurrentCheckup,
    goToPreviousDay,
    goToNextDay,
    loading: journalLoading,
    error: journalError,
    refreshEntries: refreshJournalEntries,
  } = useJournal();

  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localTags, setLocalTags] = useState<string>('');
  const [expandedCheckupId, setExpandedCheckupId] = useState<string | null>(null);
  const [hasDailyEntry, setHasDailyEntry] = useState(false);

  const isLoading = journalLoading || localLoading;

  const verifyCurrentUser = React.useMemo(() => {
    return !!authUserId && !!userId && authUserId === userId;
  }, [authUserId, userId]);

  if (!authUserId || !verifyCurrentUser) {
    return (
      <Card style={{
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333333',
      }}>
          <Text style={{ 
            color: '#AAAAAA',
            fontSize: 14,
            fontWeight: '500'
          }}>Unauthorized access</Text>
      </Card>
    );
  }

  useEffect(() => {
    const checkDailyEntryStatus = async () => {
      if (!authUserId) return;
      const dateStr = formatDate(currentDate);
      try {
        const daily = await journalService.getEntry(dateStr, authUserId);
        setHasDailyEntry(!!daily);
      } catch (err) {
        console.error("[JournalPanel] Error checking daily entry status:", err);
        setHasDailyEntry(false);
      }
    };
    if (verifyCurrentUser) {
        checkDailyEntryStatus();
    }
  }, [currentDate, authUserId, checkups, verifyCurrentUser]);

  const handleEntryChange = useCallback((text: string) => {
    updateLocalEntryText(currentDate, text);
  }, [updateLocalEntryText, currentDate]);

  const handleTagsChange = useCallback((text: string) => {
    setLocalTags(text);
  }, []);

  const toggleCheckupExpansion = useCallback((id: string) => {
    setExpandedCheckupId(prevId => (prevId === id ? null : id));
  }, []);

  const handleSaveCheckup = useCallback(async () => {
    if (!localEntryText.trim()) return;
    setLocalLoading(true);
    setLocalError(null);
    try {
      const processedTags = localTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      const savedCheckup = await saveCurrentCheckup(currentDate, processedTags);
      if (savedCheckup && authUserId) {
           await analyzeJournalEntry(savedCheckup.content, authUserId);
      }
      setLocalTags('');
    } catch (err: any) {
      console.error('JournalPanel: Error in handleSaveCheckup:', err);
      setLocalError(err?.message || 'Failed to save checkup entry');
    } finally {
      setLocalLoading(false);
    }
  }, [currentDate, localEntryText, localTags, saveCurrentCheckup, analyzeJournalEntry, authUserId]);

  const handleDailyEntry = useCallback(async () => {
     if (!authUserId || !verifyCurrentUser) {
         console.error("Cannot handle daily entry: Unauthorized");
         return;
     }
     setLocalLoading(true);
     setLocalError(null);
     const dateStr = formatDate(currentDate); // Define dateStr outside the try block
     try {
        if (localEntryText.trim()) {
            await saveCurrentCheckup(currentDate, []);
            setLocalTags('');
        }
        const newDailyEntry = await journalService.saveDailyEntry(dateStr, authUserId, localEntryText); // Pass localEntryText
        console.log("[JournalPanel] Daily entry created:", newDailyEntry.id);
        setHasDailyEntry(true); // Update state to reflect creation
        // Navigate back to the journal screen (or refresh if already there)
        // Refreshing might be handled by useJournal hook after saveDailyEntry potentially triggers it
        // For now, let's assume useJournal handles refresh, or we can explicitly call refreshEntries
        refreshJournalEntries(); // Explicitly refresh after saving
        // router.push('/journal'); // Navigate back if needed, but refresh might be enough
     } catch (err: any) {
        console.error('JournalPanel: Error in handleDailyEntry:', err);
        setLocalError(err?.message || 'Failed to generate daily entry');
        // Ensure hasDailyEntry reflects potential failure if applicable
        const daily = await journalService.getEntry(dateStr, authUserId);
        setHasDailyEntry(!!daily);
     } finally {
        setLocalLoading(false);
     }
  }, [currentDate, authUserId, verifyCurrentUser, localEntryText, saveCurrentCheckup, router, refreshJournalEntries]); // Added refreshJournalEntries dependency

  const isToday = formatDate(currentDate) === formatDate(new Date());
  const errorToShow = localError || journalError;

  // Format date for header display (e.g., "Apr 01")
  const formattedHeaderDate = currentDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  // Determine header title
  const headerTitle = showAnalysis
    ? `ANALYSIS - ${formattedHeaderDate}`
    : isToday
    ? `TODAY'S JOURNAL - ${formattedHeaderDate}`
    : `YOUR JOURNAL - ${formattedHeaderDate}`;


  return (
    <Card style={{
      backgroundColor: '#1E1E1E',
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#333333',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 2,
      flex: fullColumnMode ? 1 : undefined,
      marginTop: fullColumnMode ? 0 : 20,
      marginBottom: fullColumnMode ? 0 : 20,
    }}>
      {/* Enhanced header with theme styling */}
      <View style={{ 
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
        backgroundColor: '#252525',
      }}>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center',
          paddingBottom: 8,
          borderBottomWidth: 2,
          borderBottomColor: themeColor
        }}>
          <Text style={{ 
            fontWeight: 'bold',
            color: '#EEEEEE',
            fontSize: 18, // Slightly smaller to fit date
          }}>
            {headerTitle}
          </Text>
          <View style={{
            height: 2, // Slightly thinner underline
            width: 24,
            backgroundColor: themeColor,
            marginLeft: 8,
            borderRadius: 2,
          }} />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={{
              padding: 8,
              borderRadius: 6,
              backgroundColor: '#333333',
              borderWidth: 1,
              borderColor: '#444444',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 1,
            }}
            onPress={goToPreviousDay}
          >
            <MaterialIcons name="chevron-left" size={24} color={themeColor} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              padding: 8,
              borderRadius: 6,
              backgroundColor: '#333333',
              borderWidth: 1,
              borderColor: '#444444',
              opacity: isToday ? 0.5 : 1
            }}
            onPress={goToNextDay}
            disabled={isToday}
          >
            <MaterialIcons name="chevron-right" size={24} color={themeColor} />
          </TouchableOpacity>

          {/* Add Daily Entry Button */}
          <TouchableOpacity
            style={{
              padding: 8,
              borderRadius: 6,
              backgroundColor: '#333333',
              borderWidth: 1,
              borderColor: '#444444',
              opacity: isLoading || hasDailyEntry ? 0.5 : 1, // Disable if loading or entry exists
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 1,
            }}
            onPress={handleDailyEntry}
            disabled={isLoading || hasDailyEntry} // Disable if loading or entry exists
          >
            {localLoading ? (
               <ActivityIndicator size="small" color={secondaryColor} />
             ) : (
               <MaterialIcons name="bedtime" size={24} color={secondaryColor} /> // Use bedtime icon and secondary color
             )}
           </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: '#1A1A1A', padding: 15, position: 'relative' }}>
        {/* Content Area */}
        <View style={{ flex: 1, flexDirection: 'column' }}>
          {errorToShow ? (
            <View style={{
              margin: 10,
              padding: 10,
              backgroundColor: '#3A2222',
              borderRadius: 5,
              borderLeftWidth: 2,
              borderLeftColor: '#FF6B6B',
            }}>
              <Text style={{ color: '#FF6B6B', fontSize: 14 }}>
                {errorToShow}
                <Text 
                  style={{ textDecorationLine: 'underline', marginLeft: 8 }}
                  onPress={() => { setLocalError(null); refreshJournalEntries(); }}
                >
                  Try again
                </Text>
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1, flexDirection: 'column', gap: 10 }}>
              {/* Main Content Area - Three Equal Sections */}
              <View style={{ flex: 1, minHeight: 0, flexDirection: 'column', gap: 15 }}>
                {/* Today's Checkups Section - Top 1/3 */}
                <View style={{ 
                  flex: 1,
                  backgroundColor: '#252525',
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#333333',
                  maxHeight: '33%'
                }}>
                  {/* Header */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#333333',
                    backgroundColor: '#252525'
                  }}>
                      <View style={{ 
                        flexDirection: 'row',
                        alignItems: 'center'
                      }}>
                        <MaterialIcons 
                          name="history" 
                          size={16} 
                          color={secondaryColor} 
                          style={{ marginRight: 6 }} 
                        />
                        <Text style={{ 
                          color: '#EEEEEE', 
                          fontWeight: 'bold', 
                          fontSize: 14,
                          textShadowColor: 'rgba(0, 0, 0, 0.25)',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 2
                        }}>
                          TODAY'S CHECKUPS ({checkups.length})
                        </Text>
                      </View>
                  </View>
                  {/* Scrollable Checkups */}
                  <ScrollView style={{ flex: 1 }}>
                    {!showAnalysis && checkups.length > 0 ? (
                      <View style={{ padding: 12 }}>
                        {checkups.map((checkup, index) => (
                          <View key={checkup.id} style={{ marginBottom: index === checkups.length - 1 ? 0 : 12 }}>
                            <CheckupItem
                              checkup={checkup}
                              
                              themeColor={themeColor}
                              secondaryColor={secondaryColor}
                              onPress={() => toggleCheckupExpansion(checkup.id)}
                              isExpanded={expandedCheckupId === checkup.id}
                            />
                          </View>
                        ))}
                      </View>
                    ) : (
                      !showAnalysis && !isLoading && (
                        <View style={{ 
          flex: 1,
          padding: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1E1E1E',
          borderRadius: 4
                        }}>
                          <MaterialIcons name="history" size={30} color="#444444" />
                          <Text style={{ color: '#AAAAAA', marginTop: 10, fontSize: 14 }}>
                            No check-ins logged for today yet
                          </Text>
                        </View>
                      )
                    )}
                  </ScrollView>
                </View>
                {/* Journal Input Section - Fills remaining space */}
                {!showAnalysis && (
                  <View style={{
                    flex: 1,
                    backgroundColor: '#252525',
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#333333',
                  }}>
                    {/* Journal Entry Header */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#333333'
                    }}>
                      <Text style={{ 
                        color: '#EEEEEE', 
                        fontWeight: 'bold', 
                        fontSize: 14 
                      }}>
                        JOURNAL ENTRY
                      </Text>
                      <TouchableOpacity
                        style={{
                      padding: 8,
                      borderRadius: 6,
                      backgroundColor: '#333333',
                      borderWidth: 1,
                      borderColor: '#444444',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.2,
                      shadowRadius: 2,
                      elevation: 1,
                          opacity: (!localEntryText.trim() || isLoading) ? 0.5 : 1, // Grey out if disabled
                        }}
                        onPress={handleSaveCheckup}
                        disabled={!localEntryText.trim() || isLoading} // Disable if text is empty/whitespace or loading
                      >
                        {localLoading ? ( // Use localLoading for this specific button's indicator
                          <ActivityIndicator size="small" color={themeColor} /> 
                        ) : journalLoading ? ( // Show indicator if journal hook is loading generally
                           <ActivityIndicator size="small" color={themeColor} />
                        ) : (
                          <MaterialIcons name="save" size={24} color={themeColor} />
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, padding: 12 }}>
                      <TextInput
                        style={{
                          flex: 1,
                          color: '#EEEEEE',
                          fontSize: 16,
                          padding: 12,
                          backgroundColor: '#1E1E1E',
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: '#333333',
                          textAlignVertical: 'top'
                        }}
                        multiline
                        placeholder="Write your journal entry here..."
                        placeholderTextColor="#666666"
                        value={localEntryText}
                        onChangeText={handleEntryChange}
                        editable={!isLoading}
                      />
                    </View>
                  </View>
                )}
                {/* AI Response Section */}
                {!showAnalysis && latestAiResponse && (
                  <View style={{
                    flex: 1,
                    backgroundColor: '#252525',
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#333333',
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#333333'
                    }}>
                      <View style={{ 
                        flexDirection: 'row',
                        alignItems: 'center'
                      }}>
                        <MaterialIcons 
                          name="chat" 
                          size={16} 
                          color={secondaryColor}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={{ 
                          color: '#EEEEEE',
                          fontWeight: 'bold',
                          fontSize: 14,
                          textShadowColor: 'rgba(0, 0, 0, 0.25)',
                          textShadowOffset: { width: 0, height: 1 },
                          textShadowRadius: 2
                        }}>
                          AI RESPONSE
                        </Text>
                      </View>
                    </View>
                    <ScrollView style={{ flex: 1 }}>
                      <View style={{ padding: 12 }}>
                        <AIResponse
                          response={latestAiResponse}
                          loading={isLoading}
                          aiGenerating={journalLoading}
                          fullColumnMode={fullColumnMode}
                          secondaryColor={secondaryColor}
                          entryUserId={authUserId}
                        />
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Loading Overlay for Daily Entry Generation */}
        {localLoading && (
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent overlay
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10, // Ensure it's on top
            borderRadius: 8, // Match card's border radius if needed inside padding
            margin: -15 // Adjust if padding affects overlay coverage
          }}>
            <ActivityIndicator size="large" color={secondaryColor} />
            <Text style={{ color: secondaryColor, marginTop: 10, fontWeight: 'bold' }}>
              Generating Daily Summary...
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
}
