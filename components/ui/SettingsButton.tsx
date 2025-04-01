import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Removed MaterialIcons if not used elsewhere
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk
import { ColorPicker } from './ColorPicker';
import { PersonalityButton } from './PersonalityButton';

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { themeColor, secondaryColor, setThemeColor, setSecondaryColor, textColor } = useTheme();
  const { signOut } = useAuth(); // Get signOut from Clerk

  const handleLogout = async () => {
    try {
      await signOut(); // Use Clerk's signOut
      setIsOpen(false);
      // No need to check for error explicitly here, Clerk handles errors internally or throws
    } catch (error) {
      console.error('Error signing out with Clerk:', error);
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
          <TouchableOpacity 
            style={styles.popup}
            activeOpacity={1}
            onPress={(e) => {
              // Prevent click from propagating to overlay
              e.stopPropagation();
            }}
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
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textColor }]}></Text>
              <PersonalityButton />
            </View>
            <TouchableOpacity 
              style={[styles.logoutButton, { borderColor: themeColor }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color={themeColor} />
              <Text style={[styles.logoutText, { color: themeColor }]}>Logout</Text>
            </TouchableOpacity>
          </TouchableOpacity>
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
  section: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
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
