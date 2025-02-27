import { StyleSheet } from 'react-native';
import { colors } from './global';

export const journalStyles = StyleSheet.create({
  // Journal panel styles
  journalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  journalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  updateButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },

  updateButtonText: {
    fontWeight: '600',
  },

  // Journal screen styles
  container: {
    flex: 1,
    padding: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    paddingBottom: 15,
  },

  contentContainer: {
    flex: 1,
  },

  dateList: {
    paddingVertical: 15,
    paddingHorizontal: 8,
  },

  dateButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
  },

  dateText: {
    color: '#DDD',
    fontWeight: '600',
  },

  entryContainer: {
    flex: 1,
    minHeight: 200, // added minimum height for visibility
    padding: 20,
    borderRadius: 8,
    position: 'relative',
    backgroundColor: '#1E1E1E',
    marginBottom: 10,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 10,
  },

  entryScrollView: {
    flex: 1,
    marginBottom: 60,
    paddingBottom: 20,
  },

  entryText: {
    fontSize: 16,
    color: '#E5E5E5',
    lineHeight: 22,
    marginBottom: 20,
  },

  aiEntryText: {
    fontSize: 15,
    color: '#BBB',
    fontStyle: 'italic',
    backgroundColor: 'rgba(15, 15, 15, 0.6)',
    padding: 12,
    borderRadius: 5,
    borderLeftWidth: 2,
    borderColor: 'rgba(220, 0, 50, 0.7)',
    marginTop: 20,
    shadowColor: 'rgba(220, 0, 50, 0.3)',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.6,
    shadowRadius: 5,
  },

  noEntryText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 50,
  },

  entryInput: {
    fontSize: 16,
    padding: 15,
    paddingTop: 15,
    backgroundColor: 'rgba(25, 25, 25, 0.7)',
    color: '#E0E0E0',
    borderRadius: 5,
    height: 300,
    textAlignVertical: 'top',
    lineHeight: 22,
    borderLeftWidth: 2,
  },

  editButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498DB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
  },

  saveButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },

  buttonText: {
    color: '#FFF',
    marginLeft: 6,
    fontWeight: '600',
  },

  newEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: '#2E86C1',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },

  newEntryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 5,
  },

  titleInput: {
    fontSize: 22,
    padding: 10,
    marginBottom: 15,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    color: '#F0F0F0',
    borderRadius: 5,
    borderLeftWidth: 3,
    paddingLeft: 15,
    fontWeight: 'bold',
  },
  
  displayedTitle: {
    fontSize: 22,
    color: '#F0F0F0',
    marginBottom: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
