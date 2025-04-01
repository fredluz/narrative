import React, { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import TriangularSpinner from '@/components/loading/TriangularSpinner';
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk
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
  entryUserId // This is the ID of the user who wrote the journal entry
}) => {
  const { userId: authUserId } = useAuth(); // Get the currently logged-in user's ID
  const [personalityName, setPersonalityName] = useState('');

  // Fetch personality based on the logged-in user's ID
  useEffect(() => {
    if (authUserId) {
      personalityService.getUserPersonality(authUserId)
        .then(personality => {
          switch(personality) {
            case 'johnny':
              setPersonalityName('SILVERHAND');
              break;
            case 'batman':
              setPersonalityName('BRUCE');
              break;
            case 'bt7274':
              setPersonalityName('TITAN');
              break;
            case 'bigBoss':
              setPersonalityName('BOSS');
              break;
            default:
              setPersonalityName('ASSISTANT');
          }
        })
        .catch(error => {
          console.error('Error getting personality:', error);
          setPersonalityName('ASSISTANT'); // Fallback to default
        });
    } else {
      // Reset personality if user logs out
      setPersonalityName('ASSISTANT');
    }
  }, [authUserId]); // Depend on the logged-in user's ID


  // Perform ownership check directly using Clerk's authUserId and the entryUserId prop
  const isOwner = React.useMemo(() => {
    // User must be logged in (authUserId exists) AND their ID must match the entry's user ID
    return !!authUserId && !!entryUserId && authUserId === entryUserId;
  }, [authUserId, entryUserId]);

  // If the logged-in user is not the owner, display an unauthorized message
  if (!isOwner) {
    // Define a simple message for unauthorized access
    const message = "You do not have permission to view this AI response.";
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
      minHeight: 0, // Add this to ensure proper flex behavior
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
      
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          padding: 10,
          flexGrow: 1 
        }}>
        <ThemedText style={{
          fontSize: fullColumnMode ? 18 : 15,
          color: '#BBB',
          fontStyle: 'italic',
          textShadowColor: secondaryColor,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 3
        }}>
          {loading ? "Thinking..." : (response || (
            personalityName === 'SILVERHAND' ? "Keep typing, choom. Your story's writing itself." :
            personalityName === 'BRUCE' ? "Continue your log. Every detail matters." :
            personalityName === 'TITAN' ? "Continue your log, pilot. Record your experiences." :
            personalityName === 'BOSS' ? "Kept you waiting, huh? Keep writing." :
            "I'm listening. Please continue your entry."
          ))}
        </ThemedText>
      </ScrollView>
    </View>
  );
};
