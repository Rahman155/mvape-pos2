/**
 * useAuth hook tests
 */

import { renderHook, act } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types';

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Reset store before each test
    localStorage.clear();
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

  describe('Initial state', () => {
    it('should have null user, token, and role initially', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.role).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('should update auth state after login', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login(mockUser, mockToken);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.role).toBe('OWNER');
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle different user roles', () => {
      const kasirUser: User = { ...mockUser, role: 'KASIR' };
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login(kasirUser, mockToken);
      });

      expect(result.current.role).toBe('KASIR');
    });
  });

  describe('logout', () => {
    it('should clear auth state after logout', () => {
      const { result } = renderHook(() => useAuth());

      // First login
      act(() => {
        result.current.login(mockUser, mockToken);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.role).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should update user without affecting other fields', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login(mockUser, mockToken);
      });

      const updatedUser: User = { ...mockUser, username: 'newusername' };

      act(() => {
        result.current.setUser(updatedUser);
      });

      expect(result.current.user?.username).toBe('newusername');
      expect(result.current.token).toBe(mockToken);
      expect(result.current.role).toBe('OWNER');
    });
  });

  describe('setToken', () => {
    it('should update token without affecting other fields', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login(mockUser, mockToken);
      });

      const newToken = 'new-token-123';

      act(() => {
        result.current.setToken(newToken);
      });

      expect(result.current.token).toBe(newToken);
      expect(result.current.user).toEqual(mockUser);
    });
  });

  describe('setRole', () => {
    it('should update role', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setRole('KASIR');
      });

      expect(result.current.role).toBe('KASIR');

      act(() => {
        result.current.setRole('ADMIN');
      });

      expect(result.current.role).toBe('ADMIN');
    });

    it('should allow setting role to null', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.setRole('OWNER');
      });

      act(() => {
        result.current.setRole(null);
      });

      expect(result.current.role).toBeNull();
    });
  });

  describe('Callback stability', () => {
    it('should have stable callback references', () => {
      const { result, rerender } = renderHook(() => useAuth());

      const login1 = result.current.login;
      const logout1 = result.current.logout;
      const setUser1 = result.current.setUser;

      rerender();

      const login2 = result.current.login;
      const logout2 = result.current.logout;
      const setUser2 = result.current.setUser;

      // Callbacks should be stable across rerenders
      expect(login1).toBe(login2);
      expect(logout1).toBe(logout2);
      expect(setUser1).toBe(setUser2);
    });
  });

  describe('Multiple hook instances', () => {
    it('should share state between multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useAuth());
      const { result: result2 } = renderHook(() => useAuth());

      act(() => {
        result1.current.login(mockUser, mockToken);
      });

      // Second hook should see the updated state
      expect(result2.current.isAuthenticated).toBe(true);
      expect(result2.current.user).toEqual(mockUser);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete auth flow: login -> update -> logout', () => {
      const { result } = renderHook(() => useAuth());

      // Initial state
      expect(result.current.isAuthenticated).toBe(false);

      // Login
      act(() => {
        result.current.login(mockUser, mockToken);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.username).toBe('testuser');

      // Update user
      const updatedUser: User = { ...mockUser, username: 'updateduser' };
      act(() => {
        result.current.setUser(updatedUser);
      });

      expect(result.current.user?.username).toBe('updateduser');

      // Logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should handle role switching without logout', () => {
      const { result } = renderHook(() => useAuth());

      // Login as OWNER
      act(() => {
        result.current.login(mockUser, mockToken);
      });

      expect(result.current.role).toBe('OWNER');

      // Switch role to KASIR (simulating role change)
      act(() => {
        result.current.setRole('KASIR');
      });

      expect(result.current.role).toBe('KASIR');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).not.toBeNull();
    });
  });
});
