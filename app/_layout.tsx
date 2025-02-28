import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback } from 'react';
import { View, Text } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { ThemeProvider as AppThemeProvider } from '@/contexts/ThemeContext';
import { SupabaseProvider, useSupabase } from '@/contexts/SupabaseContext';
import { QuestUpdateProvider } from '@/contexts/QuestUpdateContext';
import styles from './styles/global';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { isLoading: isSupabaseLoading } = useSupabase();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !isSupabaseLoading) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isSupabaseLoading]);

  if (!fontsLoaded || isSupabaseLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#181818' }}>
        <Text style={{ color: '#fff' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AppThemeProvider>
        <QuestUpdateProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#181818' },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="landing" options={{ headerShown: false }} />
            <Stack.Screen name="quests" options={{ headerShown: false }} />
          </Stack>
        </QuestUpdateProvider>
      </AppThemeProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SupabaseProvider>
      <RootLayoutContent />
    </SupabaseProvider>
  );
}
