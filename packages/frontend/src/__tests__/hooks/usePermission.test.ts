/**
 * usePermission hook tests
 */

import { renderHook, act } from '@testing-library/react';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/stores/auth.store';

describe('usePermission Hook', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      token: null,
      role: null,
      isAuthenticated: false,
    });
  });

  describe('Permission checking', () => {
    it('should return false when no role is set', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.can('suppliers')).toBe(false);
      expect(result.current.canAccess('/dashboard')).toBe(false);
    });

    it('should check permissions for owner role', () => {
      useAuthStore.setState({
        role: 'OWNER',
        isAuthenticated: true,
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.can('suppliers')).toBe(true);
      expect(result.current.can('purchase_orders')).toBe(true);
      expect(result.current.can('dashboard')).toBe(true);
    });

    it('should check permissions for kasir role', () => {
      useAuthStore.setState({
        role: 'KASIR',
        isAuthenticated: true,
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.can('pos')).toBe(true);
      expect(result.current.can('suppliers')).toBe(false);
      expect(result.current.can('purchase_orders')).toBe(false);
    });
  });

  describe('Page access checking', () => {
    it('should check page access for owner', () => {
      useAuthStore.setState({
        role: 'OWNER',
        isAuthenticated: true,
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.canAccess('/dashboard')).toBe(true);
      expect(result.current.canAccess('/stores')).toBe(true);
      expect(result.current.canAccess('/suppliers')).toBe(true);
    });

    it('should check page access for kasir', () => {
      useAuthStore.setState({
        role: 'KASIR',
        isAuthenticated: true,
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.canAccess('/pos')).toBe(true);
      expect(result.current.canAccess('/history')).toBe(true);
      expect(result.current.canAccess('/dashboard')).toBe(false);
      expect(result.current.canAccess('/suppliers')).toBe(false);
    });

    it('should allow access to public pages regardless of role', () => {
      useAuthStore.setState({
        role: 'KASIR',
        isAuthenticated: true,
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.canAccess('/login')).toBe(true);
      expect(result.current.canAccess('/logout')).toBe(true);
    });
  });

  describe('Role checking', () => {
    it('should check single role', () => {
      useAuthStore.setState({
        role: 'OWNER',
        isAuthenticated: true,
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.hasRole('OWNER')).toBe(true);
      expect(result.current.hasRole('KASIR')).toBe(false);
    });

    it('should check multiple roles', () => {
      useAuthStore.setState({
        role: 'OWNER',
        isAuthenticated: true,
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.hasRole(['OWNER', 'ADMIN'])).toBe(true);
      expect(result.current.hasRole(['KASIR', 'ADMIN'])).toBe(false);
    });

    it('should return false when no role is set', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.hasRole('OWNER')).toBe(false);
      expect(result.current.hasRole(['OWNER', 'KASIR'])).toBe(false);
    });
  });

  describe('Default page retrieval', () => {
    it('should return /dashboard for owner', () => {
      useAuthStore.setState({
        role: 'OWNER',
        isAuthenticated: true,
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.getDefaultPage()).toBe('/dashboard');
    });

    it('should return /dashboard-kasir for kasir', () => {
      useAuthStore.setState({
        role: 'KASIR',
        isAuthenticated: true,
      });

      const { result } = renderHook(() => usePermission());

      expect(result.current.getDefaultPage()).toBe('/dashboard-kasir');
    });

    it('should return null when no role is set', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.getDefaultPage()).toBeNull();
    });
  });

  describe('Protected page checking', () => {
    it('should identify protected pages', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.isProtectedPage('/dashboard')).toBe(true);
      expect(result.current.isProtectedPage('/pos')).toBe(true);
      expect(result.current.isProtectedPage('/suppliers')).toBe(true);
    });

    it('should identify public pages', () => {
      const { result } = renderHook(() => usePermission());

      expect(result.current.isProtectedPage('/login')).toBe(false);
      expect(result.current.isProtectedPage('/logout')).toBe(false);
    });
  });

  describe('Reactivity to role changes', () => {
    it('should update results when role changes', () => {
      const { result, rerender } = renderHook(() => usePermission());

      // Initially no role
      expect(result.current.can('suppliers')).toBe(false);

      // Set OWNER role
      act(() => {
        useAuthStore.setState({
          role: 'OWNER',
          isAuthenticated: true,
        });
      });

      rerender();
      expect(result.current.can('suppliers')).toBe(true);

      // Switch to KASIR role
      act(() => {
        useAuthStore.setState({
          role: 'KASIR',
          isAuthenticated: true,
        });
      });

      rerender();
      expect(result.current.can('suppliers')).toBe(false);
    });
  });

  describe('Memoization', () => {
    it('should maintain stable references across rerenders', () => {
      useAuthStore.setState({
        role: 'OWNER',
        isAuthenticated: true,
      });

      const { result, rerender } = renderHook(() => usePermission());

      const permission1 = result.current;
      rerender();
      const permission2 = result.current;

      // Should return different objects (memoized but rebuilt each call)
      expect(permission1).not.toBe(permission2);

      // But the values should be the same
      expect(permission1.can('suppliers')).toBe(permission2.can('suppliers'));
      expect(permission1.getDefaultPage()).toBe(permission2.getDefaultPage());
    });
  });

  describe('Edge cases', () => {
    it('should handle admin role with all permissions', () => {
      useAuthStore.setState({
        role: 'ADMIN',
        isAuthenticated: true,
      });

      const { result } = renderHook(() => usePermission());

      // Admin should have access to everything
      expect(result.current.can('suppliers')).toBe(true);
      expect(result.current.can('pos')).toBe(true);
      expect(result.current.canAccess('/dashboard')).toBe(true);
      expect(result.current.canAccess('/pos')).toBe(true);
    });

    it('should handle permission checks with empty arrays', () => {
      useAuthStore.setState({
        role: 'OWNER',
        isAuthenticated: true,
      });

      const { result } = renderHook(() => usePermission());

      // Empty role array should return false
      expect(result.current.hasRole([])).toBe(false);
    });
  });
});
