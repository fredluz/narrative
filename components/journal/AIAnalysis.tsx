import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk

interface AIAnalysisProps {
  analysis: string | null;
  loading: boolean;
  fullColumnMode?: boolean;
  themeColor: string;
  expanded?: boolean;
  quests?: Array<{ id: string; title: string; user_id: string; }>;
  onCreateTask?: (taskData: any) => Promise<void>;
  entryUserId?: string; // Add this to verify ownership
}

export function AIAnalysis({ 
  analysis, 
  loading,
  entryUserId,
  fullColumnMode,
  themeColor,
  expanded = false,
  quests = [],
  onCreateTask
}: AIAnalysisProps) {
  const { userId: authUserId } = useAuth(); // Get logged-in user's ID
  const { secondaryColor } = useTheme();

  // Perform ownership check directly using Clerk's authUserId and the entryUserId prop
  const isOwner = React.useMemo(() => {
    // User must be logged in (authUserId exists) AND their ID must match the entry's user ID
    return !!authUserId && !!entryUserId && authUserId === entryUserId;
  }, [authUserId, entryUserId]);

  const handleCreateTask = React.useCallback(async (taskData: any) => {
    // Use authUserId for check
    if (!authUserId) {
      console.warn("Cannot create task: User not logged in (Clerk)");
      return;
    }

    // Use isOwner for permission check
    if (!isOwner) {
      console.error("Cannot create task: User does not own this entry");
      return;
    }

    if (onCreateTask) {
      await onCreateTask({
        ...taskData,
        user_id: authUserId // Use Clerk userId
      });
    }
  }, [onCreateTask, authUserId, isOwner]); // Depend on Clerk userId and ownership status

  // If the logged-in user is not the owner, display an unauthorized message
  if (!isOwner) {
    // Define a simple message for unauthorized access
    const message = "You do not have permission to view this analysis.";
    return (
      <View style={{ 
        backgroundColor: 'rgba(15, 15, 15, 0.8)',
        borderRadius: 5,
        borderLeftWidth: 3,
        borderColor: themeColor,
        padding: 10
      }}>
        <ThemedText style={{ color: '#666', fontStyle: 'italic' }}>
          {message}
        </ThemedText>
      </View>
    );
  }

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
