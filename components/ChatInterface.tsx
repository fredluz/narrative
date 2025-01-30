import React from 'react';
import { View, Text, ScrollView, TextInput } from 'react-native';
import { Card } from 'react-native-paper';
import styles from '@/app/styles/global';
import { ChatMessage } from '@/app/types';

interface ChatInterfaceProps {
  themeColor: string;
  recentMessages: ChatMessage[];
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    themeColor, 
    recentMessages 
}) => (
    <Card style={[styles.chatCard, { borderColor: themeColor, borderWidth: 2, flex: 1 }]}> 
    <Text style={styles.cardTitle}>Direct Messages</Text>
    <ScrollView style={styles.chatScroll}>
        {recentMessages.map((msg: ChatMessage, index: number) => (
            <View key={index} style={[
                msg.sender === "You" ? styles.userMessage : styles.aiMessage,
                msg.sender === "You" && { backgroundColor: themeColor }
            ]}>
                <Text style={styles.messageSender}>{msg.sender}</Text>
                <Text style={styles.messageText}>{msg.message}</Text>
                </View>
            ))}
        </ScrollView>
        <TextInput 
            style={styles.chatInput} 
            placeholder='Type a message...' 
            placeholderTextColor='#AAA'
        />
    </Card>
);
