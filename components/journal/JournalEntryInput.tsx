import React from 'react';
import { View, TextInput } from 'react-native';

interface JournalEntryInputProps {
  value: string;
  tagsValue: string;
  onChangeText: (text: string) => void;
  onChangeTags: (text: string) => void;
  loading: boolean;
  fullColumnMode?: boolean;
  themeColor: string;
}

export const JournalEntryInput: React.FC<JournalEntryInputProps> = ({
  value,
  tagsValue,
  onChangeText,
  onChangeTags,
  loading,
  fullColumnMode,
  themeColor
}) => (
  <View style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
    <View style={{
      flex: 1,
      backgroundColor: 'rgba(20, 20, 20, 0.9)',
      borderWidth: 1,
      borderColor: themeColor,
      borderLeftWidth: 2,
      borderLeftColor: themeColor,
      borderRadius: 4,
      marginBottom: 5,
    }}>
      <TextInput
        style={{
          flex: 1,
          color: '#FFFFFF',
          padding: 12,
          fontSize: fullColumnMode ? 18 : 16,
          fontWeight: 'normal',
          textAlignVertical: 'top',
          height: '100%',
        }}
        multiline
        value={value}
        onChangeText={onChangeText}
        placeholder="How's your day going, samurai?"
        placeholderTextColor="#666"
        editable={!loading}
      />
    </View>
    
    <TextInput
      style={{
        height: 40,
        backgroundColor: 'rgba(20, 20, 20, 0.9)',
        borderWidth: 1,
        borderColor: themeColor,
        borderLeftWidth: 2,
        borderLeftColor: themeColor,
        borderRadius: 4,
        color: '#FFFFFF',
        padding: 12,
        fontSize: 14,
        fontWeight: 'normal',
      }}
      value={tagsValue}
      onChangeText={onChangeTags}
      placeholder="Add tags (comma separated) e.g. work, meeting, idea. In the future, have Johnny assign tags himself."
      placeholderTextColor="#666"
      editable={!loading}
    />
  </View>
);