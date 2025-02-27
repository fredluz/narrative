import React, { useCallback, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';
import { MaterialIcons } from '@expo/vector-icons';
import styles from '@/app/styles/global';
import { useJournal } from '@/hooks/useJournal';
import { journalStyles } from '@/app/styles/journalStyles';
import { questStyles } from '@/app/styles/questStyles';
import { journalService } from '@/services/journalService';

interface Props {
  themeColor: string;
  textColor: string;
}

export function JournalPanel({ themeColor, textColor }: Props) {
  const router = useRouter();
  const { 
    currentDate, 
    getEntry, 
    getAiAnalysis,
    updateLocalEntry,
    refreshEntries,
    goToPreviousDay, 
    goToNextDay
  } = useJournal();
  
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  const entry = getEntry(currentDate);
  const aiAnalysis = getAiAnalysis(currentDate);

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

  // Directly use journalService instead of going through the useJournal hook
  const handleSaveEntry = useCallback(async () => {
    try {
      setLocalLoading(true);
      setLocalError(null);
      console.log('JournalPanel: Save button clicked');
      
      // Format the date as YYYY-MM-DD
      const dateString = currentDate.toISOString().split('T')[0];
      console.log('JournalPanel: Saving entry for date:', dateString);
      
      // Directly call the journalService
      await journalService.saveEntry(dateString, entry);
      console.log('JournalPanel: Save successful');
      
      // Refresh the entries list
      refreshEntries();
    } catch (err: any) {
      console.error('JournalPanel: Error in handleSaveEntry:', err);
      setLocalError(err?.message || 'Failed to update journal entry');
    } finally {
      setLocalLoading(false);
    }
  }, [currentDate, entry, refreshEntries]);

  const loading = localLoading;
  const error = localError;

  return (
    <Card style={[styles.taskCard, { overflow: 'hidden', borderColor: themeColor, borderWidth: 1, borderLeftWidth: 3, marginTop: 20 }]}>
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
              // Add subtle glow effect
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

      <ThemedText style={[styles.cardDetails, { 
        paddingLeft: 15,
        paddingTop: 10,
        paddingBottom: 5,
        borderLeftWidth: 3,
        borderLeftColor: 'rgba(255, 255, 255, 0.1)',
        marginLeft: 15,
        fontSize: 12,
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
          <TextInput
            style={[styles.chatInput, { 
              height: 100, 
              margin: 15,
              marginTop: 5,
              color: '#F0F0F0',
              backgroundColor: 'rgba(20, 20, 20, 0.7)',
              opacity: loading ? 0.7 : 1,
              borderLeftWidth: 2,
              borderLeftColor: themeColor,
              borderRadius: 4,
              padding: 12,
            }]}
            multiline
            value={entry}
            onChangeText={(text) => {
              updateLocalEntry(currentDate, text);
            }}
            placeholder="How's your day going, samurai?"
            placeholderTextColor="#666"
            editable={!loading}
            blurOnSubmit={false}
          />

          <ThemedText style={[journalStyles.aiEntryText, {
            margin: 15,
            marginTop: 0,
            borderColor: secondaryColor,
            backgroundColor: 'rgba(12, 12, 15, 0.8)',
            color: '#DDD',
            // Add subtle text effect
            textShadowColor: secondaryColor,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 3
          }]}>
            [SILVERHAND]: {aiAnalysis || "Keep typing, choom. Your story's writing itself."}
          </ThemedText>
        </>
      )}
    </Card>
  );
}
