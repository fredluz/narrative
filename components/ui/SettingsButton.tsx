import React, { useState, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { ColorPicker } from './ColorPicker';
import { authService } from '@/services/authService';
import { personalityService } from '@/services/personalityService';
import { PersonalityType } from '@/services/agents/PersonalityPrompts';

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPersonality, setCurrentPersonality] = useState('TFRobot');
  const { themeColor, secondaryColor, setThemeColor, setSecondaryColor, textColor } = useTheme();
  const { session } = useSupabase();

  // Fetch current personality on mount
  useEffect(() => {
    if (session?.user?.id) {
      personalityService.getUserPersonality(session.user.id)
        .then(personality => {
          setCurrentPersonality(personality);
        })
        .catch(error => {
          console.error('Error getting personality:', error);
        });
    }
  }, [session?.user?.id]);

  const handleLogout = async () => {
    try {
      const { error } = await authService.signOut();
      if (error) throw error;
      setIsOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handlePersonalityChange = async (personality: PersonalityType) => {
    console.log('Attempting to change personality to:', personality);
    if (!session?.user?.id) return;
    try {
      await personalityService.setUserPersonality(session.user.id, personality);
      setCurrentPersonality(personality);
      console.log('Successfully set personality to:', personality);
    } catch (error) {
      console.error('Error updating personality:', error);
    }
  };

  const getDisplayName = (personality: string) => {
    switch (personality) {
      case 'TFRobot':
        return 'BT';
      case 'johnny':
        return 'Johnny';
      case 'batman':
        return 'Batman';
      default:
        return personality;
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
        <Ionicons name="settings" size={24} color={textColor} />
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
            style={styles.popup}
          >
            <ColorPicker
              color={themeColor}
              onColorChange={setThemeColor}
              label="Primary Theme Color"
              textColor={textColor}
            />
            <ColorPicker
              color={secondaryColor}
              onColorChange={setSecondaryColor}
              label="Secondary Theme Color"
              textColor={textColor}
            />

            {/* Personality Selector */}
            <View style={styles.personalityContainer}>
              <Text style={[styles.label, { color: textColor }]}>AI Personality</Text>
              <View style={styles.personalityButtons}>
                {['TFRobot', 'johnny', 'batman'].map((personality) => (
                  <Pressable
                    key={personality}
                    style={[
                      styles.personalityButton,
                      { borderColor: themeColor },
                      personality === currentPersonality && {
                        backgroundColor: `${themeColor}20`, // 20 is hex for 12% opacity
                      }
                    ]}
                    onPress={() => handlePersonalityChange(personality as PersonalityType)}
                  >
                    <Text style={[
                      styles.personalityText, 
                      { color: themeColor },
                      personality === currentPersonality && { fontWeight: '700' }
                    ]}>
                      {getDisplayName(personality)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            
            {/* Logout button */}
            <Pressable 
              style={[styles.logoutButton, { borderColor: themeColor }]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color={themeColor} />
              <Text style={[styles.logoutText, { color: themeColor }]}>Logout</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    bottom: 20,
    zIndex: 1000,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: '#222',
    padding: 20,
    borderRadius: 16,
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    color: '#fff',
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  pickerContainer: {
    height: 300,
    marginBottom: 16,
  },
  currentColor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorText: {
    color: '#fff',
    fontSize: 14,
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#444',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  personalityContainer: {
    marginBottom: 20,
  },
  personalityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  personalityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalityText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
