import { StyleSheet } from 'react-native';
import { colors, colorMappings } from './global';

const commonCardStyle = {
  backgroundColor: colors.card, // Changed from colors.surface to colors.card
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
    color: colors.text, // Changed from colors.textPrimary to colors.text
    marginBottom: 5,
    fontFamily: 'Poppins_700Bold',
  },

  cardDetails: {
    fontSize: 14,
    color: colors.textMuted, // Changed from colors.textSecondary to colors.textMuted
    marginBottom: 5,
    fontFamily: 'Inter_400Regular',
  },

  deadline: {
    fontSize: 14,
    color: colors.error, // Changed from colors.textDanger to colors.error
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
    backgroundColor: colors.cardDark, // Changed from colors.surfaceLighter to colors.cardDark
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
    color: colors.text, // Changed from colors.textPrimary to colors.text
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },

  location: {
    fontSize: 14,
    color: colors.textMuted, // Changed from colors.textSecondary to colors.textMuted
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
    color: colors.error, // Changed from colors.textDanger to colors.error
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  }
});
