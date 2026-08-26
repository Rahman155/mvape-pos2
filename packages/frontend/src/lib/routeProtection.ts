/**
 * Advanced route protection utilities
 * Provides runtime route protection and redirect logic
 */

import { Role } from '@/lib/permissions';

/**
 * Route protection configuration
 */
export interface RouteConfig {
  path: string;
  allowedRoles: Role[];
  requiresAuth: boolean;
  redirectTo?: string;
}

/**
 * Define all protected routes with their access control
 */
export const ROUTE_CONFIGS: RouteConfig[] = [
  // Public routes - no auth required
  { path: '/login', allowedRoles: [], requiresAuth: false },
  { path: '/logout', allowedRoles: [], requiresAuth: false },
  { path: '/', allowedRoles: [], requiresAuth: false },

  // Owner-only pages
  {
    path: '/dashboard',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/stores',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/reports/daily',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/reports/weekly',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/reports/monthly',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/reports/capital',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/reports/piutang',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/reports/bop',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/members/top-up',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/suppliers',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/purchase-orders',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/attendance',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/stock-opname',
    allowedRoles: ['OWNER', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },

  // Owner & Kasir pages
  {
    path: '/dashboard-kasir',
    allowedRoles: ['OWNER', 'KASIR', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/pos',
    allowedRoles: ['OWNER', 'KASIR', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/history',
    allowedRoles: ['OWNER', 'KASIR', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/members',
    allowedRoles: ['OWNER', 'KASIR', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/bop',
    allowedRoles: ['OWNER', 'KASIR', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
  {
    path: '/profile',
    allowedRoles: ['OWNER', 'KASIR', 'ADMIN'],
    requiresAuth: true,
    redirectTo: '/unauthorized',
  },
];

/**
 * Find route config by path
 * Supports exact and prefix matching
 */
export function findRouteConfig(pathname: string): RouteConfig | undefined {
  // Try exact match first
  let config = ROUTE_CONFIGS.find((rc) => rc.path === pathname);

  if (config) {
    return config;
  }

  // Try prefix match (for nested routes like /reports/daily/something)
  config = ROUTE_CONFIGS.find((rc) => pathname.startsWith(rc.path + '/'));

  return config;
}

/**
 * Check if user can access a route
 */
export function canAccessRoute(pathname: string, userRole: Role | null): boolean {
  const config = findRouteConfig(pathname);

  if (!config) {
    // Route not configured - deny by default
    return false;
  }

  // Public route
  if (!config.requiresAuth) {
    return true;
  }

  // Protected route
  if (!userRole) {
    return false;
  }

  return config.allowedRoles.includes(userRole);
}

/**
 * Get redirect URL for unauthorized access
 */
export function getRedirectUrl(pathname: string): string {
  const config = findRouteConfig(pathname);

  if (!config) {
    return '/login';
  }

  if (!config.requiresAuth) {
    return '';
  }

  return config.redirectTo || '/login';
}

/**
 * Validate token expiry
 * Can be used to check if token needs refresh
 */
export function isTokenExpired(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  // Consider expired if less than 5 minutes remaining
  return expiresAt - now < 300;
}

/**
 * Log authorization failure for monitoring
 */
export function logAuthorizationFailure(
  userId: string,
  attemptedRoute: string,
  reason: string
): void {
  if (typeof window !== 'undefined') {
    console.warn(`[Authorization Failure] User: ${userId}, Route: ${attemptedRoute}, Reason: ${reason}`);
    // In production, send to error tracking service (e.g., Sentry)
  }
}
