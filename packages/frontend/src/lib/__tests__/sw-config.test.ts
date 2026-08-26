/**
 * Service Worker Configuration Tests
 * Tests for cache versioning, strategies, and configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CACHE_VERSION,
  SW_VERSION,
  CACHE_NAMES,
  ALL_CACHE_NAMES,
  CACHE_EXPIRATION,
  CACHE_MAX_ENTRIES,
  NON_CACHEABLE_ENDPOINTS,
  OFFLINE_ROUTES,
  shouldCacheUrl,
  getCacheStrategy,
  getCacheNameForUrl,
  getCacheExpiration,
  getCacheMaxEntries,
  storeAppVersion,
  getStoredAppVersion,
  hasAppBeenUpdated,
} from '../sw-config';

describe('Service Worker Configuration', () => {
  describe('Version Management', () => {
    it('should have defined CACHE_VERSION', () => {
      expect(CACHE_VERSION).toBe('v1');
    });

    it('should have defined SW_VERSION', () => {
      expect(SW_VERSION).toBe('1.0.0');
    });

    it('should store app version in localStorage', () => {
      const mockLocalStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };

      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      storeAppVersion('1.1.0');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('app_version', '1.1.0');
    });

    it('should retrieve stored app version', () => {
      const mockLocalStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(() => '1.0.0'),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };

      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      const version = getStoredAppVersion();
      expect(version).toBe('1.0.0');
    });

    it('should detect app update', () => {
      const mockLocalStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(() => '0.9.0'),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };

      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

      const updated = hasAppBeenUpdated();
      expect(updated).toBe(true);
    });
  });

  describe('Cache Configuration', () => {
    it('should have all required cache names', () => {
      expect(CACHE_NAMES.API).toBeDefined();
      expect(CACHE_NAMES.IMAGES).toBeDefined();
      expect(CACHE_NAMES.STATIC).toBeDefined();
      expect(CACHE_NAMES.PAGES).toBeDefined();
      expect(CACHE_NAMES.DATA).toBeDefined();
    });

    it('should include all cache names in ALL_CACHE_NAMES', () => {
      expect(ALL_CACHE_NAMES).toContain(CACHE_NAMES.API);
      expect(ALL_CACHE_NAMES).toContain(CACHE_NAMES.IMAGES);
      expect(ALL_CACHE_NAMES).toContain(CACHE_NAMES.STATIC);
      expect(ALL_CACHE_NAMES).toContain(CACHE_NAMES.PAGES);
      expect(ALL_CACHE_NAMES).toContain(CACHE_NAMES.DATA);
    });

    it('should have cache names include version prefix', () => {
      expect(CACHE_NAMES.API).toContain('v1');
      expect(CACHE_NAMES.IMAGES).toContain('v1');
      expect(CACHE_NAMES.STATIC).toContain('v1');
      expect(CACHE_NAMES.PAGES).toContain('v1');
      expect(CACHE_NAMES.DATA).toContain('v1');
    });
  });

  describe('Cache Expiration', () => {
    it('should define expiration for all caches', () => {
      expect(CACHE_EXPIRATION[CACHE_NAMES.API]).toBe(5 * 60);
      expect(CACHE_EXPIRATION[CACHE_NAMES.IMAGES]).toBe(7 * 24 * 60 * 60);
      expect(CACHE_EXPIRATION[CACHE_NAMES.STATIC]).toBe(365 * 24 * 60 * 60);
      expect(CACHE_EXPIRATION[CACHE_NAMES.PAGES]).toBe(60 * 60);
      expect(CACHE_EXPIRATION[CACHE_NAMES.DATA]).toBe(24 * 60 * 60);
    });

    it('should return correct expiration for URL', () => {
      const apiExpiration = getCacheExpiration('/api/test');
      expect(apiExpiration).toBe(CACHE_EXPIRATION[CACHE_NAMES.API]);

      const imageExpiration = getCacheExpiration('/images/test.png');
      expect(imageExpiration).toBe(CACHE_EXPIRATION[CACHE_NAMES.IMAGES]);
    });
  });

  describe('Cache Size Limits', () => {
    it('should define max entries for all caches', () => {
      expect(CACHE_MAX_ENTRIES[CACHE_NAMES.API]).toBe(50);
      expect(CACHE_MAX_ENTRIES[CACHE_NAMES.IMAGES]).toBe(100);
      expect(CACHE_MAX_ENTRIES[CACHE_NAMES.STATIC]).toBe(60);
      expect(CACHE_MAX_ENTRIES[CACHE_NAMES.PAGES]).toBe(20);
      expect(CACHE_MAX_ENTRIES[CACHE_NAMES.DATA]).toBe(30);
    });

    it('should return correct max entries for cache name', () => {
      const apiMax = getCacheMaxEntries(CACHE_NAMES.API);
      expect(apiMax).toBe(50);

      const defaultMax = getCacheMaxEntries('unknown-cache');
      expect(defaultMax).toBe(50); // Default
    });
  });

  describe('URL Caching Validation', () => {
    it('should not cache authentication endpoints', () => {
      expect(shouldCacheUrl('https://api.example.com/api/auth/login')).toBe(false);
      expect(shouldCacheUrl('https://api.example.com/api/auth/logout')).toBe(false);
      expect(shouldCacheUrl('https://api.example.com/api/auth/refresh')).toBe(false);
    });

    it('should not cache sensitive endpoints', () => {
      expect(shouldCacheUrl('https://api.example.com/api/admin/sensitive')).toBe(false);
      expect(shouldCacheUrl('https://api.example.com/api/user/password')).toBe(false);
    });

    it('should respect nocache query parameter', () => {
      expect(shouldCacheUrl('https://api.example.com/api/data?nocache=true')).toBe(false);
    });

    it('should cache valid URLs', () => {
      expect(shouldCacheUrl('https://api.example.com/api/products')).toBe(true);
      expect(shouldCacheUrl('https://example.com/styles.css')).toBe(true);
    });

    it('should handle invalid URLs gracefully', () => {
      expect(shouldCacheUrl('not a valid url')).toBe(false);
    });
  });

  describe('Cache Strategy Selection', () => {
    it('should use network-first for API endpoints', () => {
      expect(getCacheStrategy('https://api.example.com/api/data')).toBe('network-first');
      expect(getCacheStrategy('https://localhost:3001/api/products')).toBe('network-first');
    });

    it('should use cache-first for images', () => {
      expect(getCacheStrategy('https://example.com/image.png')).toBe('cache-first');
      expect(getCacheStrategy('https://example.com/image.jpg')).toBe('cache-first');
      expect(getCacheStrategy('https://example.com/image.webp')).toBe('cache-first');
    });

    it('should use cache-first for static assets', () => {
      expect(getCacheStrategy('https://example.com/app.js')).toBe('cache-first');
      expect(getCacheStrategy('https://example.com/styles.css')).toBe('cache-first');
      expect(getCacheStrategy('https://fonts.example.com/font.woff2')).toBe('cache-first');
    });

    it('should use network-first for HTML pages by default', () => {
      expect(getCacheStrategy('https://example.com/page')).toBe('network-first');
      expect(getCacheStrategy('https://example.com/page.html')).toBe('network-first');
    });
  });

  describe('Cache Name Selection', () => {
    it('should select API cache for API URLs', () => {
      expect(getCacheNameForUrl('https://api.example.com/api/data')).toBe(CACHE_NAMES.API);
    });

    it('should select image cache for images', () => {
      expect(getCacheNameForUrl('https://example.com/image.png')).toBe(CACHE_NAMES.IMAGES);
      expect(getCacheNameForUrl('https://example.com/image.jpg')).toBe(CACHE_NAMES.IMAGES);
    });

    it('should select static cache for CSS and JS', () => {
      expect(getCacheNameForUrl('https://example.com/app.js')).toBe(CACHE_NAMES.STATIC);
      expect(getCacheNameForUrl('https://example.com/styles.css')).toBe(CACHE_NAMES.STATIC);
    });

    it('should select pages cache for HTML pages', () => {
      expect(getCacheNameForUrl('https://example.com/')).toBe(CACHE_NAMES.PAGES);
      expect(getCacheNameForUrl('https://example.com/page.html')).toBe(CACHE_NAMES.PAGES);
    });

    it('should return null for unrecognized URLs', () => {
      expect(getCacheNameForUrl('https://example.com/data.xml')).toBeNull();
    });
  });

  describe('Non-Cacheable Endpoints', () => {
    it('should include authentication endpoints', () => {
      expect(NON_CACHEABLE_ENDPOINTS).toContain('/api/auth/login');
      expect(NON_CACHEABLE_ENDPOINTS).toContain('/api/auth/logout');
      expect(NON_CACHEABLE_ENDPOINTS).toContain('/api/auth/refresh');
    });

    it('should include sensitive endpoints', () => {
      expect(NON_CACHEABLE_ENDPOINTS).toContain('/api/admin/sensitive');
      expect(NON_CACHEABLE_ENDPOINTS).toContain('/api/user/password');
    });
  });

  describe('Offline Routes', () => {
    it('should include main routes', () => {
      expect(OFFLINE_ROUTES).toContain('/');
      expect(OFFLINE_ROUTES).toContain('/inventory');
      expect(OFFLINE_ROUTES).toContain('/transactions');
      expect(OFFLINE_ROUTES).toContain('/members');
      expect(OFFLINE_ROUTES).toContain('/reports');
    });

    it('should include offline fallback route', () => {
      expect(OFFLINE_ROUTES).toContain('/offline');
    });
  });
});
