/**
 * Offline Queue Tests
 * Tests for transaction queueing, retry logic, and offline data persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeOfflineQueue, getOfflineQueue } from '@/lib/offlineQueue';
import type { QueueItem } from '@/lib/offlineQueue';

/**
 * Mock setup for database
 */
const mockDBManager = {
  createInStore: vi.fn(),
  getFromStore: vi.fn(),
  updateInStore: vi.fn(),
  deleteFromStore: vi.fn(),
  getAllFromStore: vi.fn(),
};

// Mock modules
vi.mock('@/lib/indexedDB', () => ({
  getDBManager: () => mockDBManager,
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

describe('OfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
  });

  describe('Initialization', () => {
    it('should initialize offline queue successfully', async () => {
      const queue = await initializeOfflineQueue();
      expect(queue).toBeDefined();
    });

    it('should use singleton pattern for queue instance', async () => {
      const queue1 = getOfflineQueue();
      const queue2 = getOfflineQueue();
      expect(queue1).toBe(queue2);
    });

    it('should handle multiple initialization calls', async () => {
      const queue1 = await initializeOfflineQueue();
      const queue2 = await initializeOfflineQueue();
      expect(queue1).toBe(queue2);
    });
  });

  describe('Adding Items to Queue', () => {
    it('should add transaction to queue', async () => {
      mockDBManager.createInStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const transactionData = {
        items: [{ productId: 'p1', quantity: 2, price: 100 }],
        total: 200,
        paymentMethod: 'CASH',
      };

      const queueItem = await queue.addTransaction(transactionData);

      expect(queueItem).toBeDefined();
      expect(queueItem.entityType).toBe('transaction');
      expect(queueItem.changeType).toBe('CREATE');
      expect(queueItem.data).toEqual(transactionData);
      expect(queueItem.synced).toBe(false);
      expect(queueItem.retries).toBe(0);
    });

    it('should add generic item to queue', async () => {
      mockDBManager.createInStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const itemData = { name: 'Test Item', value: 42 };

      const queueItem = await queue.addToQueue(
        'custom_entity',
        'entity-1',
        'UPDATE',
        itemData,
        { maxRetries: 5, priority: 'high' }
      );

      expect(queueItem.entityType).toBe('custom_entity');
      expect(queueItem.entityId).toBe('entity-1');
      expect(queueItem.changeType).toBe('UPDATE');
      expect(queueItem.maxRetries).toBe(5);
      expect(queueItem.priority).toBe('high');
    });

    it('should generate unique queue item IDs', async () => {
      mockDBManager.createInStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const item1 = await queue.addTransaction({ amount: 100 });
      const item2 = await queue.addTransaction({ amount: 200 });

      expect(item1.id).not.toBe(item2.id);
    });

    it('should set correct timestamp on queue items', async () => {
      mockDBManager.createInStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const beforeTime = Date.now();
      const item = await queue.addTransaction({ amount: 100 });
      const afterTime = Date.now();

      expect(item.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(item.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should handle queue item addition errors gracefully', async () => {
      mockDBManager.createInStore.mockRejectedValue(new Error('DB Error'));

      const queue = await initializeOfflineQueue();

      await expect(queue.addTransaction({ amount: 100 })).rejects.toThrow();
    });

    it('should use default priority if not specified', async () => {
      mockDBManager.createInStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const item = await queue.addToQueue(
        'transaction',
        'txn-1',
        'CREATE',
        { amount: 100 }
      );

      expect(item.priority).toBe('normal');
    });

    it('should use default max retries if not specified', async () => {
      mockDBManager.createInStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const item = await queue.addToQueue(
        'transaction',
        'txn-1',
        'CREATE',
        { amount: 100 }
      );

      expect(item.maxRetries).toBe(3);
    });
  });

  describe('Removing Items from Queue', () => {
    it('should remove item from queue', async () => {
      mockDBManager.deleteFromStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      await queue.removeFromQueue('test-1');

      expect(mockDBManager.deleteFromStore).toHaveBeenCalledWith('queue', 'test-1');
    });

    it('should handle removal errors gracefully', async () => {
      mockDBManager.deleteFromStore.mockRejectedValue(new Error('DB Error'));

      const queue = await initializeOfflineQueue();

      await expect(queue.removeFromQueue('test-1')).rejects.toThrow();
    });
  });

  describe('Marking Items as Synced', () => {
    it('should mark item as synced', async () => {
      const mockItem: QueueItem = {
        id: 'test-1',
        entityType: 'transaction',
        entityId: 'txn-1',
        changeType: 'CREATE',
        data: { amount: 100 },
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      };

      mockDBManager.getFromStore.mockResolvedValue(mockItem);
      mockDBManager.updateInStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      await queue.markAsSynced('test-1');

      // Verify update was called
      expect(mockDBManager.updateInStore).toHaveBeenCalled();
      const updateCall = mockDBManager.updateInStore.mock.calls[0][1];
      expect(updateCall.synced).toBe(true);
      expect(updateCall.syncedAt).toBeDefined();
    });

    it('should throw error if item not found when marking as synced', async () => {
      mockDBManager.getFromStore.mockResolvedValue(null);

      const queue = await initializeOfflineQueue();

      await expect(queue.markAsSynced('nonexistent-1')).rejects.toThrow();
    });
  });

  describe('Updating Retry Count', () => {
    it('should update retry count for item', async () => {
      const mockItem: QueueItem = {
        id: 'test-1',
        entityType: 'transaction',
        entityId: 'txn-1',
        changeType: 'CREATE',
        data: { amount: 100 },
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      };

      mockDBManager.getFromStore.mockResolvedValue(mockItem);
      mockDBManager.updateInStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      await queue.updateRetryCount('test-1', 2, 'Validation error');

      // Verify update was called with incremented retry count
      expect(mockDBManager.updateInStore).toHaveBeenCalled();
      const updateCall = mockDBManager.updateInStore.mock.calls[0][1];
      expect(updateCall.retries).toBe(2);
      expect(updateCall.error).toBe('Validation error');
    });

    it('should allow optional error parameter', async () => {
      const mockItem: QueueItem = {
        id: 'test-1',
        entityType: 'transaction',
        entityId: 'txn-1',
        changeType: 'CREATE',
        data: { amount: 100 },
        timestamp: Date.now(),
        retries: 1,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      };

      mockDBManager.getFromStore.mockResolvedValue(mockItem);
      mockDBManager.updateInStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      await queue.updateRetryCount('test-1', 2);

      expect(mockDBManager.updateInStore).toHaveBeenCalled();
    });
  });

  describe('Getting Pending Items', () => {
    it('should return pending items (not synced and retries < maxRetries)', async () => {
      const pendingItems: QueueItem[] = [
        {
          id: 'pending-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'pending-2',
          entityType: 'transaction',
          entityId: 'txn-2',
          changeType: 'UPDATE',
          data: { amount: 200 },
          timestamp: Date.now() + 1000,
          retries: 1,
          maxRetries: 3,
          priority: 'high',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValue(pendingItems);

      const queue = await initializeOfflineQueue();
      const pending = await queue.getPendingItems();

      expect(pending).toHaveLength(2);
      expect(pending[0].synced).toBe(false);
      expect(pending[1].synced).toBe(false);
    });

    it('should filter out synced items', async () => {
      const items: QueueItem[] = [
        {
          id: 'pending-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'synced-1',
          entityType: 'transaction',
          entityId: 'txn-2',
          changeType: 'CREATE',
          data: { amount: 200 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: true,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValue(items);

      const queue = await initializeOfflineQueue();
      const pending = await queue.getPendingItems();

      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('pending-1');
    });

    it('should filter out items that exceeded max retries', async () => {
      const items: QueueItem[] = [
        {
          id: 'pending-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 1,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'failed-1',
          entityType: 'transaction',
          entityId: 'txn-2',
          changeType: 'CREATE',
          data: { amount: 200 },
          timestamp: Date.now(),
          retries: 3,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValue(items);

      const queue = await initializeOfflineQueue();
      const pending = await queue.getPendingItems();

      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('pending-1');
    });

    it('should sort items by priority then timestamp', async () => {
      const items: QueueItem[] = [
        {
          id: 'low-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'low',
          synced: false,
        },
        {
          id: 'high-1',
          entityType: 'transaction',
          entityId: 'txn-2',
          changeType: 'CREATE',
          data: { amount: 200 },
          timestamp: Date.now() + 1000,
          retries: 0,
          maxRetries: 3,
          priority: 'high',
          synced: false,
        },
        {
          id: 'normal-1',
          entityType: 'transaction',
          entityId: 'txn-3',
          changeType: 'CREATE',
          data: { amount: 300 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValue(items);

      const queue = await initializeOfflineQueue();
      const pending = await queue.getPendingItems();

      // Should be sorted: high > normal > low, then by timestamp
      expect(pending[0].priority).toBe('high');
      expect(pending[1].priority).toBe('normal');
      expect(pending[2].priority).toBe('low');
    });
  });

  describe('Queue Statistics', () => {
    it('should return correct queue statistics', async () => {
      const items: QueueItem[] = [
        {
          id: 'pending-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'high',
          synced: false,
        },
        {
          id: 'synced-1',
          entityType: 'transaction',
          entityId: 'txn-2',
          changeType: 'CREATE',
          data: { amount: 200 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: true,
        },
        {
          id: 'failed-1',
          entityType: 'transaction',
          entityId: 'txn-3',
          changeType: 'CREATE',
          data: { amount: 300 },
          timestamp: Date.now(),
          retries: 3,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValue(items);

      const queue = await initializeOfflineQueue();
      const stats = await queue.getStats();

      expect(stats.totalItems).toBe(3);
      expect(stats.pendingItems).toBe(1);
      expect(stats.failedItems).toBe(1);
      expect(stats.highPriorityItems).toBe(1);
    });
  });

  describe('Clearing Queue Items', () => {
    it('should clear synced items', async () => {
      const items: QueueItem[] = [
        {
          id: 'pending-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'synced-1',
          entityType: 'transaction',
          entityId: 'txn-2',
          changeType: 'CREATE',
          data: { amount: 200 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: true,
        },
        {
          id: 'synced-2',
          entityType: 'transaction',
          entityId: 'txn-3',
          changeType: 'CREATE',
          data: { amount: 300 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: true,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValue(items);
      mockDBManager.deleteFromStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const clearedCount = await queue.clearSyncedItems();

      expect(clearedCount).toBe(2);
      expect(mockDBManager.deleteFromStore).toHaveBeenCalledTimes(2);
    });

    it('should clear failed items', async () => {
      const items: QueueItem[] = [
        {
          id: 'pending-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 1,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'failed-1',
          entityType: 'transaction',
          entityId: 'txn-2',
          changeType: 'CREATE',
          data: { amount: 200 },
          timestamp: Date.now(),
          retries: 3,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValue(items);
      mockDBManager.deleteFromStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const clearedCount = await queue.clearFailedItems();

      expect(clearedCount).toBe(1);
      expect(mockDBManager.deleteFromStore).toHaveBeenCalledWith('queue', 'failed-1');
    });

    it('should clear entire queue', async () => {
      const items: QueueItem[] = Array.from({ length: 5 }, (_, i) => ({
        id: `test-${i}`,
        entityType: 'transaction',
        entityId: `txn-${i}`,
        changeType: 'CREATE',
        data: { amount: 100 },
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      }));

      mockDBManager.getAllFromStore.mockResolvedValue(items);
      mockDBManager.deleteFromStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const clearedCount = await queue.clearQueue();

      expect(clearedCount).toBe(5);
      expect(mockDBManager.deleteFromStore).toHaveBeenCalledTimes(5);
    });
  });

  describe('Queue Import/Export', () => {
    it('should export queue items', async () => {
      const items: QueueItem[] = [
        {
          id: 'test-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValue(items);

      const queue = await initializeOfflineQueue();
      const exported = await queue.exportQueue();

      expect(exported).toEqual(items);
    });

    it('should import queue items', async () => {
      const items: QueueItem[] = [
        {
          id: 'imported-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.createInStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const importedCount = await queue.importQueue(items);

      expect(importedCount).toBe(1);
      expect(mockDBManager.createInStore).toHaveBeenCalledWith('queue', items[0]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty queue', async () => {
      mockDBManager.getAllFromStore.mockResolvedValue([]);

      const queue = await initializeOfflineQueue();
      const pending = await queue.getPendingItems();

      expect(pending).toHaveLength(0);
    });

    it('should handle very large item data', async () => {
      const largeData = {
        items: Array.from({ length: 100 }, (_, i) => ({
          productId: `p${i}`,
          quantity: Math.random() * 100,
          price: Math.random() * 10000,
        })),
      };

      mockDBManager.createInStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const item = await queue.addTransaction(largeData);

      expect(item.data).toEqual(largeData);
    });

    it('should check if queue has pending items', async () => {
      const items: QueueItem[] = [
        {
          id: 'test-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValue(items);

      const queue = await initializeOfflineQueue();
      const hasPending = await queue.hasPendingItems();

      expect(hasPending).toBe(true);
    });

    it('should get retryable items correctly', async () => {
      const items: QueueItem[] = [
        {
          id: 'retryable-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 1,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'not-retryable-1',
          entityType: 'transaction',
          entityId: 'txn-2',
          changeType: 'CREATE',
          data: { amount: 200 },
          timestamp: Date.now(),
          retries: 3,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValue(items);

      const queue = await initializeOfflineQueue();
      const retryable = await queue.getRetryableItems();

      expect(retryable).toHaveLength(1);
      expect(retryable[0].id).toBe('retryable-1');
    });

    it('should get items by entity type', async () => {
      const items: QueueItem[] = [
        {
          id: 'txn-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'member-1',
          entityType: 'member',
          entityId: 'member-1',
          changeType: 'UPDATE',
          data: { name: 'John' },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValue(items);

      const queue = await initializeOfflineQueue();
      const transactions = await queue.getItemsByEntityType('transaction');

      expect(transactions).toHaveLength(1);
      expect(transactions[0].entityType).toBe('transaction');
    });
  });

  describe('All Items Retrieval', () => {
    it('should get all queue items', async () => {
      const items: QueueItem[] = Array.from({ length: 5 }, (_, i) => ({
        id: `test-${i}`,
        entityType: 'transaction',
        entityId: `txn-${i}`,
        changeType: 'CREATE',
        data: { amount: 100 },
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: i % 2 === 0,
      }));

      mockDBManager.getAllFromStore.mockResolvedValue(items);

      const queue = await initializeOfflineQueue();
      const allItems = await queue.getAllItems();

      expect(allItems).toHaveLength(5);
    });
  });
});
