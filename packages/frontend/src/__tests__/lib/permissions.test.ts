/**
 * Permission utilities tests
 */

import {
  can,
  canAccess,
  isOwner,
  isKasir,
  isAdmin,
  hasAnyRole,
  getAccessiblePages,
  isProtectedPage,
  getDefaultPage,
} from '@/lib/permissions';

describe('Permission Utilities', () => {
  describe('can - check permission for role', () => {
    it('should return true for owner accessing suppliers permission', () => {
      expect(can('OWNER', 'suppliers')).toBe(true);
    });

    it('should return false for kasir accessing suppliers permission', () => {
      expect(can('KASIR', 'suppliers')).toBe(false);
    });

    it('should return true for kasir accessing dashboard_kasir permission', () => {
      expect(can('KASIR', 'dashboard_kasir')).toBe(true);
    });

    it('should return false for non-existent role', () => {
      expect(can('INVALID_ROLE' as any, 'suppliers')).toBe(false);
    });

    it('should return true for admin accessing any permission', () => {
      expect(can('ADMIN', 'suppliers')).toBe(true);
      expect(can('ADMIN', 'dashboard')).toBe(true);
      expect(can('ADMIN', 'pos')).toBe(true);
    });
  });

  describe('canAccess - check page access for role', () => {
    it('should return true for owner accessing dashboard', () => {
      expect(canAccess('OWNER', '/dashboard')).toBe(true);
    });

    it('should return false for kasir accessing dashboard', () => {
      expect(canAccess('KASIR', '/dashboard')).toBe(false);
    });

    it('should return true for kasir accessing POS page', () => {
      expect(canAccess('KASIR', '/pos')).toBe(true);
    });

    it('should return true for both owner and kasir accessing shared pages', () => {
      expect(canAccess('OWNER', '/pos')).toBe(true);
      expect(canAccess('KASIR', '/pos')).toBe(true);
    });

    it('should return true for public pages regardless of role', () => {
      expect(canAccess('OWNER', '/login')).toBe(true);
      expect(canAccess('KASIR', '/login')).toBe(true);
    });

    it('should allow public pages without authentication', () => {
      expect(canAccess('OWNER', '/logout')).toBe(true);
    });
  });

  describe('Role type guards', () => {
    describe('isOwner', () => {
      it('should return true for OWNER role', () => {
        expect(isOwner('OWNER')).toBe(true);
      });

      it('should return false for KASIR role', () => {
        expect(isOwner('KASIR')).toBe(false);
      });

      it('should return false for null', () => {
        expect(isOwner(null)).toBe(false);
      });
    });

    describe('isKasir', () => {
      it('should return true for KASIR role', () => {
        expect(isKasir('KASIR')).toBe(true);
      });

      it('should return false for OWNER role', () => {
        expect(isKasir('OWNER')).toBe(false);
      });

      it('should return false for null', () => {
        expect(isKasir(null)).toBe(false);
      });
    });

    describe('isAdmin', () => {
      it('should return true for ADMIN role', () => {
        expect(isAdmin('ADMIN')).toBe(true);
      });

      it('should return false for OWNER role', () => {
        expect(isAdmin('OWNER')).toBe(false);
      });

      it('should return false for null', () => {
        expect(isAdmin(null)).toBe(false);
      });
    });
  });

  describe('hasAnyRole - check if user has one of multiple roles', () => {
    it('should return true if user has one of specified roles', () => {
      expect(hasAnyRole('OWNER', ['OWNER', 'ADMIN'])).toBe(true);
      expect(hasAnyRole('KASIR', ['OWNER', 'KASIR'])).toBe(true);
    });

    it('should return false if user does not have any specified role', () => {
      expect(hasAnyRole('KASIR', ['OWNER', 'ADMIN'])).toBe(false);
    });

    it('should return false for null role', () => {
      expect(hasAnyRole(null, ['OWNER', 'KASIR'])).toBe(false);
    });
  });

  describe('getAccessiblePages - get pages for role', () => {
    it('should return all pages for OWNER', () => {
      const pages = getAccessiblePages('OWNER');
      expect(pages).toContain('/dashboard');
      expect(pages).toContain('/stores');
      expect(pages).toContain('/suppliers');
      expect(pages).toContain('/pos');
    });

    it('should return only allowed pages for KASIR', () => {
      const pages = getAccessiblePages('KASIR');
      expect(pages).toContain('/pos');
      expect(pages).toContain('/history');
      expect(pages).not.toContain('/stores');
      expect(pages).not.toContain('/suppliers');
    });

    it('should include public pages for all roles', () => {
      const pages = getAccessiblePages('KASIR');
      expect(pages).toContain('/login');
      expect(pages).toContain('/logout');
    });

    it('should return all pages for ADMIN', () => {
      const adminPages = getAccessiblePages('ADMIN');
      const ownerPages = getAccessiblePages('OWNER');
      expect(adminPages).toEqual(expect.arrayContaining(ownerPages));
    });
  });

  describe('isProtectedPage - check if page requires auth', () => {
    it('should return false for public pages', () => {
      expect(isProtectedPage('/login')).toBe(false);
      expect(isProtectedPage('/logout')).toBe(false);
    });

    it('should return true for protected pages', () => {
      expect(isProtectedPage('/dashboard')).toBe(true);
      expect(isProtectedPage('/pos')).toBe(true);
    });

    it('should return true for undefined routes (protect by default)', () => {
      expect(isProtectedPage('/unknown-route')).toBe(true);
    });
  });

  describe('getDefaultPage - get landing page for role', () => {
    it('should return /dashboard for OWNER', () => {
      expect(getDefaultPage('OWNER')).toBe('/dashboard');
    });

    it('should return /dashboard-kasir for KASIR', () => {
      expect(getDefaultPage('KASIR')).toBe('/dashboard-kasir');
    });

    it('should return /dashboard for ADMIN', () => {
      expect(getDefaultPage('ADMIN')).toBe('/dashboard');
    });
  });
});
