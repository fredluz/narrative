import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { TaskRecommendation } from './TaskRecommendation';
import { TaskRecommendationParser } from '@/services/TaskRecommendationParser';
import { useTheme } from '@/contexts/ThemeContext';

interface AIAnalysisProps {
  analysis: string | null;
  loading: boolean;
  fullColumnMode?: boolean;
  themeColor: string;
  expanded?: boolean;
  quests?: Array<{ id: string; title: string; }>;
  onCreateTask?: (taskData: any) => Promise<void>;
}

export function AIAnalysis({ 
  analysis, 
  loading, 
  fullColumnMode,
  themeColor,
  expanded = false,
  quests = [],
  onCreateTask
}: AIAnalysisProps) {
  const { secondaryColor } = useTheme();
  const recommendations = React.useMemo(() => {
    if (!analysis) return [];
    return TaskRecommendationParser.parseAnalysis(analysis);
  }, [analysis]);

  return (
    <View style={{ 
      backgroundColor: 'rgba(15, 15, 15, 0.8)',
      borderRadius: 5,
      borderLeftWidth: 3,
      borderColor: themeColor,
      flex: expanded ? 2 : 1,
      maxHeight: expanded ? undefined : 200
    }}>
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      }}>
        <MaterialIcons 
          name={expanded ? "analytics" : "insights"} 
          size={16} 
          color={themeColor}
          style={{ marginRight: 8 }} 
        />
        <ThemedText style={{
          fontSize: expanded ? 16 : 14,
          fontWeight: 'bold',
          color: themeColor,
        }}>
          {expanded ? 'DETAILED ANALYSIS' : 'DAILY INSIGHT'}
        </ThemedText>
      </View>
      
      <ScrollView style={{ 
        padding: 10,
        maxHeight: expanded ? undefined : 150
      }}>
        {loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={themeColor} />
          </View>
        ) : analysis ? (
          <>
            <ThemedText style={{
              fontSize: expanded ? 16 : 14,
              color: '#E0E0E0',
              lineHeight: expanded ? 24 : 20,
              fontStyle: 'italic',
              textShadowColor: themeColor,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: expanded ? 4 : 2
            }}>
              {analysis}
            </ThemedText>

            {expanded && recommendations.length > 0 && onCreateTask && (
              <TaskRecommendation
                recommendations={recommendations}
                themeColor={themeColor}
                secondaryColor={secondaryColor}
                quests={quests}
                onCreateTask={onCreateTask}
              />
            )}
          </>
        ) : (
          <ThemedText style={{ color: '#666', fontStyle: 'italic' }}>
            No analysis available yet. Complete your daily entry to receive insights.
          </ThemedText>
        )}
      </ScrollView>
    </View>
  );
}
