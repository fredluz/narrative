import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { TaskSuggestion } from '@/services/agents/SuggestionAgent';
import { format } from 'date-fns';

// UPDATED Props Interface
interface CompactTaskSuggestionProps {
  suggestion: TaskSuggestion;
  onAccept?: () => void; // Made optional
  onReject?: () => void; // Made optional
  onExpand?: () => void; // Made optional
  onUpgradeToQuest?: () => void; // Already optional
  // NEW Props
  isAccepting?: boolean;
  isPendingQuest?: boolean;

  // Kept for consistency, but disabling logic will use isAccepting now
  isSubmitting?: boolean; // DEPRECATED: Use isAccepting instead
}

const CompactTaskSuggestion: React.FC<CompactTaskSuggestionProps> = ({
  suggestion,
  onAccept,
  onReject,
  onExpand,
  onUpgradeToQuest,
  // NEW props destructured
  isAccepting = false,
  isPendingQuest = false,
}) => {
  const { themeColor, secondaryColor } = useTheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(20)).current;

  // Combine loading/pending states for disabling
  const isDisabled = isAccepting || isPendingQuest;

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
        transform: [{ translateY: slideAnim }],
        // Optional: Add visual indication if disabled
        // opacity: isDisabled ? 0.7 : 1,
      }
    ]}>
      <View style={styles.header}>
        <MaterialIcons name="lightbulb" size={16} color={themeColor} />
        <Text style={[styles.headerText, { color: themeColor }]}>Task Suggestion</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onReject}
          disabled={isAccepting} // Only disable reject if actively accepting
        >
          <MaterialIcons name="close" size={16} color={isDisabled ? "#666" : "#999"} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {suggestion.title}
        </Text>
        <Text style={styles.dueDate}>
            Due: {dueDate} {isPendingQuest && <Text style={styles.pendingText}>(Quest Pending)</Text>}
        </Text>
      </View>

      <View style={styles.actions}>
        {/* Show upgrade button only if handler is provided AND not disabled */}
        {onUpgradeToQuest && (
          <TouchableOpacity
            style={[
                styles.actionButton,
                styles.upgradeButton,
                { backgroundColor: isDisabled ? '#555' : secondaryColor } // Use combined disable state
            ]}
            onPress={onUpgradeToQuest}
            disabled={isDisabled} // Disable based on combined state
          >
            <MaterialIcons name="upgrade" size={14} color="#fff" />
            <Text style={styles.actionText}>Quest</Text>
          </TouchableOpacity>
        )}

        {/* Expand Button */}
        <TouchableOpacity
          style={[
              styles.actionButton,
              styles.expandButton,
              { backgroundColor: isAccepting ? '#555' : 'rgba(50, 50, 50, 0.8)' } // Dim only if accepting
          ]}
          onPress={onExpand}
          disabled={isAccepting} // Only disable expand if actively accepting
        >
          <MaterialIcons name="open-in-full" size={14} color="#fff" />
          <Text style={styles.actionText}>Details</Text>
        </TouchableOpacity>

        {/* Accept Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.acceptButton,
            {
              backgroundColor: isDisabled ? '#555' : themeColor, // Dim if disabled
              opacity: isAccepting ? 0.7 : 1 // Keep opacity change only for accepting state
            }
          ]}
          onPress={onAccept}
          disabled={isDisabled} // Disable if accepting or quest is pending
        >
          {isAccepting ? (
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
    // width: 240, // Let it size based on content or parent
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 6,
    borderLeftWidth: 3,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    marginHorizontal: 4, // Add some spacing if needed
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
  pendingText: {
    color: '#FFA726', // Orange color for pending status
    fontStyle: 'italic',
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
    paddingVertical: 8,
    paddingHorizontal: 10, // Adjust padding
    flex: 1, // Let buttons share space
    minWidth: 70, // Ensure minimum tap area
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
    marginLeft: 4,
    fontWeight: 'bold', // Make text bolder
  }
});

export default CompactTaskSuggestion;