import React from 'react';
import { View, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';

interface AIAnalysisProps {
  analysis: string | null;
  loading: boolean;
  fullColumnMode?: boolean;
  themeColor: string;
}

export const AIAnalysis: React.FC<AIAnalysisProps> = ({
  analysis,
  loading,
  fullColumnMode,
  themeColor
}) => (
  <View style={{
    flex: 1,
    backgroundColor: 'rgba(15, 15, 15, 0.8)',
    borderRadius: 5,
    borderLeftWidth: 3,
    borderColor: themeColor,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  }}>
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center',
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    }}>
      <MaterialIcons 
        name="analytics" 
        size={20} 
        color={themeColor} 
        style={{ marginRight: 8 }} 
      />
      <ThemedText style={{
        fontSize: 16,
        fontWeight: 'bold',
        color: themeColor,
      }}>
        STRATEGIC ANALYSIS
      </ThemedText>
    </View>
    
    <ScrollView style={{ flex: 1, padding: 10 }}>
      <ThemedText style={{
        fontSize: fullColumnMode ? 18 : 15,
        color: '#BBB',
        fontStyle: 'normal',
        lineHeight: 22,
      }}>
        {loading ? "Analyzing patterns..." : (analysis || "Awaiting data for analysis.")}
      </ThemedText>
    </ScrollView>
  </View>
);
