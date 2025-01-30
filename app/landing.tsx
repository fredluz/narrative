import React from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { DesktopLayout } from '@/components/layouts/DesktopLayout';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android' || width < 768;

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
