import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface AIAnalysisProps {
  response: string | null;
  loading: boolean;
  aiGenerating: boolean;
  secondaryColor: string;
}

export function AIAnalysis({ 
  response, 
  loading, 
  aiGenerating,
  secondaryColor
}: AIAnalysisProps) {

  if (!response && !loading && !aiGenerating) {
    return (
      <View style={{
        backgroundColor: '#252525',
        borderRadius: 6,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333333',
      }}>
        <MaterialIcons name="analytics" size={30} color="#444444" />
        <Text style={{ color: '#AAAAAA', marginTop: 10, fontSize: 14 }}>
          No analysis available
        </Text>
      </View>
    );
  }

  return (
    <View style={{
      backgroundColor: '#252525',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#333333',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333333',
        backgroundColor: '#2A2A2A',
      }}>
        <MaterialIcons 
          name="analytics" 
          size={16} 
          color={secondaryColor}
          style={{ marginRight: 8 }} 
        />
        <Text style={{ 
          color: '#EEEEEE',
          fontSize: 14,
          fontWeight: '600',
        }}>
          JOURNAL ANALYSIS
        </Text>
      </View>

      {/* Content */}
      <View style={{ padding: 15 }}>
        {(loading || aiGenerating) ? (
          <View style={{ 
            padding: 20,
            alignItems: 'center'
          }}>
            <MaterialIcons 
              name="hourglass-empty" 
              size={24} 
              color={secondaryColor}
              style={{ marginBottom: 8 }}
            />
            <Text style={{ 
              color: '#AAAAAA',
              fontSize: 14
            }}>
              Analyzing journal entries...
            </Text>
          </View>
        ) : response ? (
          <Text style={{ 
            color: '#BBBBBB',
            fontSize: 14,
            lineHeight: 20
          }}>
            {response}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
