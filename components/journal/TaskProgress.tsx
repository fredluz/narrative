import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { Task } from '@/app/types';

interface TaskProgressProps {
  tasks: Task[];
  themeColor: string;
  secondaryColor: string;
}

interface TaskGroup {
  title: string;
  tasks: Task[];
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}