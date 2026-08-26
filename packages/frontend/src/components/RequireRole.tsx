/**
 * RequireRole component
 * Renders children only if user has the required role
 */

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/lib/permissions';

export interface RequireRoleProps {
  children: ReactNode;
  roles: Role | Role[];
  fallback?: ReactNode;
}

/**
 * Component that requires user to have specific role(s)
 * Shows fallback or nothing if role doesn't match
 */
export function RequireRole({ children, roles, fallback }: RequireRoleProps): ReactNode {
  const { role } = useAuth();

  if (!role) {
    return fallback || null;
  }

  const hasRole = Array.isArray(roles) ? roles.includes(role) : role === roles;

  if (!hasRole) {
    return fallback || null;
  }

  return children;
}
