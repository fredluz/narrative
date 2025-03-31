import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useRef } from 'react';
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

{/* Keep the splash screen visible while we fetch resources */}
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  console.log(`[InitialLayout] COMPONENT FUNCTION CALLED at ${new Date().toISOString()}`);
  
  // Track render count for debugging
  const renderCount = useRef(0);
  renderCount.current += 1;
  
  const { isLoading: isSupabaseLoading, session } = useSupabase();
  const { themeColor } = useTheme();
  
  // DEBUG: Track auth states
  const prevSupabaseLoadingRef = useRef(isSupabaseLoading);
  const prevSessionRef = useRef(session);
  
  useEffect(() => {
    if (prevSupabaseLoadingRef.current !== isSupabaseLoading) {
      console.log(`[InitialLayout] SUPABASE LOADING STATE CHANGED: ${prevSupabaseLoadingRef.current} -> ${isSupabaseLoading} at ${new Date().toISOString()}`);
      console.log(`[InitialLayout] Stack trace for isSupabaseLoading change:`, new Error().stack);
      prevSupabaseLoadingRef.current = isSupabaseLoading;
    }
  }, [isSupabaseLoading]);
  
  useEffect(() => {
    const prevSessionExists = !!prevSessionRef.current?.user?.id;
    const currentSessionExists = !!session?.user?.id;
    
    if (prevSessionExists !== currentSessionExists) {
      console.log(`[InitialLayout] SESSION STATE CHANGED: ${prevSessionExists ? 'exists' : 'null'} -> ${currentSessionExists ? 'exists' : 'null'} at ${new Date().toISOString()}`);
      prevSessionRef.current = session;
    } else if (session && prevSessionRef.current && session !== prevSessionRef.current) {
      // Same user but different session object
      console.log(`[InitialLayout] SESSION OBJECT CHANGED but same login state at ${new Date().toISOString()}`);
      console.log(`[InitialLayout] Previous expiry: ${prevSessionRef.current.expires_at ? new Date(prevSessionRef.current.expires_at * 1000).toISOString() : 'n/a'}`);
      console.log(`[InitialLayout] New expiry: ${session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'n/a'}`);
      prevSessionRef.current = session;
    }
  }, [session]);
  
  // Track component mount/unmount
  useEffect(() => {
    console.log(`[InitialLayout] COMPONENT MOUNTED (render #${renderCount.current}) at ${new Date().toISOString()}`);
    
    return () => {
      console.log(`[InitialLayout] COMPONENT UNMOUNTED after ${renderCount.current} renders at ${new Date().toISOString()}`);
    };
  }, []);
  
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  
  // DEBUG: Track font loading
  useEffect(() => {
    console.log(`[InitialLayout] FONTS LOADED: ${fontsLoaded} at ${new Date().toISOString()}`);
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && !isSupabaseLoading) {
      console.log(`[InitialLayout] HIDING SPLASH SCREEN at ${new Date().toISOString()} - fonts loaded: ${fontsLoaded}, supabase loading: ${isSupabaseLoading}`);
      await SplashScreen.hideAsync();
    } else {
      console.log(`[InitialLayout] NOT HIDING SPLASH SCREEN at ${new Date().toISOString()} - fonts loaded: ${fontsLoaded}, supabase loading: ${isSupabaseLoading}`);
    }
  }, [fontsLoaded, isSupabaseLoading]);

  // DEBUG: Periodic check of states - keep this one since it also tracks font loading
  // and other app state, but reduce frequency to 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log(`[InitialLayout] PERIODIC STATE CHECK at ${new Date().toISOString()}`);
      console.log(`[InitialLayout] Current values - render count: ${renderCount.current}, isSupabaseLoading: ${isSupabaseLoading}, fontsLoaded: ${fontsLoaded}`);
      
      if (session && session.expires_at) {
        const expiresAt = session.expires_at * 1000;
        const now = Date.now();
        console.log(`[InitialLayout] Session expires: ${new Date(expiresAt).toISOString()} (in ${Math.floor((expiresAt - now) / 1000)} seconds)`);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [isSupabaseLoading, fontsLoaded, session]);

  console.log(`[InitialLayout] RENDERING (render #${renderCount.current}): isSupabaseLoading=${isSupabaseLoading}, fontsLoaded=${fontsLoaded} at ${new Date().toISOString()}`);

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Slot />
      {/* Loading overlay */}
      {(!fontsLoaded || isSupabaseLoading) && (
        <View style={layoutStyles.overlay}>
          <TriangularSpinner size={40} color={themeColor || '#fff'} />
          <Text style={[layoutStyles.loadingText, { color: themeColor || '#fff' }]}>
            Loading... {renderCount.current}
          </Text>
          <Text style={{color: '#888', fontSize: 10, marginTop: 5}}>
            fonts: {String(fontsLoaded)}, auth: {String(!isSupabaseLoading)}
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
  console.log(`[RootLayout] COMPONENT FUNCTION CALLED at ${new Date().toISOString()}`);
  
  // Track render count for debugging
  const renderCount = useRef(0);
  renderCount.current += 1;
  
  // Track component mount/unmount
  useEffect(() => {
    console.log(`[RootLayout] COMPONENT MOUNTED (render #${renderCount.current}) at ${new Date().toISOString()}`);
    console.log(`[RootLayout] Stack trace at mount:`, new Error().stack);
    
    // Track memory usage if available
    if (typeof window !== 'undefined' && (window as any).performance && (window as any).performance.memory) {
      console.log(`[RootLayout] Memory usage at mount: `, (window as any).performance.memory);
    }
    
    return () => {
      console.log(`[RootLayout] COMPONENT UNMOUNTED after ${renderCount.current} renders at ${new Date().toISOString()}`);
      console.log(`[RootLayout] Stack trace at unmount:`, new Error().stack);
    };
  }, []);
  
  console.log(`[RootLayout] RENDERING (render #${renderCount.current}) at ${new Date().toISOString()}`);
  
  return (
    <SupabaseProvider>
      <AppThemeProvider>
        <QuestUpdateProvider>
          <SuggestionProvider>
              <InitialLayout />
          </SuggestionProvider>
        </QuestUpdateProvider>
      </AppThemeProvider>
    </SupabaseProvider>
  );
}
