/**
 * usePermission hook
 * Provides permission checking utilities for components
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { can, canAccess, hasAnyRole, getDefaultPage, isProtectedPage, Role } from '@/lib/permissions';

export interface UsePermissionReturn {
  can: (permission: string) => boolean;
  canAccess: (page: string) => boolean;
  hasRole: (roles: Role | Role[]) => boolean;
  getDefaultPage: () => string | null;
  isProtectedPage: (page: string) => boolean;
}

/**
 * Hook to check permissions and access control
 * @returns Permission checking utilities
 */
export function usePermission(): UsePermissionReturn {
  const { role } = useAuth();

  const checkPermission = useCallback(
    (permission: string): boolean => {
      if (!role) return false;
      return can(role, permission);
    },
    [role]
  );

  const checkAccess = useCallback(
    (page: string): boolean => {
      if (!role) return false;
      return canAccess(role, page);
    },
    [role]
  );

  const checkRole = useCallback(
    (roles: Role | Role[]): boolean => {
      if (!role) return false;
      if (typeof roles === 'string') {
        return role === roles;
      }
      return hasAnyRole(role, roles);
    },
    [role]
  );

  const getDefault = useCallback((): string | null => {
    if (!role) return null;
    return getDefaultPage(role);
  }, [role]);

  const checkProtected = useCallback((page: string): boolean => {
    return isProtectedPage(page);
  }, []);

  return useMemo(
    () => ({
      can: checkPermission,
      canAccess: checkAccess,
      hasRole: checkRole,
      getDefaultPage: getDefault,
      isProtectedPage: checkProtected,
    }),
    [checkPermission, checkAccess, checkRole, getDefault, checkProtected]
  );
}
