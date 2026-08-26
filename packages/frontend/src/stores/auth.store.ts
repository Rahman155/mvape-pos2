/**
 * Authentication store using Zustand
 * Manages global auth state including user, token, and role
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthState as AuthStateType } from '@/types';

/**
 * Extended auth state with additional methods
 */
interface AuthStore extends AuthStateType {
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setRole: (role: 'KASIR' | 'OWNER' | 'ADMIN' | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  login: (user: User, token: string) => void;
  logout: () => void;
  reset: () => void;
}

const INITIAL_STATE: AuthStateType = {
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
};

/**
 * Global auth store
 * Uses localStorage for persistence via Zustand's persist middleware
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setUser: (user: User) => {
        set({ user });
      },

      setToken: (token: string) => {
        set({ token });
      },

      setRole: (role: 'KASIR' | 'OWNER' | 'ADMIN' | null) => {
        set({ role });
      },

      setAuthenticated: (isAuthenticated: boolean) => {
        set({ isAuthenticated });
      },

      login: (user: User, token: string) => {
        set({
          user,
          token,
          role: user.role,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          role: null,
          isAuthenticated: false,
        });
      },

      reset: () => {
        set(INITIAL_STATE);
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Get current auth state (non-reactive)
 * Useful for non-component code
 */
export function getAuthState(): AuthStateType {
  return useAuthStore.getState();
}
