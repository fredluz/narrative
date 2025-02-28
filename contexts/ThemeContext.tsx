import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  themeColor: string;
  secondaryColor: string;
  setThemeColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  textColor: string;
}

const ThemeContext = createContext<ThemeContextType>({
  themeColor: '#2c8c0f',
  secondaryColor: '#1D64AB',
  setThemeColor: () => {},
  setSecondaryColor: () => {},
  textColor: '#fff',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColorState] = useState('#2c8c0f');
  const [secondaryColor, setSecondaryColorState] = useState('#1D64AB');

  useEffect(() => {
    // Load saved colors
    const loadColors = async () => {
      const savedTheme = await AsyncStorage.getItem('themeColor');
      const savedSecondary = await AsyncStorage.getItem('secondaryColor');
      if (savedTheme) setThemeColorState(savedTheme);
      if (savedSecondary) setSecondaryColorState(savedSecondary);
    };
    loadColors();
  }, []);

  const setThemeColor = async (color: string) => {
    setThemeColorState(color);
    await AsyncStorage.setItem('themeColor', color);
  };

  const setSecondaryColor = async (color: string) => {
    setSecondaryColorState(color);
    await AsyncStorage.setItem('secondaryColor', color);
  };

  const isDark = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

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
