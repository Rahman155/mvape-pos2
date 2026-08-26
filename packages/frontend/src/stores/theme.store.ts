/**
 * Theme store using Zustand
 * Manages global theme state including dark/light mode
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

const INITIAL_THEME: Theme = 'light';

/**
 * Global theme store
 * Uses localStorage for persistence via Zustand's persist middleware
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: INITIAL_THEME,

      setTheme: (theme: Theme) => {
        set({ theme });
        // Apply theme to document
        if (typeof document !== 'undefined') {
          const html = document.documentElement;
          if (theme === 'dark') {
            html.classList.add('dark');
          } else {
            html.classList.remove('dark');
          }
        }
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      initializeTheme: () => {
        if (typeof document === 'undefined') return;

        const html = document.documentElement;
        const stored = get().theme;

        // Check system preference if no stored preference
        if (!stored) {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const theme = prefersDark ? 'dark' : 'light';
          get().setTheme(theme);
        } else {
          get().setTheme(stored);
        }
      },
    }),
    {
      name: 'theme-store',
      partialize: (state) => ({
        theme: state.theme,
      }),
    }
  )
);

/**
 * Get current theme state (non-reactive)
 * Useful for non-component code
 */
export function getThemeState(): Theme {
  return useThemeStore.getState().theme;
}
