import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { ColorPicker } from './ColorPicker';

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { themeColor, secondaryColor, setThemeColor, setSecondaryColor, textColor } = useTheme();

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
});
