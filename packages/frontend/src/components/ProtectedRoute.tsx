/**
 * ProtectedRoute component
 * Wrapper for protecting routes based on authentication and authorization
 */

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/lib/permissions';

export interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: Role | Role[];
  fallback?: ReactNode;
  onUnauthorized?: () => void;
}

/**
 * Component that protects routes based on user authentication and role
 * Redirects unauthenticated users to login
 * Shows fallback for unauthorized users
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  fallback,
  onUnauthorized,
}: ProtectedRouteProps): ReactNode {
  const router = useRouter();
  const { user, isAuthenticated, role } = useAuth();

  // Check if user is authenticated
  if (!isAuthenticated || !user || !role) {
    // Redirect to login
    router.push('/login');
    return null;
  }

  // Check if user has required role
  const hasPermission = Array.isArray(allowedRoles)
    ? allowedRoles.includes(role)
    : role === allowedRoles;

  if (!hasPermission) {
    onUnauthorized?.();
    if (fallback) {
      return fallback;
    }
    // Show unauthorized message
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-900 mb-4">Access Denied</h1>
          <p className="text-red-700 mb-6">You do not have permission to access this page.</p>
          <button
            onClick={() => router.back()}
            className="inline-block px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
}
