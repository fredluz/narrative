import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

interface ThemeContextType {
  themeColor: string;
  secondaryColor: string;
  setThemeColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  textColor: string;
}

const ThemeContext = createContext<ThemeContextType>({
  themeColor: '#2c8c0f',
  secondaryColor: '#35b8bf',
  setThemeColor: () => {},
  setSecondaryColor: () => {},
  textColor: '#fff',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColorState] = useState('#2c8c0f');
  const [secondaryColor, setSecondaryColorState] = useState('#35b8bf');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved colors
    const loadColors = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themeColor');
        const savedSecondary = await AsyncStorage.getItem('secondaryColor');
        if (savedTheme) setThemeColorState(savedTheme);
        if (savedSecondary) setSecondaryColorState(savedSecondary);
      } catch (error) {
        console.error('Error loading theme colors:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadColors();
  }, []);

  const setThemeColor = async (color: string) => {
    setThemeColorState(color);
    try {
      await AsyncStorage.setItem('themeColor', color);
    } catch (error) {
      console.error('Error saving theme color:', error);
    }
  };

  const setSecondaryColor = async (color: string) => {
    setSecondaryColorState(color);
    try {
      await AsyncStorage.setItem('secondaryColor', color);
    } catch (error) {
      console.error('Error saving secondary color:', error);
    }
  };

  const isDark = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#181818' }}>
        <ActivityIndicator size="large" color="#2c8c0f" />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={{ 
      themeColor, 
      secondaryColor,
      setThemeColor,
      setSecondaryColor,
      textColor: isDark(themeColor) ? '#fff' : '#000'
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
