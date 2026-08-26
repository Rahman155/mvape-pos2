/**
 * RequireAuth component
 * Ensures user is authenticated before rendering children
 */

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export interface RequireAuthProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Component that requires user to be authenticated
 * Redirects to login if not authenticated
 */
export function RequireAuth({ children, fallback }: RequireAuthProps): ReactNode {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    if (fallback) {
      return fallback;
    }
    // Redirect to login
    router.push('/login');
    return null;
  }

  return children;
}
