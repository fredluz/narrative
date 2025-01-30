import React from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_400Regular, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { DesktopLayout } from '@/components/layouts/DesktopLayout';

export default function HomeScreen() {
  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Poppins_400Regular,
    Poppins_700Bold,
  });

  const { width } = useWindowDimensions();
  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android' || width < 768;

  if (!fontsLoaded) {
    return null;
  }

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
