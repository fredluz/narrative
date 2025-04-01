import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface JournalEntryInputProps {
  value: string;
  tagsValue: string;
  onChangeText: (text: string) => void;
  onChangeTags: (text: string) => void;
  loading: boolean;
  fullColumnMode?: boolean;
  themeColor: string;
}

export function JournalEntryInput({ 
  value, 
  tagsValue, 
  onChangeText, 
  onChangeTags, 
  loading, 
  fullColumnMode = false,
  themeColor
}: JournalEntryInputProps) {
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
          name="edit" 
          size={16} 
          color={themeColor}
          style={{ marginRight: 8 }} 
        />
        <Text style={{ 
          color: '#EEEEEE',
          fontSize: 14,
          fontWeight: '600',
        }}>
          NEW ENTRY
        </Text>
      </View>

      {/* Content */}
      <View style={{ padding: 12 }}>
        <TextInput
          multiline
          value={value}
          onChangeText={onChangeText}
          placeholder="What's on your mind?"
          placeholderTextColor="#666666"
          style={{
            color: '#DDDDDD',
            fontSize: 14,
            lineHeight: 20,
            minHeight: 80,
            textAlignVertical: 'top',
            backgroundColor: '#1E1E1E',
            borderRadius: 4,
            padding: 10,
            borderWidth: 1,
            borderColor: '#333333',
          }}
          editable={!loading}
        />
      </View>
    </View>
  );
}
