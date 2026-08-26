/**
 * Offline Flow Integration Tests
 * End-to-end tests for offline transaction creation, queuing, and synchronization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeOfflineQueue, getOfflineQueue } from '@/lib/offlineQueue';
import { initializeSyncEngine, getSyncEngine } from '@/lib/syncEngine';
import type { QueueItem } from '@/lib/offlineQueue';

/**
 * Mock setup for API and database
 */
const mockApiClient = {
  post: vi.fn(),
  get: vi.fn(),
};

const mockDBManager = {
  createInStore: vi.fn(),
  getFromStore: vi.fn(),
  updateInStore: vi.fn(),
  deleteFromStore: vi.fn(),
  getAllFromStore: vi.fn(),
};

// Mock modules
vi.mock('@/lib/api', () => ({
  getApiClient: () => mockApiClient,
}));

vi.mock('@/lib/indexedDB', () => ({
  getDBManager: () => mockDBManager,
  initDatabase: vi.fn().mockResolvedValue(undefined),
}));

describe('Offline Transaction Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
    });
  });

  afterEach(() => {
    const engine = getSyncEngine();
    engine?.destroy();
  });

  describe('Complete Offline Transaction Workflow', () => {
    it('should create transaction offline and sync when online', async () => {
      // Step 1: User is offline
      Object.defineProperty(window, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      // Step 2: Create transaction while offline
      const transactionData = {
        items: [
          { productId: 'p1', quantity: 2, price: 50000 },
          { productId: 'p2', quantity: 1, price: 75000 },
        ],
        total: 175000,
        paymentMethod: 'CASH',
        paymentReceived: 200000,
        change: 25000,
      };

      mockDBManager.createInStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const queuedTransaction = await queue.addTransaction(transactionData);

      // Verify transaction was queued
      expect(queuedTransaction).toBeDefined();
      expect(queuedTransaction.synced).toBe(false);
      expect(queuedTransaction.retries).toBe(0);
      expect(queuedTransaction.changeType).toBe('CREATE');

      // Step 3: Verify it's in pending queue
      mockDBManager.getAllFromStore.mockResolvedValue([queuedTransaction]);
      const pendingItems = await queue.getPendingItems();
      expect(pendingItems).toHaveLength(1);
      expect(pendingItems[0].id).toBe(queuedTransaction.id);

      // Step 4: User comes online
      Object.defineProperty(window, 'navigator', {
        value: { onLine: true },
        writable: true,
      });

      // Step 5: Sync engine processes the queued transaction
      mockApiClient.post.mockResolvedValue({
        data: {
          results: [{ success: true, id: queuedTransaction.id }],
        },
      });

      const engine = await initializeSyncEngine();
      const syncResult = await engine.sync();

      // Verify sync was successful
      expect(syncResult.success).toBe(true);
      expect(syncResult.itemsProcessed).toBe(1);
      expect(syncResult.itemsFailed).toBe(0);

      // Verify API was called with correct data
      const apiCall = mockApiClient.post.mock.calls[0];
      expect(apiCall[0]).toBe('/sync/batch');
      expect(apiCall[1].items).toHaveLength(1);
      expect(apiCall[1].items[0].data).toEqual(transactionData);

      // Step 6: Mark as synced
      mockDBManager.getFromStore.mockResolvedValue(queuedTransaction);
      mockDBManager.updateInStore.mockResolvedValue(undefined);

      await queue.markAsSynced(queuedTransaction.id);

      // Verify item was marked as synced
      const updateCall = mockDBManager.updateInStore.mock.calls[0];
      expect(updateCall[1].synced).toBe(true);
    });

    it('should queue multiple transactions before sync', async () => {
      // Create 3 transactions offline
      mockDBManager.createInStore.mockResolvedValue(undefined);
      const queue = await initializeOfflineQueue();

      const transactions = await Promise.all([
        queue.addTransaction({
          items: [{ productId: 'p1', quantity: 1, price: 50000 }],
          total: 50000,
          paymentMethod: 'CASH',
        }),
        queue.addTransaction({
          items: [{ productId: 'p2', quantity: 2, price: 75000 }],
          total: 150000,
          paymentMethod: 'MEMBER_CREDIT',
        }),
        queue.addTransaction({
          items: [{ productId: 'p1', quantity: 1, price: 50000 }],
          total: 50000,
          paymentMethod: 'TEMPO',
        }),
      ]);

      expect(transactions).toHaveLength(3);

      // Verify all are in queue
      mockDBManager.getAllFromStore.mockResolvedValue(transactions);
      const queue2 = getOfflineQueue();
      const pending = await queue2.getPendingItems();

      expect(pending).toHaveLength(3);

      // Now sync all
      mockApiClient.post.mockResolvedValue({
        data: {
          results: [
            { success: true },
            { success: true },
            { success: true },
          ],
        },
      });

      const engine = await initializeSyncEngine();
      const syncResult = await engine.sync();

      expect(syncResult.itemsProcessed).toBe(3);
      expect(syncResult.success).toBe(true);
    });

    it('should handle partial sync failures with retry', async () => {
      const queuedTransaction1: QueueItem = {
        id: 'txn-1',
        entityType: 'transaction',
        entityId: 'txn-1',
        changeType: 'CREATE',
        data: { amount: 100000 },
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'high',
        synced: false,
      };

      const queuedTransaction2: QueueItem = {
        id: 'txn-2',
        entityType: 'transaction',
        entityId: 'txn-2',
        changeType: 'CREATE',
        data: { amount: 200000 },
        timestamp: Date.now() + 1000,
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      };

      mockDBManager.getAllFromStore.mockResolvedValue([
        queuedTransaction1,
        queuedTransaction2,
      ]);

      // First sync: one succeeds, one fails
      mockApiClient.post.mockResolvedValue({
        data: {
          results: [
            { success: true },
            { success: false, error: 'Validation error' },
          ],
        },
      });

      const engine = await initializeSyncEngine();
      const firstSyncResult = await engine.sync();

      expect(firstSyncResult.itemsProcessed).toBe(1);
      expect(firstSyncResult.itemsFailed).toBe(1);
      expect(firstSyncResult.success).toBe(false);

      // Second sync: retry the failed item
      mockApiClient.post.mockResolvedValue({
        data: {
          results: [{ success: true }],
        },
      });

      // Simulate retry with updated retry count
      mockDBManager.updateInStore.mockResolvedValue(undefined);
      await getOfflineQueue().updateRetryCount('txn-2', 1);

      // Would be called by retry logic, but simulating here
      mockDBManager.getAllFromStore.mockResolvedValue([queuedTransaction2]);

      const secondSyncResult = await engine.sync();

      expect(secondSyncResult.itemsProcessed).toBe(1);
      expect(secondSyncResult.itemsFailed).toBe(0);
    });

    it('should maintain transaction order by priority', async () => {
      mockDBManager.createInStore.mockResolvedValue(undefined);
      const queue = await initializeOfflineQueue();

      // Create transactions with different priorities
      const normalTxn = await queue.addToQueue(
        'transaction',
        'txn-normal',
        'CREATE',
        { amount: 100 },
        { priority: 'normal' }
      );

      const lowTxn = await queue.addToQueue(
        'transaction',
        'txn-low',
        'CREATE',
        { amount: 50 },
        { priority: 'low' }
      );

      const highTxn = await queue.addToQueue(
        'transaction',
        'txn-high',
        'CREATE',
        { amount: 500 },
        { priority: 'high' }
      );

      // Get pending items - should be sorted by priority
      mockDBManager.getAllFromStore.mockResolvedValue([
        normalTxn,
        lowTxn,
        highTxn,
      ]);

      const queue2 = getOfflineQueue();
      const pending = await queue2.getPendingItems();

      // Should be ordered: high > normal > low
      expect(pending[0].priority).toBe('high');
      expect(pending[1].priority).toBe('normal');
      expect(pending[2].priority).toBe('low');
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from network error and retry', async () => {
      const queuedTransaction: QueueItem = {
        id: 'txn-1',
        entityType: 'transaction',
        entityId: 'txn-1',
        changeType: 'CREATE',
        data: { amount: 100000 },
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'high',
        synced: false,
      };

      mockDBManager.getAllFromStore.mockResolvedValue([queuedTransaction]);

      // First attempt: network error
      mockApiClient.post.mockRejectedValueOnce(
        new Error('Network connection failed')
      );

      const engine = await initializeSyncEngine({
        initialBackoff: 10,
        maxBackoff: 100,
      });
      const firstResult = await engine.sync();

      expect(firstResult.success).toBe(false);
      expect(firstResult.errors[0]?.retryable).toBe(true);

      // Second attempt: succeeds
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          results: [{ success: true }],
        },
      });

      // Simulate retry
      mockDBManager.getAllFromStore.mockResolvedValue([queuedTransaction]);
      const secondResult = await engine.sync();

      expect(secondResult.success).toBe(true);
      expect(secondResult.itemsProcessed).toBe(1);
    });

    it('should handle max retries exceeded', async () => {
      const failedTransaction: QueueItem = {
        id: 'txn-1',
        entityType: 'transaction',
        entityId: 'txn-1',
        changeType: 'CREATE',
        data: { amount: 100000 },
        timestamp: Date.now(),
        retries: 3,
        maxRetries: 3,
        priority: 'high',
        synced: false,
      };

      mockDBManager.getAllFromStore.mockResolvedValue([failedTransaction]);

      const engine = await initializeSyncEngine();
      const result = await engine.sync();

      // Item shouldn't be processed since it's already at max retries
      expect(result.totalItems).toBe(1);
    });

    it('should handle offline error during sync', async () => {
      Object.defineProperty(window, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      const engine = await initializeSyncEngine();
      const result = await engine.sync();

      expect(result.success).toBe(false);
      expect(result.errors[0]?.error).toContain('offline');
      expect(result.errors[0]?.retryable).toBe(true);
    });
  });

  describe('Queue Statistics During Sync', () => {
    it('should report accurate queue statistics', async () => {
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
      expect(stats.pendingItems).toBe(1); // Only pending-1
      expect(stats.failedItems).toBe(1); // Only failed-1
      expect(stats.highPriorityItems).toBe(1); // pending-1 with high priority
    });
  });

  describe('Queue Cleanup After Sync', () => {
    it('should clear synced items after successful sync', async () => {
      const items: QueueItem[] = [
        {
          id: 'synced-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: true,
        },
        {
          id: 'synced-2',
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
      mockDBManager.deleteFromStore.mockResolvedValue(undefined);

      const queue = await initializeOfflineQueue();
      const clearedCount = await queue.clearSyncedItems();

      expect(clearedCount).toBe(2);
      expect(mockDBManager.deleteFromStore).toHaveBeenCalledTimes(2);
    });
  });

  describe('Concurrent Sync Operations', () => {
    it('should prevent concurrent sync attempts', async () => {
      mockDBManager.getAllFromStore.mockResolvedValue([]);

      // Mock a slow sync operation
      mockApiClient.post.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { results: [] },
                }),
              100
            )
          )
      );

      const engine = await initializeSyncEngine();

      // Attempt concurrent syncs
      const sync1Promise = engine.sync();
      const sync2Promise = engine.sync();

      const [result1, result2] = await Promise.all([
        sync1Promise,
        sync2Promise,
      ]);

      // One should succeed, one should fail due to concurrent attempt
      const successCount = [result1, result2].filter((r) => r.success).length;
      expect(successCount).toBe(1);

      const failCount = [result1, result2].filter((r) => !r.success).length;
      expect(failCount).toBe(1);
    });
  });

  describe('Sync Progress Reporting', () => {
    it('should report progress during batch sync', async () => {
      const items: QueueItem[] = Array.from({ length: 25 }, (_, i) => ({
        id: `test-${i}`,
        entityType: 'transaction',
        entityId: `txn-${i}`,
        changeType: 'CREATE',
        data: { amount: 100 * (i + 1) },
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      }));

      mockDBManager.getAllFromStore.mockResolvedValue(items);
      mockApiClient.post.mockResolvedValue({
        data: {
          results: items.map(() => ({ success: true })),
        },
      });

      const progressUpdates: unknown[] = [];
      window.addEventListener('sync:progress', (e: any) => {
        progressUpdates.push(e.detail);
      });

      const engine = await initializeSyncEngine({ batchSize: 10 });
      const result = await engine.sync();

      window.removeEventListener('sync:progress', (e: any) => {
        progressUpdates.push(e.detail);
      });

      expect(result.itemsProcessed).toBe(25);
      // Progress should have been reported multiple times (3 batches)
      expect(progressUpdates.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Data Integrity During Sync', () => {
    it('should preserve complete transaction data through sync cycle', async () => {
      const originalTransaction = {
        items: [
          {
            productId: 'PRODUCT-001',
            productName: 'Vape Juice 10ml',
            quantity: 3,
            unitPrice: 50000,
            subtotal: 150000,
          },
          {
            productId: 'PRODUCT-002',
            productName: 'Coil',
            quantity: 1,
            unitPrice: 25000,
            subtotal: 25000,
          },
        ],
        total: 175000,
        paymentMethod: 'CASH',
        paymentReceived: 200000,
        change: 25000,
        customerName: 'Budi',
        notes: 'New customer',
      };

      mockDBManager.createInStore.mockResolvedValue(undefined);
      const queue = await initializeOfflineQueue();
      const queuedItem = await queue.addTransaction(originalTransaction);

      // Verify data is preserved
      expect(queuedItem.data).toEqual(originalTransaction);

      // Verify data is preserved in API call
      mockDBManager.getAllFromStore.mockResolvedValue([queuedItem]);
      mockApiClient.post.mockResolvedValue({
        data: {
          results: [{ success: true }],
        },
      });

      const engine = await initializeSyncEngine();
      await engine.sync();

      const apiCall = mockApiClient.post.mock.calls[0];
      expect(apiCall[1].items[0].data).toEqual(originalTransaction);
    });
  });
});
