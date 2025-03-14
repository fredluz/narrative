import { StyleSheet, Platform } from 'react-native';

// Cyberpunk-inspired color palette
export const colors = {
  background: '#0A0A0A',
  backgroundSecondary: '#151515',
  card: '#1A1A1A',
  cardDark: '#121212',
  text: '#F0F0F0',
  textMuted: '#999999',
  border: 'rgba(255, 255, 255, 0.1)',
  error: '#FF6B6B',
  success: '#50FA7B',
  warning: '#FFB86C',
  info: '#8BE9FD',
  accent1: '#FF0055', // Neon pink/red
  accent2: '#0092FF', // Neon blue
  accent3: '#2c8c0f', // Neon green
  accent4: '#BD93F9', // Neon purple
  accent5: '#FFB86C', // Neon orange
  overlay: 'rgba(12, 12, 15, 0.8)',
};

// Common shadow styles for the cyberpunk UI elements
const cyberpunkShadow = {
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 3,
  },
  shadowOpacity: 0.5,
  shadowRadius: 5,
  elevation: 8,
};

const neonBorderEffect = {
  borderWidth: 1,
  borderRadius: 4,
};

// Update the shared card styles to use consistent colors
const commonCardStyle = {
  backgroundColor: colors.card, // All main sections use the same surface color
  borderRadius: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 3,
};

/**
 * A refined dark theme leveraging subtle gradients, rounded corners, 
 * modern font pairings, soft shadows, and increased spacing to improve 
 * readability and visual hierarchy. 
 * 
 * Note: 
 * - For gradient backgrounds, consider using libraries such as 
 *   "react-native-linear-gradient" or "expo-linear-gradient" and 
 *   wrapping relevant components accordingly.
 * - For animations (hover, loading, transitions), consider using
 *   React Native's Animated API or third-party libraries like
 *   "react-native-reanimated" or Lottie for more advanced Interactions.
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: Platform.select({
      ios: 'column',
      android: 'column',
      default: 'row'
    }),
    backgroundColor: colors.background, // Base dark background
    padding: Platform.select({
      ios: 10,
      android: 10,
      default: 16
    }),               // Increased padding for more whitespace
  },
  column: {
    flex: 1,
    marginHorizontal: 8,       // Slightly larger horizontal margin
    height: '100%',
  },
  chatCard: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 12,          // Subtle rounded corners
    margin: Platform.select({
      ios: 10,
      android: 10,
      default: 0
    }),
    // Soft shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  chatScroll: {
    flex: 1,
  },
  leftColumn: {
    flex: 1,
    marginRight: 10,
  },
  rightColumn: {
    flex: 1,
    flexDirection: 'column',
  },
  chatContainer: {
    flex: 1,
    marginBottom: 10,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...cyberpunkShadow,
  },

  // Modern chat bubble styling
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent2, // Accent color (can be customized)
    padding: 12,
    paddingHorizontal: 20, // Increased horizontal padding
    borderRadius: 16,
    marginVertical: 5,
    maxWidth: '75%',
    marginHorizontal: 16, // Increased horizontal margin
    // Font recommendations
    fontFamily: 'Inter_400Regular', // Example UI font
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cardDark,
    padding: 12,
    paddingHorizontal: 20, // Increased horizontal padding
    borderRadius: 16,
    marginVertical: 5,
    maxWidth: '75%',
    marginHorizontal: 8, // Increased horizontal margin
    // Font recommendations
    fontFamily: 'Inter_400Regular', // Example UI font
  },
  messageSender: {
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'Poppins_700Bold', // Example heading font
  },
  messageText: {
    color: colors.text,
    fontFamily: 'Inter_400Regular',
  },
  chatMessage: {
    color: colors.text,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
  },
  

  updateButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },

  updateButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Task-related styles
  taskContainer: {
    flex: 1,
    marginBottom: 10,
  },
  taskCard: {
    ...commonCardStyle,
    padding: 15,
    marginBottom: 10,
    ...cyberpunkShadow,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
    fontFamily: 'Poppins_700Bold',
  },
  cardDetails: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 5,
    fontFamily: 'Inter_400Regular',
  },
 

  // Chat input & theme selector
  chatInput: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    color: colors.text,
    marginVertical: 10,
    padding: 10,
    borderRadius: 12,
    fontFamily: 'Inter_400Regular',
  },
  themeSelector: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gearIcon: {
    marginRight: 5,
    color: colors.text,
  },
  colorInput: {
    backgroundColor: colors.card,
    color: colors.text,
    padding: 5,
    borderRadius: 12,
    fontFamily: 'Inter_400Regular',
  },

  // Task list & toggles
  taskListContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  toggleButton: {
    backgroundColor: colors.cardDark,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },

  // Mobile-specific styles
  mobileHeader: {
    height: 50,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mobileHeaderText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  mobileContent: {
    flex: 1,
    padding: 10,
  },
  mobileNavigation: {
    height: 60,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    position: 'relative',
  },
  mobileNavButton: {
    padding: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  mobileNavButtonActive: {
    backgroundColor: colors.cardDark,
  },
  mobileNavText: {
    color: colors.text,
    fontSize: 14,
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  mobileNavButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  mobileNavButtonActive: {
    backgroundColor: colors.cardDark,
  },
  mobileNavText: {
    color: colors.text,
    fontSize: 16,
  },

  customChatContainer: {
    ...commonCardStyle,
    flex: 1,
    margin: 10,
    borderWidth: 2,
    overflow: 'hidden',
  },
  
  chatHeader: {
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  hamburgerButton: {
    width: Platform.select({ ios: 40, android: 40, default: 48 }),
    height: Platform.select({ ios: 40, android: 40, default: 48 }),
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  hamburgerButtonMobile: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
  },
  hamburgerButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },


  desktopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  desktopHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  errorText: {
    color: colors.error,
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
    fontStyle: 'italic',
  },
  statusTimestamp: {
    color: colors.text,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    marginBottom: 5,
  },

  aiEntryText: {
    fontSize: 14,
    color: colors.text,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
    lineHeight: 20,
    backgroundColor: colors.overlay,
    padding: 15,
    borderRadius: 6,
    borderLeftWidth: 2,
    marginVertical: 10,
  },

  // Cyberpunk UI elements
  neonText: {
    // Text with neon glow effect
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    fontWeight: 'bold',
  },

  glitchContainer: {
    position: 'relative',
    overflow: 'hidden',
  },

  verticalAccent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 3,
    left: 0,
  },

  horizontalDivider: {
    height: 1,
    width: '100%',
    backgroundColor: colors.border,
    marginVertical: 15,
  },

  scanlines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.07,
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  
  // Adding commonly mapped colors to solve inconsistencies
  kanbanStyles: {
    emptyBoard: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: 'rgba(20, 20, 20, 0.7)',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      marginVertical: 10,
    },
  },
});

// Add these color mappings to fix inconsistencies between files
export const colorMappings = {
  // Color mappings to standardize names across files
  surface: colors.card,
  surfaceLight: colors.backgroundSecondary,
  surfaceLighter: colors.cardDark,
  textPrimary: colors.text,
  textSecondary: colors.textMuted,
  textDanger: colors.error,
  borderLight: colors.border,
};

export default styles;
