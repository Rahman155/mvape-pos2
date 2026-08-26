import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light mode colors
        primary: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
        },
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        info: {
          50: '#ECFDFD',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
      },
      fontSize: {
        h1: ['32px', { fontWeight: 'bold', lineHeight: '1.2' }],
        h2: ['24px', { fontWeight: 'bold', lineHeight: '1.3' }],
        h3: ['20px', { fontWeight: '600', lineHeight: '1.4' }],
        body: ['16px', { fontWeight: 'normal', lineHeight: '1.5' }],
        small: ['14px', { fontWeight: 'normal', lineHeight: '1.5' }],
        tiny: ['12px', { fontWeight: 'normal', lineHeight: '1.4' }],
      },
      minHeight: {
        screen: '100vh',
      },
      height: {
        screen: '100vh',
      },
      boxShadow: {
        'sm-dark': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'md-dark': '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        'lg-dark': '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
      },
      backgroundColor: {
        'surface-light': '#FFFFFF',
        'surface-light-secondary': '#F9FAFB',
        'surface-dark': '#111827',
        'surface-dark-secondary': '#1F2937',
      },
      textColor: {
        'base-light': '#1F2937',
        'base-dark': '#F3F4F6',
        'secondary-light': '#6B7280',
        'secondary-dark': '#D1D5DB',
      },
    },
  },
  darkMode: 'class',
  plugins: [
    forms,
    // Custom plugin for theme-aware utilities
    function ({ addBase, addComponents, addUtilities, theme }: any) {
      addComponents({
        '.card-base': {
          '@apply rounded-lg border shadow-md transition-all duration-200': {},
          '@apply bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700': {},
        },
        '.card-interactive': {
          '@apply card-base hover:shadow-lg dark:hover:shadow-lg cursor-pointer': {},
        },
        '.btn-focus': {
          '@apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900': {},
        },
        '.input-focus': {
          '@apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-400': {},
        },
      });

      addUtilities({
        '.text-contrast-aa': {
          '@apply text-gray-900 dark:text-gray-50': {},
        },
        '.text-contrast-secondary': {
          '@apply text-gray-700 dark:text-gray-300': {},
        },
        '.bg-contrast-surface': {
          '@apply bg-white dark:bg-gray-900': {},
        },
        '.border-contrast': {
          '@apply border-gray-200 dark:border-gray-700': {},
        },
      });
    },
  ],
};

export default config;
