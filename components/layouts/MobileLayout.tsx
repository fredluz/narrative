import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import globalStyles, { colors } from '@/app/styles/global'; // Corrected import

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  onOpenMenu?: () => void;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({ children, title = 'Screen', onOpenMenu }) => {

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onOpenMenu} style={styles.menuButton}>
          <Text style={styles.menuButtonText}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerActionPlaceholder} /> 
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: Platform.select({ ios: 50, android: 60, default: 60 }),
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuButton: {
    padding: 10,
    minWidth: 40,
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 24,
    color: colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerActionPlaceholder: {
    minWidth: 40,
  },
  content: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary, 
  },
});

export default MobileLayout;
