import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SignUp } from '@clerk/clerk-expo/web'; // Assuming SignUp is also from /web
import { colors } from '@/app/styles/global'; // Import global colors if needed for container

export default function SignUpScreen() {
  return (
    <View style={styles.container}>
      <SignUp
        appearance={{
          elements: {
            rootBox: { fontFamily: 'Inter_400Regular' }, // Apply to the root container if possible
            card: { fontFamily: 'Inter_400Regular' }, // General card text
            headerTitle: { fontFamily: 'Poppins_600SemiBold' }, // Header text
            headerSubtitle: { fontFamily: 'Inter_400Regular' },
            formButtonPrimary: { fontFamily: 'Inter_500Medium' }, // Button text
            socialButtonsBlockButton: { fontFamily: 'Inter_500Medium' },
            footerActionText: { fontFamily: 'Inter_400Regular' },
            footerActionLink: { fontFamily: 'Inter_500Medium' },
            formFieldLabel: { fontFamily: 'Inter_500Medium' },
            formFieldInput: { fontFamily: 'Inter_400Regular' },
            dividerText: { fontFamily: 'Inter_400Regular' },
            identityPreviewText: { fontFamily: 'Inter_400Regular' },
            otpCodeFieldInput: { fontFamily: 'Inter_400Regular' },
            alternativeMethodsBlockButton: { fontFamily: 'Inter_500Medium' },
            // Add other elements as needed
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background, // Use a background color consistent with the app
    padding: 20,
  },
});
