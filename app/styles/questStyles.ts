import { StyleSheet, Platform } from 'react-native';
import { colors, colorMappings } from './global';

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
});
