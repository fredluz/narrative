import React, { createContext, useContext, useState, useMemo } from 'react';

interface ThemeContextType {
  themeColor: string;
  setThemeColor: (color: string) => void;
  textColor: string;
}

const ThemeContext = createContext<ThemeContextType>({
  themeColor: '#00008B',
  setThemeColor: () => {},
  textColor: '#fff',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState('#00008B');
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
