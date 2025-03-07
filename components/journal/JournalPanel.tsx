import React, { useCallback, useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, ScrollView } from 'react-native';
import { Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ui/ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
import styles from '@/app/styles/global';
import { useJournal } from '@/hooks/useJournal';
import { journalStyles } from '@/app/styles/journalStyles';
import { questStyles } from '@/app/styles/questStyles';
import { journalService, JournalEntry, CheckupEntry } from '@/services/journalService';
import { useTheme } from '@/contexts/ThemeContext';

import { JournalEntryInput } from './JournalEntryInput';
import { CheckupItem } from './CheckupItem';
import { AIResponse } from './AIResponse';
import { AIAnalysis } from './AIAnalysis';

export function JournalPanel({ themeColor, textColor, fullColumnMode = false }: { themeColor: string; textColor: string; fullColumnMode?: boolean; }) {
  const { secondaryColor } = useTheme();
  const router = useRouter();
  const { 
    currentDate, 
    getEntry, 
    getAiResponses,
    updateLocalEntry,
    refreshEntries,
    goToPreviousDay, 
    goToNextDay
  } = useJournal();
  
  const [localLoading, setLocalLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localEntry, setLocalEntry] = useState<string>('');
  const [originalEntry, setOriginalEntry] = useState<string>('');
  const [localTags, setLocalTags] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [dailyEntry, setDailyEntry] = useState<JournalEntry | null>(null);
  const [checkups, setCheckups] = useState<CheckupEntry[]>([]);
  const [hasDailyEntry, setHasDailyEntry] = useState(false);
  const [expandedCheckupId, setExpandedCheckupId] = useState<string | null>(null);

  // Format date display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  // Load current entries whenever date changes or after refresh
  useEffect(() => {
    const loadEntries = async () => {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Get daily entry first
      const dailyEntryForDate = await journalService.getEntry(dateStr);
      setDailyEntry(dailyEntryForDate);
      setHasDailyEntry(!!dailyEntryForDate);

      // Get today's checkups (both linked and unlinked)
      const todaysCheckups = await journalService.getCheckupEntries(dateStr);
      setCheckups(todaysCheckups);

      // Set current entry and responses
      setLocalEntry(''); // Start with empty entry for new checkup
      setOriginalEntry('');
      setLocalTags('');
      
      // If there's a daily entry response, use that
      if (dailyEntryForDate?.ai_response) {
        setAiResponse(dailyEntryForDate.ai_response);
      } else if (todaysCheckups.length > 0) {
        // Otherwise, if there are checkups today, use the AI response from the latest one
        const latestCheckup = todaysCheckups[todaysCheckups.length - 1];
        setAiResponse(latestCheckup.ai_checkup_response || null);
      } else {
        // Fallback to the response from useJournal if no checkups or daily entry
        const aiResponses = getAiResponses(currentDate);
        setAiResponse(aiResponses.response);
      }
      
      // Analysis should always come from daily entries
      if (dailyEntryForDate?.ai_analysis) {
        setAiAnalysis(dailyEntryForDate.ai_analysis);
      } else {
        const aiResponses = getAiResponses(currentDate);
        setAiAnalysis(aiResponses.analysis);
      }
    };

    loadEntries();
  }, [currentDate, getAiResponses]);

  // Refresh entries initially to make sure we have the latest data
  useEffect(() => {
    console.log('JournalPanel: Initial load, fetching entries...');
    refreshEntries().then(() => {
      // After refreshing, get the entry again to ensure we have the latest data
      const entry = getEntry(currentDate);
      console.log('JournalPanel: After refresh, entry length:', entry?.user_entry?.length || 0);
      setLocalEntry(entry?.user_entry || '');
      setOriginalEntry(entry?.user_entry || '');
    });
  }, []);
  
  useEffect(() => {
    // Check if getAiAnalysis is a function
    if (typeof getAiResponses !== 'function') {
      console.error('JournalPanel: getAiResponses is not a function');
    }
  }, [getAiResponses]);

  // Generate a bright accent color for cyberpunk text effect
  const getBrightAccent = (baseColor: string) => {
    // For dark colors, create a bright neon variant
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // If already bright, make it even brighter
    if (r + g + b > 500) {
      return '#FFFFFF';
    }
    
    // Otherwise create a bright neon version
    const brightR = Math.min(255, r + 100);
    const brightG = Math.min(255, g + 100);
    const brightB = Math.min(255, b + 100);
    
    return `#${brightR.toString(16).padStart(2, '0')}${
      brightG.toString(16).padStart(2, '0')}${
      brightB.toString(16).padStart(2, '0')}`;
  };
  
  const brightAccent = getBrightAccent(themeColor);

  // Handle entry text changes - remove immediate update
  const handleEntryChange = useCallback((text: string) => {
    setLocalEntry(text);
    // Removed the immediate updateLocalEntry call
  }, []);

  // Handle tags changes
  const handleTagsChange = useCallback((text: string) => {
    setLocalTags(text);
  }, []);

  // Toggle checkup expansion
  const toggleCheckupExpansion = useCallback((id: string) => {
    setExpandedCheckupId(prevId => prevId === id ? null : id);
  }, []);

  // Modified save handler to update local entries before saving and generate AI response
  // FIXED: Replace saveEntry call with saveCheckupEntry
  const handleSaveEntry = useCallback(async () => {
    if (!localEntry) return;
    
    try {
      setLocalLoading(true);
      setAiGenerating(true);
      setLocalError(null);
      
      const processedTags = localTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      updateLocalEntry(currentDate, localEntry);
      
      // Replace saveEntry with saveCheckupEntry
      const dateStr = currentDate.toISOString().split('T')[0];
      await journalService.saveCheckupEntry(dateStr, localEntry, processedTags);
      
      await refreshEntries();
      
      // Get updated entries after saving
      const todaysCheckups = await journalService.getCheckupEntries(dateStr);
      setCheckups(todaysCheckups);

      const aiResponses = getAiResponses(currentDate);
      setAiResponse(aiResponses.response);
      setAiAnalysis(aiResponses.analysis);
      
      // Update the original entry to the new version
      setOriginalEntry(localEntry);
      
    } catch (err: any) {
      console.error('JournalPanel: Error in handleSaveEntry:', err);
      setLocalError(err?.message || 'Failed to update journal entry');
    } finally {
      setLocalLoading(false);
      setAiGenerating(false);
    }
  }, [currentDate, localEntry, localTags, updateLocalEntry, refreshEntries, getAiResponses]);

  // Save a checkup entry (without linking to a daily entry yet)
  const handleSaveCheckup = useCallback(async () => {
    if (!localEntry) return;
    
    try {
      setLocalLoading(true);
      setAiGenerating(true);
      setLocalError(null);
      
      const processedTags = localTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Save to checkup_entries table with null daily_entry_id
      const dateStr = currentDate.toISOString().split('T')[0];
      const newCheckup = await journalService.saveCheckupEntry(dateStr, localEntry, processedTags);
      
      // Refresh entries
      await refreshEntries();

      // Get updated entries and set them
      const todaysCheckups = await journalService.getCheckupEntries(dateStr);
      setCheckups(todaysCheckups);

      // ONLY set the AI response from the newly created checkup, clean it first
      let cleanResponse = newCheckup.ai_checkup_response || null;
      if (cleanResponse) {
        cleanResponse = cleanResponse.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
        cleanResponse = cleanResponse.replace(/^Johnny Silverhand's response:\s*/i, ''); // Remove prefix
      }
      setAiResponse(cleanResponse);
      
      // Analysis should stay as it was or null
      setAiAnalysis(aiAnalysis);

      // Clear the form for the next checkup
      setLocalEntry('');
      setLocalTags('');
      
    } catch (err: any) {
      console.error('JournalPanel: Error in handleSaveCheckup:', err);
      setLocalError(err?.message || 'Failed to save checkup entry');
    } finally {
      setLocalLoading(false);
      setAiGenerating(false);
    }
  }, [currentDate, localEntry, localTags, refreshEntries, getAiResponses, aiAnalysis]);

  // Create a daily entry and link all unlinked checkups via foreign key
  const handleDailyEntry = useCallback(async () => {
    try {
      setLocalLoading(true);
      setAiGenerating(true);
      setLocalError(null);
      
      const dateStr = currentDate.toISOString().split('T')[0];
      // This creates a journal entry and updates the checkup_entries.daily_entry_id
      const newDailyEntry = await journalService.saveDailyEntry(dateStr);
      
      // Refresh entries
      await refreshEntries();
      
      // Update daily entry status
      setHasDailyEntry(true);
      
      const aiResponses = getAiResponses(currentDate);
      let cleanResponse = aiResponses.response;
      let cleanAnalysis = aiResponses.analysis;

      // Clean response and analysis
      if (cleanResponse) {
        cleanResponse = cleanResponse.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
        cleanResponse = cleanResponse.replace(/^johnny silverhands response:\s*/i, ''); // Remove prefix
      }
      if (cleanAnalysis) {
        cleanAnalysis = cleanAnalysis.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
        cleanAnalysis = cleanAnalysis.replace(/^johnny silverhands response:\s*/i, ''); // Remove prefix
      }
      
      setAiResponse(cleanResponse);
      setAiAnalysis(cleanAnalysis);
      
    } catch (err: any) {
      console.error('JournalPanel: Error in handleDailyEntry:', err);
      setLocalError(err?.message || 'Failed to generate daily entry');
    } finally {
      setLocalLoading(false);
      setAiGenerating(false);
    }
  }, [currentDate, refreshEntries, getAiResponses]);

  const loading = localLoading;
  const error = localError;

  return (
    <Card style={[styles.taskCard, { 
      overflow: 'hidden', 
      borderColor: themeColor, 
      borderWidth: 1, 
      borderLeftWidth: 3, 
      height: fullColumnMode ? '100%' : 'auto',
      flex: fullColumnMode ? 1 : undefined, // Changed 'auto' to undefined
      marginTop: fullColumnMode ? 0 : 20,
    }]}>
      {/* Background with subtle gradient effect */}
      <View style={{ 
        position: 'absolute', 
        width: '100%', 
        height: '100%',
        backgroundColor: '#151515',
        borderLeftColor: themeColor,
        borderLeftWidth: 3,
      }} />
      
      {/* Create cyberpunk-style overlay effect - more performance-friendly */}
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.07,
        height: '100%',
      }}>
        {/* Horizontal lines */}
        <View style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: '100%',
          width: '100%',
          backgroundColor: 'transparent',
          borderStyle: 'dotted',
          borderTopWidth: 1,
          borderBottomWidth: 0,
          borderLeftWidth: 0,
          borderRightWidth: 0,
          borderColor: 'rgba(255,255,255,0.1)',
          borderRadius: 1
        }} />
        
        {/* Digital noise effect */}
        <View style={{
          position: 'absolute',
          top: 0,
          height: '100%',
          width: 60,
          right: 20,
          opacity: 0.05,
          backgroundColor: themeColor,
        }} />
      </View>

      {/* Glitch line - very cyberpunk */}
      <View style={{
        position: 'absolute',
        top: '30%',
        left: -10,
        width: '120%',
        height: 2,
        backgroundColor: themeColor,
        opacity: 0.15,
        transform: [{ rotate: '-1deg' }],
      }} />

      <View style={[journalStyles.journalHeader, { padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
        <TouchableOpacity 
          style={{ 
            padding: 8, 
            borderRadius: 4, 
            backgroundColor: 'rgba(20, 20, 20, 0.7)'
          }}
          onPress={goToPreviousDay}
        >
          <MaterialIcons name="chevron-left" size={24} color={brightAccent} />
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedText style={[questStyles.mainQuestTitle, { 
            fontSize: 20,
            color: '#FFFFFF',
            textShadowColor: themeColor,
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 5
          }]}>
            TODAY'S JOURNAL
          </ThemedText>
          <View style={{
            height: 3,
            width: 20,
            backgroundColor: themeColor,
            marginLeft: 8,
            borderRadius: 2,
          }} />
          <TouchableOpacity 
            onPress={() => router.push('/journal')}
            style={[journalStyles.newEntryButton, { 
              backgroundColor: 'rgba(30, 30, 30, 0.9)',
              borderWidth: 1,
              borderColor: themeColor,
              marginLeft: 12,
              paddingVertical: 5,
              paddingHorizontal: 8,
            }]}
          >
            <MaterialIcons name="launch" size={16} color={brightAccent} />
          </TouchableOpacity>
        </View>
        
        <View style={journalStyles.journalHeaderRight}>
          <View style={{ flexDirection: 'column', gap: 8, marginRight: 10 }}>
            <TouchableOpacity 
              style={[journalStyles.updateButton, { 
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                borderWidth: 1,
                borderColor: themeColor,
                paddingVertical: 6,
                shadowColor: themeColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 5,
                elevation: 5,
                minWidth: 140 // Added minimum width to keep buttons same size
              }]}
              onPress={handleSaveCheckup}
              disabled={loading || !localEntry.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color={brightAccent} />
              ) : (
                <ThemedText style={[journalStyles.updateButtonText, { 
                  color: brightAccent,
                  fontWeight: 'bold',
                  textShadowColor: themeColor,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 4
                }]}>
                  SAVE CHECKUP
                </ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[journalStyles.updateButton, { 
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                borderWidth: 1,
                borderColor: secondaryColor,
                paddingVertical: 6,
                shadowColor: secondaryColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 5,
                elevation: 5,
                opacity: hasDailyEntry ? 0.5 : 1,
                minWidth: 140 // Added minimum width to keep buttons same size
              }]}
              onPress={handleDailyEntry}
              disabled={loading || hasDailyEntry || checkups.length === 0}
            >
              <ThemedText style={[journalStyles.updateButtonText, { 
                color: secondaryColor,
                fontWeight: 'bold',
                textShadowColor: secondaryColor,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 4
              }]}>
                SAVE DAILY ENTRY
              </ThemedText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={{ 
              padding: 8, 
              borderRadius: 4, 
              backgroundColor: 'rgba(20, 20, 20, 0.7)'
            }}
            onPress={goToNextDay}
          >
            <MaterialIcons name="chevron-right" size={24} color={brightAccent} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ 
        flex: 1, 
        padding: 15, 
        flexDirection: 'column' 
      }}>
        <ThemedText style={[styles.cardDetails, { 
          paddingLeft: 15,
          paddingBottom: 10,
          borderLeftWidth: 3,
          borderLeftColor: 'rgba(255, 255, 255, 0.1)',
          marginLeft: 15,
          fontSize: 14,
          color: '#AAA',
        }]}>
          {formattedDate}
          {checkups.length > 0 && (
            <Text style={{ color: '#888' }}> • {checkups.length} checkup{checkups.length !== 1 ? 's' : ''} today</Text>
          )}
        </ThemedText>
        
        {error ? (
          <View style={{ 
            margin: 15,
            padding: 10, 
            backgroundColor: 'rgba(200, 0, 0, 0.1)', 
            borderRadius: 5,
            borderLeftWidth: 2,
            borderLeftColor: '#D81159',
          }}>
            <ThemedText style={[styles.errorText, { color: '#FF6B6B' }]}>
              {error}. <Text style={{textDecorationLine: 'underline', color: '#FF6B6B'}} onPress={() => { setLocalError(null); refreshEntries(); }}>Try again</Text>
            </ThemedText>
          </View>
        ) : (
          <View style={{ 
            flex: 1, 
            flexDirection: 'column', 
            gap: 10,
            height: '100%',
          }}>
            {/* Today's checkups list */}
            {checkups.length > 0 && (
              <View style={{ maxHeight: 250 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <MaterialIcons name="history" size={16} color={themeColor} style={{ marginRight: 6 }} />
                  <Text style={{ color: themeColor, fontWeight: 'bold', fontSize: 14 }}>TODAY'S CHECKUPS</Text>
                </View>
                <ScrollView style={{ maxHeight: 210 }}>
                  {checkups.map((checkup) => (
                    <CheckupItem 
                      key={checkup.id}
                      checkup={checkup}
                      themeColor={themeColor}
                      onPress={() => toggleCheckupExpansion(checkup.id)}
                      isExpanded={expandedCheckupId === checkup.id}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Each section gets appropriate vertical space */}
            <View style={{ flex: 1 }}>
              <JournalEntryInput
                value={localEntry}
                tagsValue={localTags}
                onChangeText={handleEntryChange}
                onChangeTags={handleTagsChange}
                loading={loading}
                fullColumnMode={fullColumnMode}
                themeColor={themeColor}
              />
            </View>
            
            <View style={{ flex: 1 }}>
              <AIResponse
                response={aiResponse}
                loading={loading}
                aiGenerating={aiGenerating} // Pass the new AI generation state
                fullColumnMode={fullColumnMode}
                secondaryColor={secondaryColor}
              />
            </View>
            
            <View style={{ flex: 1 }}>
              <AIAnalysis
                analysis={aiAnalysis}
                loading={loading}
                fullColumnMode={fullColumnMode}
                themeColor={themeColor}
              />
            </View>
          </View>
        )}
      </View>
    </Card>
  );
}
