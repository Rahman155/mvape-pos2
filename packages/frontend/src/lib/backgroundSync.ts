/**
 * Background Sync Integration
 * Registers and manages background sync events with the service worker
 * Handles sync failures, retries, and periodic syncing
 */

export interface BackgroundSyncOptions {
  /**
   * Tag for sync events
   */
  tag?: string;

  /**
   * Sync period in milliseconds
   */
  period?: number;

  /**
   * Whether to sync in background
   */
  enableBackground?: boolean;

  /**
   * Whether to sync on reconnect
   */
  syncOnReconnect?: boolean;

  /**
   * Minimum battery level (0-100) required for sync
   */
  minBatteryLevel?: number;
}

export interface SyncRegistration {
  tag: string;
  registered: boolean;
  lastSyncTime: number | null;
  nextSyncTime: number | null;
  period: number;
}

/**
 * Background sync manager
 */
class BackgroundSyncManager {
  private isSupported = false;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private syncTags: Map<string, SyncRegistration> = new Map();
  private listeners: Map<string, Set<(event: SyncEvent) => void>> = new Map();
  private periodicTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize background sync
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      console.warn('[BackgroundSync] Not available in non-browser environment');
      return;
    }

    // Check for background sync support
    this.isSupported =
      'serviceWorker' in navigator &&
      'SyncManager' in window &&
      'registration' in ServiceWorkerContainer.prototype;

    if (!this.isSupported) {
      console.warn('[BackgroundSync] Background Sync API not supported');
      return;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.ready;
      console.log('[BackgroundSync] Initialized successfully');

      // Setup event listener for sync events from service worker
      navigator.serviceWorker.addEventListener('message', this.handleSWMessage.bind(this));
    } catch (error) {
      console.error('[BackgroundSync] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register background sync
   */
  async registerSync(tag: string, options: BackgroundSyncOptions = {}): Promise<boolean> {
    if (!this.isSupported || !this.swRegistration) {
      console.warn('[BackgroundSync] Background Sync not supported, using fallback');
      return this.setupFallbackSync(tag, options);
    }

    try {
      const syncManager = this.swRegistration.sync;

      if (!syncManager) {
        console.warn('[BackgroundSync] SyncManager not available, using fallback');
        return this.setupFallbackSync(tag, options);
      }

      // Try to register background sync
      await syncManager.register(tag);

      const registration: SyncRegistration = {
        tag,
        registered: true,
        lastSyncTime: null,
        nextSyncTime: Date.now() + (options.period || 0),
        period: options.period || 60000,
      };

      this.syncTags.set(tag, registration);
      console.log(`[BackgroundSync] Registered sync: ${tag}`);

      // Also setup periodic timer as fallback
      if (options.period) {
        this.setupPeriodicSync(tag, options.period);
      }

      return true;
    } catch (error) {
      console.error(`[BackgroundSync] Failed to register sync ${tag}:`, error);
      // Fallback to polling
      return this.setupFallbackSync(tag, options);
    }
  }

  /**
   * Setup fallback periodic sync using timers
   */
  private setupFallbackSync(tag: string, options: BackgroundSyncOptions): boolean {
    const period = options.period || 60000;

    const registration: SyncRegistration = {
      tag,
      registered: true,
      lastSyncTime: null,
      nextSyncTime: Date.now() + period,
      period,
    };

    this.syncTags.set(tag, registration);
    this.setupPeriodicSync(tag, period);

    console.log(`[BackgroundSync] Setup fallback sync for ${tag}`);
    return true;
  }

  /**
   * Setup periodic timer-based sync
   */
  private setupPeriodicSync(tag: string, period: number): void {
    // Clear existing timer
    const existingTimer = this.periodicTimers.get(tag);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Setup new timer
    const timer = setInterval(async () => {
      try {
        await this.triggerSync(tag);
      } catch (error) {
        console.error(`[BackgroundSync] Periodic sync failed for ${tag}:`, error);
      }
    }, period);

    this.periodicTimers.set(tag, timer);
  }

  /**
   * Trigger sync manually
   */
  async triggerSync(tag: string): Promise<void> {
    const registration = this.syncTags.get(tag);
    if (!registration) {
      throw new Error(`Sync tag not registered: ${tag}`);
    }

    try {
      registration.lastSyncTime = Date.now();
      registration.nextSyncTime = Date.now() + registration.period;

      // Send message to service worker
      if (this.swRegistration?.active) {
        this.swRegistration.active.postMessage({
          type: 'TRIGGER_BACKGROUND_SYNC',
          tag,
        });
      }

      // Dispatch local event
      this.dispatchSyncEvent(tag, { success: true, tag, timestamp: Date.now() });

      console.log(`[BackgroundSync] Triggered sync: ${tag}`);
    } catch (error) {
      console.error(`[BackgroundSync] Failed to trigger sync ${tag}:`, error);
      this.dispatchSyncEvent(tag, {
        success: false,
        tag,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  /**
   * Unregister sync
   */
  async unregisterSync(tag: string): Promise<void> {
    // Clear periodic timer
    const timer = this.periodicTimers.get(tag);
    if (timer) {
      clearInterval(timer);
      this.periodicTimers.delete(tag);
    }

    this.syncTags.delete(tag);
    console.log(`[BackgroundSync] Unregistered sync: ${tag}`);
  }

  /**
   * Handle messages from service worker
   */
  private handleSWMessage(event: ExtendableMessageEvent): void {
    const { type, tag, success, error } = event.data;

    if (type === 'SYNC_COMPLETE') {
      const registration = this.syncTags.get(tag);
      if (registration) {
        registration.lastSyncTime = Date.now();
      }

      this.dispatchSyncEvent(tag, {
        success,
        tag,
        error,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Add sync event listener
   */
  addEventListener(tag: string, listener: (event: SyncEvent) => void): void {
    if (!this.listeners.has(tag)) {
      this.listeners.set(tag, new Set());
    }
    this.listeners.get(tag)!.add(listener);
  }

  /**
   * Remove sync event listener
   */
  removeEventListener(tag: string, listener: (event: SyncEvent) => void): void {
    const listeners = this.listeners.get(tag);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Dispatch sync event
   */
  private dispatchSyncEvent(tag: string, event: SyncEvent): void {
    // Dispatch custom window event
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent(`bg:sync:${tag}`, { detail: event });
      window.dispatchEvent(customEvent);
    }

    // Call registered listeners
    const listeners = this.listeners.get(tag);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('[BackgroundSync] Listener error:', error);
        }
      }
    }
  }

  /**
   * Get sync registration
   */
  getRegistration(tag: string): SyncRegistration | null {
    return this.syncTags.get(tag) || null;
  }

  /**
   * Get all registrations
   */
  getAllRegistrations(): SyncRegistration[] {
    return Array.from(this.syncTags.values());
  }

  /**
   * Check if sync is supported
   */
  isBackgroundSyncSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get registration method
   */
  getRegistrationMethod(tag: string): 'native' | 'fallback' | 'none' {
    if (!this.isSupported) {
      const registration = this.syncTags.get(tag);
      return registration ? 'fallback' : 'none';
    }

    const registration = this.syncTags.get(tag);
    if (!registration) return 'none';

    return this.periodicTimers.has(tag) ? 'fallback' : 'native';
  }

  /**
   * Cleanup
   */
  destroy(): void {
    for (const timer of this.periodicTimers.values()) {
      clearInterval(timer);
    }
    this.periodicTimers.clear();
    this.listeners.clear();
    this.syncTags.clear();
    console.log('[BackgroundSync] Destroyed');
  }
}

/**
 * Sync event data
 */
export interface SyncEvent {
  success: boolean;
  tag: string;
  error?: string;
  timestamp: number;
}

/**
 * Singleton instance
 */
let syncManagerInstance: BackgroundSyncManager | null = null;

/**
 * Get or create background sync manager
 */
export function getBackgroundSyncManager(): BackgroundSyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new BackgroundSyncManager();
  }
  return syncManagerInstance;
}

/**
 * Initialize background sync manager
 */
export async function initializeBackgroundSync(): Promise<BackgroundSyncManager> {
  const manager = getBackgroundSyncManager();
  await manager.initialize();
  return manager;
}

export default BackgroundSyncManager;
