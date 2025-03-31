import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';

export default function AuthLayout() {
  console.log(`[AuthLayout] COMPONENT FUNCTION CALLED at ${new Date().toISOString()}`);
  
  // Track render count for debugging
  const renderCount = useRef(0);
  renderCount.current += 1;
  
  // Track component mount/unmount
  useEffect(() => {
    console.log(`[AuthLayout] COMPONENT MOUNTED (render #${renderCount.current}) at ${new Date().toISOString()}`);
    console.log(`[AuthLayout] Stack trace at mount:`, new Error().stack);
    
    return () => {
      console.log(`[AuthLayout] COMPONENT UNMOUNTED after ${renderCount.current} renders at ${new Date().toISOString()}`);
      console.log(`[AuthLayout] Stack trace at unmount:`, new Error().stack);
    };
  }, []);
  
  // Periodic check to see if this component stays mounted
  useEffect(() => {
    const interval = setInterval(() => {
      console.log(`[AuthLayout] STILL MOUNTED at ${new Date().toISOString()} (render #${renderCount.current})`);
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  console.log(`[AuthLayout] RENDERING (render #${renderCount.current}) at ${new Date().toISOString()}`);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Sign In',
        }}
      />
      <Stack.Screen
        name="loading"
        options={{
          title: 'Loading',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="callback"
        options={{
          title: 'Completing Sign In',
        }}
      />
    </Stack>
  );
}