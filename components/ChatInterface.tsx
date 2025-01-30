import React from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import styles from '@/app/styles/global';
import { ChatMessage } from '@/app/types';

interface ChatInterfaceProps {
  themeColor: string;
  recentMessages: ChatMessage[];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    themeColor, 
    recentMessages 
}) => {

  const isDarkColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  const textColor = isDarkColor(themeColor) ? '#fff' : '#000';

  return (
    <View style={[styles.customChatContainer, { borderColor: themeColor }]}>
      <View style={styles.chatHeader}>
        <Text style={styles.cardTitle}>Direct Messages</Text>
      </View>
      <ScrollView style={styles.chatScroll}>
        {recentMessages?.map((msg: ChatMessage, index: number) => (
          <View key={index} style={[
            msg.sender === "You" ? styles.userMessage : styles.aiMessage,
            msg.sender === "You" && { backgroundColor: themeColor }
          ]}>
            <Text style={[styles.messageSender, msg.sender === "You" && { color: textColor }]}>{msg.sender}</Text>
            <Text style={[styles.messageText, msg.sender === "You" && { color: textColor }]}>{msg.message}</Text>
          </View>
        ))}
      </ScrollView>
      <TextInput 
        style={styles.chatInput} 
        placeholder='Type a message...' 
        placeholderTextColor='#AAA'
      />
    </View>
  );
};
