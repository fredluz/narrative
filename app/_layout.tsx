import { Slot, useRouter, useSegments } from 'expo-router'; // Re-added useSegments
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { SupabaseProvider } from '@/contexts/SupabaseContext'; // Keep SupabaseProvider for DB client
import { QuestUpdateProvider } from '@/contexts/QuestUpdateContext';
import { SuggestionProvider } from '@/contexts/SuggestionContext';
import { ChatProvider } from '@/contexts/ChatContext'; // Import ChatProvider
import { TriangularSpinner } from '@/components/loading/TriangularSpinner';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'; // Removed SignedIn, SignedOut
import * as SecureStore from 'expo-secure-store';

// Retrieve Clerk Publishable Key from environment variables
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key. Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local');
}

// Token Cache implementation using expo-secure-store
const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      console.error("SecureStore.getItemAsync failed:", err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error("SecureStore.setItemAsync failed:", err);
      return;
    }
  },
  async deleteToken(key: string) {
    try {
      return SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.error("SecureStore.deleteItemAsync failed:", err);
      return;
    }
  }
};

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Removed RedirectToAuth component

function InitialLayout() {
  console.log(`[InitialLayout] COMPONENT FUNCTION CALLED at ${new Date().toISOString()}`);
  const renderCount = useRef(0);
  renderCount.current += 1;

  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth(); // Use Clerk auth state
  const { themeColor } = useTheme();
  const segments = useSegments(); // Need segments for the redirect check
  const router = useRouter(); // Need router for the redirect check

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // DEBUG: Track states
  useEffect(() => {
    console.log(`[InitialLayout] STATE CHECK - Clerk Loaded: ${isClerkLoaded}, Signed In: ${isSignedIn}, Fonts Loaded: ${fontsLoaded} at ${new Date().toISOString()}`);
  }, [isClerkLoaded, isSignedIn, fontsLoaded]);

  // Effect to handle redirects based on auth state
  useEffect(() => {
    // Wait for both Clerk AND fonts to be loaded before attempting navigation
    if (!isClerkLoaded || !fontsLoaded) {
      return; 
    }

    // Check if the current route segment is within the 'auth' directory
    const inAuthGroup = segments[0] === 'auth'; 

    console.log(`[InitialLayout] Auth Redirect Check: isSignedIn=${isSignedIn}, inAuthGroup=${inAuthGroup}, segments=${segments.join('/')}`);

    if (isSignedIn && inAuthGroup) {
      // If signed in and in auth group, redirect to the main app page (e.g., '/')
      console.log("[InitialLayout] Redirecting authenticated user away from /auth to /");
      router.replace('/'); 
    } else if (!isSignedIn && !inAuthGroup) {
      // If signed out and NOT in auth group, redirect to the auth page
      console.log("[InitialLayout] Redirecting unauthenticated user to /auth");
      router.replace('/auth'); // Ensure '/auth' is your correct sign-in route
    }
    // Implicit else:
    // - If signed in and NOT in auth group: Stay where you are (already in the app).
    // - If signed out and IN auth group: Stay where you are (already on the sign-in page).

  }, [isClerkLoaded, fontsLoaded, isSignedIn, segments, router]); // Add fontsLoaded to dependency array

  // Hide splash screen when both fonts and Clerk are loaded
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && isClerkLoaded) {
      console.log(`[InitialLayout] HIDING SPLASH SCREEN at ${new Date().toISOString()} - fonts loaded: ${fontsLoaded}, clerk loaded: ${isClerkLoaded}`);
      await SplashScreen.hideAsync();
    } else {
      console.log(`[InitialLayout] NOT HIDING SPLASH SCREEN at ${new Date().toISOString()} - fonts loaded: ${fontsLoaded}, clerk loaded: ${isClerkLoaded}`);
    }
  }, [fontsLoaded, isClerkLoaded]);

  console.log(`[InitialLayout] RENDERING (render #${renderCount.current}): isClerkLoaded=${isClerkLoaded}, fontsLoaded=${fontsLoaded} at ${new Date().toISOString()}`);

  // Show loading overlay until fonts and Clerk are ready
  const showLoadingOverlay = !fontsLoaded || !isClerkLoaded;

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      {/* Always render Slot after loading, redirection handled elsewhere or by effect above */}
      {!showLoadingOverlay && <Slot />}

      {/* Loading overlay remains the same */}
      {showLoadingOverlay && (
        <View style={layoutStyles.overlay}>
          <TriangularSpinner size={40} color={themeColor || '#fff'} />
          <Text style={[layoutStyles.loadingText, { color: themeColor || '#fff' }]}>
            Loading... {renderCount.current}
          </Text>
          <Text style={{color: '#888', fontSize: 10, marginTop: 5}}>
            fonts: {String(fontsLoaded)}, auth: {String(isClerkLoaded)}
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
  const renderCount = useRef(0);
  renderCount.current += 1;

  useEffect(() => {
    console.log(`[RootLayout] COMPONENT MOUNTED (render #${renderCount.current}) at ${new Date().toISOString()}`);
    return () => {
      console.log(`[RootLayout] COMPONENT UNMOUNTED after ${renderCount.current} renders at ${new Date().toISOString()}`);
    };
  }, []);

  console.log(`[RootLayout] RENDERING (render #${renderCount.current}) at ${new Date().toISOString()}`);

  return (
    // ClerkProvider wraps everything that needs auth context
    <ClerkProvider
      tokenCache={tokenCache}
      publishableKey={CLERK_PUBLISHABLE_KEY}
    >
      {/* Other global providers go inside ClerkProvider */}
      <AppThemeProvider>
        <SupabaseProvider> {/* Keep SupabaseProvider for DB client */}
          <QuestUpdateProvider>
            <SuggestionProvider>
              <ChatProvider> {/* Wrap with ChatProvider */}
                {/* InitialLayout handles font/auth loading and splash screen */}
                <InitialLayout />
              </ChatProvider>
            </SuggestionProvider>
          </QuestUpdateProvider>
        </SupabaseProvider>
      </AppThemeProvider>
    </ClerkProvider>
  );
}
