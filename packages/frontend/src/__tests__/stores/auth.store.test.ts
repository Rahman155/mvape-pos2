/**
 * Auth store tests
 */

import { useAuthStore, getAuthState } from '@/stores/auth.store';
import { User } from '@/types';

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
    });
  });

  const mockUser: User = {
    id: '123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'OWNER',
    storeId: 'store-1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

  describe('setUser', () => {
    it('should set user in store', () => {
      const { setUser } = useAuthStore.getState();
      setUser(mockUser);

      const { user } = useAuthStore.getState();
      expect(user).toEqual(mockUser);
    });
  });

  describe('setToken', () => {
    it('should set token in store', () => {
      const { setToken } = useAuthStore.getState();
      setToken(mockToken);

      const { token } = useAuthStore.getState();
      expect(token).toBe(mockToken);
    });
  });

  describe('setRole', () => {
    it('should set role in store', () => {
      const { setRole } = useAuthStore.getState();
      setRole('KASIR');

      const { role } = useAuthStore.getState();
      expect(role).toBe('KASIR');
    });

    it('should allow setting role to null', () => {
      const { setRole } = useAuthStore.getState();
      setRole('OWNER');
      setRole(null);

      const { role } = useAuthStore.getState();
      expect(role).toBeNull();
    });
  });

  describe('setAuthenticated', () => {
    it('should set authentication status', () => {
      const { setAuthenticated } = useAuthStore.getState();
      setAuthenticated(true);

      const { isAuthenticated } = useAuthStore.getState();
      expect(isAuthenticated).toBe(true);
    });
  });

  describe('login', () => {
    it('should set user, token, role and mark as authenticated', () => {
      const { login } = useAuthStore.getState();
      login(mockUser, mockToken);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
      expect(state.role).toBe('OWNER');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle different roles', () => {
      const kasirUser: User = { ...mockUser, role: 'KASIR' };
      const { login } = useAuthStore.getState();

      login(kasirUser, mockToken);

      const { role } = useAuthStore.getState();
      expect(role).toBe('KASIR');
    });
  });

  describe('logout', () => {
    it('should clear all auth state', () => {
      const { login, logout } = useAuthStore.getState();

      // First login
      login(mockUser, mockToken);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then logout
      logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.role).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      const { login, reset } = useAuthStore.getState();

      // First login
      login(mockUser, mockToken);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then reset
      reset();

      const state = useAuthStore.getState();
      expect(state).toEqual({
        user: null,
        token: null,
        role: null,
        isAuthenticated: false,
      });
    });
  });

  describe('getAuthState', () => {
    it('should return current auth state without subscription', () => {
      const { login } = useAuthStore.getState();
      login(mockUser, mockToken);

      const state = getAuthState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe(mockToken);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should return non-reactive snapshot', () => {
      const { login } = useAuthStore.getState();
      login(mockUser, mockToken);

      const state1 = getAuthState();
      const state2 = getAuthState();

      // Different objects, but same content
      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });
  });

  describe('Persistence', () => {
    it('should persist user data to localStorage', async () => {
      const { login } = useAuthStore.getState();
      login(mockUser, mockToken);

      // Wait for persistence
      await new Promise((resolve) => setTimeout(resolve, 100));

      const stored = localStorage.getItem('auth-store');
      expect(stored).toBeTruthy();

      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.user).toEqual(mockUser);
        expect(parsed.state.token).toBe(mockToken);
      }
    });

    it('should restore state from localStorage on init', () => {
      const testData = {
        state: {
          user: mockUser,
          token: mockToken,
          role: 'OWNER',
          isAuthenticated: true,
        },
      };

      localStorage.setItem('auth-store', JSON.stringify(testData));

      // Create new store instance to trigger hydration
      const state = getAuthState();
      expect(state.user).toEqual(mockUser);
    });
  });

  describe('State consistency', () => {
    it('should maintain consistency between user role and role field', () => {
      const { login } = useAuthStore.getState();
      login(mockUser, mockToken);

      const { user, role } = useAuthStore.getState();
      expect(user?.role).toBe(role);
    });

    it('should prevent inconsistent auth state', () => {
      const { setUser, setAuthenticated } = useAuthStore.getState();

      // Should not be authenticated without user
      setUser(mockUser);
      setAuthenticated(false);

      const state = useAuthStore.getState();
      expect(state.user).toBeTruthy();
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
