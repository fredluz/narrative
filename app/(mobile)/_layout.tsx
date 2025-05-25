import React, { useState, useCallback } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, Platform } from 'react-native';
import { Slot, useSegments, useRouter } from 'expo-router';
import MobileLayout from '@/components/layouts/MobileLayout';
import { colors } from '@/app/styles/global'; // For modal styling

// Helper to get screen title from route segments
function deriveScreenTitle(segments: string[]): string {
  if (!segments || segments.length === 0) {
    return 'App'; // Default title
  }
  const lastSegment = segments[segments.length - 1];
  // Capitalize first letter and return
  return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
}

const menuItems = [
  { label: 'Chat', path: '/chat' },
  { label: 'Journal', path: '/journal' },
  { label: 'Tasks', path: '/tasks' },
  // Add more items as new mobile screens are created
];

export default function MobileAppGroupLayout() {
  const segments = useSegments();
  const router = useRouter();
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // Derive title for the MobileLayout header
  // For segments like ['(mobile)', 'chat'], we want the last part.
  // If segments is ['(mobile)'], title becomes 'Mobile' or a default.
  const screenTitle = deriveScreenTitle(segments.filter(s => s !== '(mobile)'));

  const toggleMenu = useCallback(() => {
    setIsMenuVisible(prev => !prev);
  }, []);

  const navigateAndCloseMenu = useCallback((path: string) => {
    router.push(path); // Paths are relative to the (mobile) group
    setIsMenuVisible(false);
  }, [router]);

  return (
    <>
      <MobileLayout title={screenTitle} onOpenMenu={toggleMenu}>
        <Slot />
      </MobileLayout>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isMenuVisible}
        onRequestClose={toggleMenu} // For Android back button
      >
        <Pressable style={styles.modalOverlay} onPress={toggleMenu}>
          <Pressable style={styles.menuContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.menuTitle}>Navigation</Text>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.path}
                style={styles.menuItem}
                onPress={() => navigateAndCloseMenu(item.path)}
              >
                <Text style={styles.menuItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.menuItem, styles.closeButton]} onPress={toggleMenu}>
              <Text style={styles.menuItemText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menuContainer: {
    backgroundColor: colors.cardDark, // Using a color from global styles
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30, // Adjust for status bar
    height: '100%',
    width: '75%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemText: {
    fontSize: 18,
    color: colors.text,
  },
  closeButton: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 0, // No bottom border for the close button itself
  },
}); 