import { StyleSheet, Platform } from 'react-native';

// Cyberpunk-inspired color palette
export const colors = {
  // Base colors
  background: '#181818',
  surface: '#222222',
  surfaceLight: '#333333',
  surfaceLighter: '#444444',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#BBBBBB',
  textMuted: '#888888',
  textDanger: '#FF4444',
  
  // Border colors
  borderDark: '#333333',
  borderLight: '#444444',
  
  // Overlay/Modal colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: '#222222',
  
  // Status colors
  success: '#00CC66',
  warning: '#FFB020',
  error: '#FF4444',
  info: '#0088FF',
};

// Update the shared card styles to use consistent colors
const commonCardStyle = {
  backgroundColor: colors.surface, // All main sections use the same surface color
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
    backgroundColor: colors.surfaceLight,
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
  },
  mainQuestContainer: {
    flex: 2,
    marginBottom: 10,
  },
  mainQuestCard: {
    ...commonCardStyle,
    padding: 20,
  },

  // Modern chat bubble styling
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007BFF', // Accent color (can be customized)
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
    backgroundColor: colors.surfaceLighter,
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
    color: colors.textPrimary,
    fontFamily: 'Poppins_700Bold', // Example heading font
  },
  messageText: {
    color: colors.textPrimary,
    fontFamily: 'Inter_400Regular',
  },
  chatMessage: {
    color: colors.textPrimary,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
  },

  // Kanban-related styles
  kanbanTaskCard: {
    ...commonCardStyle,
    padding: 10,
    marginVertical: 5,
  },
  mainQuestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
    fontFamily: 'Poppins_700Bold',
  },
  kanbanContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kanbanColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  kanbanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
    fontFamily: 'Poppins_700Bold',
  },
  kanbanTask: {
    fontSize: 14,
    color: colors.textMuted,
    marginVertical: 3,
    fontFamily: 'Inter_400Regular',
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
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 5,
    fontFamily: 'Poppins_700Bold',
  },
  cardDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
    fontFamily: 'Inter_400Regular',
  },
  cardQuest: {
    color: colors.textPrimary,
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
  },

  // Chat input & theme selector
  chatInput: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
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
    color: colors.textPrimary,
  },
  colorInput: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
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
    backgroundColor: colors.surfaceLighter,
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
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },

  // Mobile-specific styles
  mobileHeader: {
    height: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  mobileHeaderText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  mobileContent: {
    flex: 1,
    padding: 10,
  },
  mobileNavigation: {
    height: 60,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
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
    backgroundColor: colors.surfaceLighter,
  },
  mobileNavText: {
    color: colors.textPrimary,
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
    backgroundColor: colors.surfaceLight,
  },
  mobileNavText: {
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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

  viewAllQuests: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
  },
  viewAllQuestsText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },

  questTasksContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },

  setMainQuestButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  setMainQuestButtonText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },

  desktopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
  },
  desktopHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  errorText: {
    color: colors.textDanger,
    textAlign: 'center',
    padding: 20,
  },
  
  kanbanContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  kanbanColumn: {
    flex: 1,
    gap: 8,
  },
  kanbanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  kanbanTaskCard: {
    padding: 8,
    backgroundColor: colors.surfaceLight,
  },
  kanbanTask: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  errorText: {
    color: colors.textDanger,
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
  cardQuest: {
    color: colors.textPrimary,
    fontSize: 14,
    marginTop: 4,
  },
  statusTimestamp: {
    color: colors.textPrimary,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    marginBottom: 5,
  },

  aiEntryText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default styles;
