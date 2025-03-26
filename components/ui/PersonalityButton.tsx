import React, { useState, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { PersonalityType, personalities } from '@/services/agents/PersonalityPrompts';
import { personalityService } from '@/services/personalityService';

export function PersonalityButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { themeColor, secondaryColor, textColor } = useTheme();
  const { session } = useSupabase();
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType>('johnny');

  useEffect(() => {
    if (session?.user?.id) {
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
      setIsOpen(false);
    } catch (error) {
      console.error('Error updating personality:', error);
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
            onStartShouldSetResponder={() => true}
            onTouchEnd={e => e.stopPropagation()}
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
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    bottom: 80, // Position above settings button
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
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  personalityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(40, 40, 40, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 8,
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
});