import React, { useCallback, useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ThemedText } from './ThemedText';
import { MaterialIcons } from '@expo/vector-icons';
import styles from '@/app/styles/global';
import { useJournal } from '@/hooks/useJournal';
import { journalStyles } from '@/app/styles/journalStyles';
import { questStyles } from '@/app/styles/questStyles';
import { journalService, JournalEntry } from '@/services/journalService';
import { useTheme } from '@/contexts/ThemeContext';

interface JournalPanelProps {
  themeColor: string;
  textColor: string;
  fullColumnMode?: boolean; // Add new prop to indicate full column mode
}

export function JournalPanel({ themeColor, textColor, fullColumnMode = false }: JournalPanelProps) {
  const { secondaryColor } = useTheme();
  const router = useRouter();
  const { 
    currentDate, 
    getEntry, 
    getAiAnalysis,
    updateLocalEntry,
    saveEntry,
    refreshEntries,
    goToPreviousDay, 
    goToNextDay
  } = useJournal();
  
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localEntry, setLocalEntry] = useState<string>('');
  const [originalEntry, setOriginalEntry] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiAnalysisAvailable, setAiAnalysisAvailable] = useState(true);

  // Format date display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  // Load current entry whenever date changes or after refresh
  useEffect(() => {
    const entry = getEntry(currentDate);
    console.log('JournalPanel: Loading entry for date:', currentDate.toISOString().split('T')[0], 'Entry length:', entry?.length || 0);
    setLocalEntry(entry);
    setOriginalEntry(entry); // Store the original entry for comparison
  }, [currentDate, getEntry]);

  // Refresh entries initially to make sure we have the latest data
  useEffect(() => {
    console.log('JournalPanel: Initial load, fetching entries...');
    refreshEntries().then(() => {
      // After refreshing, get the entry again to ensure we have the latest data
      const entry = getEntry(currentDate);
      console.log('JournalPanel: After refresh, entry length:', entry?.length || 0);
      setLocalEntry(entry);
      setOriginalEntry(entry);
    });
  }, []);
  
  useEffect(() => {
    // Check if getAiAnalysis is a function
    if (typeof getAiAnalysis !== 'function') {
      console.error('JournalPanel: getAiAnalysis is not a function');
      setAiAnalysisAvailable(false);
    }
  }, [getAiAnalysis]);

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

  // Generate AI response based on changes between original and updated entry
  const generateAiResponse = useCallback(async (originalText: string, updatedText: string) => {
    if (originalText === updatedText) {
      setAiResponse("No changes detected in today's entry.");
      return;
    }

    try {
      // Simulate an API call for AI response generation
      // In a real app, you would send originalText and updatedText to your backend
      setAiResponse("Analyzing your journal update...");
      
      // Simulate delay for API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Example response - in a real app this would come from your API/backend
      const responses = [
        "I notice you're focusing more on your long-term goals today. That's a positive shift from yesterday's entry.",
        "You seem to be in a more reflective mood today. Take the time you need to process your thoughts.",
        "Your progress is notable. Each step forward, no matter how small, is still progress worth celebrating.",
        "I see you're concerned about that upcoming deadline. Remember to break it down into manageable tasks.",
        "There's a more optimistic tone in your writing today - keep nurturing that perspective."
      ];
      
      // Randomly select a response
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setAiResponse(randomResponse);
      
    } catch (err) {
      console.error('Failed to generate AI response:', err);
      setAiResponse("I couldn't analyze your journal update at this time.");
    }
  }, []);

  // Modified save handler to update local entries before saving and generate AI response
  const handleSaveEntry = useCallback(async () => {
    if (!localEntry) return;
    
    try {
      setLocalLoading(true);
      setLocalError(null);
      
      // Update local entries right before saving
      updateLocalEntry(currentDate, localEntry);
      
      // First save the entry
      await journalService.saveEntry(
        currentDate.toISOString().split('T')[0],
        localEntry,
        'Journal Entry' // Can add title support later if needed
      );
      
      // Then refresh the entries list
      await refreshEntries();

      // Generate AI response based on the changes
      await generateAiResponse(originalEntry, localEntry);
      
      // Update the original entry to the new version
      setOriginalEntry(localEntry);
      
    } catch (err: any) {
      console.error('JournalPanel: Error in handleSaveEntry:', err);
      setLocalError(err?.message || 'Failed to update journal entry');
    } finally {
      setLocalLoading(false);
    }
  }, [currentDate, localEntry, originalEntry, updateLocalEntry, refreshEntries, generateAiResponse]);

  // Safely get AI analysis with error handling
  const getSafeAiAnalysis = useCallback((date: Date): string | null => {
    if (!aiAnalysisAvailable) return null;
    
    try {
      return getAiAnalysis(date);
    } catch (err) {
      console.error('Error getting AI analysis:', err);
      return null;
    }
  }, [getAiAnalysis, aiAnalysisAvailable]);

  const loading = localLoading;
  const error = localError;
  const aiAnalysis = getSafeAiAnalysis(currentDate);

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
          <TouchableOpacity 
            style={[journalStyles.updateButton, { 
              backgroundColor: 'rgba(30, 30, 30, 0.9)',
              borderWidth: 1,
              borderColor: themeColor,
              marginRight: 10,
              paddingVertical: 6,
              shadowColor: themeColor,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 5,
              elevation: 5
            }]}
            onPress={handleSaveEntry}
            disabled={loading}
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
                UPDATE
              </ThemedText>
            )}
          </TouchableOpacity>
          
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <ThemedText style={[styles.cardDetails, { 
          paddingLeft: 15,
          paddingTop: 10,
          paddingBottom: 5,
          borderLeftWidth: 3,
          borderLeftColor: 'rgba(255, 255, 255, 0.1)',
          marginLeft: 15,
          fontSize: 14,
          color: '#AAA',
        }]}>
          {formattedDate}
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
          <>
            <View style={{
              margin: 15,
              marginTop: 5,
              backgroundColor: 'rgba(20, 20, 20, 0.9)',
              borderWidth: 1,
              borderColor: themeColor,
              borderLeftWidth: 2,
              borderLeftColor: themeColor,
              borderRadius: 4,
              padding: 0, // Remove padding that might affect input visibility
              position: 'relative', // Ensure proper stacking context
            }}>
              <TextInput
                style={{
                  height: fullColumnMode ? 200 : 100, // Increase height in full column mode
                  color: '#FFFFFF',
                  padding: 12,
                  fontSize: fullColumnMode ? 18 : 16, // Larger font in full column mode
                  fontWeight: 'normal',
                  textAlignVertical: 'top',
                }}
                multiline={true}
                value={localEntry}
                onChangeText={handleEntryChange}
                placeholder="How's your day going, samurai?"
                placeholderTextColor="#666"
                editable={!loading}
                key={`journal-input-${currentDate.toISOString().split('T')[0]}`}
              />
            </View>

            {/* AI response section - more prominent in full column mode */}
            <View style={{
              margin: 15,
              marginTop: 5,
              marginBottom: 15,
              padding: 15,
              backgroundColor: 'rgba(15, 15, 15, 0.8)',
              borderRadius: 5,
              borderLeftWidth: 3,
              borderColor: secondaryColor,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialIcons 
                  name="psychology" 
                  size={20} 
                  color={secondaryColor} 
                  style={{ marginRight: 8 }} 
                />
                <Text style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: secondaryColor,
                }}>
                  SILVERHAND
                </Text>
              </View>
              
              <ThemedText style={{
                fontSize: fullColumnMode ? 18 : 15,
                color: '#BBB',
                fontStyle: 'italic',
                textShadowColor: secondaryColor,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 3
              }}>
                {loading ? "Thinking..." : (aiResponse || aiAnalysis || "Keep typing, choom. Your story's writing itself.")}
              </ThemedText>
            </View>
            
            {/* Removed the patterns & insights section */}
          </>
        )}
      </ScrollView>
    </Card>
  );
}
