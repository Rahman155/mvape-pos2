/**
 * usePendingQueue Hook
 * React hook for managing and accessing the offline queue
 * Provides pending items, queue statistics, and queue operations
 */

import { useCallback, useEffect, useState } from 'react';
import { QueueItem, QueueStats, getOfflineQueue, OfflineQueueError } from '@/lib/offlineQueue';

export interface UsePendingQueueReturn {
  /**
   * Current pending items
   */
  pendingItems: QueueItem[];

  /**
   * Queue statistics
   */
  stats: QueueStats | null;

  /**
   * Failed items (exceeded max retries)
   */
  failedItems: QueueItem[];

  /**
   * Is currently loading queue data
   */
  isLoading: boolean;

  /**
   * Error message if any
   */
  error: string | null;

  /**
   * Refresh pending items and stats
   */
  refresh: () => Promise<void>;

  /**
   * Remove an item from queue
   */
  removeItem: (itemId: string) => Promise<void>;

  /**
   * Retry a failed item
   */
  retryItem: (itemId: string) => Promise<void>;

  /**
   * Clear all synced items
   */
  clearSynced: () => Promise<void>;

  /**
   * Clear all failed items
   */
  clearFailed: () => Promise<void>;

  /**
   * Clear entire queue
   */
  clearAll: () => Promise<void>;

  /**
   * Get items by entity type
   */
  getItemsByType: (entityType: string) => Promise<QueueItem[]>;
}

/**
 * Hook to manage and track offline queue
 * Automatically refreshes on component mount and listens for queue events
 *
 * @example
 * ```tsx
 * const { pendingItems, stats, refresh } = usePendingQueue();
 *
 * return (
 *   <div>
 *     <p>Pending changes: {stats?.pendingItems}</p>
 *     <button onClick={refresh}>Refresh</button>
 *   </div>
 * );
 * ```
 *
 * @returns Queue management interface
 */
export function usePendingQueue(): UsePendingQueueReturn {
  const [pendingItems, setPendingItems] = useState<QueueItem[]>([]);
  const [failedItems, setFailedItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queue = getOfflineQueue();

  /**
   * Refresh pending items and stats
   */
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [pending, failed, newStats] = await Promise.all([
        queue.getPendingItems(),
        queue.getFailedItems(),
        queue.getStats(),
      ]);

      setPendingItems(pending);
      setFailedItems(failed);
      setStats(newStats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh queue';
      console.error('[usePendingQueue] Refresh failed:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [queue]);

  /**
   * Remove an item from queue
   */
  const removeItem = useCallback(
    async (itemId: string) => {
      try {
        setError(null);
        await queue.removeFromQueue(itemId);
        await refresh();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove item';
        console.error('[usePendingQueue] Remove failed:', err);
        setError(errorMessage);
      }
    },
    [queue, refresh]
  );

  /**
   * Retry a failed item (reset retry count)
   */
  const retryItem = useCallback(
    async (itemId: string) => {
      try {
        setError(null);
        await queue.updateRetryCount(itemId, 0);
        await refresh();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to retry item';
        console.error('[usePendingQueue] Retry failed:', err);
        setError(errorMessage);
      }
    },
    [queue, refresh]
  );

  /**
   * Clear all synced items
   */
  const clearSynced = useCallback(async () => {
    try {
      setError(null);
      await queue.clearSyncedItems();
      await refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear synced items';
      console.error('[usePendingQueue] Clear synced failed:', err);
      setError(errorMessage);
    }
  }, [queue, refresh]);

  /**
   * Clear all failed items
   */
  const clearFailed = useCallback(async () => {
    try {
      setError(null);
      await queue.clearFailedItems();
      await refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear failed items';
      console.error('[usePendingQueue] Clear failed failed:', err);
      setError(errorMessage);
    }
  }, [queue, refresh]);

  /**
   * Clear entire queue
   */
  const clearAll = useCallback(async () => {
    try {
      setError(null);
      await queue.clearQueue();
      await refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear queue';
      console.error('[usePendingQueue] Clear all failed:', err);
      setError(errorMessage);
    }
  }, [queue, refresh]);

  /**
   * Get items by entity type
   */
  const getItemsByType = useCallback(
    async (entityType: string) => {
      try {
        setError(null);
        return await queue.getItemsByEntityType(entityType);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get items';
        console.error('[usePendingQueue] Get by type failed:', err);
        setError(errorMessage);
        return [];
      }
    },
    [queue]
  );

  /**
   * Setup effect to listen for queue events and refresh
   */
  useEffect(() => {
    // Initialize queue on mount
    queue.initialize().catch((err) => {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize queue';
      console.error('[usePendingQueue] Initialization failed:', err);
      setError(errorMessage);
    });

    // Refresh on mount
    refresh();

    // Listen for queue events
    const handleQueueEvent = (eventName: string) => () => {
      console.log('[usePendingQueue] Queue event:', eventName);
      refresh();
    };

    const events = [
      'item_added',
      'item_removed',
      'item_synced',
      'synced_items_cleared',
      'failed_items_cleared',
      'queue_cleared',
      'queue_imported',
    ];

    const listeners: Array<[string, () => void]> = [];

    if (typeof window !== 'undefined') {
      for (const eventName of events) {
        const listener = handleQueueEvent(eventName);
        window.addEventListener(`queue:${eventName}`, listener);
        listeners.push([eventName, listener]);
      }
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        for (const [eventName, listener] of listeners) {
          window.removeEventListener(`queue:${eventName}`, listener);
        }
      }
    };
  }, [refresh, queue]);

  return {
    pendingItems,
    stats,
    failedItems,
    isLoading,
    error,
    refresh,
    removeItem,
    retryItem,
    clearSynced,
    clearFailed,
    clearAll,
    getItemsByType,
  };
}

export default usePendingQueue;
