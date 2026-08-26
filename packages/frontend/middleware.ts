/**
 * Next.js Middleware for route protection
 * Handles authentication and authorization checks at the middleware level
 */

import { NextRequest, NextResponse } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/logout', '/'];

// Owner-only routes
const OWNER_ONLY_ROUTES = [
  '/dashboard',
  '/stores',
  '/reports',
  '/members/top-up',
  '/suppliers',
  '/purchase-orders',
  '/attendance',
  '/stock-opname',
];

// Routes accessible by both owner and kasir
const PROTECTED_ROUTES = ['/dashboard-kasir', '/pos', '/history', '/members', '/bop', '/profile'];

/**
 * Check if route is public
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname) || pathname === '/';
}

/**
 * Check if route is owner-only
 */
function isOwnerOnlyRoute(pathname: string): boolean {
  return OWNER_ONLY_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if route is protected (requires auth)
 */
function isProtectedRoute(pathname: string): boolean {
  return (
    PROTECTED_ROUTES.some((route) => pathname.startsWith(route)) ||
    isOwnerOnlyRoute(pathname)
  );
}

/**
 * Middleware function to handle route protection
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Get auth info from cookies
  const token = request.cookies.get('auth-token')?.value;
  const userRole = request.cookies.get('user-role')?.value;

  // Allow public routes
  if (isPublicRoute(pathname)) {
    // Redirect authenticated users away from login page
    if (pathname === '/login' && token) {
      const redirectUrl = userRole === 'KASIR' ? '/dashboard-kasir' : '/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.next();
  }

  // Check if route is protected
  if (isProtectedRoute(pathname)) {
    // Redirect to login if not authenticated
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check role-based access for owner-only routes
    if (isOwnerOnlyRoute(pathname)) {
      // Owner or Admin can access
      if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }

    // Role-based access for protected routes is already handled
    // Owner/Admin/Kasir can all access these routes
  }

  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
