import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';
import styles from '@/app/styles/global';

interface Props {
  themeColor: string;
  textColor: string;
}

export function JournalPanel({ themeColor, textColor }: Props) {
  const router = useRouter();
  const [entry, setEntry] = useState('');
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <Card style={[styles.taskCard, { borderColor: themeColor, borderWidth: 2, marginTop: 20 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <ThemedText style={styles.mainQuestTitle}>Today's Journal</ThemedText>
        <TouchableOpacity 
          onPress={() => router.push('/journal')}
          style={[styles.viewAllQuests, { backgroundColor: themeColor }]}
        >
          <ThemedText style={[styles.viewAllQuestsText, { color: textColor }]}>
            View Journal
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ThemedText style={styles.cardDetails}>{today}</ThemedText>
      
      <TextInput
        style={[styles.chatInput, { 
          height: 100, 
          marginTop: 10,
          color: '#fff',
          backgroundColor: '#333'
        }]}
        multiline
        value={entry}
        onChangeText={setEntry}
        placeholder="How's your day going, samurai?"
        placeholderTextColor="#666"
      />

      <ThemedText style={[styles.aiEntryText, { marginTop: 10 }]}>
        [SILVERHAND]: Keep typing, choom. Your story's writing itself.
      </ThemedText>
    </Card>
  );
}
