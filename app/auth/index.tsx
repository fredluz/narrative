import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '@/services/authService';
import { useTheme } from '@/contexts/ThemeContext';
import { colors } from '@/app/styles/global';
import { useSupabase } from '@/contexts/SupabaseContext';

// Define the Stream interface for the Matrix animation
interface Stream {
  chars: string[];
  xPosition: number;
  isNarrative: boolean;
  narrativeLetter: string | null;
}

// MatrixBackground component for the falling characters animation
const MatrixBackground = () => {
  const [offset, setOffset] = useState(0);
  const [streams, setStreams] = useState<Stream[]>([]);

  // Constants for the animation
  const charSet = 'qwertyuiopasdfghjklçzxcvbnm,.?!@€@£§€{[]}«»~^-_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const columnWidth = 20; // Width between streams
  const charHeight = 15; // Height of each character
  const streamLength = screenHeight  + 20; // Buffer for looping
  const numColumns = 15;
  const narrativeText = 'NARRATIVE';
  const narrativeLength = narrativeText.length;
  const startCol = Math.floor((numColumns - narrativeLength) / 2);
  const narrativeIndices = Array.from({ length: narrativeLength }, (_, i) => startCol + i);
  const yCenter = screenHeight / 2;
  const narrativeHeight = 500; // Height of the green "NARRATIVE" zone
  const tolerance = narrativeHeight / 2;

  // Initialize streams when the component mounts
  useEffect(() => {
    const newStreams = Array.from({ length: numColumns }, (_, i) => ({
      chars: Array.from({ length: streamLength*6 }, () => charSet[Math.floor(Math.random() * charSet.length)]),
      xPosition: (i * columnWidth)+ (numColumns * columnWidth *4),
      isNarrative: narrativeIndices.includes(i),
      narrativeLetter: i >= startCol && i < startCol + narrativeLength ? narrativeText[i - startCol] : null,
    }));
    setStreams(newStreams);
  }, []);

  // Update offset for the falling effect
  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => (prev + 1) % (streamLength * charHeight));
    }, 50); // Update every 50ms for smooth animation
    return () => clearInterval(interval); // Cleanup on unmount
  }, []);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}>
      {streams.map((stream, streamIndex) => (
        <View
          key={streamIndex}
          style={{
            position: 'absolute',
            left: stream.xPosition,
            top: -offset,
          }}
        >
          {stream.chars.map((char, charIndex) => {
            const y = -offset + charIndex * charHeight;
            // Skip rendering if character is off-screen
            if (y < -charHeight || y > screenHeight) return null;
            const isInRange = y >= yCenter - tolerance && y <= yCenter + tolerance;
            const displayChar = stream.isNarrative && isInRange ? stream.narrativeLetter : char;
            const color = stream.isNarrative && isInRange ? '#00FF00' : '#FFFFFF'; // Green for "NARRATIVE", white otherwise
            return (
              <Text
                key={charIndex}
                style={{
                  fontFamily: 'monospace',
                  fontSize: 14,
                  color,
                  lineHeight: charHeight,
                  opacity: 0.8,
                }}
              >
                {displayChar}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
};

export default function AuthScreen() {
  const router = useRouter();
  const { themeColor, secondaryColor } = useTheme();
  const { session } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to landing page if session exists
  useEffect(() => {
    if (session) {
      console.log('Session detected in AuthScreen, navigating to landing');
      router.replace('/landing');
    }
  }, [session]);

  // Handle Google sign-in
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Starting Google sign in...');
      const { data, error } = await authService.signInWithOAuth('google');

      if (error) {
        console.error('Google sign in error:', error);
        throw error;
      }

      if (!data?.session) {
        console.log('No session data returned from sign in');
        return;
      }

      console.log('Sign in successful, session will update');
    } catch (err: any) {
      console.error('Failed to sign in with Google:', err);
      setError(err.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Add the Matrix background animation */}
      <MatrixBackground />
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: '#FFFFFF',
              textShadowColor: themeColor,
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 5,
            },
          ]}
        >
          NARRATIVE
        </Text>

        <Text style={styles.subtitle}>Your Digital Quest Journal</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.googleButton, { borderColor: themeColor }]}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          <MaterialIcons name="login" size={24} color={themeColor} style={styles.buttonIcon} />
          <Text style={[styles.buttonText, { color: themeColor }]}>
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    alignItems: 'center',
    zIndex: 1, // Ensure content is above the background
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: Platform.select({
      ios: 'Helvetica',
      android: 'Roboto',
      default: 'Arial',
    }),
  },
  subtitle: {
    fontSize: 18,
    color: '#999',
    marginBottom: 40,
    fontFamily: Platform.select({
      ios: 'Helvetica',
      android: 'Roboto',
      default: 'Arial',
    }),
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: 'rgba(200, 0, 0, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  glitchLine: {
    position: 'absolute',
    top: '35%',
    left: -10,
    width: '120%',
    height: 1,
    opacity: 0.1,
    transform: [{ rotate: '-0.3deg' }],
  },
  verticalAccent: {
    position: 'absolute',
    top: '10%',
    bottom: '10%',
    width: 1,
    right: '20%',
    opacity: 0.1,
  },
});