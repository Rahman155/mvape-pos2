'use client';

import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PWAProvider } from '@/contexts/PWAContext';

interface RootProvidersProps {
  children: React.ReactNode;
}

/**
 * Root Providers component that wraps the entire application
 * Provides theme context and PWA functionality
 */
export function RootProviders({ children }: RootProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system">
      <PWAProvider>
        {children}
      </PWAProvider>
    </ThemeProvider>
  );
}

export default RootProviders;
