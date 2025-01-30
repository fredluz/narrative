import React from 'react';
import { View, Text } from 'react-native';
import { ChatInterface } from '@/components/ChatInterface';
import { HamburgerMenu } from '@/components/ui/HamburgerMenu';
import { useChatData } from '@/hooks/useChatData';
import styles from '@/app/styles/global';

const MobileNavigation: React.FC = () => (
  <View style={styles.mobileNavigation}>
    <HamburgerMenu />
  </View>
);

export function MobileLayout() {
  const { messages, themeColor } = useChatData();

  return (
    <View style={[styles.container, { backgroundColor: '#181818' }]}>
      <View style={styles.mobileHeader}>
        <Text style={styles.mobileHeaderText}>QuestLog</Text>
      </View>
      
      <View style={styles.mobileContent}>
        <ChatInterface themeColor={themeColor} recentMessages={messages} />
      </View>
      
      <MobileNavigation />
      <HamburgerMenu /> {/* Add this line */}
    </View>
  );
}
