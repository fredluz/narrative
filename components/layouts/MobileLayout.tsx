import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Install if needed
import { ChatInterface } from '@/components/chat/ChatInterface';
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#181818' }}>
      <View style={styles.mobileHeader}>
        <Text style={styles.mobileHeaderText}>QuestLog</Text>
      </View>
      
      <View style={styles.mobileContent}>
        <ChatInterface 
          themeColor={themeColor} 
          recentMessages={messages}
        />
      </View>
      
      <MobileNavigation />
    </SafeAreaView>
  );
}
