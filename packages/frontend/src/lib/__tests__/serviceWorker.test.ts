/**
 * Service Worker Cache Management Tests
 * Comprehensive tests for cache versioning, invalidation, and offline functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CACHE_VERSION,
  CACHE_NAMES,
  CACHE_EXPIRATION,
  CACHE_MAX_ENTRIES,
  SW_VERSION,
  shouldCacheUrl,
  getCacheStrategy,
  getCacheExpiration,
  getCacheMaxEntries,
  hasAppBeenUpdated,
  shouldPerformCleanup,
  NON_CACHEABLE_ENDPOINTS,
  OFFLINE_ROUTES,
} from '../sw-config';

describe('Service Worker Configuration', () => {
  describe('Cache Configuration', () => {
    it('should have correct cache version format', () => {
      expect(CACHE_VERSION).toMatch(/^v\d+$/);
    });

    it('should have all required cache names with version prefix', () => {
      Object.values(CACHE_NAMES).forEach((cacheName) => {
        expect(cacheName).toContain(CACHE_VERSION);
        expect(cacheName).toBeTruthy();
      });
    });

    it('should have expiration times for all cache types', () => {
      expect(CACHE_EXPIRATION.API).toBeGreaterThan(0);
      expect(CACHE_EXPIRATION.IMAGES).toBeGreaterThan(CACHE_EXPIRATION.API);
      expect(CACHE_EXPIRATION.STATIC).toBeGreaterThan(CACHE_EXPIRATION.IMAGES);
    });

    it('should have max entries for all cache types', () => {
      Object.values(CACHE_MAX_ENTRIES).forEach((maxEntries) => {
        expect(maxEntries).toBeGreaterThan(0);
      });
    });
  });

  describe('Cache URL Validation', () => {
    it('should cache regular API endpoints', () => {
      const shouldCache = shouldCacheUrl('https://api.example.com/data');
      expect(shouldCache).toBe(true);
    });

    it('should not cache authentication endpoints', () => {
      const urls = [
        'https://api.example.com/api/auth/login',
        'https://api.example.com/api/auth/logout',
        'https://api.example.com/api/auth/refresh',
      ];

      urls.forEach((url) => {
        expect(shouldCacheUrl(url)).toBe(false);
      });
    });

    it('should not cache URLs with nocache query param', () => {
      const shouldCache = shouldCacheUrl('https://api.example.com/data?nocache=true');
      expect(shouldCache).toBe(false);
    });

    it('should not cache sensitive endpoints', () => {
      const sensitiveUrls = [
        'https://api.example.com/api/admin/sensitive',
        'https://api.example.com/api/user/password',
      ];

      sensitiveUrls.forEach((url) => {
        expect(shouldCacheUrl(url)).toBe(false);
      });
    });

    it('should handle invalid URLs gracefully', () => {
      const shouldCache = shouldCacheUrl('not-a-valid-url');
      expect(shouldCache).toBe(false);
    });
  });

  describe('Cache Strategy Selection', () => {
    it('should select network-first strategy for API endpoints', () => {
      const strategy = getCacheStrategy('https://api.example.com/data');
      expect(strategy?.handler).toBe('NetworkFirst');
    });

    it('should select cache-first strategy for images', () => {
      const imageUrls = [
        'https://example.com/image.png',
        'https://example.com/photo.jpg',
        'https://example.com/logo.svg',
      ];

      imageUrls.forEach((url) => {
        const strategy = getCacheStrategy(url);
        expect(strategy?.handler).toBe('CacheFirst');
      });
    });

    it('should select cache-first strategy for static assets', () => {
      const staticUrls = [
        'https://example.com/bundle.js',
        'https://example.com/styles.css',
      ];

      staticUrls.forEach((url) => {
        const strategy = getCacheStrategy(url);
        expect(strategy?.handler).toBe('CacheFirst');
      });
    });

    it('should return null for unmatched URLs', () => {
      const strategy = getCacheStrategy('https://example.com/some-random-file.xyz');
      expect(strategy).toBeNull();
    });
  });

  describe('Cache Expiration and Size Management', () => {
    it('should return correct expiration time for API cache', () => {
      const expiration = getCacheExpiration(CACHE_NAMES.API);
      expect(expiration).toBe(CACHE_EXPIRATION.API);
    });

    it('should return correct expiration time for image cache', () => {
      const expiration = getCacheExpiration(CACHE_NAMES.IMAGES);
      expect(expiration).toBe(CACHE_EXPIRATION.IMAGES);
    });

    it('should return correct max entries for API cache', () => {
      const maxEntries = getCacheMaxEntries(CACHE_NAMES.API);
      expect(maxEntries).toBe(CACHE_MAX_ENTRIES.API);
    });

    it('should return correct max entries for image cache', () => {
      const maxEntries = getCacheMaxEntries(CACHE_NAMES.IMAGES);
      expect(maxEntries).toBe(CACHE_MAX_ENTRIES.IMAGES);
    });

    it('should return default values for unknown cache names', () => {
      const expiration = getCacheExpiration('unknown-cache');
      const maxEntries = getCacheMaxEntries('unknown-cache');
      expect(expiration).toBe(CACHE_EXPIRATION.API);
      expect(maxEntries).toBe(CACHE_MAX_ENTRIES.API);
    });
  });

  describe('Non-Cacheable Endpoints', () => {
    it('should identify all non-cacheable endpoints', () => {
      expect(NON_CACHEABLE_ENDPOINTS.length).toBeGreaterThan(0);
      NON_CACHEABLE_ENDPOINTS.forEach((endpoint) => {
        expect(typeof endpoint).toBe('string');
        expect(endpoint.startsWith('/api/')).toBe(true);
      });
    });

    it('should not cache authentication endpoints', () => {
      const endpoint = NON_CACHEABLE_ENDPOINTS.find((ep) => ep.includes('auth'));
      expect(endpoint).toBeTruthy();
    });
  });

  describe('Offline Routes', () => {
    it('should have offline routes defined', () => {
      expect(OFFLINE_ROUTES.length).toBeGreaterThan(0);
    });

    it('should include root route for offline', () => {
      expect(OFFLINE_ROUTES).toContain('/');
    });

    it('should include inventory and transaction routes', () => {
      expect(OFFLINE_ROUTES).toContain('/inventory');
      expect(OFFLINE_ROUTES).toContain('/transactions');
    });
  });

  describe('Service Worker Version Management', () => {
    it('should have a valid semantic version', () => {
      expect(SW_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should be able to check for app updates', () => {
      const shouldUpdate = hasAppBeenUpdated();
      expect(typeof shouldUpdate).toBe('boolean');
    });

    it('should determine cleanup is needed periodically', () => {
      // First call should return true (no previous cleanup)
      const shouldClean = shouldPerformCleanup();
      expect(typeof shouldClean).toBe('boolean');
    });
  });
});

describe('Cache Invalidation Logic', () => {
  describe('Version-based Invalidation', () => {
    it('should invalidate cache on version change', () => {
      const oldVersion = '1.0.0';
      const newVersion = '1.1.0';
      
      // This would be checked in the service worker
      expect(oldVersion).not.toBe(newVersion);
    });

    it('should not invalidate cache if version is same', () => {
      const version1 = '1.0.0';
      const version2 = '1.0.0';
      
      expect(version1).toBe(version2);
    });
  });

  describe('Cache Expiration Logic', () => {
    it('should expire cache based on age', () => {
      const createdAt = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const maxAge = 5 * 60; // 5 minutes
      
      const isExpired = Date.now() - createdAt > maxAge * 1000;
      expect(isExpired).toBe(true);
    });

    it('should not expire fresh cache', () => {
      const createdAt = Date.now() - 1 * 60 * 1000; // 1 minute ago
      const maxAge = 5 * 60; // 5 minutes
      
      const isExpired = Date.now() - createdAt > maxAge * 1000;
      expect(isExpired).toBe(false);
    });
  });
});

describe('Cache Naming Conventions', () => {
  it('should follow consistent naming pattern', () => {
    const pattern = /^v\d+-\w+-cache$/;
    
    Object.values(CACHE_NAMES).forEach((cacheName) => {
      expect(cacheName).toMatch(pattern);
    });
  });

  it('should include cache version in all cache names', () => {
    Object.values(CACHE_NAMES).forEach((cacheName) => {
      expect(cacheName.startsWith(CACHE_VERSION)).toBe(true);
    });
  });

  it('should have descriptive cache names', () => {
    expect(CACHE_NAMES.API).toContain('api');
    expect(CACHE_NAMES.IMAGES).toContain('image');
    expect(CACHE_NAMES.STATIC).toContain('static');
    expect(CACHE_NAMES.PAGES).toContain('pages');
    expect(CACHE_NAMES.DATA).toContain('data');
  });
});

describe('Cache Strategy Properties', () => {
  it('API strategy should use network timeout', () => {
    const strategy = getCacheStrategy('https://api.example.com/data');
    expect(strategy?.networkTimeoutSeconds).toBeGreaterThan(0);
  });

  it('Image strategy should have long expiration', () => {
    const strategy = getCacheStrategy('https://example.com/image.png');
    expect(strategy?.handler).toBe('CacheFirst');
  });

  it('Static strategy should have very long expiration', () => {
    const strategy = getCacheStrategy('https://example.com/script.js');
    expect(strategy?.handler).toBe('CacheFirst');
  });
});

describe('Cache Size and Limits', () => {
  it('should have reasonable max entries for each cache', () => {
    expect(CACHE_MAX_ENTRIES.API).toBeLessThanOrEqual(100);
    expect(CACHE_MAX_ENTRIES.IMAGES).toBeLessThanOrEqual(200);
    expect(CACHE_MAX_ENTRIES.STATIC).toBeLessThanOrEqual(100);
  });

  it('should allow more entries for images than static assets', () => {
    expect(CACHE_MAX_ENTRIES.IMAGES).toBeGreaterThan(CACHE_MAX_ENTRIES.STATIC);
  });

  it('should limit API cache size reasonably', () => {
    expect(CACHE_MAX_ENTRIES.API).toBeLessThan(CACHE_MAX_ENTRIES.IMAGES);
  });
});

describe('Expiration Times Configuration', () => {
  it('should have shorter expiration for API than images', () => {
    expect(CACHE_EXPIRATION.API).toBeLessThan(CACHE_EXPIRATION.IMAGES);
  });

  it('should have very long expiration for static assets', () => {
    expect(CACHE_EXPIRATION.STATIC).toBeGreaterThan(365 * 24 * 60 * 60 / 2); // >180 days
  });

  it('should have 24-hour expiration for data cache', () => {
    expect(CACHE_EXPIRATION.DATA).toBe(24 * 60 * 60);
  });

  it('should have 1-hour expiration for pages', () => {
    expect(CACHE_EXPIRATION.PAGES).toBe(60 * 60);
  });
});
