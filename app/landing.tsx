import React, { useEffect } from 'react';
import { Platform, useWindowDimensions, View, ActivityIndicator, Text } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { DesktopLayout } from '@/components/layouts/DesktopLayout';
import { useAuth } from '@clerk/clerk-expo';
import { colors } from '@/app/styles/global'; 
import { useTheme } from '@/contexts/ThemeContext';

const MOBILE_BREAKPOINT = 768; // As defined in the plan
const DEFAULT_MOBILE_ROUTE = '/chat'; // Default screen for mobile users

export default function LandingScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { themeColor } = useTheme(); // For loader color

  useEffect(() => {
    // Only proceed if auth is loaded
    if (!isAuthLoaded) {
      return;
    }

    // If user is not signed in, root _layout should handle redirection to /auth.
    // This screen assumes it's reached by an authenticated user.
    if (!isSignedIn) {
      // This is a fallback, ideally root _layout handles this.
      // router.replace('/auth'); 
      return;
    }

    const isMobileOS = Platform.OS === 'ios' || Platform.OS === 'android';
    const isSmallWebApp = Platform.OS === 'web' && width < MOBILE_BREAKPOINT;
    const shouldUseMobileLayout = isMobileOS || isSmallWebApp;

    // Check if already on a mobile path to prevent redirect loops if accessed directly
    const alreadyOnMobilePath = pathname.startsWith('/chat') || pathname.startsWith('/journal') || pathname.startsWith('/tasks');

    if (shouldUseMobileLayout && !alreadyOnMobilePath) {
      router.replace(DEFAULT_MOBILE_ROUTE);
    } 
    // No explicit else needed: if not mobile, the component proceeds to render DesktopLayout
    // if already on a mobile path (e.g. deep link), let it be handled by (mobile)/_layout.tsx

  }, [isAuthLoaded, isSignedIn, width, router, pathname]);

  // Conditions for showing DesktopLayout or a loader:
  // 1. Auth must be loaded.
  // 2. User must be signed in.
  // 3. It should NOT be a mobile context requiring redirection.

  if (!isAuthLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={themeColor || colors.accent1} />
      </View>
    );
  }

  // If signed in and on a platform/screensize that should use mobile, 
  // but useEffect hasn't redirected yet (or if it's a direct load to /landing on mobile screen size),
  // show loader to avoid flashing DesktopLayout.
  const isMobileOS = Platform.OS === 'ios' || Platform.OS === 'android';
  const isSmallWebApp = Platform.OS === 'web' && width < MOBILE_BREAKPOINT;
  if (isSignedIn && (isMobileOS || isSmallWebApp) && pathname === '/landing') {
     return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={themeColor || colors.accent1} />
        <Text style={{color: colors.textMuted, marginTop: 10}}>Loading mobile experience...</Text>
      </View>
    );
  }

  // If auth is loaded, user is signed in, and it's not a mobile context (or redirect has happened),
  // then render DesktopLayout. Or if already on a mobile path, Expo Router will handle it.
  if (isSignedIn && !((isMobileOS || isSmallWebApp) && pathname === '/landing')) {
    return <DesktopLayout />;
  }
  
  // Fallback for any other unhandled state (e.g., !isSignedIn but past initial check)
  // This also covers the case where isSignedIn is false, and root layout hasn't redirected yet.
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
       <ActivityIndicator size="large" color={themeColor || colors.accent1} />
       <Text style={{color: colors.textMuted, marginTop: 10}}>Finalizing...</Text>
    </View>
  );
}
