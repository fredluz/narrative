import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { TaskSuggestion } from '@/services/agents/SuggestionAgent';
import { format } from 'date-fns';

interface CompactTaskSuggestionProps {
  suggestion: TaskSuggestion;
  onAccept: () => void;
  onReject: () => void;
  onExpand: () => void;
  onUpgradeToQuest?: () => void;
  isSubmitting?: boolean;
}

const CompactTaskSuggestion: React.FC<CompactTaskSuggestionProps> = ({
  suggestion,
  onAccept,
  onReject,
  onExpand,
  onUpgradeToQuest,
  isSubmitting = false
}) => {
  const { themeColor, secondaryColor } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true
      })
    ]).start();
  }, []);
  
  // Format due date into a readable format
  const dueDate = suggestion.scheduled_for ? 
    format(new Date(suggestion.scheduled_for), 'MMM d') : 
    'Not specified';
    
  return (
    <Animated.View style={[
      styles.container,
      {
        borderColor: themeColor,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      <View style={styles.header}>
        <MaterialIcons name="lightbulb" size={16} color={themeColor} />
        <Text style={[styles.headerText, { color: themeColor }]}>Task Suggestion</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onReject}>
          <MaterialIcons name="close" size={16} color="#999" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {suggestion.title}
        </Text>
        <Text style={styles.dueDate}>Due: {dueDate}</Text>
      </View>
      
      <View style={styles.actions}>
        {/* Show upgrade button only if handler is provided */}
        {onUpgradeToQuest && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.upgradeButton, { backgroundColor: secondaryColor }]}
            onPress={onUpgradeToQuest}
            disabled={isSubmitting}
          >
            <MaterialIcons name="upgrade" size={14} color="#fff" />
            <Text style={styles.actionText}>Quest</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.expandButton]}
          onPress={onExpand}
          disabled={isSubmitting}
        >
          <MaterialIcons name="open-in-full" size={14} color="#fff" />
          <Text style={styles.actionText}>Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            styles.acceptButton, 
            { 
              backgroundColor: themeColor,
              opacity: isSubmitting ? 0.7 : 1 
            }
          ]}
          onPress={onAccept}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 4 }} />
          ) : (
            <MaterialIcons name="check" size={14} color="#fff" />
          )}
          <Text style={styles.actionText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 240,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 6,
    borderLeftWidth: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    flex: 1
  },
  closeButton: {
    padding: 2
  },
  content: {
    padding: 12
  },
  title: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6
  },
  dueDate: {
    color: '#AAA',
    fontSize: 12
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    flex: 1
  },
  expandButton: {
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
  },
  upgradeButton: {
    // Dynamic background color will be applied from props
  },
  acceptButton: {
    // Dynamic background color will be applied from props
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 4
  }
});

export default CompactTaskSuggestion;
