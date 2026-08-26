/**
 * Tests for offlineQueue.ts
 * Tests queue operations, persistence, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OfflineQueue,
  QueueItem,
  QueueStats,
  OfflineQueueError,
  getOfflineQueue,
  initializeOfflineQueue,
} from '../offlineQueue';
import { getDBManager, initDatabase } from '../indexedDB';

// Mock the indexedDB manager
vi.mock('../indexedDB', () => ({
  initDatabase: vi.fn().mockResolvedValue(undefined),
  getDBManager: vi.fn(),
}));

describe('OfflineQueue', () => {
  let queue: OfflineQueue;
  let mockDBManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new OfflineQueue();

    // Setup mock DB manager
    mockDBManager = {
      createInStore: vi.fn().mockResolvedValue(undefined),
      getFromStore: vi.fn(),
      updateInStore: vi.fn().mockResolvedValue(undefined),
      deleteFromStore: vi.fn().mockResolvedValue(undefined),
      getAllFromStore: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(getDBManager).mockReturnValue(mockDBManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await queue.initialize();
      expect(vi.mocked(initDatabase)).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await queue.initialize();
      await queue.initialize();
      expect(vi.mocked(initDatabase)).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      vi.mocked(initDatabase).mockRejectedValueOnce(new Error('Init failed'));
      await expect(queue.initialize()).rejects.toThrow('Init failed');
    });

    it('should handle concurrent initialization', async () => {
      const promises = [queue.initialize(), queue.initialize(), queue.initialize()];
      await Promise.all(promises);
      expect(vi.mocked(initDatabase)).toHaveBeenCalledTimes(1);
    });
  });

  describe('Adding to Queue', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('should add a transaction to queue', async () => {
      const transactionData = {
        storeId: 'store-1',
        items: [{ productId: 'prod-1', quantity: 2 }],
      };

      const result = await queue.addToQueue(
        'transaction',
        'tx-1',
        'CREATE',
        transactionData
      );

      expect(result).toMatchObject({
        entityType: 'transaction',
        entityId: 'tx-1',
        changeType: 'CREATE',
        data: transactionData,
        retries: 0,
        synced: false,
      });
      expect(mockDBManager.createInStore).toHaveBeenCalledWith('queue', expect.any(Object));
    });

    it('should add transaction with high priority', async () => {
      const data = { storeId: 'store-1' };
      const result = await queue.addTransaction(data);

      expect(result.priority).toBe('high');
      expect(result.entityType).toBe('transaction');
    });

    it('should support custom max retries', async () => {
      const result = await queue.addToQueue(
        'member',
        'member-1',
        'UPDATE',
        { name: 'John' },
        { maxRetries: 5 }
      );

      expect(result.maxRetries).toBe(5);
    });

    it('should generate unique IDs for queue items', async () => {
      const result1 = await queue.addToQueue('transaction', 'tx-1', 'CREATE', {});
      const result2 = await queue.addToQueue('transaction', 'tx-2', 'CREATE', {});

      expect(result1.id).not.toBe(result2.id);
    });

    it('should handle DB errors when adding', async () => {
      mockDBManager.createInStore.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        queue.addToQueue('transaction', 'tx-1', 'CREATE', {})
      ).rejects.toThrow('Failed to add item to queue');
    });

    it('should dispatch queue:item_added event', async () => {
      const eventSpy = vi.fn();
      window.addEventListener('queue:item_added', eventSpy);

      await queue.addToQueue('transaction', 'tx-1', 'CREATE', {});

      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener('queue:item_added', eventSpy);
    });

    it('should set timestamp on queue item', async () => {
      const before = Date.now();
      const result = await queue.addToQueue('transaction', 'tx-1', 'CREATE', {});
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Removing from Queue', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('should remove item from queue', async () => {
      await queue.removeFromQueue('item-1');

      expect(mockDBManager.deleteFromStore).toHaveBeenCalledWith('queue', 'item-1');
    });

    it('should handle removal errors', async () => {
      mockDBManager.deleteFromStore.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(queue.removeFromQueue('item-1')).rejects.toThrow(
        'Failed to remove item from queue'
      );
    });

    it('should dispatch queue:item_removed event', async () => {
      const eventSpy = vi.fn();
      window.addEventListener('queue:item_removed', eventSpy);

      await queue.removeFromQueue('item-1');

      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener('queue:item_removed', eventSpy);
    });
  });

  describe('Retry Handling', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('should update retry count', async () => {
      const item: QueueItem = {
        id: 'item-1',
        entityType: 'transaction',
        entityId: 'tx-1',
        changeType: 'CREATE',
        data: {},
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      };

      mockDBManager.getFromStore.mockResolvedValueOnce(item);

      await queue.updateRetryCount('item-1', 1);

      expect(mockDBManager.updateInStore).toHaveBeenCalledWith(
        'queue',
        expect.objectContaining({ retries: 1 })
      );
    });

    it('should store error message on retry', async () => {
      const item: QueueItem = {
        id: 'item-1',
        entityType: 'transaction',
        entityId: 'tx-1',
        changeType: 'CREATE',
        data: {},
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      };

      mockDBManager.getFromStore.mockResolvedValueOnce(item);

      await queue.updateRetryCount('item-1', 1, 'Network timeout');

      expect(mockDBManager.updateInStore).toHaveBeenCalledWith(
        'queue',
        expect.objectContaining({ error: 'Network timeout' })
      );
    });

    it('should handle retry count update errors', async () => {
      mockDBManager.getFromStore.mockResolvedValueOnce(null);

      await expect(queue.updateRetryCount('item-1', 1)).rejects.toThrow(
        'Failed to update queue item'
      );
    });
  });

  describe('Sync Status', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('should mark item as synced', async () => {
      const item: QueueItem = {
        id: 'item-1',
        entityType: 'transaction',
        entityId: 'tx-1',
        changeType: 'CREATE',
        data: {},
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      };

      mockDBManager.getFromStore.mockResolvedValueOnce(item);

      await queue.markAsSynced('item-1');

      expect(mockDBManager.updateInStore).toHaveBeenCalledWith(
        'queue',
        expect.objectContaining({ synced: true, syncedAt: expect.any(Number) })
      );
    });

    it('should dispatch queue:item_synced event', async () => {
      const item: QueueItem = {
        id: 'item-1',
        entityType: 'transaction',
        entityId: 'tx-1',
        changeType: 'CREATE',
        data: {},
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      };

      mockDBManager.getFromStore.mockResolvedValueOnce(item);

      const eventSpy = vi.fn();
      window.addEventListener('queue:item_synced', eventSpy);

      await queue.markAsSynced('item-1');

      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener('queue:item_synced', eventSpy);
    });
  });

  describe('Retrieving Items', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('should get all pending items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'item-2',
          entityType: 'member',
          entityId: 'member-1',
          changeType: 'UPDATE',
          data: {},
          timestamp: Date.now() + 1000,
          retries: 2,
          maxRetries: 3,
          priority: 'high',
          synced: true,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const pending = await queue.getPendingItems();

      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('item-1');
    });

    it('should sort pending items by priority', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: 1000,
          retries: 0,
          maxRetries: 3,
          priority: 'low',
          synced: false,
        },
        {
          id: 'item-2',
          entityType: 'member',
          entityId: 'member-1',
          changeType: 'UPDATE',
          data: {},
          timestamp: 2000,
          retries: 0,
          maxRetries: 3,
          priority: 'high',
          synced: false,
        },
        {
          id: 'item-3',
          entityType: 'product',
          entityId: 'prod-1',
          changeType: 'UPDATE',
          data: {},
          timestamp: 3000,
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const pending = await queue.getPendingItems();

      expect(pending[0].priority).toBe('high');
      expect(pending[1].priority).toBe('normal');
      expect(pending[2].priority).toBe('low');
    });

    it('should get all items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const all = await queue.getAllItems();

      expect(all).toHaveLength(1);
      expect(mockDBManager.getAllFromStore).toHaveBeenCalledWith('queue');
    });

    it('should get items by entity type', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'item-2',
          entityType: 'member',
          entityId: 'member-1',
          changeType: 'UPDATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const transactions = await queue.getItemsByEntityType('transaction');

      expect(transactions).toHaveLength(1);
      expect(transactions[0].entityType).toBe('transaction');
    });

    it('should get failed items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 3,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'item-2',
          entityType: 'member',
          entityId: 'member-1',
          changeType: 'UPDATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const failed = await queue.getFailedItems();

      expect(failed).toHaveLength(1);
      expect(failed[0].retries).toBe(3);
    });

    it('should get retryable items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 1,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'item-2',
          entityType: 'member',
          entityId: 'member-1',
          changeType: 'UPDATE',
          data: {},
          timestamp: Date.now(),
          retries: 3,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const retryable = await queue.getRetryableItems();

      expect(retryable).toHaveLength(1);
      expect(retryable[0].id).toBe('item-1');
    });
  });

  describe('Queue Statistics', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('should get accurate statistics', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'high',
          synced: false,
        },
        {
          id: 'item-2',
          entityType: 'member',
          entityId: 'member-1',
          changeType: 'UPDATE',
          data: {},
          timestamp: Date.now(),
          retries: 3,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'item-3',
          entityType: 'product',
          entityId: 'prod-1',
          changeType: 'UPDATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: true,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const stats = await queue.getStats();

      expect(stats.totalItems).toBe(3);
      expect(stats.pendingItems).toBe(1);
      expect(stats.failedItems).toBe(1);
      expect(stats.highPriorityItems).toBe(1);
    });

    it('should handle empty queue stats', async () => {
      mockDBManager.getAllFromStore.mockResolvedValueOnce([]);

      const stats = await queue.getStats();

      expect(stats.totalItems).toBe(0);
      expect(stats.pendingItems).toBe(0);
      expect(stats.failedItems).toBe(0);
      expect(stats.highPriorityItems).toBe(0);
    });
  });

  describe('Clearing Queue', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('should clear synced items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: true,
        },
        {
          id: 'item-2',
          entityType: 'member',
          entityId: 'member-1',
          changeType: 'UPDATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const count = await queue.clearSyncedItems();

      expect(count).toBe(1);
      expect(mockDBManager.deleteFromStore).toHaveBeenCalledWith('queue', 'item-1');
    });

    it('should clear failed items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 3,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'item-2',
          entityType: 'member',
          entityId: 'member-1',
          changeType: 'UPDATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const count = await queue.clearFailedItems();

      expect(count).toBe(1);
      expect(mockDBManager.deleteFromStore).toHaveBeenCalledWith('queue', 'item-1');
    });

    it('should clear entire queue', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'item-2',
          entityType: 'member',
          entityId: 'member-1',
          changeType: 'UPDATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const count = await queue.clearQueue();

      expect(count).toBe(2);
      expect(mockDBManager.deleteFromStore).toHaveBeenCalledTimes(2);
    });

    it('should dispatch queue cleared event', async () => {
      mockDBManager.getAllFromStore.mockResolvedValueOnce([]);

      const eventSpy = vi.fn();
      window.addEventListener('queue:queue_cleared', eventSpy);

      await queue.clearQueue();

      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener('queue:queue_cleared', eventSpy);
    });
  });

  describe('Import/Export', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('should export queue', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const exported = await queue.exportQueue();

      expect(exported).toEqual(items);
    });

    it('should import queue items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      const count = await queue.importQueue(items);

      expect(count).toBe(1);
      expect(mockDBManager.createInStore).toHaveBeenCalledWith('queue', items[0]);
    });

    it('should dispatch queue imported event', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      const eventSpy = vi.fn();
      window.addEventListener('queue:queue_imported', eventSpy);

      await queue.importQueue(items);

      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener('queue:queue_imported', eventSpy);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('should check if queue has pending items', async () => {
      const items: QueueItem[] = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const hasPending = await queue.hasPendingItems();

      expect(hasPending).toBe(true);
    });

    it('should return false for empty queue', async () => {
      mockDBManager.getAllFromStore.mockResolvedValueOnce([]);

      const hasPending = await queue.hasPendingItems();

      expect(hasPending).toBe(false);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const queue1 = getOfflineQueue();
      const queue2 = getOfflineQueue();

      expect(queue1).toBe(queue2);
    });

    it('should initialize singleton', async () => {
      const queue = await initializeOfflineQueue();

      expect(queue).toBeDefined();
      expect(vi.mocked(initDatabase)).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should wrap errors in OfflineQueueError', async () => {
      await queue.initialize();
      mockDBManager.getAllFromStore.mockRejectedValueOnce(new Error('DB error'));

      try {
        await queue.getPendingItems();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(OfflineQueueError);
        expect(error.message).toContain('Failed to retrieve pending items');
      }
    });

    it('should preserve original error', async () => {
      await queue.initialize();
      const originalError = new Error('Original DB error');
      mockDBManager.getAllFromStore.mockRejectedValueOnce(originalError);

      try {
        await queue.getPendingItems();
      } catch (error: any) {
        expect(error.originalError).toBe(originalError);
      }
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it('should handle very large queue', async () => {
      const items: QueueItem[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        entityType: 'transaction',
        entityId: `tx-${i}`,
        changeType: 'CREATE',
        data: {},
        timestamp: Date.now() + i,
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      }));

      mockDBManager.getAllFromStore.mockResolvedValueOnce(items);

      const pending = await queue.getPendingItems();

      expect(pending).toHaveLength(1000);
    });

    it('should handle items with large data', async () => {
      const largeData = {
        nested: {
          deeply: {
            items: Array.from({ length: 100 }, (_, i) => ({
              id: i,
              value: 'x'.repeat(1000),
            })),
          },
        },
      };

      const result = await queue.addToQueue(
        'transaction',
        'tx-1',
        'CREATE',
        largeData
      );

      expect(result.data).toEqual(largeData);
    });

    it('should handle special characters in entity IDs', async () => {
      const result = await queue.addToQueue(
        'transaction',
        'tx-🚀-special-chars-!@#$%',
        'CREATE',
        {}
      );

      expect(result.entityId).toBe('tx-🚀-special-chars-!@#$%');
    });

    it('should handle rapid sequential operations', async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        queue.addToQueue(
          'transaction',
          `tx-${i}`,
          'CREATE',
          { index: i }
        )
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      expect(new Set(results.map((r) => r.id))).toHaveSize(50);
    });
  });
});
