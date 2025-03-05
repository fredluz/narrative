import React from 'react';
import { JournalPanel } from '@/components/journal/JournalPanel';
import { useTheme } from '@/contexts/ThemeContext';

export default function JournalScreen() {
  const { themeColor } = useTheme();

  return (
    <JournalPanel themeColor={themeColor} textColor="#FFF" />
  );
}