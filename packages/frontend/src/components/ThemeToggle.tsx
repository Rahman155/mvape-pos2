import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * ThemeToggle component provides UI to switch between light, dark, and system themes
 * 
 * Accessibility:
 * - Keyboard accessible (Tab, Space/Enter to toggle)
 * - ARIA labels for screen readers
 * - High contrast for WCAG AA compliance (4.5:1 ratio)
 * - Focus indicators visible
 */
export function ThemeToggle() {
  const { theme, actualTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component only renders after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = actualTheme === 'dark';

  return (
    <div className="flex items-center gap-2">
      {/* Light mode button */}
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-lg transition-colors duration-200 ${
          theme === 'light'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
        aria-label="Switch to light mode"
        title="Light mode"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.536l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 1.414l-.707.707zm5.414 5.486l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 111.414-1.414zM5 11a1 1 0 100-2H4a1 1 0 100 2h1z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Dark mode button */}
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-lg transition-colors duration-200 ${
          theme === 'dark'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
        aria-label="Switch to dark mode"
        title="Dark mode"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </button>

      {/* System preference button */}
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-lg transition-colors duration-200 ${
          theme === 'system'
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
        aria-label="Switch to system theme preference"
        title="System preference"
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
        </svg>
      </button>
    </div>
  );
}

export default ThemeToggle;
