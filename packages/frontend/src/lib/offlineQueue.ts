/**
 * Offline Queue Management
 * Manages pending transactions and changes that need to be synced when online
 * Provides queue operations: add, remove, list, clear, and batch processing
 */

import { PendingChange } from '@/types';
import { initDatabase, getDBManager } from '@/lib/indexedDB';

export interface QueueItem {
  id: string;
  entityType: string;
  entityId: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  data: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
  error?: string;
  priority: 'low' | 'normal' | 'high';
  synced: boolean;
  syncedAt?: number;
}

export interface BatchQueueResult {
  successful: QueueItem[];
  failed: Array<QueueItem & { error: string }>;
  total: number;
}

export interface QueueOptions {
  maxRetries?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface QueueStats {
  totalItems: number;
  pendingItems: number;
  failedItems: number;
  highPriorityItems: number;
}

class OfflineQueue {
  private dbReady = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the queue system
   */
  async initialize(): Promise<void> {
    if (this.dbReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        await initDatabase();
        this.dbReady = true;
        console.log('[OfflineQueue] Initialized');
      } catch (error) {
        console.error('[OfflineQueue] Initialization failed:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Ensure database is ready
   */
  private async ensureReady(): Promise<void> {
    if (!this.dbReady) {
      await this.initialize();
    }
  }

  /**
   * Add a pending change to the offline queue
   * @param entityType - Type of entity (transaction, member, etc.)
   * @param entityId - ID of the entity
   * @param changeType - Type of change (CREATE, UPDATE, DELETE)
   * @param data - The data being changed
   * @param options - Queue options (maxRetries, priority)
   */
  async addToQueue(
    entityType: string,
    entityId: string,
    changeType: 'CREATE' | 'UPDATE' | 'DELETE',
    data: unknown,
    options: QueueOptions = {}
  ): Promise<QueueItem> {
    await this.ensureReady();

    const queueItem: QueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      entityType,
      entityId,
      changeType,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: options.maxRetries ?? 3,
      priority: options.priority ?? 'normal',
      synced: false,
    };

    try {
      const dbManager = getDBManager();
      await dbManager.createInStore('queue', queueItem);
      console.log('[OfflineQueue] Added to queue:', queueItem.id);

      // Dispatch custom event for UI updates
      this.dispatchQueueEvent('item_added', queueItem);

      return queueItem;
    } catch (error) {
      console.error('[OfflineQueue] Failed to add to queue:', error);
      throw new OfflineQueueError('Failed to add item to queue', error);
    }
  }

  /**
   * Add a transaction to the offline queue (convenience method)
   */
  async addTransaction(transactionData: unknown): Promise<QueueItem> {
    return this.addToQueue(
      'transaction',
      `temp-${Date.now()}`,
      'CREATE',
      transactionData,
      { priority: 'high' }
    );
  }

  /**
   * Remove an item from the queue
   */
  async removeFromQueue(itemId: string): Promise<void> {
    await this.ensureReady();

    try {
      const dbManager = getDBManager();
      await dbManager.deleteFromStore('queue', itemId);
      console.log('[OfflineQueue] Removed from queue:', itemId);

      this.dispatchQueueEvent('item_removed', { id: itemId });
    } catch (error) {
      console.error('[OfflineQueue] Failed to remove from queue:', error);
      throw new OfflineQueueError('Failed to remove item from queue', error);
    }
  }

  /**
   * Update a queue item's retry count
   */
  async updateRetryCount(itemId: string, retries: number, error?: string): Promise<void> {
    await this.ensureReady();

    try {
      const dbManager = getDBManager();
      const item = await dbManager.getFromStore('queue', itemId);

      if (!item) {
        throw new Error('Queue item not found');
      }

      const updatedItem = {
        ...item,
        retries,
        error: error || undefined,
      };

      await dbManager.updateInStore('queue', updatedItem);
      console.log('[OfflineQueue] Updated retry count for:', itemId, 'retries:', retries);
    } catch (error) {
      console.error('[OfflineQueue] Failed to update retry count:', error);
      throw new OfflineQueueError('Failed to update queue item', error);
    }
  }

  /**
   * Mark an item as synced
   */
  async markAsSynced(itemId: string): Promise<void> {
    await this.ensureReady();

    try {
      const dbManager = getDBManager();
      const item = await dbManager.getFromStore('queue', itemId);

      if (!item) {
        throw new Error('Queue item not found');
      }

      const syncedItem = {
        ...item,
        synced: true,
        syncedAt: Date.now(),
      };

      await dbManager.updateInStore('queue', syncedItem);
      console.log('[OfflineQueue] Marked as synced:', itemId);

      this.dispatchQueueEvent('item_synced', syncedItem);
    } catch (error) {
      console.error('[OfflineQueue] Failed to mark as synced:', error);
      throw new OfflineQueueError('Failed to mark item as synced', error);
    }
  }

  /**
   * Get all pending items (not synced and retries < maxRetries)
   */
  async getPendingItems(): Promise<QueueItem[]> {
    await this.ensureReady();

    try {
      const dbManager = getDBManager();
      const allItems = await dbManager.getAllFromStore('queue');

      // Filter for pending items (not synced and within retry limit)
      const pending = (allItems as QueueItem[]).filter(
        (item) => !item.synced && item.retries < item.maxRetries
      );

      // Sort by priority and timestamp
      pending.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        return priorityDiff !== 0 ? priorityDiff : a.timestamp - b.timestamp;
      });

      return pending;
    } catch (error) {
      console.error('[OfflineQueue] Failed to get pending items:', error);
      throw new OfflineQueueError('Failed to retrieve pending items', error);
    }
  }

  /**
   * Get all items in queue
   */
  async getAllItems(): Promise<QueueItem[]> {
    await this.ensureReady();

    try {
      const dbManager = getDBManager();
      return (await dbManager.getAllFromStore('queue')) as QueueItem[];
    } catch (error) {
      console.error('[OfflineQueue] Failed to get all items:', error);
      throw new OfflineQueueError('Failed to retrieve queue items', error);
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    await this.ensureReady();

    try {
      const allItems = await this.getAllItems();

      return {
        totalItems: allItems.length,
        pendingItems: allItems.filter((i) => !i.synced && i.retries < i.maxRetries).length,
        failedItems: allItems.filter((i) => i.retries >= i.maxRetries).length,
        highPriorityItems: allItems.filter((i) => i.priority === 'high' && !i.synced).length,
      };
    } catch (error) {
      console.error('[OfflineQueue] Failed to get stats:', error);
      throw new OfflineQueueError('Failed to retrieve queue statistics', error);
    }
  }

  /**
   * Get items by entity type
   */
  async getItemsByEntityType(entityType: string): Promise<QueueItem[]> {
    await this.ensureReady();

    try {
      const dbManager = getDBManager();
      const allItems = await dbManager.getAllFromStore('queue');

      return (allItems as QueueItem[]).filter((item) => item.entityType === entityType);
    } catch (error) {
      console.error('[OfflineQueue] Failed to get items by type:', error);
      throw new OfflineQueueError('Failed to retrieve items by type', error);
    }
  }

  /**
   * Get failed items (exceeded max retries)
   */
  async getFailedItems(): Promise<QueueItem[]> {
    await this.ensureReady();

    try {
      const dbManager = getDBManager();
      const allItems = await dbManager.getAllFromStore('queue');

      return (allItems as QueueItem[]).filter((item) => item.retries >= item.maxRetries);
    } catch (error) {
      console.error('[OfflineQueue] Failed to get failed items:', error);
      throw new OfflineQueueError('Failed to retrieve failed items', error);
    }
  }

  /**
   * Clear all synced items
   */
  async clearSyncedItems(): Promise<number> {
    await this.ensureReady();

    try {
      const dbManager = getDBManager();
      const allItems = await dbManager.getAllFromStore('queue');
      const syncedItems = (allItems as QueueItem[]).filter((i) => i.synced);

      let count = 0;
      for (const item of syncedItems) {
        await dbManager.deleteFromStore('queue', item.id);
        count++;
      }

      console.log('[OfflineQueue] Cleared', count, 'synced items');
      this.dispatchQueueEvent('synced_items_cleared', { count });

      return count;
    } catch (error) {
      console.error('[OfflineQueue] Failed to clear synced items:', error);
      throw new OfflineQueueError('Failed to clear synced items', error);
    }
  }

  /**
   * Clear all failed items
   */
  async clearFailedItems(): Promise<number> {
    await this.ensureReady();

    try {
      const dbManager = getDBManager();
      const allItems = await dbManager.getAllFromStore('queue');
      const failedItems = (allItems as QueueItem[]).filter((i) => i.retries >= i.maxRetries);

      let count = 0;
      for (const item of failedItems) {
        await dbManager.deleteFromStore('queue', item.id);
        count++;
      }

      console.log('[OfflineQueue] Cleared', count, 'failed items');
      this.dispatchQueueEvent('failed_items_cleared', { count });

      return count;
    } catch (error) {
      console.error('[OfflineQueue] Failed to clear failed items:', error);
      throw new OfflineQueueError('Failed to clear failed items', error);
    }
  }

  /**
   * Clear entire queue
   */
  async clearQueue(): Promise<number> {
    await this.ensureReady();

    try {
      const dbManager = getDBManager();
      const allItems = await dbManager.getAllFromStore('queue');

      let count = 0;
      for (const item of allItems as QueueItem[]) {
        await dbManager.deleteFromStore('queue', item.id);
        count++;
      }

      console.log('[OfflineQueue] Queue cleared, removed', count, 'items');
      this.dispatchQueueEvent('queue_cleared', { count });

      return count;
    } catch (error) {
      console.error('[OfflineQueue] Failed to clear queue:', error);
      throw new OfflineQueueError('Failed to clear queue', error);
    }
  }

  /**
   * Export queue for backup/debugging
   */
  async exportQueue(): Promise<QueueItem[]> {
    await this.ensureReady();

    try {
      return await this.getAllItems();
    } catch (error) {
      console.error('[OfflineQueue] Failed to export queue:', error);
      throw new OfflineQueueError('Failed to export queue', error);
    }
  }

  /**
   * Import queue from backup
   */
  async importQueue(items: QueueItem[]): Promise<number> {
    await this.ensureReady();

    try {
      const dbManager = getDBManager();
      let count = 0;

      for (const item of items) {
        await dbManager.createInStore('queue', item);
        count++;
      }

      console.log('[OfflineQueue] Imported', count, 'items');
      this.dispatchQueueEvent('queue_imported', { count });

      return count;
    } catch (error) {
      console.error('[OfflineQueue] Failed to import queue:', error);
      throw new OfflineQueueError('Failed to import queue', error);
    }
  }

  /**
   * Dispatch custom events for UI updates
   */
  private dispatchQueueEvent(eventName: string, detail: unknown): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(`queue:${eventName}`, { detail });
      window.dispatchEvent(event);
    }
  }

  /**
   * Check if queue has pending items
   */
  async hasPendingItems(): Promise<boolean> {
    const pending = await this.getPendingItems();
    return pending.length > 0;
  }

  /**
   * Get items that need retry
   */
  async getRetryableItems(): Promise<QueueItem[]> {
    await this.ensureReady();

    try {
      const dbManager = getDBManager();
      const allItems = await dbManager.getAllFromStore('queue');

      return (allItems as QueueItem[]).filter(
        (item) => !item.synced && item.retries < item.maxRetries
      );
    } catch (error) {
      console.error('[OfflineQueue] Failed to get retryable items:', error);
      throw new OfflineQueueError('Failed to retrieve retryable items', error);
    }
  }
}

/**
 * Custom error class for queue operations
 */
export class OfflineQueueError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'OfflineQueueError';
  }
}

/**
 * Singleton instance
 */
let offlineQueueInstance: OfflineQueue | null = null;

/**
 * Get or create offline queue instance
 */
export function getOfflineQueue(): OfflineQueue {
  if (!offlineQueueInstance) {
    offlineQueueInstance = new OfflineQueue();
  }
  return offlineQueueInstance;
}

/**
 * Initialize offline queue
 */
export async function initializeOfflineQueue(): Promise<OfflineQueue> {
  const queue = getOfflineQueue();
  await queue.initialize();
  return queue;
}

export default OfflineQueue;
