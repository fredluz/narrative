import React from 'react';
import { View, Text } from 'react-native';
import TriangularSpinner from '../loading/TriangularSpinner';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView } from 'react-native-gesture-handler';

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
    <View style={{
      flex: 1,
      backgroundColor: '#252525',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#333333',
    }}>
      {/* Content */}
      <View style={{ 
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
          <Text style={{ 
            color: secondaryColor,
            fontSize: 15,
            lineHeight: 22,
            opacity: 0.9,
            letterSpacing: 0.2
          }}>
            {response}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
