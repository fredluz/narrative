import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { TaskList } from '@/components/tasks/TaskList';
import { colors } from '@/app/styles/global';
import { useTheme } from '@/contexts/ThemeContext';

export default function MobileTasksScreen() {
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const { themeColor } = useTheme();
  
  if (!isAuthLoaded) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={themeColor || colors.accent1} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullScreenContainer}>
      <TaskList
        userId={userId || undefined}
        compactMode={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
}); 