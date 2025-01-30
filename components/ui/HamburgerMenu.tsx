import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform, useWindowDimensions, ViewStyle } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
  withTiming,
  Easing
} from 'react-native-reanimated';

import { IconSymbol } from './IconSymbol';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTheme } from '@/contexts/ThemeContext';

const MENU_ITEMS = [
  { name: 'Notifications', icon: 'bell.fill', route: '/notification' },
  { name: 'Quests', icon: 'flag', route: '/(app)/quests' },
  { name: 'Tasks', icon: 'list.bullet', route: '/(app)/tasks' },
  { name: 'Routine', icon: 'clock', route: '/(app)/routine' },
  { name: 'Journal', icon: 'book', route: '/(app)/journal' },
  { name: 'Profile', icon: 'person', route: '/(app)/profile' },
  { name: 'Settings', icon: 'gear', route: '/(app)/settings' },
] as const;

export function HamburgerMenu() {
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS === 'ios' || Platform.OS === 'android' || width < 768;
  const [isOpen, setIsOpen] = useState(false);
  const menuAnimation = useSharedValue(0);
  const { themeColor } = useTheme(); // Fix: correctly destructure from useTheme

  const menuStyle = useAnimatedStyle(() => ({
    opacity: withTiming(menuAnimation.value, {
      duration: 200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    }),
    transform: [
      { 
        translateY: withSpring(menuAnimation.value * -500, { // Increased from -300
          damping: 15,
          stiffness: 100,
        })
      }
    ],
  }));

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    menuAnimation.value = isOpen ? 0 : 1;
  };

  const buttonStyle = (pressed: boolean): ViewStyle => ({
    ...styles.hamburgerButton,
    ...(isMobile && styles.hamburgerButtonMobile),
    ...(pressed && styles.hamburgerButtonPressed),
    backgroundColor: themeColor,
    shadowColor: themeColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  });

  return (
    <View style={[
      styles.container,
      isMobile && styles.containerMobile
    ]}>
      <Pressable 
        onPress={toggleMenu} 
        style={({ pressed }) => buttonStyle(pressed)}>
        <IconSymbol 
          name={isOpen ? "xmark" : "line.3.horizontal"} 
          size={24} 
          color="#fff" 
        />
      </Pressable>

      {isOpen && (
        <Animated.View 
          pointerEvents="box-none"
          style={[
            styles.menu,
            isMobile && styles.menuMobile,
            menuStyle
          ]}>
          {MENU_ITEMS.map((item) => (
            <Pressable
              key={item.name}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed
              ]}
              onPress={() => {
                router.push(item.route as any);
                toggleMenu();
              }}>
              <IconSymbol name={item.icon} size={20} color="#fff" />
              <Text style={styles.menuText}>{item.name}</Text>
            </Pressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 1000,
  },
  menu: {
    position: 'absolute',
    top: 60,
    right: 0,
    backgroundColor: Colors.light.background,
    borderRadius: 16,
    padding: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#333',
  },
  menuItemPressed: {
    backgroundColor: '#444',
  },
  menuText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  containerMobile: {
    position: 'relative',
    right: 0,
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  menuMobile: {
    position: 'absolute',
    bottom: 120, // Increased from 60
    right: -70, // Centers the 200px wide menu relative to the 60px wide container
    backgroundColor: '#222',
    borderColor: '#333',
    borderWidth: 1,
    width: 200,
    minHeight: 280,
    padding: 8,
    borderRadius: 12,
    zIndex: 2000,
  },
  hamburgerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  hamburgerButtonMobile: {
    width: 40,
    height: 40,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
  },
  hamburgerButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
