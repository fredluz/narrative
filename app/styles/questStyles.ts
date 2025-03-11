import { StyleSheet, Platform, Dimensions } from 'react-native';
import { colors, colorMappings } from './global';

// Get the screen height
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define fallback fonts based on platform
const fontFamilies = {
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'Inter_400Regular'
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'Inter_500Regular'
  }),
  semiBold: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'Poppins_600SemiBold'
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'Poppins_700Bold'
  })
};

export const questStyles = StyleSheet.create({
  mainQuestContainer: {
    flex: 2,
    marginBottom: 10,
  },

  mainQuestCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  mainQuestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    fontFamily: fontFamilies.bold,
  },

  questDetails: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 5,
    fontFamily: fontFamilies.regular,
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
    fontFamily: fontFamilies.bold,
  },

  questTasksContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  setMainQuestButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 10,
  },

  setMainQuestButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: fontFamilies.bold,
  },

  // Kanban styles for quest tasks
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
    color: colors.textMuted,
    fontFamily: fontFamilies.bold,
  },

  kanbanTaskCard: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 8,
  },

  kanbanTask: {
    color: colors.text,
    fontSize: 14,
    marginVertical: 3,
    fontFamily: fontFamilies.regular,
  },

  statusTimestamp: {
    color: colors.text,
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    marginBottom: 5,
  },

  deadline: {
    color: colors.error,
    fontSize: 12,
    fontFamily: fontFamilies.regular,
  },
  
  // Add missing Kanban board styles referenced in KanbanBoard.tsx
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
  
  emptyBoardText: {
    color: colors.textMuted,
    marginTop: 10,
    fontSize: 16,
    fontStyle: 'italic',
    fontFamily: fontFamilies.regular,
  },
  
  columnFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 10,
  },
  
  columnFilterText: {
    fontSize: 14,
    fontFamily: fontFamilies.medium,
  },
  
  emptyColumn: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.5)',
    borderRadius: 8,
    marginVertical: 5,
  },
  
  emptyColumnText: {
    color: colors.textMuted,
    fontStyle: 'italic',
    fontSize: 14,
    fontFamily: fontFamilies.regular,
  },
  
  taskItem: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: fontFamilies.semiBold,
    marginBottom: 4,
  },
  
  taskDescription: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: fontFamilies.regular,
    marginBottom: 6,
  },
  
  taskStatusIcon: {
    marginLeft: 10,
    justifyContent: 'center',
  },

  cardHeader: {
    padding: 16, 
    borderBottomWidth: 1,
  },
  
  questTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: fontFamilies.bold,
  },

  // Suggestion Popup Styles - Combined and deduplicated
  suggestionPopupContainer: {
    position: 'absolute',
    backgroundColor: colors.cardDark,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    width: 400,
    maxHeight: SCREEN_HEIGHT * 0.8, // Convert 80vh to 80% of screen height
    marginBottom: 16,
  },
  
  suggestionPopupTopRight: {
    top: 20,
    right: 20,
    zIndex: 1000,
  },
  
  suggestionPopupBottomRight: {
    bottom: 100,
    right: 20,
  },
  
  suggestionPopupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  
  suggestionPopupHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  suggestionPopupHeaderIcon: {
    marginRight: 8,
  },
  
  suggestionPopupHeaderTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
    fontFamily: fontFamilies.bold,
  },
  
  suggestionPopupContent: {
    padding: 16,
    flexGrow: 1,
  },

  // Form Fields
  label: {
    fontSize: 14,
    marginBottom: 4,
    fontFamily: fontFamilies.regular,
  },
  
  input: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    fontFamily: fontFamilies.regular,
    color: colors.text,
  },
  
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  
  dateField: {
    flex: 1,
  },

  // Related Tasks Section
  relatedTasksContainer: {
    marginBottom: 16,
  },
  
  relatedTaskItem: {
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#444',
  },
  
  relatedTaskTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
    fontFamily: fontFamilies.bold,
  },
  
  relatedTaskDescription: {
    fontSize: 12,
    color: '#888',
    fontFamily: fontFamilies.regular,
  },

  // Source Info Section
  suggestionSourceInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 4,
  },
  
  suggestionSourceText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    fontFamily: fontFamilies.regular,
  },
  
  suggestionSourceBold: {
    fontWeight: 'bold',
    color: '#AAA',
    fontFamily: fontFamilies.bold,
  },

  // Action Buttons
  suggestionActionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  
  suggestionActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  suggestionActionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: fontFamilies.bold,
  },
  
  disabledButton: {
    opacity: 0.5,
  },

  // Error States
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    fontFamily: fontFamilies.regular,
  },

  // Loading State
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  
  loadingText: {
    color: '#fff',
    marginTop: 8,
    fontFamily: fontFamilies.regular,
  },
});
