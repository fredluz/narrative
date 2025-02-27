import { StyleSheet } from 'react-native';
import { colors } from './global';

export const questStyles = StyleSheet.create({
  mainQuestContainer: {
    flex: 2,
    marginBottom: 10,
  },

  mainQuestCard: {
    backgroundColor: colors.surface,
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
    color: colors.textPrimary,
    marginBottom: 10,
    fontFamily: 'Poppins_700Bold',
  },

  questDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 5,
    fontFamily: 'Inter_400Regular',
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
    color: colors.textSecondary,
    fontFamily: 'Poppins_700Bold',
  },

  kanbanTaskCard: {
    padding: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 8,
  },

  kanbanTask: {
    color: colors.textPrimary,
    fontSize: 14,
    marginVertical: 3,
    fontFamily: 'Inter_400Regular',
  },

  statusTimestamp: {
    color: colors.textPrimary,
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    marginBottom: 5,
  },

  deadline: {
    color: colors.textDanger,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  }
});
