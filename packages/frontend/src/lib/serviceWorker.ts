/**
 * Service Worker registration and management
 * Handles registration, updates, cache invalidation, and offline functionality
 */

import { 
  SW_VERSION, 
  storeAppVersion, 
  getStoredAppVersion, 
  hasAppBeenUpdated,
  CACHE_VERSION,
  CACHE_NAMES,
  ALL_CACHE_NAMES 
} from './sw-config';

/**
 * Register service worker with comprehensive update and cache management
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof window === 'undefined') {
    return undefined;
  }

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return undefined;
  }

  // Check if PWA is enabled
  if (process.env.NEXT_PUBLIC_PWA_ENABLED !== 'true') {
    console.log('PWA is disabled');
    return undefined;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration);

    // Store initial version
    const storedVersion = getStoredAppVersion();
    if (storedVersion !== SW_VERSION) {
      console.log(`[SW] App version changed: ${storedVersion} -> ${SW_VERSION}`);
      storeAppVersion(SW_VERSION);
    }

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New Service Worker installed');
            // Notify user about update available
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('swupdate', {
                detail: { registration, newWorker }
              }));
            }
          }

          if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
            console.log('[SW] New Service Worker activated');
            // Notify user about update applied
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('swupdated', {
                detail: { registration, newWorker }
              }));
            }
          }
        });
      }
    });

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Check every hour

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return undefined;
  }
}

/**
 * Skip waiting for new service worker and reload
 */
export function skipWaiting(): void {
  if (typeof window === 'undefined') return;

  const listener = () => {
    navigator.serviceWorker.removeEventListener('controllerchange', listener);
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', listener);
  
  // Send skip waiting message to all service workers
  navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Invalidate all caches on demand
 */
export async function invalidateCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames
      .filter((name) => ALL_CACHE_NAMES.some((cacheName) => name.includes(cacheName)))
      .map((name) => caches.delete(name));
    
    await Promise.all(deletePromises);
    console.log('Cache invalidation completed');

    // Notify service worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'INVALIDATE_CACHE' });
    }
  } catch (error) {
    console.error('Failed to invalidate caches:', error);
  }
}

/**
 * Clear specific cache by name
 */
export async function clearSpecificCache(cacheName: string): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    await caches.delete(cacheName);
    console.log(`Cache ${cacheName} cleared`);
  } catch (error) {
    console.error(`Failed to clear cache ${cacheName}:`, error);
  }
}

/**
 * Check if offline
 */
export function isOffline(): boolean {
  if (typeof window === 'undefined') return false;
  return !navigator.onLine;
}

/**
 * Listen for online/offline status changes
 */
export function listenToOnlineStatusChanges(
  onOnline: () => void,
  onOffline: () => void
): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
}

/**
 * Remove online/offline status listeners
 */
export function removeOnlineStatusListeners(
  onOnline: () => void,
  onOffline: () => void
): void {
  if (typeof window === 'undefined') return;

  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
}

/**
 * Cache specific assets preemptively
 */
export async function cacheAssets(cacheName: string, urls: string[]): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const cache = await caches.open(cacheName);
    const cachePromises = urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.status === 200) {
          await cache.put(url, response);
        }
      } catch (error) {
        console.warn(`Failed to cache asset ${url}:`, error);
      }
    });
    
    await Promise.all(cachePromises);
    console.log(`Assets cached in ${cacheName}`);
  } catch (error) {
    console.error('Failed to cache assets:', error);
  }
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('All caches cleared');
  } catch (error) {
    console.error('Failed to clear all caches:', error);
  }
}

/**
 * Get cached response for URL
 */
export async function getCachedResponse(url: string): Promise<Response | undefined> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return undefined;
  }

  try {
    const response = await caches.match(url);
    return response;
  } catch (error) {
    console.error('Failed to get cached response:', error);
    return undefined;
  }
}

/**
 * Get cache size information
 */
export async function getCacheSize(): Promise<{ cacheName: string; size: number }[]> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return [];
  }

  try {
    const sizes: { cacheName: string; size: number }[] = [];
    
    for (const cacheName of ALL_CACHE_NAMES) {
      try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        let totalSize = 0;

        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }

        sizes.push({ cacheName, size: totalSize });
      } catch (error) {
        console.warn(`Failed to get size for cache ${cacheName}:`, error);
      }
    }

    return sizes;
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return [];
  }
}

/**
 * Request permission for notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }

  return 'denied';
}

/**
 * Send notification
 */
export function sendNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, options);
  }
}

/**
 * Store item for background sync (offline mutations)
 * Called when user attempts a mutation while offline
 */
export async function storeSyncItem(method: string, url: string, data: unknown): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Notify service worker to store sync item
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'STORE_SYNC_ITEM',
        data: { method, url, data },
      });
    }
  } catch (error) {
    console.error('Failed to store sync item:', error);
  }
}

/**
 * Trigger background sync queue processing
 */
export async function triggerSyncQueue(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Notify service worker to process sync queue
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SYNC_OFFLINE_CHANGES' });
    }
  } catch (error) {
    console.error('Failed to trigger sync queue:', error);
  }
}

/**
 * Hook into swupdate event to notify user about available updates
 */
export function onServiceWorkerUpdate(callback: (registration: ServiceWorkerRegistration) => void): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('swupdate', ((event: any) => {
    callback(event.detail.registration);
  }) as EventListener);
}

/**
 * Hook into swupdated event to notify user about applied updates
 */
export function onServiceWorkerUpdated(callback: (registration: ServiceWorkerRegistration) => void): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('swupdated', ((event: any) => {
    callback(event.detail.registration);
  }) as EventListener);
}
