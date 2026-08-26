/**
 * Permission and role management utilities
 * Handles role-based access control checks for the frontend
 */

export type Role = 'KASIR' | 'OWNER' | 'ADMIN';
export type Permission = Role | Role[];

/**
 * Role permissions mapping
 * Defines what each role can access
 */
export const ROLE_PERMISSIONS = {
  OWNER: {
    dashboard: true,
    stores: true,
    reports: true,
    reports_daily: true,
    reports_weekly: true,
    reports_monthly: true,
    reports_capital: true,
    reports_piutang: true,
    reports_bop: true,
    members_topup: true,
    suppliers: true,
    purchase_orders: true,
    attendance: true,
    stock_opname: true,
    dashboard_kasir: true,
    pos: true,
    history: true,
    members: true,
    bop: true,
    profile: true,
  },
  KASIR: {
    dashboard_kasir: true,
    pos: true,
    history: true,
    members: true,
    bop: true,
    profile: true,
  },
  ADMIN: {
    dashboard: true,
    stores: true,
    reports: true,
    reports_daily: true,
    reports_weekly: true,
    reports_monthly: true,
    reports_capital: true,
    reports_piutang: true,
    reports_bop: true,
    members_topup: true,
    suppliers: true,
    purchase_orders: true,
    attendance: true,
    stock_opname: true,
    dashboard_kasir: true,
    pos: true,
    history: true,
    members: true,
    bop: true,
    profile: true,
  },
};

/**
 * Page access control mapping
 * Maps route paths to required roles
 */
export const PAGE_ACCESS_CONTROL = {
  // Owner-only pages
  '/dashboard': ['OWNER', 'ADMIN'],
  '/stores': ['OWNER', 'ADMIN'],
  '/reports/daily': ['OWNER', 'ADMIN'],
  '/reports/weekly': ['OWNER', 'ADMIN'],
  '/reports/monthly': ['OWNER', 'ADMIN'],
  '/reports/capital': ['OWNER', 'ADMIN'],
  '/reports/piutang': ['OWNER', 'ADMIN'],
  '/reports/bop': ['OWNER', 'ADMIN'],
  '/members/top-up': ['OWNER', 'ADMIN'],
  '/suppliers': ['OWNER', 'ADMIN'],
  '/purchase-orders': ['OWNER', 'ADMIN'],
  '/attendance': ['OWNER', 'ADMIN'],
  '/stock-opname': ['OWNER', 'ADMIN'],

  // Owner & Kasir pages
  '/dashboard-kasir': ['OWNER', 'KASIR', 'ADMIN'],
  '/pos': ['OWNER', 'KASIR', 'ADMIN'],
  '/history': ['OWNER', 'KASIR', 'ADMIN'],
  '/members': ['OWNER', 'KASIR', 'ADMIN'],
  '/bop': ['OWNER', 'KASIR', 'ADMIN'],
  '/profile': ['OWNER', 'KASIR', 'ADMIN'],

  // Public pages (no auth required)
  '/login': [],
  '/logout': [],
};

/**
 * Check if a role has a specific permission
 * @param role - User role
 * @param permission - Permission to check
 * @returns True if role has permission
 */
export function can(role: Role, permission: string): boolean {
  const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
  if (!rolePerms) return false;
  return (rolePerms as Record<string, boolean>)[permission] === true;
}

/**
 * Check if a role can access a specific page
 * @param role - User role
 * @param page - Page path
 * @returns True if role can access the page
 */
export function canAccess(role: Role, page: string): boolean {
  const allowedRoles = PAGE_ACCESS_CONTROL[page as keyof typeof PAGE_ACCESS_CONTROL];
  if (!allowedRoles || allowedRoles.length === 0) {
    return true; // Public page
  }
  return allowedRoles.includes(role);
}

/**
 * Check if a role is owner
 * @param role - User role
 * @returns True if role is owner
 */
export function isOwner(role: Role | null): role is 'OWNER' {
  return role === 'OWNER';
}

/**
 * Check if a role is kasir
 * @param role - User role
 * @returns True if role is kasir
 */
export function isKasir(role: Role | null): role is 'KASIR' {
  return role === 'KASIR';
}

/**
 * Check if a role is admin
 * @param role - User role
 * @returns True if role is admin
 */
export function isAdmin(role: Role | null): role is 'ADMIN' {
  return role === 'ADMIN';
}

/**
 * Check if user has one of multiple roles
 * @param role - User role
 * @param roles - Array of roles to check
 * @returns True if user has one of the roles
 */
export function hasAnyRole(role: Role | null, roles: Role[]): boolean {
  if (!role) return false;
  return roles.includes(role);
}

/**
 * Get all accessible pages for a role
 * @param role - User role
 * @returns Array of accessible page paths
 */
export function getAccessiblePages(role: Role): string[] {
  return Object.entries(PAGE_ACCESS_CONTROL)
    .filter(([_, allowedRoles]) => {
      if (!allowedRoles || allowedRoles.length === 0) return true; // Public pages
      return allowedRoles.includes(role);
    })
    .map(([page]) => page);
}

/**
 * Check if a page requires authentication
 * @param page - Page path
 * @returns True if page requires auth
 */
export function isProtectedPage(page: string): boolean {
  const allowedRoles = PAGE_ACCESS_CONTROL[page as keyof typeof PAGE_ACCESS_CONTROL];
  if (allowedRoles === undefined) {
    // Route not explicitly defined - treat as protected by default
    return true;
  }
  return allowedRoles.length > 0;
}

/**
 * Get the default landing page for a role
 * @param role - User role
 * @returns Default page path for the role
 */
export function getDefaultPage(role: Role): string {
  if (isOwner(role)) {
    return '/dashboard';
  }
  if (isKasir(role)) {
    return '/dashboard-kasir';
  }
  if (isAdmin(role)) {
    return '/dashboard';
  }
  return '/login';
}
