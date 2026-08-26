/**
 * Auth Context
 * Provides authentication state to components
 */

'use client';

import React, { createContext, useContext } from 'react';
import { useAuth, UseAuthReturn } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/auth.store';

interface AuthContextType extends UseAuthReturn {
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Consider it loading if we haven't determined auth state yet
  const isLoading = false; // Auth state is immediately available from store

  const value: AuthContextType = {
    ...auth,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}

// Export for backward compatibility
export const AuthContextValue = AuthContext;
