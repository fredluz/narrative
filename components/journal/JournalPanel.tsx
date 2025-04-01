// File: components/journal/JournalPanel.tsx
import React, { useCallback, useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, ScrollView } from 'react-native'; // Removed unused Image, TextInput imports for cleanup
import { Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ui/ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
import styles from '@/app/styles/global';
import { useJournal } from '@/hooks/useJournal';
import { journalStyles } from '@/app/styles/journalStyles';
import { questStyles } from '@/app/styles/questStyles';
import { journalService, CheckupEntry } from '@/services/journalService'; // Removed unused JournalEntry
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk
import { useSuggestions } from '@/contexts/SuggestionContext';
import { personalityService } from '@/services/personalityService';

import { JournalEntryInput } from './JournalEntryInput';
import { CheckupItem } from './CheckupItem';
import { AIResponse } from './AIResponse';

// Define formatDate helper function
const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

// Define getBrightAccent helper function
const getBrightAccent = (baseColor: string) => {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (r + g + b > 500) return '#FFFFFF';
    const brightR = Math.min(255, r + 100);
    const brightG = Math.min(255, g + 100);
    const brightB = Math.min(255, b + 100);
    return `#${brightR.toString(16).padStart(2, '0')}${brightG.toString(16).padStart(2, '0')}${brightB.toString(16).padStart(2, '0')}`;
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
  userId: string; // Keep userId prop for now, represents the user whose journal is being viewed
}) {
  const { secondaryColor } = useTheme();
  const router = useRouter();
  const { userId: authUserId } = useAuth(); // Get logged-in user's ID from Clerk
  const { analyzeJournalEntry } = useSuggestions();
  const [personalityName, setPersonalityName] = useState('ASSISTANT');

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


  // Verify the logged-in user (authUserId) matches the user whose journal is being viewed (userId prop)
  const verifyCurrentUser = React.useMemo(() => {
    return !!authUserId && !!userId && authUserId === userId;
  }, [authUserId, userId]);

  // Check if logged in at all, and if they match the prop userId
  if (!authUserId || !verifyCurrentUser) {
    return (
      <Card style={[styles.taskCard, { padding: 15, backgroundColor: '#1a1a1a' }]}>
        <ThemedText style={{ color: '#777', textAlign: 'center' }}>Unauthorized access</ThemedText>
      </Card>
    );
  }

  useEffect(() => {
    const checkDailyEntryStatus = async () => {
      // Use authUserId for check
      if (!authUserId) return;
      const dateStr = formatDate(currentDate);
      try {
        // Use authUserId to fetch the entry (assuming viewing own journal)
        // If viewing others' journals is intended, this needs adjustment based on `userId` prop and permissions
        const daily = await journalService.getEntry(dateStr, authUserId);
        setHasDailyEntry(!!daily);
      } catch (err) {
        console.error("[JournalPanel] Error checking daily entry status:", err);
        setHasDailyEntry(false);
      }
    };
    // Only run if the logged-in user matches the journal user being viewed
    if (verifyCurrentUser) {
        checkDailyEntryStatus();
    }
  }, [currentDate, authUserId, checkups, verifyCurrentUser]); // Re-check when date/authUserId/checkups/verification change

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
      // saveCurrentCheckup likely uses the userId internally from useJournal hook, which needs refactoring too.
      // Assuming saveCurrentCheckup is refactored or implicitly uses the correct user:
      const savedCheckup = await saveCurrentCheckup(currentDate, processedTags);
      console.log("[JournalPanel] Checkup saved via hook:", savedCheckup?.id);
      // Use authUserId for analysis
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
     // Use authUserId for check
     if (!authUserId) {
         console.error("Cannot handle daily entry: User not logged in (Clerk).");
         return;
     }
     // Ensure the action is performed by the owner of the journal
     if (!verifyCurrentUser) {
         console.error("Cannot handle daily entry: Logged-in user does not match journal owner.");
         return;
     }
     setLocalLoading(true);
     setLocalError(null);
     try {
        const dateStr = formatDate(currentDate);
        if (localEntryText.trim()) {
            console.log("[JournalPanel] Saving final checkup before creating daily entry...");
            // Assuming saveCurrentCheckup uses correct user context
            await saveCurrentCheckup(currentDate, []);
            setLocalTags('');
        }
        console.log("[JournalPanel] Creating daily summary entry...");
        // Use authUserId to save the daily entry
        const newDailyEntry = await journalService.saveDailyEntry(dateStr, authUserId);
        console.log("[JournalPanel] Daily entry created:", newDailyEntry.id);
        setHasDailyEntry(true);
        router.push('/daily-review'); // Consider if this route needs auth check
     } catch (err: any) {
        console.error('JournalPanel: Error in handleDailyEntry:', err);
        setLocalError(err?.message || 'Failed to generate daily entry');
     } finally {
        setLocalLoading(false);
     }
  }, [currentDate, authUserId, verifyCurrentUser, localEntryText, saveCurrentCheckup, router]);

  const brightAccent = getBrightAccent(themeColor);
  const amberColor = '#FFB74D';
  const errorToShow = localError || journalError;
  const isToday = formatDate(currentDate) === formatDate(new Date()); // Check if current date is today

  return (
    <Card style={[styles.taskCard, {
        overflow: 'hidden',
        borderColor: themeColor,
        borderWidth: 1,
        borderLeftWidth: 3,
        height: fullColumnMode ? 'auto' : 'auto',
        flex: fullColumnMode ? 1 : undefined,
        marginTop: fullColumnMode ? 0 : 20,
        marginBottom: fullColumnMode ? 0 : 20,
        backgroundColor: 'transparent',
     }]}>
      {/* Background */}
      <View style={{ position: 'absolute', width: '100%', height: '100%', backgroundColor: '#151515' }} />

      {/* Header */}
      <View style={[journalStyles.journalHeader, {
          padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)',
          alignItems: 'center', justifyContent: 'space-between', flexDirection: 'row', width: '100%',
       }]}>
         {/* Journal Icon Button */}
         <TouchableOpacity
             style={[journalStyles.updateButton, {
               backgroundColor: 'rgba(30, 30, 30, 0.9)', borderWidth: 1, borderColor: themeColor, padding: 10,
               shadowColor: themeColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 5, elevation: 5,
             }]}
             onPress={() => router.push('/journal')}>
            <Text style={{ color: brightAccent, fontSize: 22, textShadowColor: themeColor, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 4 }}>📓</Text>
         </TouchableOpacity>

         {/* Date Navigation */}
         <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center', marginHorizontal: 10 }}>
            <TouchableOpacity
                style={{ padding: 8, borderRadius: 4, backgroundColor: 'rgba(20, 20, 20, 0.7)', marginHorizontal: 5 }}
                onPress={goToPreviousDay}>
               <MaterialIcons name="chevron-left" size={24} color={brightAccent} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center', flexShrink: 1 }}>
               <ThemedText style={[questStyles.mainQuestTitle, { fontSize: 20, color: '#FFFFFF', textShadowColor: themeColor, textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 5, textAlign: 'center' }]}>
                  {showAnalysis ? 'ANALYSIS' : "TODAY'S JOURNAL"}
               </ThemedText>
               <ThemedText style={{ fontSize: 12, color: '#AAA', marginTop: 0 }}>
                  {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
               </ThemedText>
            </View>
            <TouchableOpacity
                style={{ // <<< FIX: Moved opacity into style object >>>
                    padding: 8, borderRadius: 4, backgroundColor: 'rgba(20, 20, 20, 0.7)', marginHorizontal: 5,
                    opacity: isToday ? 0.5 : 1 // Apply opacity based on isToday check
                 }}
                onPress={goToNextDay}
                disabled={isToday} // Disable button if it's today
                // Removed direct opacity prop
                >
               <MaterialIcons name="chevron-right" size={24} color={brightAccent} />
            </TouchableOpacity>
         </View>

         {/* Action Buttons */}
         <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity
               style={[journalStyles.updateButton, {
                 backgroundColor: 'rgba(30,30,30,0.9)', borderWidth: 1, borderColor: amberColor, padding: 10,
                 shadowColor: amberColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 5, elevation: 5,
                 opacity: !localEntryText.trim() || isLoading ? 0.5 : 1
               }]}
               onPress={handleSaveCheckup}
               disabled={isLoading || !localEntryText.trim()}>
               {isLoading && localLoading ? <ActivityIndicator size="small" color={amberColor} /> : <Text style={{ color: brightAccent, fontSize: 22, textShadowColor: amberColor, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 4 }}>💾</Text>}
            </TouchableOpacity>
            <TouchableOpacity
               style={[journalStyles.updateButton, {
                 backgroundColor: 'rgba(30,30,30,0.9)', borderWidth: 1, borderColor: secondaryColor, padding: 10,
                 shadowColor: secondaryColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 5, elevation: 5,
                 opacity: hasDailyEntry || checkups.length === 0 || isLoading ? 0.5 : 1
                }]}
               onPress={handleDailyEntry}
               disabled={isLoading || hasDailyEntry || checkups.length === 0}>
              {isLoading && localLoading ? <ActivityIndicator size="small" color={secondaryColor} /> : <Text style={{ color: brightAccent, fontSize: 22, textShadowColor: secondaryColor, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 4 }}>🛌</Text>}
            </TouchableOpacity>
         </View>
      </View>

      {/* Content Area */}
      <View style={{ flex: 1, padding: 15, flexDirection: 'column' }}>
        {errorToShow ? (
          <View style={{ margin: 15, padding: 10, backgroundColor: 'rgba(200, 0, 0, 0.1)', borderRadius: 5, borderLeftWidth: 2, borderLeftColor: '#D81159' }}>
            <ThemedText style={[styles.errorText, { color: '#FF6B6B' }]}>
              {errorToShow}. {/* Removed stray dot */}
              <Text style={{ textDecorationLine: 'underline' }} onPress={() => { setLocalError(null); refreshJournalEntries(); }}>Try again</Text>
            </ThemedText>
          </View>
        ) : (
          <View style={{ flex: 1, flexDirection: 'column', gap: 10 }}>
            {/* Today's checkups list */}
            {!showAnalysis && checkups.length > 0 && (
              <View style={{ maxHeight: 250 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialIcons name="history" size={16} color={themeColor} style={{ marginRight: 6 }} />
                  <Text style={{ color: themeColor, fontWeight: 'bold', fontSize: 14 }}>
                    TODAY'S <Text style={{ color: brightAccent }}>{checkups.length}</Text> CHECKUP{checkups.length !== 1 ? 'S' : ''}
                  </Text>
                </View>
                <ScrollView style={{ flexShrink: 1 }}>
                  {checkups.map((checkup) => (
                    <CheckupItem
                      key={checkup.id}
                      checkup={checkup}
                      themeColor={themeColor}
                      onPress={() => toggleCheckupExpansion(checkup.id)}
                      isExpanded={expandedCheckupId === checkup.id}
                      secondaryColor={secondaryColor}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
             {/* Message if no checkups */}
             {!showAnalysis && checkups.length === 0 && !isLoading && (
                <View style={{alignItems: 'center', paddingVertical: 20}}>
                   <ThemedText style={{color: '#777', fontStyle: 'italic'}}>No check-ins logged for today yet.</ThemedText>
                </View>
             )}

            {/* Journal Input */}
            {!showAnalysis && (
              <View>
                <JournalEntryInput
                  value={localEntryText}
                  tagsValue={localTags}
                  onChangeText={handleEntryChange}
                  onChangeTags={handleTagsChange}
                  loading={isLoading}
                  fullColumnMode={fullColumnMode}
                  themeColor={themeColor}
                />
              </View>
            )}

            {/* AI Response */}
            <View style={{ flex: 1, minHeight: 0 }}>
              <ScrollView style={{ flex: 1 }}>
                <AIResponse
                  response={latestAiResponse}
                  loading={isLoading}
                  aiGenerating={journalLoading} // Assuming useJournal hook handles loading state correctly
                  fullColumnMode={fullColumnMode}
                  secondaryColor={secondaryColor}
                  entryUserId={authUserId} // Pass logged-in user ID
                />
              </ScrollView>
            </View>
            {/* Ensure no stray text/whitespace here */}
          </View>
        )}
        {/* Ensure no stray text/whitespace here */}
      </View>
      {/* Ensure no stray text/whitespace here */}
    </Card>
  );
}
