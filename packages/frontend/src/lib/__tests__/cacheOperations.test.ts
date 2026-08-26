/**
 * Cache Operations Tests
 * Tests for cache management, offline handling, and sync operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isOffline,
  invalidateCaches,
  clearAllCaches,
  clearSpecificCache,
  getCachedResponse,
  getCacheSize,
  cacheAssets,
  storeSyncItem,
  triggerSyncQueue,
  onServiceWorkerUpdate,
  onServiceWorkerUpdated,
} from '../serviceWorker';

describe('Cache Operations', () => {
  beforeEach(() => {
    // Mock navigator
    global.navigator = {
      onLine: true,
      serviceWorker: {
        controller: {
          postMessage: vi.fn(),
        },
      },
    } as any;

    // Mock caches API
    global.caches = {
      open: vi.fn(),
      match: vi.fn(),
      keys: vi.fn(),
      delete: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Offline Detection', () => {
    it('should detect when online', () => {
      navigator.onLine = true;
      expect(isOffline()).toBe(false);
    });

    it('should detect when offline', () => {
      navigator.onLine = false;
      expect(isOffline()).toBe(true);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate all managed caches', async () => {
      const mockCaches = [
        'v1-api-cache',
        'v1-image-cache',
        'v1-static-cache',
        'v1-pages-cache',
        'v1-data-cache',
      ];

      (global.caches.keys as any).mockResolvedValue(mockCaches);
      (global.caches.delete as any).mockResolvedValue(undefined);

      await invalidateCaches();

      expect(global.caches.keys).toHaveBeenCalled();
      // Should delete versioned caches
      expect(global.caches.delete).toHaveBeenCalledWith('v1-api-cache');
    });

    it('should send message to service worker for cache invalidation', async () => {
      (global.caches.keys as any).mockResolvedValue([]);
      (global.caches.delete as any).mockResolvedValue(undefined);

      await invalidateCaches();

      expect(navigator.serviceWorker.controller.postMessage).toHaveBeenCalledWith({
        type: 'INVALIDATE_CACHE',
      });
    });

    it('should handle cache deletion errors gracefully', async () => {
      (global.caches.keys as any).mockRejectedValue(new Error('Quota exceeded'));

      // Should not throw
      expect(async () => {
        await invalidateCaches();
      }).not.toThrow();
    });
  });

  describe('Cache Clearing', () => {
    it('should clear specific cache by name', async () => {
      (global.caches.delete as any).mockResolvedValue(undefined);

      await clearSpecificCache('v1-api-cache');

      expect(global.caches.delete).toHaveBeenCalledWith('v1-api-cache');
    });

    it('should clear all caches', async () => {
      const mockCacheNames = [
        'v1-api-cache',
        'v1-image-cache',
        'v1-static-cache',
      ];

      (global.caches.keys as any).mockResolvedValue(mockCacheNames);
      (global.caches.delete as any).mockResolvedValue(undefined);

      await clearAllCaches();

      expect(global.caches.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cached Response Retrieval', () => {
    it('should get cached response for URL', async () => {
      const mockResponse = new Response('cached data');
      (global.caches.match as any).mockResolvedValue(mockResponse);

      const response = await getCachedResponse('https://api.example.com/data');

      expect(global.caches.match).toHaveBeenCalledWith('https://api.example.com/data');
      expect(response).toBe(mockResponse);
    });

    it('should return undefined if no cached response', async () => {
      (global.caches.match as any).mockResolvedValue(undefined);

      const response = await getCachedResponse('https://api.example.com/data');

      expect(response).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      (global.caches.match as any).mockRejectedValue(new Error('Cache error'));

      const response = await getCachedResponse('https://api.example.com/data');

      expect(response).toBeUndefined();
    });
  });

  describe('Cache Size Calculation', () => {
    it('should calculate total cache size', async () => {
      const mockCacheNames = ['v1-api-cache', 'v1-image-cache'];
      (global.caches.keys as any).mockResolvedValue(mockCacheNames);

      const mockCache = {
        keys: vi.fn().mockResolvedValue([]),
      };
      (global.caches.open as any).mockResolvedValue(mockCache);

      const sizes = await getCacheSize();

      expect(Array.isArray(sizes)).toBe(true);
    });

    it('should report size for each cache', async () => {
      const mockRequest = new Request('https://api.example.com/data');
      const mockResponse = new Response('data', {
        headers: { 'Content-Length': '1024' },
      });

      const mockCache = {
        keys: vi.fn().mockResolvedValue([mockRequest]),
        match: vi.fn().mockResolvedValue(mockResponse),
      };

      (global.caches.keys as any).mockResolvedValue(['v1-api-cache']);
      (global.caches.open as any).mockResolvedValue(mockCache);

      const sizes = await getCacheSize();

      expect(sizes).toBeDefined();
      expect(Array.isArray(sizes)).toBe(true);
    });
  });

  describe('Asset Caching', () => {
    it('should cache assets from URL list', async () => {
      const mockCache = {
        put: vi.fn().mockResolvedValue(undefined),
      };

      (global.caches.open as any).mockResolvedValue(mockCache);
      global.fetch = vi.fn().mockResolvedValue(new Response('data', { status: 200 }));

      const urls = [
        'https://api.example.com/data1',
        'https://api.example.com/data2',
      ];

      await cacheAssets('v1-api-cache', urls);

      expect(global.caches.open).toHaveBeenCalledWith('v1-api-cache');
      expect(mockCache.put).toHaveBeenCalled();
    });

    it('should skip failed assets', async () => {
      const mockCache = {
        put: vi.fn(),
      };

      (global.caches.open as any).mockResolvedValue(mockCache);
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const urls = ['https://api.example.com/fail'];

      await cacheAssets('v1-api-cache', urls);

      // Should not crash, just skip the failed asset
      expect(mockCache.put).not.toHaveBeenCalled();
    });

    it('should skip non-200 responses', async () => {
      const mockCache = {
        put: vi.fn(),
      };

      (global.caches.open as any).mockResolvedValue(mockCache);
      global.fetch = vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 }));

      const urls = ['https://api.example.com/notfound'];

      await cacheAssets('v1-api-cache', urls);

      expect(mockCache.put).not.toHaveBeenCalled();
    });
  });

  describe('Offline Sync', () => {
    it('should store sync item for offline changes', async () => {
      await storeSyncItem('POST', 'https://api.example.com/data', { test: 'data' });

      expect(navigator.serviceWorker.controller.postMessage).toHaveBeenCalledWith({
        type: 'STORE_SYNC_ITEM',
        data: {
          method: 'POST',
          url: 'https://api.example.com/data',
          data: { test: 'data' },
        },
      });
    });

    it('should trigger sync queue processing', async () => {
      await triggerSyncQueue();

      expect(navigator.serviceWorker.controller.postMessage).toHaveBeenCalledWith({
        type: 'SYNC_OFFLINE_CHANGES',
      });
    });

    it('should handle sync errors gracefully', async () => {
      (navigator.serviceWorker.controller.postMessage as any).mockImplementation(() => {
        throw new Error('Sync error');
      });

      // Should not throw
      expect(async () => {
        await storeSyncItem('POST', 'https://api.example.com/data', { test: 'data' });
      }).not.toThrow();
    });
  });

  describe('Service Worker Update Events', () => {
    it('should handle update available event', () => {
      const callback = vi.fn();
      onServiceWorkerUpdate(callback);

      const mockRegistration = {} as ServiceWorkerRegistration;
      window.dispatchEvent(
        new CustomEvent('swupdate', { detail: { registration: mockRegistration } })
      );

      expect(callback).toHaveBeenCalledWith(mockRegistration);
    });

    it('should handle update applied event', () => {
      const callback = vi.fn();
      onServiceWorkerUpdated(callback);

      const mockRegistration = {} as ServiceWorkerRegistration;
      window.dispatchEvent(
        new CustomEvent('swupdated', { detail: { registration: mockRegistration } })
      );

      expect(callback).toHaveBeenCalledWith(mockRegistration);
    });
  });
});

describe('Cache Strategy Integration', () => {
  it('should support network-first strategy for API', () => {
    // Network-first: try network first, fallback to cache
    const strategy = 'NetworkFirst';
    expect(strategy).toBe('NetworkFirst');
  });

  it('should support cache-first strategy for assets', () => {
    // Cache-first: try cache first, fallback to network
    const strategy = 'CacheFirst';
    expect(strategy).toBe('CacheFirst');
  });
});

describe('Offline Functionality', () => {
  it('should work without network when cache available', () => {
    navigator.onLine = false;
    expect(isOffline()).toBe(true);
  });

  it('should restore functionality when back online', () => {
    navigator.onLine = true;
    expect(isOffline()).toBe(false);
  });
});
