import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { ColorPicker } from './ColorPicker';
import { authService } from '@/services/authService';
import { PersonalityType, personalities } from '@/services/agents/PersonalityPrompts';
import { personalityService } from '@/services/personalityService';

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { themeColor, secondaryColor, setThemeColor, setSecondaryColor, textColor } = useTheme();
  const { session } = useSupabase();
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType>('johnny');

  React.useEffect(() => {
    if (session?.user?.id) {
      // Load current personality on mount
      personalityService.getUserPersonality(session.user.id).then(personality => {
        setSelectedPersonality(personality);
      });
    }
  }, [session?.user?.id]);

  const handlePersonalityChange = async (personality: PersonalityType) => {
    if (!session?.user?.id) return;
    
    try {
      await personalityService.setUserPersonality(session.user.id, personality);
      setSelectedPersonality(personality);
    } catch (error) {
      console.error('Error updating personality:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await authService.signOut();
      if (error) throw error;
      setIsOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
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
            onStartShouldSetResponder={() => true}
            onTouchEnd={e => e.stopPropagation()}
          >
            {/* Theme Color Settings */}
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
            
            {/* AI Personality Selection */}
            <Text style={[styles.label, { color: textColor }]}>AI Personality</Text>
            <View style={styles.personalityContainer}>
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
                      'security'
                    }
                    size={20} 
                    color={selectedPersonality === personality ? secondaryColor : '#777'}
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
            
            {/* Logout Button */}
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
  personalityContainer: {
    marginBottom: 20,
    gap: 8,
  },
  personalityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  personalityIcon: {
    marginRight: 12,
  },
  personalityName: {
    color: '#AAA',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  personalityDescription: {
    color: '#666',
    fontSize: 12,
    lineHeight: 16,
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
});
