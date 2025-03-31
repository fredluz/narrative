import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useSegments, useRootNavigation } from 'expo-router';
import { useSupabase } from '@/contexts/SupabaseContext';
import { colors } from '@/app/styles/global';
import { useTheme } from '@/contexts/ThemeContext';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log(`[AuthGuard] COMPONENT FUNCTION CALLED at ${new Date().toISOString()}`);
  
  // Track render count for debugging
  const renderCount = useRef(0);
  renderCount.current += 1;
  
  const { session, isLoading } = useSupabase();
  const router = useRouter();
  const segments = useSegments();
  const { themeColor } = useTheme();
  const rootNavigation = useRootNavigation();
  
  // DEBUG: Track auth state changes in the guard
  const prevLoadingRef = useRef(isLoading);
  const prevSessionRef = useRef(session);
  
  // Track component mount/unmount
  useEffect(() => {
    console.log(`[AuthGuard] COMPONENT MOUNTED (render #${renderCount.current}) at ${new Date().toISOString()}`);
    
    return () => {
      console.log(`[AuthGuard] COMPONENT UNMOUNTED after ${renderCount.current} renders at ${new Date().toISOString()}`);
    };
  }, []);
  
  useEffect(() => {
    if (prevLoadingRef.current !== isLoading) {
      console.log(`[AuthGuard] AUTH LOADING STATE CHANGED: ${prevLoadingRef.current} -> ${isLoading} at ${new Date().toISOString()}`);
      console.log(`[AuthGuard] Stack trace for isLoading change:`, new Error().stack);
      prevLoadingRef.current = isLoading;
    }
  }, [isLoading]);
  
  useEffect(() => {
    const prevSessionExists = !!prevSessionRef.current?.user?.id;
    const currentSessionExists = !!session?.user?.id;
    
    if (prevSessionExists !== currentSessionExists) {
      console.log(`[AuthGuard] SESSION STATE CHANGED: ${prevSessionExists ? 'exists' : 'null'} -> ${currentSessionExists ? 'exists' : 'null'} at ${new Date().toISOString()}`);
      console.log(`[AuthGuard] Current route segments:`, segments);
      prevSessionRef.current = session;
    }
  }, [session, segments]);

  // Check if the user is authenticated
  // If they are not, AND we're not already on the auth screen, redirect to auth
  useEffect(() => {
    // Only attempt navigation when root navigation is ready and not loading auth state
    if (!rootNavigation?.isReady() || isLoading) {
      console.log(`[AuthGuard] Navigation not ready or still loading auth state at ${new Date().toISOString()}`);
      return;
    }

    const inAuthGroup = segments[0] === 'auth';
    const hasSession = !!session?.user;
    
    console.log(`[AuthGuard] NAVIGATION CHECK at ${new Date().toISOString()} -`, {
      inAuthGroup,
      hasSession,
      segments: segments.join('/'),
      userId: session?.user?.id || 'none',
      navigationReady: rootNavigation.isReady()
    });

    if (!hasSession && !inAuthGroup) {
      console.log(`[AuthGuard] REDIRECTING to /auth at ${new Date().toISOString()} - No session and not in auth group`);
      router.replace('/auth');
    } else if (hasSession && inAuthGroup) {
      console.log(`[AuthGuard] REDIRECTING to / at ${new Date().toISOString()} - Has session but in auth group`);
      router.replace('/');
    } else {
      console.log(`[AuthGuard] NO REDIRECT NEEDED at ${new Date().toISOString()} - Current state is valid`);
    }
  }, [session?.user?.id, segments, isLoading, router, rootNavigation]);

  // DEBUG: Log render decision
  console.log(`[AuthGuard] RENDERING: ${isLoading ? 'Loading State' : 'Children'} (render #${renderCount.current}) at ${new Date().toISOString()}`);
  
  // Show loading state during initial loading
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={themeColor} />
        <Text style={{ marginTop: 15, color: themeColor }}>Loading auth state...</Text>
        <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 12 }}>
          Auth Loading: {String(isLoading)} | Render #{renderCount.current}
        </Text>
      </View>
    );
  }
  
  // Render children (the app) when auth check is complete
  return <>{children}</>;
};
