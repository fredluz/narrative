// app/onboarding.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSupabase } from '@/contexts/SupabaseContext';
import { personalityService } from '@/services/personalityService';
import { PersonalityType } from '@/services/agents/PersonalityPrompts';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { TriangularSpinner } from '@/components/loading/TriangularSpinner';
import { colors } from '@/app/styles/global';

export default function OnboardingScreen() {
  const { session, isLoading } = useSupabase();
  const router = useRouter();
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType>('TFRobot');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { themeColor, textColor } = useTheme();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isLoading && !session?.user?.id) {
      router.replace('/auth/');
    }
  }, [session, isLoading, router]);

  const personalities: { type: PersonalityType; name: string; description: string }[] = [
    { 
      type: 'TFRobot', 
      name: 'BT-7274', 
      description: 'Focused on helping you accomplish tasks efficiently and stay organized.'
    },
    { 
      type: 'johnny', 
      name: 'Johnny Silverhand', 
      description: 'A sarcastic and witty companion that adds a vengeful twist to your journey.'
    },
    { 
      type: 'batman', 
      name: 'The Dark Knight', 
      description: 'Direct and serious, with a heroic flair for getting things done.'
    },
  ];

  const handleContinue = async () => {
    if (!session?.user?.id) return;
    
    setIsSubmitting(true);
    try {
      await personalityService.setUserPersonality(session.user.id, selectedPersonality);
      router.replace('/');
    } catch (error) {
      console.error('Error saving personality preference:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to determine if a color is dark
  const isDark = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  // Show loading spinner while authentication state is being determined
  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <TriangularSpinner size={40} />
      </ThemedView>
    );
  }

  // If no session, the useEffect will handle redirect
  if (!session?.user?.id) {
    return (
      <ThemedView style={[styles.container, styles.centerContent]}>
        <ThemedText>Redirecting to login...</ThemedText>
        <TriangularSpinner size={24} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Welcome to QuestLog</ThemedText>
          <ThemedText style={styles.subtitle}>Choose your AI assistant's personality</ThemedText>
        </View>
        
        <View style={styles.personalitiesContainer}>
          {personalities.map((personality) => (
            <TouchableOpacity
              key={personality.type}
              style={[
                styles.personalityOption,
                selectedPersonality === personality.type && {
                  borderColor: themeColor,
                  backgroundColor: isDark(themeColor) ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                }
              ]}
              onPress={() => setSelectedPersonality(personality.type)}
            >
              <ThemedText style={styles.personalityName}>{personality.name}</ThemedText>
              <ThemedText style={styles.personalityDescription}>{personality.description}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.continueButton, { backgroundColor: themeColor }]}
          onPress={handleContinue}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <TriangularSpinner size={24} color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  personalitiesContainer: {
    gap: 16,
  },
  personalityOption: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  personalityName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  personalityDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
  continueButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
