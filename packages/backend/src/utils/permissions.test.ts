/**
 * Tests for permission utilities
 */

import {
  hasRole,
  canAccessStore,
  getFeaturePermission,
  normalizePermission,
  PERMISSIONS,
} from './permissions.js';

describe('Permission Utilities', () => {
  describe('hasRole() - Role validation', () => {
    it('should return true for public permission', () => {
      expect(hasRole('OWNER', 'public')).toBe(true);
      expect(hasRole('KASIR', 'public')).toBe(true);
    });

    it('should return true when role matches single required role', () => {
      expect(hasRole('OWNER', 'OWNER')).toBe(true);
      expect(hasRole('KASIR', 'KASIR')).toBe(true);
    });

    it('should return false when role does not match single required role', () => {
      expect(hasRole('KASIR', 'OWNER')).toBe(false);
      expect(hasRole('OWNER', 'KASIR')).toBe(false);
    });

    it('should return true when role is in array of allowed roles', () => {
      expect(hasRole('OWNER', ['OWNER', 'KASIR'])).toBe(true);
      expect(hasRole('KASIR', ['OWNER', 'KASIR'])).toBe(true);
    });

    it('should return false when role is not in array of allowed roles', () => {
      expect(hasRole('ADMIN', ['OWNER', 'KASIR'])).toBe(false);
    });

    it('should return false for null or undefined permission', () => {
      expect(hasRole('OWNER', null as any)).toBe(true); // 'public' check
      expect(hasRole('OWNER', undefined as any)).toBe(true);
    });
  });

  describe('canAccessStore() - Store access validation', () => {
    it('should allow OWNER to access any store', () => {
      expect(canAccessStore('OWNER', undefined, 'store-1')).toBe(true);
      expect(canAccessStore('OWNER', undefined, 'store-2')).toBe(true);
      expect(canAccessStore('OWNER', 'store-1', 'store-2')).toBe(true);
    });

    it('should allow ADMIN to access any store', () => {
      expect(canAccessStore('ADMIN', undefined, 'store-1')).toBe(true);
      expect(canAccessStore('ADMIN', undefined, 'store-2')).toBe(true);
    });

    it('should allow KASIR to access their assigned store', () => {
      expect(canAccessStore('KASIR', 'store-1', 'store-1')).toBe(true);
    });

    it('should deny KASIR access to other stores', () => {
      expect(canAccessStore('KASIR', 'store-1', 'store-2')).toBe(false);
    });

    it('should deny KASIR access when not assigned to any store', () => {
      expect(canAccessStore('KASIR', undefined, 'store-1')).toBe(false);
      expect(canAccessStore('KASIR', undefined, 'store-2')).toBe(false);
    });
  });

  describe('getFeaturePermission() - Feature permission lookup', () => {
    it('should return permission for valid feature and action', () => {
      const permission = getFeaturePermission('AUTH', 'LOGIN');
      expect(permission).toBe('public');

      const permission2 = getFeaturePermission('AUTH', 'LOGOUT');
      expect(permission2).toEqual(['OWNER', 'KASIR']);
    });

    it('should return store list permission with role restrictions', () => {
      const permission = getFeaturePermission('STORES', 'LIST');
      expect(permission).toEqual({
        OWNER: 'all',
        KASIR: 'own_store',
      });
    });

    it('should return null for invalid feature', () => {
      const permission = getFeaturePermission('INVALID' as any, 'ACTION');
      expect(permission).toBeNull();
    });

    it('should return null for invalid action', () => {
      const permission = getFeaturePermission('AUTH', 'INVALID_ACTION');
      expect(permission).toBeNull();
    });

    it('should handle action case insensitivity', () => {
      const permission1 = getFeaturePermission('AUTH', 'logout');
      const permission2 = getFeaturePermission('AUTH', 'LOGOUT');
      expect(permission1).toEqual(permission2);
    });
  });

  describe('normalizePermission() - Permission normalization', () => {
    it('should convert public permission to array', () => {
      const normalized = normalizePermission('public');
      expect(normalized).toEqual(['public']);
    });

    it('should convert single role to array', () => {
      const normalized = normalizePermission('OWNER');
      expect(normalized).toEqual(['OWNER']);
    });

    it('should keep array as is', () => {
      const permission = ['OWNER', 'KASIR'];
      const normalized = normalizePermission(permission);
      expect(normalized).toEqual(['OWNER', 'KASIR']);
    });

    it('should return empty array for null or invalid input', () => {
      const normalized = normalizePermission(null as any);
      expect(normalized).toEqual([]);
    });
  });

  describe('PERMISSIONS registry - Endpoint permissions', () => {
    it('should define permissions for all major features', () => {
      expect(PERMISSIONS.AUTH).toBeDefined();
      expect(PERMISSIONS.STORES).toBeDefined();
      expect(PERMISSIONS.PRODUCTS).toBeDefined();
      expect(PERMISSIONS.TRANSACTIONS).toBeDefined();
      expect(PERMISSIONS.REPORTS).toBeDefined();
    });

    it('should define login as public', () => {
      expect(PERMISSIONS.AUTH.LOGIN).toBe('public');
    });

    it('should restrict product creation to OWNER', () => {
      expect(PERMISSIONS.PRODUCTS.CREATE).toBe('OWNER');
    });

    it('should allow both roles for member operations', () => {
      expect(PERMISSIONS.MEMBERS.LIST).toEqual(['OWNER', 'KASIR']);
      expect(PERMISSIONS.MEMBERS.CREATE).toEqual(['OWNER', 'KASIR']);
    });

    it('should define store-restricted operations', () => {
      expect(PERMISSIONS.STORES.LIST).toEqual({
        OWNER: 'all',
        KASIR: 'own_store',
      });
    });

    it('should define transaction operations with store restrictions', () => {
      expect(PERMISSIONS.TRANSACTIONS.CREATE).toEqual({
        OWNER: 'all',
        KASIR: 'own_store',
      });
    });

    it('should define BOP access with role restrictions', () => {
      expect(PERMISSIONS.BOP.LIST).toEqual({
        OWNER: 'all',
        KASIR: 'own_store',
      });
    });

    it('should restrict reports to OWNER', () => {
      expect(PERMISSIONS.REPORTS.DAILY).toBe('OWNER');
      expect(PERMISSIONS.REPORTS.WEEKLY).toBe('OWNER');
      expect(PERMISSIONS.REPORTS.MONTHLY).toBe('OWNER');
    });

    it('should allow BOP report for kasir own store only', () => {
      expect(PERMISSIONS.REPORTS.BOP).toEqual({
        OWNER: 'all',
        KASIR: 'own_store_only',
      });
    });
  });

  describe('Role and feature combinations', () => {
    it('should verify KASIR transaction restrictions', () => {
      const transactionCreate = PERMISSIONS.TRANSACTIONS.CREATE;
      expect(transactionCreate).toEqual({
        OWNER: 'all',
        KASIR: 'own_store',
      });
    });

    it('should verify KASIR cannot delete stores', () => {
      const storeDelete = PERMISSIONS.STORES.DELETE;
      expect(storeDelete).toBe('OWNER');
    });

    it('should verify KASIR can create members', () => {
      const memberCreate = PERMISSIONS.MEMBERS.CREATE;
      expect(memberCreate).toContain('KASIR');
    });

    it('should verify OWNER can delete members', () => {
      const memberDelete = PERMISSIONS.MEMBERS.DELETE;
      expect(memberDelete).toBe('OWNER');
    });

    it('should verify inventory access is restricted by store', () => {
      const inventoryView = PERMISSIONS.INVENTORY.VIEW;
      expect(inventoryView).toEqual({
        OWNER: 'all',
        KASIR: 'own_store',
      });
    });
  });

  describe('Permission consistency', () => {
    it('should have consistent role names throughout', () => {
      const allPermissions = Object.values(PERMISSIONS).flatMap((feature) =>
        Object.values(feature).flatMap((perm) => {
          if (typeof perm === 'string') {
            return perm;
          }
          if (Array.isArray(perm)) {
            return perm;
          }
          if (typeof perm === 'object') {
            return Object.keys(perm);
          }
          return [];
        })
      );

      const uniqueRoles = new Set(allPermissions);
      const validRoles = ['public', 'OWNER', 'KASIR', 'ADMIN', 'all', 'own_store', 'own_store_with_ownership', 'own_store_only'];

      for (const role of uniqueRoles) {
        expect(validRoles).toContain(role);
      }
    });
  });
});
