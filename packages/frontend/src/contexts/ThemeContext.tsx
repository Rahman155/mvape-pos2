import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  actualTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'vapestore-pos-theme-preference';

/**
 * Detects system color scheme preference
 */
function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Gets the actual theme to apply (resolves 'system' to actual value)
 */
function getActualTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemPreference();
  }
  return theme;
}

/**
 * Applies theme to the document
 */
function applyTheme(theme: 'light' | 'dark') {
  const html = document.documentElement;
  
  if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
  
  // Update theme-color meta tag for mobile browsers
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute(
      'content',
      theme === 'dark' ? '#1F2937' : '#2563EB'
    );
  }
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}

/**
 * ThemeProvider component that manages theme state and applies theme to DOM
 * 
 * Features:
 * - Persists user preference to localStorage
 * - Detects system color scheme preference
 * - Applies theme on mount and when changed
 * - Listens to system preference changes
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Load theme preference from localStorage and apply
  useEffect(() => {
    // Load persisted preference
    const stored = localStorage.getItem(storageKey) as ThemeMode | null;
    const initialTheme = (stored || defaultTheme) as ThemeMode;
    
    setThemeState(initialTheme);
    const actual = getActualTheme(initialTheme);
    setActualTheme(actual);
    applyTheme(actual);
    setMounted(true);
  }, [storageKey, defaultTheme]);

  // Listen to system preference changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        const newActual = getActualTheme('system');
        setActualTheme(newActual);
        applyTheme(newActual);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    
    // Persist preference
    if (newTheme === 'system') {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, newTheme);
    }

    // Apply theme
    const actual = getActualTheme(newTheme);
    setActualTheme(actual);
    applyTheme(actual);
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    setTheme(actualTheme === 'dark' ? 'light' : 'dark');
  }, [actualTheme, setTheme]);

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme context
 * Must be used inside ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

export default ThemeContext;
