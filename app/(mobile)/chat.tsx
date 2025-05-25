import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { colors } from '@/app/styles/global';
import { useChat } from '@/contexts/ChatContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function MobileChatScreen() {
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const {
    messages: recentMessages,
    sendMessage,
    handleTyping,
    endSession,
    isTyping,
    sessionEnded,
    checkupCreated,
  } = useChat();
  const { themeColor } = useTheme();

  if (!isAuthLoaded) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={themeColor || colors.accent1} />
        <Text style={styles.loadingText}>Loading Chat...</Text>
      </View>
    );
  }

  if (!userId) {
    // This case should ideally be handled by root navigation, redirecting to auth
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>User not authenticated.</Text>
      </View>
    );
  }

  return (
    <ChatInterface
      userId={userId}
      recentMessages={recentMessages}
      onSendMessage={sendMessage}
      handleTyping={handleTyping}
      isTyping={isTyping}
      onEndSession={endSession}
      sessionEnded={sessionEnded}
      checkupCreated={checkupCreated}
    />
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
  },
}); 