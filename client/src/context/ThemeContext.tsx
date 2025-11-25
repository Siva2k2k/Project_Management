import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      // Check localStorage first
      const savedTheme = localStorage.getItem('theme');
      console.log('Initial theme from localStorage:', savedTheme);

      if (savedTheme === 'dark' || savedTheme === 'light') {
        return savedTheme;
      }

      // Check system preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      console.log('System prefers dark:', prefersDark);

      return prefersDark ? 'dark' : 'light';
    } catch (error) {
      console.error('Error initializing theme:', error);
      return 'light';
    }
  });

  useEffect(() => {
    const root = document.documentElement;

    console.log('=== Theme Effect Running ===');
    console.log('Current theme state:', theme);
    console.log('HTML classes BEFORE:', root.className);

    // Tailwind uses only 'dark' class, no 'light' class needed
    if (theme === 'dark') {
      root.classList.add('dark');
      console.log('Added dark class');
    } else {
      root.classList.remove('dark');
      console.log('Removed dark class');
    }

    // Save to localStorage
    try {
      localStorage.setItem('theme', theme);
      console.log('Saved to localStorage:', theme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }

    // Debug log
    console.log('HTML classes AFTER:', root.className);
    console.log('Has dark class:', root.classList.contains('dark'));
    console.log('===========================');
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't set a preference
      if (!localStorage.getItem('theme')) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      console.log('Toggle theme called:', prev, '→', next);
      return next;
    });
  };

  const setTheme = (newTheme: Theme) => {
    console.log('Set theme called:', newTheme);
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
