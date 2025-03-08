import { Stack } from 'expo-router';

export default function AuthLayout() {
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