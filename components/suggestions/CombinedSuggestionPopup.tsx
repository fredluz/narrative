import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { QuestSuggestion, useSuggestions } from '@/contexts/SuggestionContext';
import QuestSuggestionPopup from './QuestSuggestionPopup';

const CombinedSuggestionPopup: React.FC = () => {
  const { 
    currentQuestSuggestion, 
    combinedSuggestionActive,
    acceptQuestSuggestion,
    rejectQuestSuggestion
  } = useSuggestions();
  
  const { themeColor } = useTheme();
  const [expanded, setExpanded] = useState(true);
  
  // Only show when we have an active combined suggestion
  if (!combinedSuggestionActive || !currentQuestSuggestion) return null;
  
  return (
    <View style={styles.overlay}>
      <View style={[styles.container, { borderColor: themeColor }]}>
        <View style={[styles.header, { backgroundColor: themeColor }]}>
          <View style={styles.headerContent}>
            <MaterialIcons name="upgrade" size={20} color="#FFF" style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Upgraded to Quest</Text>
          </View>
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <MaterialIcons 
              name={expanded ? 'expand-less' : 'expand-more'} 
              size={22} 
              color="#FFF" 
            />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.upgradeMessage}>
            Your task was successfully upgraded to a quest with related subtasks.
          </Text>
          
          {expanded && (
            <View style={styles.questPreview}>
              <Text style={styles.previewTitle}>{currentQuestSuggestion.title}</Text>
              <Text style={styles.previewTagline}>{currentQuestSuggestion.tagline}</Text>
              
              {currentQuestSuggestion.relatedTasks && currentQuestSuggestion.relatedTasks.length > 0 && (
                <View style={styles.tasksList}>
                  <Text style={styles.tasksHeader}>Related Tasks:</Text>
                  {currentQuestSuggestion.relatedTasks.map(task => (
                    <View key={task.id} style={styles.taskItem}>
                      <MaterialIcons name="check-circle-outline" size={16} color="#AAA" style={{ marginRight: 8 }} />
                      <Text style={styles.taskText}>{task.title}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.button, styles.editButton]}
            onPress={() => {
              // Hide this popup but keep the quest suggestion for regular edit
              setExpanded(false);
            }}
          >
            <MaterialIcons name="edit" size={16} color="#FFF" />
            <Text style={styles.buttonText}>Edit Details</Text>
          </TouchableOpacity>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              onPress={() => rejectQuestSuggestion(currentQuestSuggestion.id)}
              style={[styles.actionButton, styles.rejectButton]}
            >
              <MaterialIcons name="close" size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => acceptQuestSuggestion(currentQuestSuggestion)}
              style={[styles.actionButton, styles.acceptButton, { backgroundColor: themeColor }]}
            >
              <MaterialIcons name="check" size={16} color="#FFF" />
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* The normal quest suggestion popup is still available for editing details */}
      <QuestSuggestionPopup />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  upgradeMessage: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  questPreview: {
    backgroundColor: 'rgba(40, 40, 40, 0.6)',
    padding: 16,
    borderRadius: 8,
  },
  previewTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewTagline: {
    color: '#CCC',
    fontSize: 14,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  tasksList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  tasksHeader: {
    color: '#DDD',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskText: {
    color: '#BBB',
    fontSize: 14,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 4,
  },
  editButton: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 6,
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 4,
  },
  rejectButton: {
    backgroundColor: '#555',
  },
  acceptButton: {
    // Background color is set dynamically
  },
});

export default CombinedSuggestionPopup;