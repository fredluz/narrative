import React, { useState, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk
import { PersonalityType, personalities } from '@/services/agents/PersonalityPrompts';
import { personalityService } from '@/services/personalityService';

export function PersonalityButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { themeColor, secondaryColor, textColor } = useTheme();
  const { userId } = useAuth(); // Get userId from Clerk
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType>('johnny');

  useEffect(() => {
    // Fetch personality when userId is available
    if (userId) {
      personalityService.getUserPersonality(userId).then(personality => {
        setSelectedPersonality(personality);
      }).catch(error => {
        console.error("Error fetching user personality:", error);
        // Handle error appropriately, maybe default to 'johnny'
        setSelectedPersonality('johnny');
      });
    } else {
      // Handle case where user is not logged in (userId is null)
      setSelectedPersonality('johnny'); // Default personality
    }
  }, [userId]); // Depend on userId

  const handlePersonalityChange = async (personality: PersonalityType) => {
    // Use userId directly
    if (!userId) {
        console.error("Cannot change personality: User not logged in.");
        return;
    }

    try {
      await personalityService.setUserPersonality(userId, personality); // Use userId
      setSelectedPersonality(personality);
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating personality:', error);
      // Optionally show an error message to the user
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setIsOpen(!isOpen)}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: themeColor },
          pressed && styles.pressed
        ]}>
        <MaterialIcons name="psychology" size={24} color={textColor} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[styles.popup, { borderColor: themeColor }]}
            onStartShouldSetResponder={() => true} // Prevents touches from passing through on native
            onTouchEnd={e => e.stopPropagation()} // Prevents touches from passing through on web/native
          >
            <Text style={[styles.title, { color: textColor }]}>Select AI Personality</Text>

            {(Object.keys(personalities) as PersonalityType[]).map((personality) => (
              <TouchableOpacity
                key={personality}
                style={[
                  styles.personalityButton,
                  selectedPersonality === personality && {
                    backgroundColor: themeColor,
                    borderColor: secondaryColor,
                  }
                ]}
                onPress={() => handlePersonalityChange(personality)}
              >
                <MaterialIcons
                  name={
                    personality === 'johnny' ? 'person' :
                    personality === 'bt7274' ? 'smart-toy' :
                    'security' // Default icon or adjust as needed
                  }
                  size={20}
                  color={selectedPersonality === personality ? (secondaryColor || '#FFF') : '#777'} // Ensure secondaryColor fallback
                  style={styles.personalityIcon}
                />
                <View>
                  <Text style={[
                    styles.personalityName,
                    selectedPersonality === personality && { color: '#FFF' }
                  ]}>
                    {personalities[personality].name}
                  </Text>
                  <Text style={styles.personalityDescription} numberOfLines={2}>
                    {personalities[personality].description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    backgroundColor: '#333', // Consider using themeColor here?
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Slightly darker overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: '#282828', // Slightly darker popup background
    padding: 20,
    borderRadius: 16,
    width: 320, // Slightly wider
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, // Slightly increased shadow
    shadowRadius: 12,
    elevation: 10, // Increased elevation
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20, // More space below title
    textAlign: 'center',
  },
  personalityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(50, 50, 50, 0.9)', // Darker button background
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555', // Darker border
    marginBottom: 10, // Increased spacing
  },
  personalityIcon: {
    marginRight: 12,
  },
  personalityName: {
    color: '#CCC', // Lighter text for name
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  personalityDescription: {
    color: '#888', // Lighter description text
    fontSize: 12,
    lineHeight: 16,
  },
});
