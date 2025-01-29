import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    padding: 10,
  },
  column: {
    flex: 1,
    marginHorizontal: 5,
    height: '100%',
  },
  chatCard: {
    padding: 15,
    backgroundColor: '#333',
    flex: 1,
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
  },
  mainQuestCard: {
    padding: 20,
    backgroundColor: '#222',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#444',
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
  },
  messageSender: {
    fontWeight: 'bold',
    color: '#FFF',
  },
  kanbanTaskCard: {
    padding: 10,
    backgroundColor: '#333',
    marginVertical: 5,
    borderRadius: 5,
  },
  mainQuestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  kanbanContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kanbanColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  messageText: {
    color: '#FFF',
  },
  kanbanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#AAA',
  },
  kanbanTask: {
    fontSize: 14,
    color: '#CCC',
    marginVertical: 3,
  },
  taskContainer: {
    flex: 1,
  },
  taskCard: {
    padding: 15,
    backgroundColor: '#444',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cardDetails: {
    fontSize: 14,
    color: '#BBB',
  },
  cardQuest: {
    color: '#FFF',
    fontSize: 14,
    fontStyle: 'italic',
  },
  chatMessage: {
    color: '#FFF',
    fontStyle: 'italic',
  },
  chatInput: {
    backgroundColor: '#222',
    color: 'white',
    marginVertical: 10,
    padding: 5,
    borderRadius: 5,
  },
  themeSelector: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  colorInput: {
    backgroundColor: '#222',
    color: 'white',
    padding: 5,
    borderRadius: 5,
  },
  taskListContainer: {
    flex: 1,
    alignItems: 'center',
  },
  toggleButton: {
    backgroundColor: '#444',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default styles;
