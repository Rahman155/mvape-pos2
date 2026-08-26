/**
 * Service Worker Configuration
 * Central configuration for cache versioning, strategies, and offline support
 */

// ============================================================================
// VERSION MANAGEMENT
// ============================================================================

// Semantic versioning for cache invalidation
export const CACHE_VERSION = 'v1';

// Application version for app update detection
export const SW_VERSION = '1.0.0';

// IndexedDB keys for version tracking
const SW_VERSION_KEY = 'sw_version';
const APP_VERSION_KEY = 'app_version';

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

export const CACHE_NAMES = {
  API: `${CACHE_VERSION}-api-cache`,
  IMAGES: `${CACHE_VERSION}-image-cache`,
  STATIC: `${CACHE_VERSION}-static-cache`,
  PAGES: `${CACHE_VERSION}-pages-cache`,
  DATA: `${CACHE_VERSION}-data-cache`,
  SYNC_QUEUE: `${CACHE_VERSION}-sync-queue`,
} as const;

export const ALL_CACHE_NAMES = Object.values(CACHE_NAMES);

// ============================================================================
// CACHE EXPIRATION STRATEGIES (in seconds)
// ============================================================================

export const CACHE_EXPIRATION = {
  [CACHE_NAMES.API]: 5 * 60, // 5 minutes
  [CACHE_NAMES.IMAGES]: 7 * 24 * 60 * 60, // 7 days
  [CACHE_NAMES.STATIC]: 365 * 24 * 60 * 60, // 1 year
  [CACHE_NAMES.PAGES]: 60 * 60, // 1 hour
  [CACHE_NAMES.DATA]: 24 * 60 * 60, // 24 hours
} as const;

// ============================================================================
// CACHE SIZE LIMITS (max entries per cache)
// ============================================================================

export const CACHE_MAX_ENTRIES = {
  [CACHE_NAMES.API]: 50,
  [CACHE_NAMES.IMAGES]: 100,
  [CACHE_NAMES.STATIC]: 60,
  [CACHE_NAMES.PAGES]: 20,
  [CACHE_NAMES.DATA]: 30,
} as const;

// ============================================================================
// NON-CACHEABLE ENDPOINTS
// ============================================================================

/**
 * Endpoints that should never be cached
 * These require fresh network requests for security
 */
export const NON_CACHEABLE_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/admin/sensitive',
  '/api/user/password',
] as const;

// ============================================================================
// OFFLINE ROUTES
// ============================================================================

/**
 * Routes that should have offline fallbacks
 * These pages will be available even without network connection
 */
export const OFFLINE_ROUTES = [
  '/',
  '/inventory',
  '/transactions',
  '/members',
  '/reports',
  '/offline',
] as const;

// ============================================================================
// CACHE STRATEGY HELPERS
// ============================================================================

/**
 * Determine if URL should be cached
 */
export function shouldCacheUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Don't cache non-cacheable endpoints
    for (const endpoint of NON_CACHEABLE_ENDPOINTS) {
      if (urlObj.pathname.includes(endpoint)) {
        return false;
      }
    }
    
    // Don't cache if query param says so
    if (urlObj.searchParams.has('nocache')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Get cache strategy for URL
 * Returns 'network-first' or 'cache-first'
 */
export function getCacheStrategy(url: string): 'network-first' | 'cache-first' {
  if (url.includes('/api/')) {
    return 'network-first';
  } else if (/\.(png|jpg|jpeg|svg|gif|webp|ico)$/.test(url)) {
    return 'cache-first';
  } else if (/\.(js|css|woff2?|ttf|eot)$/.test(url)) {
    return 'cache-first';
  } else {
    return 'network-first';
  }
}

/**
 * Get cache name for URL
 */
export function getCacheNameForUrl(url: string): string | null {
  if (url.includes('/api/')) {
    return CACHE_NAMES.API;
  } else if (/\.(png|jpg|jpeg|svg|gif|webp|ico)$/.test(url)) {
    return CACHE_NAMES.IMAGES;
  } else if (/\.(js|css|woff2?|ttf|eot)$/.test(url)) {
    return CACHE_NAMES.STATIC;
  } else if (url.endsWith('/') || url.endsWith('.html')) {
    return CACHE_NAMES.PAGES;
  }
  return null;
}

/**
 * Get cache expiration time for URL (in seconds)
 */
export function getCacheExpiration(url: string): number {
  const cacheName = getCacheNameForUrl(url);
  if (cacheName && cacheName in CACHE_EXPIRATION) {
    return CACHE_EXPIRATION[cacheName as keyof typeof CACHE_EXPIRATION];
  }
  return 24 * 60 * 60; // Default to 1 day
}

/**
 * Get max entries for cache
 */
export function getCacheMaxEntries(cacheName: string): number {
  if (cacheName in CACHE_MAX_ENTRIES) {
    return CACHE_MAX_ENTRIES[cacheName as keyof typeof CACHE_MAX_ENTRIES];
  }
  return 50; // Default
}

// ============================================================================
// APP VERSION TRACKING
// ============================================================================

/**
 * Store app version in localStorage
 */
export function storeAppVersion(version: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(APP_VERSION_KEY, version);
    } catch (error) {
      console.warn('Failed to store app version:', error);
    }
  }
}

/**
 * Get stored app version from localStorage
 */
export function getStoredAppVersion(): string | null {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(APP_VERSION_KEY);
    } catch (error) {
      console.warn('Failed to retrieve app version:', error);
    }
  }
  return null;
}

/**
 * Check if app version has been updated
 */
export function hasAppBeenUpdated(): boolean {
  const storedVersion = getStoredAppVersion();
  return storedVersion !== SW_VERSION;
}

// ============================================================================
// PERFORMANCE TARGETS
// ============================================================================

/**
 * Performance metrics targets (milliseconds)
 */
export const PERFORMANCE_TARGETS = {
  FCP: 2000, // First Contentful Paint
  LCP: 2500, // Largest Contentful Paint
  TTI: 3000, // Time to Interactive
  NETWORK_TIMEOUT: 10000, // Network timeout for requests
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Feature flags for PWA functionality
 */
export const PWA_FEATURES = {
  ENABLED: process.env.NEXT_PUBLIC_PWA_ENABLED === 'true',
  OFFLINE_SUPPORT: true,
  BACKGROUND_SYNC: true,
  PUSH_NOTIFICATIONS: false, // Enable when ready
  PERIODIC_SYNC: false, // Enable when ready
} as const;
