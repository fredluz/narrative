import React, { useState, useEffect } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native'; // Removed TouchableOpacity, ScrollView
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext'; // Keep for potential styling
import { colors } from '@/app/styles/global';
import { SignedIn, SignedOut, useAuth, } from '@clerk/clerk-expo'; 
import { SignIn, SignUp } from '@clerk/clerk-expo/web'; // Import SignIn component from Clerk
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
const CHAR_SET =
  'qwertyuiopasdfghjklçzxcvbnm,.?!@€@£§€{[]}«»~^-_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789我你他是嘛汉字测试';

export default function AuthScreen() {
  const router = useRouter();
  // const { themeColor } = useTheme(); // Keep theme if needed for Clerk styling later
  const { isLoaded, isSignedIn } = useAuth(); // Use Clerk's auth state
  const { themeColor } = useTheme(); // Use theme color from context
  // Track window dims for Matrix effect
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
      {/* Matrix: wave + reflection */}
      <View style={styles.backgroundContainer}>{renderMatrix()}</View>
      {/* ASCII Art Title */}
      <Text style={styles.asciiTitle}>{asciiArt}</Text>
      {/* Content Area */}
      <View style={styles.content}>
        {/* Clerk handles the actual Sign In/Sign Up UI via its Provider configuration */}
        {/* We show the Matrix background when signed out */}
        <SignedOut>
           <Text style={styles.subtitle}>Your Digital Journey</Text>
           {/* Clerk's Sign In Button */}
           <SignIn />
          </SignedOut>
        {/* SignedIn might just show a loading indicator briefly before redirect */}
        <SignedIn>
          <Text style={styles.loadingText}>Loading...</Text>
        </SignedIn>
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
    opacity: 0.8,
    lineHeight: 15,
  },
  content: {
    width: '100%',
    maxWidth: 600,
    padding: 20,
    alignItems: 'center',
    zIndex: 1, // Ensure content is above matrix
    backgroundColor: 'rgba(0,0,0,0.6)', // Semi-transparent background for readability
    borderRadius: 10,
  },
  title: { // Added title style
    fontSize: 48, // Larger title
    fontWeight: 'bold',
    color: '#FFF', // White title
    fontFamily: 'monospace', // Consistent font
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'monospace',
    color: '#CCC', // Lighter grey subtitle
    marginBottom: 40, // More space below subtitle
    textAlign: 'center',
  },
  loadingText: { // Style for loading text when signed in
      fontSize: 18,
      color: '#FFF',
      fontFamily: 'monospace',
  },
  // Button styles
  
  signInText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  asciiTitle: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: 'monospace',
    marginBottom: 20,
    opacity: 0.8,
  }
});
