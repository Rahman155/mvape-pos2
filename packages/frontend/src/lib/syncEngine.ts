/**
 * Synchronization Engine
 * Manages syncing of offline changes with the server
 * Implements batch operations, exponential backoff, and conflict handling
 */

import { getOfflineQueue, QueueItem } from './offlineQueue';
import { getApiClient } from './api';
import { initDatabase, getDBManager } from './indexedDB';
import { getConflictResolver } from './conflictResolution';
import { getSyncNotificationManager } from './syncNotifications';
import { getConflictNotificationHandler } from './conflictNotificationHandler';

// Simple logger
const logger = {
  debug: (msg: string, ...args: unknown[]) => console.debug(`[SyncEngine] ${msg}`, ...args),
  info: (msg: string, ...args: unknown[]) => console.info(`[SyncEngine] ${msg}`, ...args),
  warn: (msg: string, ...args: unknown[]) => console.warn(`[SyncEngine] ${msg}`, ...args),
  error: (msg: string, ...args: unknown[]) => console.error(`[SyncEngine] ${msg}`, ...args),
};

export interface SyncOptions {
  batchSize?: number;
  maxRetries?: number;
  initialBackoff?: number;
  maxBackoff?: number;
  timeout?: number;
}

export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsFailed: number;
  totalItems: number;
  duration: number;
  errors: SyncError[];
  timestamp: number;
}

export interface SyncError {
  itemId: string;
  entityType: string;
  error: string;
  statusCode?: number;
  retryable: boolean;
}

export interface BatchSyncRequest {
  items: Array<{
    id: string;
    entityType: string;
    changeType: string;
    data: unknown;
  }>;
}

export interface BatchSyncResponse {
  success: boolean;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
    data?: unknown;
  }>;
  timestamp: number;
  version: string;
}

export enum SyncStatus {
  Idle = 'idle',
  Syncing = 'syncing',
  Paused = 'paused',
  Error = 'error',
  Complete = 'complete',
}

class SyncEngine {
  private status: SyncStatus = SyncStatus.Idle;
  private isOnline = true;
  private lastSyncTime: number | null = null;
  private syncInProgress = false;
  private options: Required<SyncOptions>;
  private retryCount: Map<string, number> = new Map();
  private backoffTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(options: SyncOptions = {}) {
    this.options = {
      batchSize: options.batchSize ?? 10,
      maxRetries: options.maxRetries ?? 3,
      initialBackoff: options.initialBackoff ?? 1000,
      maxBackoff: options.maxBackoff ?? 30000,
      timeout: options.timeout ?? 30000,
    };
  }

  /**
   * Initialize sync engine
   */
  async initialize(): Promise<void> {
    try {
      await initDatabase();
      this.setupOnlineDetection();
      console.log('[SyncEngine] Initialized');
    } catch (error) {
      console.error('[SyncEngine] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup online/offline detection
   */
  private setupOnlineDetection(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      console.log('[SyncEngine] Network restored');
      this.isOnline = true;
      this.dispatchEvent('engine:online');
      // Trigger sync when coming back online
      this.sync().catch((err) => {
        console.error('[SyncEngine] Auto-sync failed:', err);
      });
    });

    window.addEventListener('offline', () => {
      console.log('[SyncEngine] Network lost');
      this.isOnline = false;
      this.dispatchEvent('engine:offline');
    });

    this.isOnline = navigator.onLine;
  }

  /**
   * Main sync method - processes all pending items
   */
  async sync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.warn('[SyncEngine] Sync already in progress');
      return {
        success: false,
        itemsProcessed: 0,
        itemsFailed: 0,
        totalItems: 0,
        duration: 0,
        errors: [{ itemId: 'engine', entityType: 'engine', error: 'Sync already in progress', retryable: false }],
        timestamp: Date.now(),
      };
    }

    if (!this.isOnline) {
      console.warn('[SyncEngine] Cannot sync while offline');
      return {
        success: false,
        itemsProcessed: 0,
        itemsFailed: 0,
        totalItems: 0,
        duration: 0,
        errors: [{ itemId: 'engine', entityType: 'engine', error: 'Device is offline', retryable: true }],
        timestamp: Date.now(),
      };
    }

    const startTime = Date.now();
    this.syncInProgress = true;
    this.status = SyncStatus.Syncing;

    try {
      this.dispatchEvent('sync:start');

      const queue = getOfflineQueue();
      const pendingItems = await queue.getPendingItems();

      if (pendingItems.length === 0) {
        console.log('[SyncEngine] No pending items to sync');
        const result: SyncResult = {
          success: true,
          itemsProcessed: 0,
          itemsFailed: 0,
          totalItems: 0,
          duration: Date.now() - startTime,
          errors: [],
          timestamp: Date.now(),
        };
        this.finalizeSyncSuccess(result);
        return result;
      }

      console.log('[SyncEngine] Starting sync of', pendingItems.length, 'items');

      const result = await this.processBatch(pendingItems);
      result.duration = Date.now() - startTime;
      result.timestamp = Date.now();

      this.lastSyncTime = result.timestamp;

      if (result.success) {
        this.finalizeSyncSuccess(result);
      } else {
        this.finalizeSyncError(result);
      }

      return result;
    } catch (error) {
      const errorResult: SyncResult = {
        success: false,
        itemsProcessed: 0,
        itemsFailed: 0,
        totalItems: 0,
        duration: Date.now() - startTime,
        errors: [
          {
            itemId: 'engine',
            entityType: 'engine',
            error: error instanceof Error ? error.message : 'Unknown error',
            retryable: true,
          },
        ],
        timestamp: Date.now(),
      };

      this.finalizeSyncError(errorResult);
      return errorResult;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process a batch of items
   */
  private async processBatch(items: QueueItem[]): Promise<SyncResult> {
    const queue = getOfflineQueue();
    const results: SyncResult = {
      success: true,
      itemsProcessed: 0,
      itemsFailed: 0,
      totalItems: items.length,
      duration: 0,
      errors: [],
      timestamp: Date.now(),
    };

    // Process in batches
    for (let i = 0; i < items.length; i += this.options.batchSize) {
      const batch = items.slice(i, i + this.options.batchSize);
      const batchResult = await this.processSingleBatch(batch);

      results.itemsProcessed += batchResult.itemsProcessed;
      results.itemsFailed += batchResult.itemsFailed;
      results.errors.push(...batchResult.errors);

      if (!batchResult.success) {
        results.success = false;
      }

      // Update progress
      this.dispatchEvent('sync:progress', {
        processed: results.itemsProcessed,
        total: results.totalItems,
        failed: results.itemsFailed,
      });

      // Small delay between batches
      if (i + this.options.batchSize < items.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  /**
   * Process a single batch of items
   */
  private async processSingleBatch(
    items: QueueItem[]
  ): Promise<{ itemsProcessed: number; itemsFailed: number; success: boolean; errors: SyncError[] }> {
    const queue = getOfflineQueue();
    const conflictResolver = getConflictResolver();
    const notificationManager = getSyncNotificationManager();
    const conflictNotificationHandler = getConflictNotificationHandler();
    const request: BatchSyncRequest = {
      items: items.map((item) => ({
        id: item.id,
        entityType: item.entityType,
        changeType: item.changeType,
        data: item.data,
      })),
    };

    try {
      const apiClient = getApiClient();
      const response = await apiClient.post<BatchSyncResponse>(
        '/sync/batch',
        request,
        { timeout: this.options.timeout }
      );

      const batchResult = response.data;
      let processedCount = 0;
      let failedCount = 0;
      let conflictCount = 0;
      const errors: SyncError[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemResult = batchResult.results?.[i];

        if (!itemResult) {
          failedCount++;
          errors.push({
            itemId: item.id,
            entityType: item.entityType,
            error: 'No result returned from server',
            retryable: true,
          });
          continue;
        }

        if (itemResult.success) {
          // Check if conflict was detected and resolved on server
          if (itemResult.conflict?.detected) {
            conflictCount++;
            logger.warn(
              `[SyncEngine] Conflict resolved for ${item.entityType} ${item.id}: ${itemResult.conflict.reason}`
            );

            // Notify user via notification handler
            await conflictNotificationHandler.notifyConflict(
              item.entityType,
              item.id,
              itemResult.conflict.strategy as 'LWW' | 'MERGE' | 'MANUAL',
              itemResult.conflict.reason
            );

            // Also show toast notification
            await notificationManager.showConflict(item.entityType, item.id);

            // Log conflict for audit trail
            this.dispatchEvent('sync:conflict-resolved', {
              entityType: item.entityType,
              entityId: item.id,
              strategy: itemResult.conflict.strategy,
              reason: itemResult.conflict.reason,
            });
          }

          await queue.markAsSynced(item.id);
          processedCount++;
          this.retryCount.delete(item.id);
        } else {
          failedCount++;
          const retries = (this.retryCount.get(item.id) ?? 0) + 1;

          if (retries < this.options.maxRetries) {
            // Schedule retry with exponential backoff
            await this.scheduleRetry(item, retries);
            this.retryCount.set(item.id, retries);
          } else {
            // Max retries exceeded
            await queue.updateRetryCount(item.id, retries, itemResult.error || 'Max retries exceeded');
          }

          errors.push({
            itemId: item.id,
            entityType: item.entityType,
            error: itemResult.error || 'Unknown error',
            retryable: retries < this.options.maxRetries,
          });
        }
      }

      // Log sync batch summary
      if (conflictCount > 0) {
        logger.info(
          `[SyncEngine] Batch sync completed with ${conflictCount} conflict(s) resolved`
        );
        this.dispatchEvent('sync:conflicts', {
          total: conflictCount,
          batchSize: items.length,
        });
      }

      return {
        itemsProcessed: processedCount,
        itemsFailed: failedCount,
        success: failedCount === 0,
        errors,
      };
    } catch (error) {
      // Network or server error
      const errors = items.map((item) => ({
        itemId: item.id,
        entityType: item.entityType,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true,
      }));

      return {
        itemsProcessed: 0,
        itemsFailed: items.length,
        success: false,
        errors,
      };
    }
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private async scheduleRetry(item: QueueItem, retryNumber: number): Promise<void> {
    const backoff = Math.min(
      this.options.initialBackoff * Math.pow(2, retryNumber - 1),
      this.options.maxBackoff
    );

    console.log(
      `[SyncEngine] Scheduling retry for ${item.id} in ${backoff}ms (attempt ${retryNumber})`
    );

    // Clear any existing timeout
    const existingTimeout = this.backoffTimeouts.get(item.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule new retry
    const timeout = setTimeout(async () => {
      this.backoffTimeouts.delete(item.id);
      try {
        await this.sync();
      } catch (error) {
        console.error('[SyncEngine] Retry sync failed:', error);
      }
    }, backoff);

    this.backoffTimeouts.set(item.id, timeout);
  }

  /**
   * Pause syncing
   */
  pause(): void {
    if (this.status === SyncStatus.Syncing) {
      this.status = SyncStatus.Paused;
      console.log('[SyncEngine] Sync paused');
      this.dispatchEvent('engine:paused');
    }
  }

  /**
   * Resume syncing
   */
  async resume(): Promise<void> {
    if (this.status === SyncStatus.Paused) {
      this.status = SyncStatus.Idle;
      console.log('[SyncEngine] Sync resumed');
      await this.sync();
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return this.status;
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): number | null {
    return this.lastSyncTime;
  }

  /**
   * Get pending items count
   */
  async getPendingCount(): Promise<number> {
    const queue = getOfflineQueue();
    const items = await queue.getPendingItems();
    return items.length;
  }

  /**
   * Force clear all retry timeouts
   */
  clearRetries(): void {
    this.retryCount.clear();
    for (const timeout of this.backoffTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.backoffTimeouts.clear();
    console.log('[SyncEngine] Cleared all retry state');
  }

  /**
   * Finalize successful sync
   */
  private finalizeSyncSuccess(result: SyncResult): void {
    this.status = SyncStatus.Complete;
    console.log('[SyncEngine] Sync completed successfully');
    this.dispatchEvent('sync:end', {
      success: true,
      itemsProcessed: result.itemsProcessed,
      itemsFailed: result.itemsFailed,
      timestamp: result.timestamp,
    });
  }

  /**
   * Finalize failed sync
   */
  private finalizeSyncError(result: SyncResult): void {
    this.status = SyncStatus.Error;
    console.log('[SyncEngine] Sync completed with errors');
    this.dispatchEvent('sync:end', {
      success: false,
      itemsProcessed: result.itemsProcessed,
      itemsFailed: result.itemsFailed,
      error: result.errors[0]?.error || 'Unknown error',
      timestamp: result.timestamp,
    });
  }

  /**
   * Dispatch custom events
   */
  private dispatchEvent(eventName: string, detail?: unknown): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(eventName, { detail });
      window.dispatchEvent(event);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.clearRetries();
    console.log('[SyncEngine] Destroyed');
  }
}

/**
 * Singleton instance
 */
let syncEngineInstance: SyncEngine | null = null;

/**
 * Get or create sync engine instance
 */
export function getSyncEngine(options?: SyncOptions): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine(options);
  }
  return syncEngineInstance;
}

/**
 * Initialize sync engine
 */
export async function initializeSyncEngine(options?: SyncOptions): Promise<SyncEngine> {
  const engine = getSyncEngine(options);
  await engine.initialize();
  return engine;
}

export default SyncEngine;
