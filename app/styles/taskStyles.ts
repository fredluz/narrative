import { StyleSheet } from 'react-native';
import { colors } from './global';

const commonCardStyle = {
  backgroundColor: colors.card,
  borderRadius: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 3,
};

export const taskStyles = StyleSheet.create({
  container: {
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

  deadline: {
    fontSize: 14,
    color: colors.error,
    marginBottom: 5,
    fontFamily: 'Inter_400Regular',
  },

  questReference: {
    color: colors.text,
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
    fontFamily: 'Inter_400Regular',
  },

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

  location: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 5,
    fontFamily: 'Inter_400Regular',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },

  // Task suggestion specific styles
  suggestionScrollContainer: {
    flexGrow: 1,
    padding: 15,
  },
  
  suggestionLabel: {
    color: '#AAA',
    fontSize: 12,
    marginBottom: 4,
    marginTop: 12,
    fontWeight: '500',
    fontFamily: 'Inter_500Regular',
  },
  
  suggestionInput: {
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFF',
    fontSize: 14,
    padding: 8,
    marginBottom: 12,
    fontFamily: 'Inter_400Regular',
  },
  
  suggestionInputError: {
    borderColor: '#ff6b6b',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  
  suggestionTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
    marginTop: 12,
  },
  
  suggestionDateContainer: {
    flex: 1,
    marginRight: 8,
  },
  
  suggestionDateInput: {
    marginBottom: 0,
    fontFamily: 'Inter_400Regular',
  },
  
  suggestionPriorityContainer: {
    flex: 1,
  },
  
  suggestionPriorityButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 4,
  },
  
  suggestionPriorityButton: {
    flex: 1,
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  
  suggestionPriorityText: {
    fontSize: 12,
    color: '#AAA',
    fontFamily: 'Inter_400Regular',
  },
  
  suggestionSourceInfo: {
    marginTop: 20,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 4,
  },
  
  suggestionSourceText: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'Inter_400Regular',
  },
  
  suggestionSourceBold: {
    fontWeight: 'bold',
    color: '#CCC',
    fontFamily: 'Inter_500Regular',
  },
  
  suggestionUpgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderWidth: 1,
  },
  
  suggestionUpgradeText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter_500Regular',
  }
});
