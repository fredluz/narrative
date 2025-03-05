import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { CheckupEntry } from '@/services/journalService';

interface CheckupItemProps {
  checkup: CheckupEntry;
  themeColor: string;
  onPress: () => void;
  isExpanded: boolean;
}

export const CheckupItem: React.FC<CheckupItemProps> = ({
  checkup,
  themeColor,
  onPress,
  isExpanded
}) => {
  const checkupTime = new Date(checkup.created_at).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  });
  
  // Get a summary of the entry (first sentence or first 60 chars)
  const summary = checkup.content.split('.')[0] + (checkup.content.length > 60 ? '...' : '');
  
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        padding: 12,
        backgroundColor: 'rgba(20, 20, 20, 0.7)',
        borderRadius: 4,
        marginBottom: 8,
        borderLeftWidth: 2,
        borderLeftColor: themeColor,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#AAA', fontSize: 12, fontWeight: 'bold' }}>
          {checkupTime}
        </Text>
        <MaterialIcons
          name={isExpanded ? "expand-less" : "expand-more"}
          size={18}
          color="#AAA"
        />
      </View>
      
      {isExpanded ? (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: '#FFF', fontSize: 15 }}>
            {checkup.content}
          </Text>
          
          {/* Update AI response styling to match AIResponse component */}
          {checkup.ai_checkup_response && (
            <View style={{
              marginTop: 10,
              backgroundColor: 'rgba(15, 15, 15, 0.8)',
              borderRadius: 5,
              borderLeftWidth: 3,
              borderColor: '#D81159',
            }}>
              {/* Match the header styling from AIResponse */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: 10,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255, 255, 255, 0.1)',
              }}>
                <MaterialIcons 
                  name="psychology" 
                  size={16} 
                  color="#D81159" 
                  style={{ marginRight: 8 }} 
                />
                <ThemedText style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: '#D81159',
                }}>
                  SILVERHAND
                </ThemedText>
              </View>
              
              {/* Match the content styling from AIResponse */}
              <ScrollView style={{ padding: 10, maxHeight: 150 }}>
                <ThemedText style={{
                  fontSize: 15,
                  color: '#BBB',
                  fontStyle: 'italic',
                  textShadowColor: '#D81159',
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 3
                }}>
                  {checkup.ai_checkup_response}
                </ThemedText>
              </ScrollView>
            </View>
          )}
        </View>
      ) : (
        <Text style={{ color: '#FFF', marginTop: 4, fontSize: 15 }} numberOfLines={1}>
          {summary}
        </Text>
      )}
    </TouchableOpacity>
  );
};
