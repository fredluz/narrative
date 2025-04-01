import React, { useState } from 'react';
import { View, Pressable, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@clerk/clerk-expo'; // Import useAuth from Clerk
import { ColorPicker } from './ColorPicker';
import { PersonalityButton } from './PersonalityButton';

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'colors'>('main'); // State for view
  const { themeColor, secondaryColor, setThemeColor, setSecondaryColor, textColor } = useTheme();
  const { signOut } = useAuth(); // Get signOut from Clerk

  const handleLogout = async () => {
    try {
      await signOut(); // Use Clerk's signOut
      setIsOpen(false);
      setCurrentView('main'); // Reset view on close/logout
    } catch (error) {
      console.error('Error signing out with Clerk:', error);
    }
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setCurrentView('main'); // Reset view on close
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
        onRequestClose={handleCloseModal}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={handleCloseModal}
        >
          <TouchableOpacity
            style={[styles.popup, { backgroundColor: '#222' }]} // Use secondary color for popup background
            activeOpacity={1}
            onPress={(e) => {
              // Prevent click from propagating to overlay
              e.stopPropagation();
            }}
          >
            {currentView === 'main' && (
              <>
                <TouchableOpacity
                  style={[styles.menuButton,{ backgroundColor: themeColor, borderColor: themeColor }]}
                  onPress={() => setCurrentView('colors')}
                   activeOpacity={0.7}
                 >
                   <Ionicons name="color-palette-outline" size={20} color={'#000000'} />
                 </TouchableOpacity>
                 <View style={styles.section}>
                  {/* <Text style={[styles.sectionTitle, { color: textColor }]}>AI Personality</Text> */}
                  <PersonalityButton />
                </View>
                <TouchableOpacity
                  style={[styles.logoutButton, { backgroundColor: '#990000', borderColor: themeColor }]}
                  onPress={handleLogout}
                   activeOpacity={0.7}
                 >
                   <Ionicons name="log-out-outline" size={20} color={'#000000'} /> {/* Use textColor */}
                   <Text style={[styles.logoutText, { color: textColor }]}>Logout</Text> {/* Use textColor */}
                 </TouchableOpacity>
               </>
            )}

            {currentView === 'colors' && (
              <>
                <TouchableOpacity
                  style={[styles.backButton, { borderColor: themeColor }]}
                  onPress={() => setCurrentView('main')}
                   activeOpacity={0.7}
                 >
                   <Ionicons name="arrow-back-outline" size={20} color={'#AAAAAA'} /> {/* Use textColor */}
                   <Text style={[styles.backButtonText, { color: '#AAAAAA' }]}>Back</Text> {/* Use textColor */}
                 </TouchableOpacity>
                 <ColorPicker
                  color={themeColor}
                  onColorChange={setThemeColor}
                  label="Primary Theme Color"
                  textColor={'#AAAAAA'}
                />
                <ColorPicker
                  color={secondaryColor}
                  onColorChange={setSecondaryColor}
                  label="Secondary Theme Color"
                  textColor={'#AAAAAA'}
                />
              </>
            )}
          </TouchableOpacity>
        </Pressable>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    position: 'absolute', // Keep settings button positioned absolutely
    left: 20,
    bottom: 20,
    zIndex: 1000, // Ensure it's above other content
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
    elevation: 5, // Android shadow
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center', // Center content horizontally
  },
  popup: {
    // backgroundColor set dynamically now
    padding: 20,
    borderRadius: 16, // Rounded corners for the popup
    width: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8, // Android shadow for popup
  },
  label: { // Style for ColorPicker labels (if needed, though ColorPicker might handle its own)
    color: '#fff',
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  menuButton: { // Style for the new "Customize Theme Colors" button
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Subtle background
    marginBottom: 20, // Space before next section
  },
  menuButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: { // Style for the "Back" button in the color view
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'center', // Align left is more common for back buttons
    paddingVertical: 10, // Slightly smaller padding
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 15, // Space before color pickers
    alignSelf: 'flex-start', // Align button to the left
  },
  backButtonText: {
    marginLeft: 6,
    fontSize: 14, // Slightly smaller text
    fontWeight: '500',
  },
  section: {
    marginTop: 16, // Adjusted spacing
    marginBottom: 16, // Adjusted spacing
  },
  sectionTitle: { // Style for section titles (like "AI Personality" if uncommented)
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  // Removed unused personality styles as PersonalityButton is self-contained
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20, // Space above logout
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // Subtle background
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
});
