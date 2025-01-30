/*import React from 'react';
import { View } from 'react-native';
import { ChatInterface } from '@/components/ChatInterface';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './styles/global';

export default function NotificationScreen() {
  const { themeColor } = useTheme();
  const recentMessages = [
    { sender: "Batcomputer", message: "Fred, today's your last day to get your medication refilled." },
    { sender: "Batcomputer", message: "The pharmacy closes at 3PM, so you've got 5 hours."},
    { sender: "You", message: "I don't feel like going out right now." },
    { sender: "Batcomputer", message: "Then I'll set a reminder for after lunch." },
    { sender: "Batcomputer", message: "Please make sure to get this done, you know how much better you feel when medicated." },
  ];

  return (
    <View style={[styles.container, { backgroundColor: '#181818' }]}>
      <ChatInterface themeColor={themeColor} recentMessages={recentMessages} />
    </View>
  );
}
*/