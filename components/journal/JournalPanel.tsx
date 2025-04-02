// File: components/journal/JournalPanel.tsx
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert, Platform } from 'react-native';
import { Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
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
import { transcriptionAgent } from '@/services/agents/TranscriptionAgent'; // Import the new agent

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
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [audioRecording, setAudioRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const recordingInstanceRef = useRef<Audio.Recording | null>(null);
  const [showDailyEntryOverlay, setShowDailyEntryOverlay] = useState(false); // State for daily entry overlay


  const isLoading = journalLoading || localLoading || recordingStatus === 'transcribing';

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
    // Clean up recording resources if component unmounts while recording
    return () => {
      if (recordingInstanceRef.current) {
        console.log('[JournalPanel] Unmounting, stopping and unloading recording.');
        recordingInstanceRef.current.stopAndUnloadAsync().catch(err => console.error("Error stopping recording on unmount:", err));
        recordingInstanceRef.current = null;
      }
    };
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

  // --- Audio Recording Handlers ---

  const requestPermissions = async (): Promise<boolean> => {
    console.log('[JournalPanel] Requesting Audio Permissions...');
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Microphone access is needed for voice entries.');
      console.log('[JournalPanel] Audio permission denied.');
      return false;
    }
    console.log('[JournalPanel] Audio permission granted.');
    return true;
  };

  const startRecording = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setRecordingStatus('recording');
    setLocalError(null); // Clear previous errors
    setAudioUri(null); // Clear previous URI

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('[JournalPanel] Starting recording...');
      // Define custom recording options for smaller web file size
      const recordingOptions: Audio.RecordingOptions = {
        isMeteringEnabled: true,
        android: { // Keep default Android settings for now
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: { // Keep default iOS settings for now
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm;codecs=opus', // Use efficient Opus codec
          bitsPerSecond: 64000, // Lower bitrate for smaller size (adjust if needed)
        },
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingInstanceRef.current = recording; // Store instance in ref
      setAudioRecording(recording); // Also store in state if needed for UI updates
      console.log('[JournalPanel] Recording started.');

    } catch (err: any) {
      console.error('[JournalPanel] Failed to start recording', err);
      setLocalError('Failed to start recording: ' + err.message);
      setRecordingStatus('idle');
      if (recordingInstanceRef.current) {
        await recordingInstanceRef.current.stopAndUnloadAsync();
        recordingInstanceRef.current = null;
      }
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (!recordingInstanceRef.current) {
      console.warn('[JournalPanel] stopRecording called but no recording instance found.');
      setRecordingStatus('idle');
      return;
    }

    console.log('[JournalPanel] Stopping recording...');
    setRecordingStatus('transcribing'); // Indicate transcription process starts now

    try {
      await recordingInstanceRef.current.stopAndUnloadAsync();
      const uri = recordingInstanceRef.current.getURI();
      console.log('[JournalPanel] Recording stopped, URI:', uri);
      recordingInstanceRef.current = null; // Clear the ref
      setAudioRecording(null); // Clear state

      if (uri) {
        setAudioUri(uri); // Store URI for potential retry or debugging
        // Call the transcription agent
        const transcript = await transcriptionAgent.requestTranscription(uri);
        console.log('[JournalPanel] Transcription result:', transcript);

        // Append transcript to existing text
        const currentText = localEntryText || '';
        const newText = currentText ? `${currentText}\n${transcript}` : transcript;
        updateLocalEntryText(currentDate, newText); // Update text via hook

        setRecordingStatus('idle');
        setAudioUri(null); // Clear URI after successful transcription
      } else {
        throw new Error('Recording URI is null after stopping.');
      }
    } catch (err: any) {
      console.error('[JournalPanel] Failed to stop recording or transcribe', err);
      // Use Alert instead of setting localError state for this specific failure
      Alert.alert(
        'Transcription Error',
        `Sorry, transcription is currently unavailable. Please try again later or type your entry manually.\n\nError: ${err.message || 'Unknown error'}`
      );
      // setLocalError(`Transcription failed: ${err.message || 'Unknown error'}`); // Removed this line
      setRecordingStatus('idle'); // Reset status on error
      // Keep audioUri in case user wants to retry manually? Or clear it? Clearing for now.
      setAudioUri(null);
    }
  };

  // --- End Audio Recording Handlers ---


  const handleDailyEntry = useCallback(async () => {
     if (!authUserId || !verifyCurrentUser) {
         console.error("Cannot handle daily entry: Unauthorized");
         return;
     }
     setShowDailyEntryOverlay(true); // Show overlay immediately
     setLocalLoading(true); // Keep for button state
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
        setLocalLoading(false); // Clear loading for button state
        // Do NOT clear showDailyEntryOverlay here
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
    : `JOURNAL - ${formattedHeaderDate}`;
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
              fontSize: 18,
            }}>
              {headerTitle}
            </Text>
            <View style={{
              height: 2,
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
  
            {/* Go to Journal Archive Button */}
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
              onPress={() => router.push('/journal')} // Navigate to Journal Archive
            >
              <MaterialIcons name="auto-stories" size={24} color={themeColor} /> {/* Icon for archive */}
            </TouchableOpacity>
  
            {/* Add Daily Entry Save Button Here */}
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
                opacity: hasDailyEntry || isLoading ? 0.5 : 1, // Disable visually if entry exists or loading
              }}
              onPress={handleDailyEntry}
              disabled={hasDailyEntry || isLoading} // Disable if entry exists or any loading is active
            >
              {/* Use localLoading specifically for the daily entry generation indicator */}
              {localLoading ? (
                <ActivityIndicator size="small" color={secondaryColor} /> // Use secondaryColor for consistency
              ) : (
                <MaterialIcons name="nightlight-round" size={24} color={secondaryColor} /> // Changed icon and color
              )}
            </TouchableOpacity>
          </View>
        </View>  
        {/* Main content container */}
        <View style={{ flex: 1, backgroundColor: '#1A1A1A', padding: 15, position: 'relative' }}>
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
                <View style={{ minHeight: 0, flexDirection: 'column', gap: 15 }}>
                  {/* Checkup List Section */}
                  <ScrollView style={{ maxHeight: '25%', flexGrow: 0, flexShrink: 1 }}>
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
  
                  {/* Journal Entry Section */}
                  {!showAnalysis && (
                    <View style={{
                      flexGrow: 0,
                      backgroundColor: '#252525',
                      borderRadius: 6,
                      borderWidth: 1,
                      maxHeight:'25%',
                      borderColor: '#333333',
                    }}>
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
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity
                            style={{
                              padding: 8,
                              borderRadius: 6,
                              backgroundColor: recordingStatus === 'recording' ? themeColor : '#333333',
                              borderWidth: 1,
                              borderColor: '#444444',
                              opacity: isLoading && recordingStatus !== 'recording' ? 0.5 : 1,
                            }}
                            onPress={recordingStatus === 'recording' ? stopRecordingAndTranscribe : startRecording}
                            disabled={isLoading && recordingStatus !== 'recording'}
                          >
                            {recordingStatus === 'transcribing' ? (
                              <ActivityIndicator size="small" color={secondaryColor} />
                            ) : (
                              <MaterialIcons
                                name={recordingStatus === 'recording' ? "stop-circle" : "mic"}
                                size={24}
                                color={recordingStatus === 'recording' ? '#FFFFFF' : secondaryColor}
                              />
                            )}
                          </TouchableOpacity>
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
                              opacity: (!localEntryText.trim() || isLoading) ? 0.5 : 1,
                            }}
                            onPress={handleSaveCheckup}
                            disabled={!localEntryText.trim() || isLoading || recordingStatus !== 'idle'}
                          >
                            {localLoading ? (
                              <ActivityIndicator size="small" color={themeColor} />
                            ) : journalLoading ? (
                              <ActivityIndicator size="small" color={themeColor} />
                            ) : (
                              <MaterialIcons name="save" size={24} color={themeColor} />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={{ flexShrink: 1, padding: 12 }}>
                        <TextInput
                          style={{
                            flexGrow: 1,
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
  
                  {/* AI Response Section - Now as a sibling to Journal Entry */}
                  {!showAnalysis && (latestAiResponse || journalLoading) && (
                    <View style={{ marginTop: 15 }}>
                      <AIResponse 
                        response={latestAiResponse} 
                        loading={journalLoading} 
                        aiGenerating={journalLoading}
                        secondaryColor={secondaryColor} 
                      />
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
  
          {/* Loading Overlay */}
          {showDailyEntryOverlay && (
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
              borderRadius: 8,
              margin: -15
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
  