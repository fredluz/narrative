import React from 'react';
import { View, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import TriangularSpinner from '@/components/loading/TriangularSpinner';
import { useSupabase } from '@/contexts/SupabaseContext';

interface AIResponseProps {
  response: string | null;
  loading: boolean;
  aiGenerating: boolean;
  fullColumnMode?: boolean;
  secondaryColor: string;
  entryUserId?: string; // Add this to verify ownership
}

export const AIResponse: React.FC<AIResponseProps> = ({
  response,
  loading,
  aiGenerating,
  fullColumnMode,
  secondaryColor,
  entryUserId
}) => {
  const { session } = useSupabase();

  // Add ownership verification
  const canAccessResponse = React.useMemo(() => {
    if (!session?.user?.id || !entryUserId) return false;
    return session.user.id === entryUserId;
  }, [session?.user?.id, entryUserId]);

  if (!canAccessResponse) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(15, 15, 15, 0.8)',
        borderRadius: 5,
        borderLeftWidth: 3,
        borderColor: secondaryColor,
        padding: 10,
      }}>
        <ThemedText style={{ color: '#666', fontStyle: 'italic' }}>
          You don't have permission to view this response.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={{
      flex: 1,
      backgroundColor: 'rgba(15, 15, 15, 0.8)',
      borderRadius: 5,
      borderLeftWidth: 3,
      borderColor: secondaryColor,
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
          name="psychology" 
          size={20} 
          color={secondaryColor} 
          style={{ marginRight: 8 }} 
        />
        <View>
          <ThemedText style={{
            fontSize: 16,
            fontWeight: 'bold',
            color: secondaryColor,
          }}>
            SILVERHAND
          </ThemedText>
        </View>
        {aiGenerating && <TriangularSpinner size={20} color={secondaryColor} />}
      </View>
      
      <ScrollView style={{ flex: 1, padding: 10 }}>
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
      </ScrollView>
    </View>
  );
};
