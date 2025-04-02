import React from 'react';
// Import ScrollView from react-native, not gesture-handler for this basic use case
import { View, Text, ScrollView } from 'react-native'; 
import TriangularSpinner from '../loading/TriangularSpinner';
import { MaterialIcons } from '@expo/vector-icons';

interface AIResponseProps {
  response: string | null;
  loading: boolean;
  aiGenerating: boolean;
  fullColumnMode?: boolean;
  secondaryColor: string;
  entryUserId?: string;
}

export function AIResponse({ 
  response, 
  loading, 
  aiGenerating, 
  fullColumnMode = false,
  secondaryColor,
  entryUserId 
}: AIResponseProps) {

  if (!response && !loading && !aiGenerating) {
    return null;
  }

  return (
    // Main container: Limit height, remove flex: 1, add overflow hidden
    <View style={{ 
      maxHeight: '33%', 
      backgroundColor: '#252525',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#333333',
      overflow: 'hidden', // Keep content within bounds
    }}>
      {/* Inner content container: Add flex: 1 to fill the limited height */}
      <View style={{ 
        flex: 1, // Allow this view to fill the maxHeight
        padding: 12,
        backgroundColor: 'rgba(15, 15, 15, 0.8)',
        borderLeftWidth: 3,
        borderLeftColor: secondaryColor
      }}>
        {(loading || aiGenerating) ? (
          <View style={{ 
            flexDirection: 'row',
            alignItems: 'center',
            opacity: 0.8
          }}>
            <TriangularSpinner size={12} color={secondaryColor} />
            <Text style={{ 
              marginLeft: 8,
              color: '#AAAAAA',
              fontSize: 12,
              fontWeight: '500'
            }}>
              Processing...
            </Text>
          </View>
        ) : response ? (
          // Wrap response Text in a ScrollView
          <ScrollView style={{ flex: 1 }}> 
            <Text style={{ 
              color: secondaryColor,
              fontSize: 15,
              lineHeight: 22,
            opacity: 0.9,
            letterSpacing: 0.2
          }}>
              {response}
            </Text>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}
