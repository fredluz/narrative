import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Suggestion } from '@/contexts/SuggestionContext';

export interface SuggestionPopupProps {
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  suggestion: Suggestion;
  totalCount: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onAccept: () => void;
  onReject: () => void;
  position?: 'top-right' | 'bottom-right';
  isValid?: boolean;
  children: React.ReactNode;
}

const SuggestionPopup: React.FC<SuggestionPopupProps> = ({
  title,
  icon,
  suggestion,
  totalCount,
  currentIndex,
  onNext,
  onPrev,
  onAccept,
  onReject,
  position = 'bottom-right',
  isValid = true,
  children
}) => {
  const { themeColor, secondaryColor } = useTheme();
  const [expanded, setExpanded] = React.useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  // Run entrance animation when component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      })
    ]).start();
  }, [suggestion.id]); // Re-run when suggestion changes

  // Handle expand/collapse animation
  const toggleExpand = () => {
    Animated.spring(expandAnim, {
      toValue: expanded ? 0 : 1,
      friction: 8,
      tension: 65,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  // Get dynamic styles based on position and animation state
  const containerStyle: ViewStyle = {
    position: 'absolute',
    ...(position === 'top-right' ? { top: 20 } : { bottom: 20 }),
    right: 20,
    width: expandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [320, 400]
    }),
    maxHeight: expandAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [400, 600]
    }),
    opacity: fadeAnim,
    transform: [{ translateX: slideAnim }]
  };

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
        <View style={styles.headerContent}>
          <MaterialIcons name={icon} size={20} color={themeColor} style={styles.headerIcon} />
          <Text style={[styles.headerTitle, { color: themeColor }]}>{title}</Text>
        </View>
        
        <View style={styles.headerActions}>
          {/* Show expand button */}
          <TouchableOpacity onPress={toggleExpand} style={styles.expandButton}>
            <MaterialIcons 
              name={expanded ? 'expand-less' : 'expand-more'} 
              size={20} 
              color="#999" 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content area */}
      <Animated.View style={[
        styles.content,
        {
          maxHeight: expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [280, 480]
          })
        }
      ]}>
        {children}
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Navigation */}
        <View style={styles.navigation}>
          {totalCount > 1 && (
            <>
              <TouchableOpacity onPress={onPrev} style={styles.navButton}>
                <MaterialIcons name="chevron-left" size={20} color="#999" />
              </TouchableOpacity>
              
              <Text style={styles.navText}>
                {currentIndex + 1} / {totalCount}
              </Text>
              
              <TouchableOpacity onPress={onNext} style={styles.navButton}>
                <MaterialIcons name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            onPress={onReject}
            style={[styles.actionButton, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}
          >
            <MaterialIcons name="close" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={onAccept}
            style={[
              styles.actionButton, 
              { backgroundColor: isValid ? themeColor : 'rgba(255, 255, 255, 0.1)' }
            ]}
            disabled={!isValid}
          >
            <MaterialIcons name="check" size={16} color="#fff" />
            <Text style={[styles.actionButtonText, !isValid && { opacity: 0.5 }]}>
              Accept
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 8,
    overflow: 'hidden',
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandButton: {
    padding: 4,
  },
  content: {
    overflow: 'hidden',
  },
  footer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    padding: 4,
  },
  navText: {
    color: '#777',
    fontSize: 12,
    marginHorizontal: 5,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
});

export default SuggestionPopup;