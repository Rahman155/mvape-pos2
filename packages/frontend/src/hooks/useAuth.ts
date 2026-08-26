/**
 * useAuth hook
 * Provides access to authentication state and methods
 */

import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { User } from '@/types';

export interface UseAuthReturn {
  user: User | null;
  token: string | null;
  role: 'KASIR' | 'OWNER' | 'ADMIN' | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setRole: (role: 'KASIR' | 'OWNER' | 'ADMIN' | null) => void;
}

/**
 * Hook to access and manage authentication state
 * @returns Auth state and methods
 */
export function useAuth(): UseAuthReturn {
  const { user, token, role, isAuthenticated, login, logout, setUser, setToken, setRole } =
    useAuthStore();

  // Memoized callbacks to ensure stable references
  const memoizedLogin = useCallback(
    (authUser: User, authToken: string) => {
      login(authUser, authToken);
    },
    [login]
  );

  const memoizedLogout = useCallback(() => {
    logout();
  }, [logout]);

  const memoizedSetUser = useCallback(
    (authUser: User) => {
      setUser(authUser);
    },
    [setUser]
  );

  const memoizedSetToken = useCallback(
    (authToken: string) => {
      setToken(authToken);
    },
    [setToken]
  );

  const memoizedSetRole = useCallback(
    (authRole: 'KASIR' | 'OWNER' | 'ADMIN' | null) => {
      setRole(authRole);
    },
    [setRole]
  );

  return {
    user,
    token,
    role,
    isAuthenticated,
    login: memoizedLogin,
    logout: memoizedLogout,
    setUser: memoizedSetUser,
    setToken: memoizedSetToken,
    setRole: memoizedSetRole,
  };
}
