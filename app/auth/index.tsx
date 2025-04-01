import React, { useState, useEffect } from 'react';
import { View, Text, Dimensions, StyleSheet, TouchableOpacity } from 'react-native'; // Added TouchableOpacity
import { useRouter } from 'expo-router';
import { colors } from '@/app/styles/global';
import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-expo';
// Removed SignIn import as it's moved to its own screen
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext'; // Import useTheme

const asciiArt = `
███╗   ██╗                                          
 ███╗   ██╗   █████╗   ███████╗  ███████╗   █████╗   ██████╗  ██╗  ██╗   ██╗  ███████╗
  ████╗  ██║  ██╔══██╗  ██╔═══█╗  ██╔═══█╗  ██╔══██╗    ██╔═   ██║  ██║   ██║  ██╔════╝
   ████╗  ██║  ██╔══██╗  ███══██╗  ███══██╗  ██╔══██╗    ██║    ██║  ██║   ██║  ██╔
    ██╔██╗ ██║  ███████║  ██████╔╝  ██████╔╝  ███████║    ██║    ██║  ██║   ██║  ██══════   
     ██╔██╗ ██║  ███  ██║  ███████╝  ███████╝  ██  ███║    ██║    ██║  ██║   ██║  ████████╗  
      ██║╚██╗██║  ██╔  ██║  ██╔══███║ ██╔═███║  ██╔  ██║    ██║    ██║  ╚██╗  ██╝  ██╔════╝  
       ██║╚██╗██║  ██║  ██║  ██║══██║  ██║══██║  ██║  ██║    ██║    ██║  ╚██╗  ██╝  ██╔  
        ██║ ╚████║  ██║  ██║  ██║  ██║  ██║  ██║  ██║  ██║    ██║    ██║   ╚██╗ ██╝  ██══════ 
         ██║ ╚████║  ██║  ██║  ██║  ███║ ██║  ███║ ██║  ██║    ██║    ██║    ╚████╔╝  ████████╗
         ╚═╝  ╚═══╝  ╚═╝  ╚═╝  ╚═╝  ╚══╝ ╚═╝  ╚══╝ ╚═╝  ╚═╝    ╚═╝    ╚═╝     ╚══╝     ╚═══════╝`;

// Extended char set (incl. Chinese)
const CHAR_SET = 'qwertyuiopasdfghjklçzxcvbnm,.?!@€@£§€{[]}«»~^-_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789我你他是嘛汉字测试';

const createStyles = (themeColor: string) => StyleSheet.create({
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
  rowContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  leftCol: {
    flex: 1,
    textAlign: 'left',
  },
  rightCol: {
    flex: 1,
    textAlign: 'right',
  },
  rowText: {
    fontFamily: 'monospace',
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.8,
    lineHeight: 15,
  },
  content: {
    width: '100%',
    maxWidth: 600,
    padding: 20,
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'monospace',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'monospace',
    color: '#CCC',
    marginBottom: 40,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#FFF',
    fontFamily: 'monospace',
  },
  signInText: { // Kept for potential future use, but not used by buttons
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  asciiTitle: {
    color: themeColor,
    fontSize: 8,
    fontFamily: 'monospace',
    marginBottom: 20,
    opacity: 0.8,
  },
  // Styles for the new buttons
  authButton: {
    backgroundColor: themeColor, // Use theme color
    marginTop: 15,
    paddingHorizontal: 30, // More horizontal padding
    paddingVertical: 15, // More vertical padding
    borderRadius: 8, // Slightly more rounded
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, // Slightly larger shadow
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5, // Increased elevation
    width: '80%', // Make buttons wider
    alignItems: 'center', // Center text
  },
  authButtonText: {
    color: '#FFFFFF', // White text
    fontWeight: '600', // Semi-bold
    fontSize: 16,
  },
});

export default function AuthScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { themeColor } = useTheme(); // Get themeColor from context
  const [localThemeColor, setLocalThemeColor] = useState(themeColor || '#2c8c0f'); // Use themeColor or default
  const [screenDims, setScreenDims] = useState(Dimensions.get('window'));
  const [matrixIndices, setMatrixIndices] = useState<number[][]>([]);

  // Update localThemeColor if themeColor from context changes
  useEffect(() => {
    if (themeColor) {
      setLocalThemeColor(themeColor);
    }
  }, [themeColor]);

  // Load theme color from AsyncStorage on mount (keep for initial load before context)
  useEffect(() => {
    const loadThemeColor = async () => {
      try {
        // Only load from storage if themeColor from context isn't available yet
        if (!themeColor) {
          const savedColor = await AsyncStorage.getItem('themeColor');
          if (savedColor) {
            setLocalThemeColor(savedColor);
          }
        }
      } catch (error) {
        console.error('Error loading theme color:', error);
      }
    };
    loadThemeColor();
  }, [themeColor]); // Depend on themeColor from context

  // Generate styles with current theme color
  const styles = createStyles(localThemeColor);

  // Orientation / size changes
  useEffect(() => {
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

  // Redirect if signed in (Clerk handles session state)
  useEffect(() => {
    // Ensure Clerk is loaded before checking isSignedIn
    if (isLoaded && isSignedIn) {
      router.replace('/landing'); // Or wherever authenticated users should go
    }
  }, [isLoaded, isSignedIn, router]);

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

  // Removed handleGoogleSignIn function

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
      <View style={styles.backgroundContainer}>{renderMatrix()}</View>
      <Text style={[styles.asciiTitle, { color: themeColor }]}>{asciiArt}</Text>
      <View style={styles.content}>
        <SignedOut>
           <Text style={styles.subtitle}>Your Digital Journey</Text>
           {/* Replace SignIn component with buttons */}
           <TouchableOpacity
             style={[styles.authButton]}
             onPress={() => router.push('/auth/signin')}
           >
             <Text style={styles.authButtonText}>Sign In</Text>
           </TouchableOpacity>
           <TouchableOpacity
             style={styles.authButton}
             onPress={() => router.push('/auth/signup')}
           >
             <Text style={styles.authButtonText}>Sign Up</Text>
           </TouchableOpacity>
        </SignedOut>
        <SignedIn>
          {/* Show loading or redirect */}
          <Text style={styles.loadingText}>Loading...</Text>
        </SignedIn>
      </View>
    </View>
  );
}
