/**
 * Custom Service Worker Logic (Beyond Workbox)
 * Handles cache versioning, validation, offline detection, and background sync
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_VERSION = 'v1';
const APP_VERSION = '1.0.0';
const SW_VERSION_KEY = 'sw_version';
const LAST_CLEANUP_KEY = 'sw_last_cleanup';

const CACHE_NAMES = {
  API: `${CACHE_VERSION}-api-cache`,
  IMAGES: `${CACHE_VERSION}-image-cache`,
  STATIC: `${CACHE_VERSION}-static-cache`,
  PAGES: `${CACHE_VERSION}-pages-cache`,
  DATA: `${CACHE_VERSION}-data-cache`,
  SYNC_QUEUE: `${CACHE_VERSION}-sync-queue`,
};

const ALL_CACHE_NAMES = Object.values(CACHE_NAMES);

// Non-cacheable endpoints that require fresh network requests
const NON_CACHEABLE_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/admin/sensitive',
  '/api/user/password',
];

// Routes that should have offline fallbacks
const OFFLINE_ROUTES = [
  '/',
  '/inventory',
  '/transactions',
  '/members',
  '/reports',
  '/offline',
];

// ============================================================================
// CACHE VERSION MANAGEMENT
// ============================================================================

/**
 * Initialize or update cache version
 * Called when Service Worker is activated
 */
async function initializeCacheVersion() {
  try {
    // Check if version has changed
    const storedVersion = await self.registration?.scope
      ? new Promise((resolve) => {
          const req = indexedDB.open('sw-config');
          req.onsuccess = () => {
            const db = req.result;
            if (db.objectStoreNames.contains('version')) {
              const tx = db.transaction('version', 'readonly');
              const store = tx.objectStore('version');
              const getReq = store.get(SW_VERSION_KEY);
              getReq.onsuccess = () => resolve(getReq.result?.value);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        })
      : null;

    if (storedVersion !== APP_VERSION) {
      console.log(`[SW] Version update detected: ${storedVersion} -> ${APP_VERSION}`);
      await invalidateCaches();
      await storeVersion(APP_VERSION);
    }
  } catch (error) {
    console.error('[SW] Error initializing cache version:', error);
  }
}

/**
 * Store current app version in IndexedDB
 */
async function storeVersion(version) {
  try {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('sw-config');
      req.onsuccess = () => {
        const db = req.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains('version')) {
          return resolve();
        }
        
        const tx = db.transaction('version', 'readwrite');
        const store = tx.objectStore('version');
        store.put({ key: SW_VERSION_KEY, value: version });
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error('[SW] Error storing version:', error);
  }
}

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

/**
 * Invalidate all caches
 * Called when app version changes or during major updates
 */
async function invalidateCaches() {
  try {
    console.log('[SW] Invalidating all caches');
    
    // Delete all versioned caches
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames
      .filter((name) => ALL_CACHE_NAMES.some((cacheName) => name.includes(cacheName)))
      .map((name) => caches.delete(name));
    
    await Promise.all(deletePromises);
    console.log('[SW] Cache invalidation complete');
  } catch (error) {
    console.error('[SW] Error invalidating caches:', error);
  }
}

/**
 * Perform periodic cache cleanup
 * Removes old entries, expired items, and maintains cache size limits
 */
async function performCacheCleanup() {
  try {
    const now = Date.now();
    
    // Check if cleanup was performed recently (within 24 hours)
    const lastCleanup = await getFromStorage(LAST_CLEANUP_KEY);
    if (lastCleanup && now - lastCleanup < 24 * 60 * 60 * 1000) {
      return;
    }
    
    console.log('[SW] Starting cache cleanup');
    
    // Clean each cache
    for (const [cacheName] of Object.entries(CACHE_NAMES)) {
      await cleanupCache(cacheName);
    }
    
    // Record cleanup time
    await saveToStorage(LAST_CLEANUP_KEY, now);
    console.log('[SW] Cache cleanup complete');
  } catch (error) {
    console.error('[SW] Error during cache cleanup:', error);
  }
}

/**
 * Clean individual cache
 */
async function cleanupCache(cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    // Define expiration times (in seconds)
    const expirationMap = {
      [CACHE_NAMES.API]: 5 * 60,
      [CACHE_NAMES.IMAGES]: 7 * 24 * 60 * 60,
      [CACHE_NAMES.STATIC]: 365 * 24 * 60 * 60,
      [CACHE_NAMES.PAGES]: 60 * 60,
      [CACHE_NAMES.DATA]: 24 * 60 * 60,
    };
    
    const maxExpiration = expirationMap[cacheName] || 24 * 60 * 60;
    const now = Date.now();
    let deletedCount = 0;
    
    for (const request of keys) {
      try {
        const response = await cache.match(request);
        if (response) {
          const dateHeader = response.headers.get('date');
          if (dateHeader) {
            const cacheTime = new Date(dateHeader).getTime();
            const age = (now - cacheTime) / 1000;
            
            if (age > maxExpiration) {
              await cache.delete(request);
              deletedCount++;
            }
          }
        }
      } catch (error) {
        console.warn(`[SW] Error checking cache entry: ${error.message}`);
      }
    }
    
    console.log(`[SW] Cleaned ${cacheName}: removed ${deletedCount} expired entries`);
  } catch (error) {
    console.error(`[SW] Error cleaning cache ${cacheName}:`, error);
  }
}

// ============================================================================
// OFFLINE DETECTION & HANDLING
// ============================================================================

/**
 * Check if a request can be handled offline
 */
function canHandleOffline(request) {
  const url = new URL(request.url);
  
  // Check if it's a GET request
  if (request.method !== 'GET') {
    return false;
  }
  
  // Check if URL is in offline routes
  return OFFLINE_ROUTES.some((route) => url.pathname.startsWith(route));
}

/**
 * Get offline fallback response
 */
async function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  // Try to get cached version
  for (const cacheName of [CACHE_NAMES.PAGES, CACHE_NAMES.API]) {
    try {
      const cache = await caches.open(cacheName);
      const response = await cache.match(request);
      if (response) {
        return response;
      }
    } catch (error) {
      console.warn(`[SW] Error checking offline cache: ${error.message}`);
    }
  }
  
  // Return offline page as last resort
  try {
    const cache = await caches.open(CACHE_NAMES.PAGES);
    return await cache.match('/offline');
  } catch {
    // Return a minimal offline response
    return new Response('Offline - Please check your connection', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// ============================================================================
// REQUEST HANDLING
// ============================================================================

/**
 * Should cache this request
 */
function shouldCacheRequest(request) {
  const url = new URL(request.url);
  
  // Only cache GET requests
  if (request.method !== 'GET') {
    return false;
  }
  
  // Don't cache non-cacheable endpoints
  for (const endpoint of NON_CACHEABLE_ENDPOINTS) {
    if (url.pathname.includes(endpoint)) {
      return false;
    }
  }
  
  // Don't cache if query param says so
  if (url.searchParams.has('nocache')) {
    return false;
  }
  
  return true;
}

/**
 * Handle fetch request with appropriate strategy
 */
async function handleFetch(request) {
  const url = new URL(request.url);
  
  // Always skip non-GET requests
  if (request.method !== 'GET') {
    return fetch(request);
  }
  
  // Skip cross-origin requests (except our own APIs)
  if (url.origin !== self.location.origin && !url.hostname.includes('api.')) {
    return fetch(request);
  }
  
  // Determine caching strategy based on URL pattern
  if (url.pathname.includes('/api/')) {
    return networkFirstStrategy(request);
  } else if (/\.(png|jpg|jpeg|svg|gif|webp|ico)$/.test(url.pathname)) {
    return cacheFirstStrategy(request);
  } else if (/\.(js|css|woff2?|ttf|eot)$/.test(url.pathname)) {
    return cacheFirstStrategy(request);
  } else {
    return networkFirstStrategy(request);
  }
}

/**
 * Network First Strategy: Try network, fall back to cache
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.status === 200 && shouldCacheRequest(request)) {
      const cacheName = getCacheNameForUrl(request.url);
      if (cacheName) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // No cache, check if we can handle offline
    if (canHandleOffline(request)) {
      return getOfflineFallback(request);
    }
    
    // Return error response
    return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Cache First Strategy: Try cache, fall back to network
 */
async function cacheFirstStrategy(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.status === 200 && shouldCacheRequest(request)) {
      const cacheName = getCacheNameForUrl(request.url);
      if (cacheName) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone());
      }
    }
    
    return response;
  } catch (error) {
    // Both cache and network failed
    return new Response('Resource unavailable', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Determine cache name for URL
 */
function getCacheNameForUrl(url) {
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

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

/**
 * Store sync item for background sync queue
 * Called when user is offline and attempts a mutation
 */
async function storeSyncItem(method, url, data) {
  try {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('sync-queue');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('pending', 'readwrite');
        const store = tx.objectStore('pending');
        
        store.add({
          id: Date.now(),
          method,
          url,
          data,
          timestamp: Date.now(),
          retries: 0,
        });
        
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error('[SW] Error storing sync item:', error);
  }
}

/**
 * Process background sync queue
 */
async function processSyncQueue() {
  try {
    return new Promise((resolve) => {
      const req = indexedDB.open('sync-queue');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('pending', 'readonly');
        const store = tx.objectStore('pending');
        const getAllReq = store.getAll();
        
        getAllReq.onsuccess = async () => {
          const items = getAllReq.result;
          let processedCount = 0;
          
          for (const item of items) {
            try {
              const response = await fetch(item.url, {
                method: item.method,
                body: JSON.stringify(item.data),
                headers: { 'Content-Type': 'application/json' },
              });
              
              if (response.ok) {
                // Remove from queue
                const txDelete = db.transaction('pending', 'readwrite');
                const storeDelete = txDelete.objectStore('pending');
                storeDelete.delete(item.id);
                processedCount++;
              }
            } catch (error) {
              console.warn(`[SW] Failed to process sync item: ${error.message}`);
            }
          }
          
          console.log(`[SW] Sync queue processed: ${processedCount}/${items.length} items`);
          resolve();
        };
      };
      req.onerror = () => resolve();
    });
  } catch (error) {
    console.error('[SW] Error processing sync queue:', error);
  }
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

/**
 * Store value in IndexedDB
 */
async function saveToStorage(key, value) {
  try {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('sw-config');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('config', 'readwrite');
        const store = tx.objectStore('config');
        store.put({ key, value });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error(`[SW] Error saving to storage: ${error.message}`);
  }
}

/**
 * Retrieve value from IndexedDB
 */
async function getFromStorage(key) {
  try {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('sw-config');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('config', 'readonly');
        const store = tx.objectStore('config');
        const getReq = store.get(key);
        getReq.onsuccess = () => resolve(getReq.result?.value);
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error(`[SW] Error retrieving from storage: ${error.message}`);
    return null;
  }
}

// ============================================================================
// SERVICE WORKER LIFECYCLE EVENTS
// ============================================================================

/**
 * Install event - cache core assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing');
  event.waitUntil(
    (async () => {
      try {
        // Optionally pre-cache critical assets
        const cache = await caches.open(CACHE_NAMES.STATIC);
        // Add offline fallback page
        try {
          const offlinePage = await fetch('/offline');
          cache.put('/offline', offlinePage);
        } catch (error) {
          console.warn('[SW] Could not cache offline page:', error);
        }
        
        // Skip waiting to activate immediately
        self.skipWaiting();
      } catch (error) {
        console.error('[SW] Install failed:', error);
      }
    })()
  );
});

/**
 * Activate event - cleanup old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating');
  event.waitUntil(
    (async () => {
      try {
        // Initialize cache version and check for updates
        await initializeCacheVersion();
        
        // Perform cache cleanup
        await performCacheCleanup();
        
        // Claim all clients
        await self.clients.claim();
        
        // Process background sync queue
        await processSyncQueue();
        
        console.log('[SW] Service Worker activated successfully');
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

/**
 * Fetch event - intercept requests
 */
self.addEventListener('fetch', (event) => {
  // Handle fetch request
  event.respondWith(handleFetch(event.request).catch(() => {
    // Final fallback
    return new Response('Service Unavailable', { status: 503 });
  }));
});

/**
 * Message event - handle messages from clients
 */
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  if (type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING, updating now');
    self.skipWaiting();
  } else if (type === 'INVALIDATE_CACHE') {
    console.log('[SW] Received INVALIDATE_CACHE');
    event.waitUntil(invalidateCaches());
  } else if (type === 'SYNC_OFFLINE_CHANGES') {
    console.log('[SW] Received SYNC_OFFLINE_CHANGES');
    event.waitUntil(processSyncQueue());
  } else if (type === 'STORE_SYNC_ITEM') {
    console.log('[SW] Received STORE_SYNC_ITEM');
    event.waitUntil(storeSyncItem(data.method, data.url, data.data));
  }
});

/**
 * Periodic background sync event
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-offline-changes') {
    console.log('[SW] Periodic sync triggered');
    event.waitUntil(processSyncQueue());
  }
});

console.log('[SW] Custom Service Worker logic loaded');
