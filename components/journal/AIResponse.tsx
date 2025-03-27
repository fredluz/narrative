import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import TriangularSpinner from '@/components/loading/TriangularSpinner';
import { useSupabase } from '@/contexts/SupabaseContext';
import { requireOwnership } from '@/utils/auth';
import { personalityService } from '@/services/personalityService';

interface AIResponseProps {
  response: string | null;
  loading: boolean;
  aiGenerating: boolean;
  fullColumnMode?: boolean;
  secondaryColor: string;
  entryUserId?: string;
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
  const [personalityName, setPersonalityName] = useState('SILVERHAND');
  
  useEffect(() => {
    if (session?.user?.id) {
      personalityService.getUserPersonality(session.user.id)
        .then(personality => {
          // Convert personality type to display name
          switch(personality) {
            case 'bt7274':
              setPersonalityName('BT');
              break;
            case 'johnny':
              setPersonalityName('SILVERHAND');
              break;
            case 'batman':
              setPersonalityName('BATMAN');
              break;
            
          }
        })
        .catch(error => {
          console.error('Error getting personality:', error);
          setPersonalityName('SILVERHAND'); // Fallback to default
        });
    }
  }, [session?.user?.id]);
  
  const { allowed, message } = React.useMemo(() => 
    requireOwnership(session, entryUserId),
    [session, entryUserId]
  );

  if (!allowed) {
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
          {message}
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
            {personalityName}
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
