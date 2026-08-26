/**
 * PermissionGate component
 * Feature-level permission control - shows/hides content based on permission
 */

import { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';

export interface PermissionGateProps {
  children: ReactNode;
  permission: string;
  fallback?: ReactNode;
}

/**
 * Component that conditionally renders based on permission
 * Useful for showing/hiding features based on user permissions
 *
 * @example
 * <PermissionGate permission="suppliers">
 *   <SupplierMenu />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  permission,
  fallback,
}: PermissionGateProps): ReactNode {
  const { can } = usePermission();

  if (!can(permission)) {
    return fallback || null;
  }

  return children;
}
