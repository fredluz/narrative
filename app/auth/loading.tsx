import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TriangularSpinner } from '@/components/loading/TriangularSpinner';
import { useTheme } from '@/contexts/ThemeContext';
import { colors } from '@/app/styles/global';

export default function AuthLoading() {
  const { themeColor } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TriangularSpinner size={40} color={themeColor} />
      <Text style={[styles.text, { color: themeColor }]}>
        Authenticating...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '500',
  },
});