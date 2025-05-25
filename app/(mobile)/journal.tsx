import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { JournalPanel } from '@/components/journal/JournalPanel';
import { colors } from '@/app/styles/global';
import { useTheme } from '@/contexts/ThemeContext';

export default function MobileJournalScreen() {
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const { themeColor, textColor } = useTheme();

  if (!isAuthLoaded) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={themeColor || colors.accent1} />
        <Text style={styles.loadingText}>Loading Journal...</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>User not authenticated.</Text>
      </View>
    );
  }

  return (
    <JournalPanel
      userId={userId}
      themeColor={themeColor}
      textColor={textColor}
      fullColumnMode={true} // For mobile full-screen view
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