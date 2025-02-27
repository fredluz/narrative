import { StyleSheet } from 'react-native';
import { colors } from './global';

const commonCardStyle = {
  backgroundColor: colors.surface,
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

  deadline: {
    fontSize: 14,
    color: colors.textDanger,
    marginBottom: 5,
    fontFamily: 'Inter_400Regular',
  },

  questReference: {
    color: colors.textPrimary,
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
    backgroundColor: colors.surfaceLighter,
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
    color: colors.textPrimary,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },

  location: {
    fontSize: 14,
    color: colors.textSecondary,
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
    color: colors.textDanger,
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  }
});
