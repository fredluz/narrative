import React, { useState, useEffect } from 'react';
import { View, Text, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '@/services/authService';
import { useTheme } from '@/contexts/ThemeContext';
import { colors } from '@/app/styles/global';
import { useSupabase } from '@/contexts/SupabaseContext';

const asciiArt = `
    ███╗   ██╗ █████╗ ██████╗ ██████╗  █████╗ ████████╗██╗██╗   ██╗███████╗
   ████╗  ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗╚══██╔══╝██║██║   ██║██╔════╝
  ██╔██╗ ██║███████║██████╔╝██████╔╝███████║   ██║   ██║██║   ██║█████╗  
 ██║╚██╗██║██╔══██║██╔══██╗██╔══██╗██╔══██║   ██║   ██║╚██╗ ██╝ ██╔══╝  
██║ ╚████║██║  ██║██║  ██║██║  ██║██║  ██║   ██║   ██║ ╚████╔╝ ███████╗
╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═══╝  ╚══════╝
`;

// Extended char set (incl. Chinese)
const CHAR_SET =
  'qwertyuiopasdfghjklçzxcvbnm,.?!@€@£§€{[]}«»~^-_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789我你他是嘛汉字测试';

export default function AuthScreen() {
  const router = useRouter();
  const { themeColor } = useTheme();
  const { session } = useSupabase();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track window dims
  const [screenDims, setScreenDims] = useState(Dimensions.get('window'));
  // Only store half as many columns
  const [matrixIndices, setMatrixIndices] = useState<number[][]>([]);

  useEffect(() => {
    // Orientation / size changes
    const handleChange = ({ window }: any) => setScreenDims(window);
    const subscription = Dimensions.addEventListener('change', handleChange);
    return () => subscription?.remove?.();
  }, []);

  // Initialize or re-init the half-width wave
  useEffect(() => {
    initMatrix();
  }, [screenDims]);

  // Keep cycling the wave
  useEffect(() => {
    const intervalId = setInterval(() => {
      updateMatrix();
    }, 150);
    return () => clearInterval(intervalId);
  }, [matrixIndices]);

  // If session found, navigate
  useEffect(() => {
    if (session) {
      router.replace('/landing');
    }
  }, [session]);

  const initMatrix = () => {
    const columnWidth = 20;
    const charHeight = 15;

    // total columns for the full screen
    const totalColumns = Math.floor(screenDims.width / columnWidth);
    const numRows = Math.ceil(screenDims.height / charHeight);

    // half for the wave
    const waveColumns = Math.floor(totalColumns / 2);

    const newIndices: number[][] = [];
    for (let r = 0; r < numRows; r++) {
      const row: number[] = [];
      for (let c = 0; c < waveColumns; c++) {
        row.push(Math.floor(Math.random() * CHAR_SET.length));
      }
      newIndices.push(row);
    }
    setMatrixIndices(newIndices);
  };

  const updateMatrix = () => {
    if (!matrixIndices.length) return;
    setMatrixIndices((prev) => {
      const next = prev.map((row) => [...row]);
      for (let r = 0; r < next.length; r++) {
        for (let c = 0; c < next[r].length; c++) {
          // scramble ~3% chance
          if (Math.random() < 0.03) {
            next[r][c] = Math.floor(Math.random() * CHAR_SET.length);
          } else {
            // cycle index
            next[r][c] = (next[r][c] + 1) % CHAR_SET.length;
          }
        }
      }
      return next;
    });
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await authService.signInWithOAuth('google');
      
      if (signInError) {
        throw signInError;
      }
      
      // Add null check for data
      if (!data) {
        throw new Error('No data received from authentication service');
      }
      
      // Handle URL-based OAuth flow (redirect case)
      if ('url' in data) {
        // For web platforms, redirect to the OAuth URL
        window.location.href = data.url;
        return;
      }
      
      // Handle direct session return case
      if ('session' in data) {
        // If we have a session already, we can navigate directly
        router.replace('/landing');
        return;
      }
      
      // Fallback if neither case matches
      router.replace('/auth/loading');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * For each row:
   *  - waveLeft = the normal row
   *  - waveRight = waveLeft reversed
   *  - Display them side-by-side in a single row
   *    Each <Text> gets flex:1, so they're forced to share space horizontally
   */
  const renderMatrix = () => {
    return matrixIndices.map((row, rowIndex) => {
      const waveLeft = row.map((i) => CHAR_SET[i]).join('');
      const waveRight = waveLeft.split('').reverse().join('');

      return (
        <View key={rowIndex} style={styles.rowContainer}>
          <Text style={[styles.rowText, styles.leftCol]} numberOfLines={1}>
            {waveLeft}
          </Text>
          <Text style={[styles.rowText, styles.rightCol]} numberOfLines={1}>
            {waveRight}
          </Text>
        </View>
      );
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Matrix: wave + reflection */}
      <View style={styles.backgroundContainer}>{renderMatrix()}</View>

      {/* Auth UI */}
      <View style={styles.content}>
        <Text style={[styles.asciiArt, { color: themeColor }]}>{asciiArt}</Text>
        <Text style={styles.subtitle}>Your Digital Quest Journal</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
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

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  // Each row has 2 columns side by side
  rowContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  // each half is forced to share horizontal space
  leftCol: {
    flex: 1,
    textAlign: 'left',
  },
  rightCol: {
    flex: 1,
    textAlign: 'right',
  },
  // base styling for row text
  rowText: {
    fontFamily: 'monospace',
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.15,
    lineHeight: 15,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  asciiArt: {
    fontFamily: 'monospace',
    fontSize: 8,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#999',
    marginBottom: 20,
  },
  googleButton: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: colors.error,
    marginBottom: 16,
  },
});
