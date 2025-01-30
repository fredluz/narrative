import { StyleSheet, Platform } from 'react-native';

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
    backgroundColor: '#1E1E1E', // Base dark background
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
    backgroundColor: '#333',
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
    padding: 20,
    backgroundColor: '#222',
    borderRadius: 16,
    // Slightly stronger shadow for main quest
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  // Modern chat bubble styling
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007BFF', // Accent color (can be customized)
    padding: 12,
    borderRadius: 16,
    marginVertical: 5,
    maxWidth: '75%',
    // Font recommendations
    fontFamily: 'Inter_400Regular', // Example UI font
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#444',
    padding: 12,
    borderRadius: 16,
    marginVertical: 5,
    maxWidth: '75%',
    // Font recommendations
    fontFamily: 'Inter_400Regular', // Example UI font
  },
  messageSender: {
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Poppins_700Bold', // Example heading font
  },
  messageText: {
    color: '#FFF',
    fontFamily: 'Inter_400Regular',
  },
  chatMessage: {
    color: '#FFF',
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
  },

  // Kanban-related styles
  kanbanTaskCard: {
    padding: 10,
    backgroundColor: '#333',
    marginVertical: 5,
    borderRadius: 12,
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  mainQuestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
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
    color: '#AAA',
    fontFamily: 'Poppins_700Bold',
  },
  kanbanTask: {
    fontSize: 14,
    color: '#CCC',
    marginVertical: 3,
    fontFamily: 'Inter_400Regular',
  },

  // Task-related styles
  taskContainer: {
    flex: 1,
    marginBottom: 10,
  },
  taskCard: {
    padding: 15,
    backgroundColor: '#444',
    marginBottom: 10,
    borderRadius: 12,
    // Soft shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
    fontFamily: 'Poppins_700Bold',
  },
  cardDetails: {
    fontSize: 14,
    color: '#BBB',
    marginBottom: 5,
    fontFamily: 'Inter_400Regular',
  },
  cardQuest: {
    color: '#FFF',
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
  },

  // Chat input & theme selector
  chatInput: {
    backgroundColor: '#222',
    color: 'white',
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
    color: 'white',
  },
  colorInput: {
    backgroundColor: '#222',
    color: 'white',
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
    backgroundColor: '#444',
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
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },

  // Mobile-specific styles
  mobileHeader: {
    height: 50,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  mobileHeaderText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  mobileContent: {
    flex: 1,
    padding: 10,
  },
  mobileNavigation: {
    height: 60,
    backgroundColor: '#222',
    borderTopWidth: 1,
    borderTopColor: '#333',
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
    backgroundColor: '#444',
  },
  mobileNavText: {
    color: '#FFF',
    fontSize: 14,
  },
  placeholderText: {
    color: '#888',
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
    backgroundColor: '#333',
  },
  mobileNavText: {
    color: 'white',
    fontSize: 16,
  },

  customChatContainer: {
    flex: 1,
    margin: 10,
    backgroundColor: '#333',
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  
  chatHeader: {
    padding: 16,
    backgroundColor: '#2A2A2A',
    borderBottomWidth: 1,
    borderBottomColor: '#444',
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
});

export default styles;
