import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '../../components/ui/ThemedText';
import { Card } from 'react-native-paper';

interface CheckupItemProps {
  checkup: {
    id: string;
    content: string;
    created_at: string;
    ai_checkup_response?: string | null;
  };
  themeColor: string;
  onPress: () => void;
  isExpanded: boolean;
  secondaryColor: string;
}

export const CheckupItem: React.FC<CheckupItemProps> = ({ checkup, themeColor, onPress, isExpanded, secondaryColor }) => {
  const checkupTime = new Date(checkup.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Get a summary of the entry (first sentence or first 60 chars)
  const summary = checkup.content.split('.')[0] + (checkup.content.length > 60 ? '...' : '');

  return (
    <Card style={{
      marginBottom: 8,
      borderRadius: 6,
      backgroundColor: '#252525',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 1,
      borderLeftWidth: 4,
      borderLeftColor: themeColor,
      borderRightWidth: 1,
      borderRightColor: '#333333',
      borderTopWidth: 1,
      borderTopColor: '#333333',
      borderBottomWidth: 1,
      borderBottomColor: '#333333'
    }}>
      <TouchableOpacity
        onPress={onPress}
        style={{
          padding: 12,
          backgroundColor: 'rgba(20, 20, 20, 0.3)',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#333333',
            paddingHorizontal: 6,
            paddingVertical: 3,
            borderRadius: 4,
            borderLeftWidth: 2,
            borderLeftColor: secondaryColor,
          }}>
            <MaterialIcons
              name="schedule"
              size={12}
              color={secondaryColor}
              style={{ marginRight: 4 }}
            />
            <Text style={{ 
              color: '#AAAAAA',
              fontSize: 12,
              fontWeight: '500'
            }}>
              {checkupTime}
            </Text>
          </View>
          <MaterialIcons
            name={isExpanded ? "expand-less" : "expand-more"}
            size={18}
            color="#AAAAAA"
            style={{
              padding: 4,
              backgroundColor: '#333333',
              borderRadius: 12
            }}
          />
        </View>

        {isExpanded ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{
              color: '#DDDDDD',
              fontSize: 15,
              lineHeight: 22,
              fontWeight: '400'
            }}>
              {checkup.content}
            </Text>

            {checkup.ai_checkup_response && (
              <View style={{
                marginTop: 10,
                backgroundColor: 'rgba(15, 15, 15, 0.8)',
                borderRadius: 5,
                borderLeftWidth: 3,
                borderColor: secondaryColor,
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255, 255, 255, 0.1)',
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <MaterialIcons
                      name="psychology"
                      size={16}
                      color={secondaryColor}
                    />
                    <Text style={{
                      fontSize: 14,
                      fontWeight: 'bold',
                      color: secondaryColor,
                      letterSpacing: 0.5
                    }}>
                      SILVERHAND
                    </Text>
                  </View>
                </View>

                <ScrollView style={{ padding: 10, maxHeight: 150 }}>
                  <ThemedText style={{
                    fontSize: 15,
                    color: secondaryColor,
                    fontStyle: 'italic',
                    opacity: 0.9,
                    letterSpacing: 0.2
                  }}>
                    {checkup.ai_checkup_response}
                  </ThemedText>
                </ScrollView>
              </View>
            )}
          </View>
        ) : (
          <Text style={{
            color: '#DDDDDD',
            marginTop: 4,
            fontSize: 15,
            lineHeight: 22,
            opacity: 0.9
          }} numberOfLines={1}>
            {summary}
          </Text>
        )}
      </TouchableOpacity>
    </Card>
  );
}
