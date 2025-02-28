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

// JournalEntry component for user input
const JournalEntryInput: React.FC<{
  value: string;
  tagsValue: string;
  onChangeText: (text: string) => void;
  onChangeTags: (text: string) => void;
  loading: boolean;
  fullColumnMode?: boolean;
  themeColor: string;
}> = ({ value, tagsValue, onChangeText, onChangeTags, loading, fullColumnMode, themeColor }) => (
  <View style={{ flex: 4, display: 'flex', flexDirection: 'column' }}>
    {/* Main text input */}
    <TextInput
      style={{
        flex: 1,
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
        borderWidth: 1,
        borderColor: themeColor,
        borderLeftWidth: 2,
        borderLeftColor: themeColor,
        borderRadius: 4,
        marginBottom: 5,
        color: '#FFFFFF',
        padding: 12,
        fontSize: fullColumnMode ? 18 : 16,
        fontWeight: 'normal',
        textAlignVertical: 'top',
        minHeight: fullColumnMode ? 260 : 160,
      }}
      multiline={true}
      value={value}
      onChangeText={onChangeText}
      placeholder="How's your day going, samurai?"
      placeholderTextColor="#666"
      editable={!loading}
    />
    
    {/* Tags input */}
    <TextInput
      style={{
        height: 40,
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
        borderWidth: 1,
        borderColor: themeColor,
        borderLeftWidth: 2,
        borderLeftColor: themeColor,
        borderRadius: 4,
        color: '#FFFFFF',
        padding: 12,
        fontSize: 14,
        fontWeight: 'normal',
      }}
      value={tagsValue}
      onChangeText={onChangeTags}
      placeholder="Add tags (comma separated) e.g. work, meeting, idea"
      placeholderTextColor="#666"
      editable={!loading}
    />
  </View>
);

// AIResponse component for Johnny's in-character response
const AIResponse: React.FC<{
  response: string | null;
  loading: boolean;
  fullColumnMode?: boolean;
  secondaryColor: string;
}> = ({ response, loading, fullColumnMode, secondaryColor }) => (
  <View style={{
    flex: 0.8,
    backgroundColor: 'rgba(15, 15, 15, 0.8)',
    borderRadius: 5,
    borderLeftWidth: 3,
    borderColor: secondaryColor,
    padding: 15,
    marginTop: 10,
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
      {loading ? "Thinking..." : (response || "Keep typing, choom. Your story's writing itself.")}
    </ThemedText>
  </View>
);

// AIAnalysis component for logical analysis
const AIAnalysis: React.FC<{
  analysis: string | null;
  loading: boolean;
  fullColumnMode?: boolean;
  themeColor: string;
}> = ({ analysis, loading, fullColumnMode, themeColor }) => (
  <View style={{
    flex: 0.8,
    backgroundColor: 'rgba(15, 15, 15, 0.8)',
    borderRadius: 5,
    borderLeftWidth: 3,
    borderColor: themeColor,
    padding: 15,
    marginTop: 10,
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <MaterialIcons 
        name="analytics" 
        size={20} 
        color={themeColor} 
        style={{ marginRight: 8 }} 
      />
      <Text style={{
        fontSize: 16,
        fontWeight: 'bold',
        color: themeColor,
      }}>
        STRATEGIC ANALYSIS
      </Text>
    </View>
    
    <ThemedText style={{
      fontSize: fullColumnMode ? 18 : 15,
      color: '#BBB',
      fontStyle: 'normal',
      lineHeight: 22,
    }}>
      {loading ? "Analyzing patterns..." : (analysis || "Awaiting data for analysis.")}
    </ThemedText>
  </View>
);

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
    getAiResponses,
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
  const [localTags, setLocalTags] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Format date display
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  // Load current entry whenever date changes or after refresh
  useEffect(() => {
    const entry = getEntry(currentDate);
    const aiResponses = getAiResponses(currentDate);
    
    setLocalEntry(entry?.user_entry || '');
    setOriginalEntry(entry?.user_entry || '');
    setLocalTags(entry?.tags?.join(', ') || '');
    setAiResponse(aiResponses.response);
    setAiAnalysis(aiResponses.analysis);
  }, [currentDate, getEntry, getAiResponses]);

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

  // Modified save handler to update local entries before saving and generate AI response
  const handleSaveEntry = useCallback(async () => {
    if (!localEntry) return;
    
    try {
      setLocalLoading(true);
      setLocalError(null);
      
      // Process tags - split by commas and trim whitespace
      const processedTags = localTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Update local entries right before saving
      updateLocalEntry(currentDate, localEntry);
      
      // First save the entry with tags
      await journalService.saveEntry(
        currentDate.toISOString().split('T')[0],
        localEntry,
        'Journal Entry',
        processedTags
      );
      
      // Then refresh the entries list
      await refreshEntries();

      // The AI responses will be updated by the saveEntry function
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
    }
  }, [currentDate, localEntry, localTags, updateLocalEntry, refreshEntries, getAiResponses]);

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

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          flexGrow: 1,
          padding: 15,
        }}
      >
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
          <View style={{ flex: 1, flexDirection: 'column', gap: 10 }}>
            <JournalEntryInput
              value={localEntry}
              tagsValue={localTags}
              onChangeText={handleEntryChange}
              onChangeTags={handleTagsChange}
              loading={loading}
              fullColumnMode={fullColumnMode}
              themeColor={themeColor}
            />
            
            <AIResponse
              response={aiResponse}
              loading={loading}
              fullColumnMode={fullColumnMode}
              secondaryColor={secondaryColor}
            />
            
            <AIAnalysis
              analysis={aiAnalysis}
              loading={loading}
              fullColumnMode={fullColumnMode}
              themeColor={themeColor}
            />
          </View>
        )}
      </ScrollView>
    </Card>
  );
}
