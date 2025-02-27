import React, { createContext, useContext, useState, useMemo } from 'react';

interface ThemeContextType {
  themeColor: string;
  setThemeColor: (color: string) => void;
  textColor: string;
}

const ThemeContext = createContext<ThemeContextType>({
  themeColor: '#2c8c0f',
  setThemeColor: () => {},
  textColor: '#fff',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState('#2c8c0f');
  const isDark = useMemo(() => {
    const hex = themeColor.replace('#', '');
    const rgb = parseInt(hex, 16);
    return rgb < 8388608; // Simple mid-point in RGB space
  }, [themeColor]);

  return (
    <ThemeContext.Provider value={{ 
      themeColor, 
      setThemeColor,
      textColor: isDark ? '#fff' : '#000'
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
