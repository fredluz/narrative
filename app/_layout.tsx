import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { ThemeProvider as AppThemeProvider } from '@/contexts/ThemeContext';
import { SupabaseProvider, useSupabase } from '@/contexts/SupabaseContext';
import { QuestUpdateProvider } from '@/contexts/QuestUpdateContext';
import { SuggestionProvider } from '@/contexts/SuggestionContext';
import { TriangularSpinner } from '@/components/loading/TriangularSpinner';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './styles/global';
import { AuthGuard } from '@/components/auth/AuthGuard';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { isLoading: isSupabaseLoading } = useSupabase();
  const { themeColor } = useTheme();
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

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Slot />
      {/* Loading overlay */}
      {(!fontsLoaded || isSupabaseLoading) && (
        <View style={layoutStyles.overlay}>
          <TriangularSpinner size={40} color={themeColor || '#fff'} />
          <Text style={[layoutStyles.loadingText, { color: themeColor || '#fff' }]}>
            Loading...
          </Text>
        </View>
      )}
    </View>
  );
}

const layoutStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(24, 24, 24, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default function RootLayout() {
  return (
    <SupabaseProvider>
      <AppThemeProvider>
        <QuestUpdateProvider>
          <SuggestionProvider>
            <AuthGuard />
            <InitialLayout />
          </SuggestionProvider>
        </QuestUpdateProvider>
      </AppThemeProvider>
    </SupabaseProvider>
  );
}
