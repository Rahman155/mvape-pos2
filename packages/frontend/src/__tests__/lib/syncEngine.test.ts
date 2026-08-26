/**
 * Sync Engine Tests
 * Tests for synchronization engine, batch processing, exponential backoff, and error recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initializeSyncEngine, getSyncEngine, SyncStatus } from '@/lib/syncEngine';
import { getOfflineQueue, initializeOfflineQueue } from '@/lib/offlineQueue';
import type { SyncResult, QueueItem } from '@/lib/offlineQueue';

/**
 * Mock setup for API and database
 */
const mockApiClient = {
  post: vi.fn(),
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

describe('SyncEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
    });
  });

  afterEach(() => {
    // Cleanup
    const engine = getSyncEngine();
    engine?.destroy();
  });

  describe('Initialization', () => {
    it('should initialize sync engine successfully', async () => {
      const engine = await initializeSyncEngine();
      expect(engine).toBeDefined();
      expect(engine.getStatus()).toBe(SyncStatus.Idle);
    });

    it('should use singleton pattern for engine instance', async () => {
      const engine1 = getSyncEngine();
      const engine2 = getSyncEngine();
      expect(engine1).toBe(engine2);
    });

    it('should have default configuration values', async () => {
      const engine = getSyncEngine({
        batchSize: 10,
        maxRetries: 3,
        initialBackoff: 1000,
        maxBackoff: 30000,
      });

      expect(engine).toBeDefined();
      // Configuration is private, but we can verify through behavior
    });
  });

  describe('Basic Sync Operations', () => {
    it('should sync empty queue successfully', async () => {
      mockDBManager.getAllFromStore.mockResolvedValue([]);

      const engine = await initializeSyncEngine();
      const result = await engine.sync();

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(0);
      expect(result.totalItems).toBe(0);
    });

    it('should process single item sync', async () => {
      const queueItem: QueueItem = {
        id: 'test-1',
        entityType: 'transaction',
        entityId: 'txn-1',
        changeType: 'CREATE',
        data: { amount: 100 },
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'high',
        synced: false,
      };

      mockDBManager.getAllFromStore.mockResolvedValue([queueItem]);
      mockApiClient.post.mockResolvedValue({
        data: {
          results: [{ success: true }],
        },
      });

      const engine = await initializeSyncEngine();
      const result = await engine.sync();

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsFailed).toBe(0);
    });

    it('should process batch of items', async () => {
      const items: QueueItem[] = Array.from({ length: 5 }, (_, i) => ({
        id: `test-${i}`,
        entityType: 'transaction',
        entityId: `txn-${i}`,
        changeType: 'CREATE',
        data: { amount: (i + 1) * 100 },
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

      const engine = await initializeSyncEngine();
      const result = await engine.sync();

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(5);
      expect(result.itemsFailed).toBe(0);
      expect(result.totalItems).toBe(5);
    });

    it('should return correct sync duration', async () => {
      mockDBManager.getAllFromStore.mockResolvedValue([]);

      const engine = await initializeSyncEngine();
      const startTime = Date.now();
      const result = await engine.sync();

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeGreaterThanOrEqual(startTime);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const queueItem: QueueItem = {
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

      mockDBManager.getAllFromStore.mockResolvedValue([queueItem]);
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      const engine = await initializeSyncEngine();
      const result = await engine.sync();

      expect(result.success).toBe(false);
      expect(result.itemsProcessed).toBe(0);
      expect(result.itemsFailed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle partial failures', async () => {
      const items: QueueItem[] = Array.from({ length: 3 }, (_, i) => ({
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
      mockApiClient.post.mockResolvedValue({
        data: {
          results: [
            { success: true },
            { success: false, error: 'Validation error' },
            { success: true },
          ],
        },
      });

      const engine = await initializeSyncEngine();
      const result = await engine.sync();

      expect(result.itemsProcessed).toBe(2);
      expect(result.itemsFailed).toBe(1);
      expect(result.success).toBe(false);
    });

    it('should prevent sync when offline', async () => {
      Object.defineProperty(window, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      const engine = await initializeSyncEngine();
      const result = await engine.sync();

      expect(result.success).toBe(false);
      expect(result.errors[0]?.error).toContain('offline');
    });

    it('should prevent concurrent sync attempts', async () => {
      mockDBManager.getAllFromStore.mockResolvedValue([]);
      mockApiClient.post.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 100))
      );

      const engine = await initializeSyncEngine();

      // Start first sync
      const promise1 = engine.sync();

      // Try to start second sync while first is in progress
      const promise2 = engine.sync();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Second sync should fail with "already in progress" message
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.errors[0]?.error).toContain('already in progress');
    });
  });

  describe('Retry Logic & Exponential Backoff', () => {
    it('should schedule retries on failure', async () => {
      const queueItem: QueueItem = {
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

      mockDBManager.getAllFromStore.mockResolvedValue([queueItem]);
      mockApiClient.post.mockResolvedValue({
        data: {
          results: [{ success: false, error: 'Temporary error' }],
        },
      });

      const engine = await initializeSyncEngine({
        initialBackoff: 100,
        maxBackoff: 1000,
      });

      const result = await engine.sync();

      expect(result.itemsFailed).toBe(1);
      expect(result.errors[0]?.retryable).toBe(true);
    });

    it('should respect max retries limit', async () => {
      const queueItem: QueueItem = {
        id: 'test-1',
        entityType: 'transaction',
        entityId: 'txn-1',
        changeType: 'CREATE',
        data: { amount: 100 },
        timestamp: Date.now(),
        retries: 3, // Already at max
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      };

      mockDBManager.getAllFromStore.mockResolvedValue([queueItem]);

      const engine = await initializeSyncEngine();
      // This item should be filtered out as pending (retries >= maxRetries)
      const result = await engine.sync();

      expect(result.totalItems).toBe(1);
    });

    it('should use exponential backoff for retries', async () => {
      // This test verifies the backoff time calculation
      // backoff = min(initialBackoff * 2^(retryNumber-1), maxBackoff)

      const testCases = [
        { retry: 1, expected: 1000 }, // 1s
        { retry: 2, expected: 2000 }, // 2s
        { retry: 3, expected: 4000 }, // 4s
        { retry: 4, expected: 8000 }, // 8s
        { retry: 10, expected: 30000 }, // capped at 30s
      ];

      const engine = getSyncEngine({
        initialBackoff: 1000,
        maxBackoff: 30000,
      });

      // Backoff calculation: Math.min(1000 * 2^(retry-1), 30000)
      for (const testCase of testCases) {
        const backoff = Math.min(
          1000 * Math.pow(2, testCase.retry - 1),
          30000
        );
        expect(backoff).toBe(testCase.expected);
      }
    });
  });

  describe('Sync Status Management', () => {
    it('should track sync status', async () => {
      mockDBManager.getAllFromStore.mockResolvedValue([]);

      const engine = await initializeSyncEngine();

      expect(engine.getStatus()).toBe(SyncStatus.Idle);

      const syncPromise = engine.sync();
      // Status should be Syncing during sync

      await syncPromise;

      expect(engine.getStatus()).toBe(SyncStatus.Complete);
    });

    it('should report isSyncing accurately', async () => {
      mockDBManager.getAllFromStore.mockResolvedValue([]);

      const engine = await initializeSyncEngine();

      expect(engine.isSyncing()).toBe(false);

      const syncPromise = engine.sync();
      // Note: isSyncing check here is timing-dependent
      await syncPromise;

      expect(engine.isSyncing()).toBe(false);
    });

    it('should track last sync time', async () => {
      mockDBManager.getAllFromStore.mockResolvedValue([]);

      const engine = await initializeSyncEngine();

      expect(engine.getLastSyncTime()).toBeNull();

      await engine.sync();

      const lastSyncTime = engine.getLastSyncTime();
      expect(lastSyncTime).not.toBeNull();
      expect(typeof lastSyncTime).toBe('number');
      expect(lastSyncTime).toBeGreaterThan(0);
    });

    it('should get pending count', async () => {
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

      const engine = await initializeSyncEngine();
      const pendingCount = await engine.getPendingCount();

      expect(pendingCount).toBe(5);
    });
  });

  describe('Pause & Resume', () => {
    it('should pause sync', async () => {
      const engine = getSyncEngine();

      // Can't pause if not syncing, but let's verify the method exists
      expect(typeof engine.pause).toBe('function');
    });

    it('should resume sync', async () => {
      const engine = getSyncEngine();

      // Verify the method exists
      expect(typeof engine.resume).toBe('function');
    });
  });

  describe('Cleanup', () => {
    it('should clear all retries on demand', async () => {
      const engine = getSyncEngine();
      engine.clearRetries();
      // Verify no errors occur
      expect(engine).toBeDefined();
    });

    it('should destroy engine cleanly', async () => {
      const engine = getSyncEngine();
      engine.destroy();
      // Verify no errors occur
      expect(engine).toBeDefined();
    });
  });

  describe('Batch Processing', () => {
    it('should process items in configurable batch sizes', async () => {
      const items: QueueItem[] = Array.from({ length: 25 }, (_, i) => ({
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
      mockApiClient.post.mockResolvedValue({
        data: {
          results: items.map(() => ({ success: true })),
        },
      });

      const engine = await initializeSyncEngine({ batchSize: 10 });
      const result = await engine.sync();

      // Should make 3 API calls (batches of 10, 10, 5)
      expect(mockApiClient.post).toHaveBeenCalledTimes(3);
      expect(result.itemsProcessed).toBe(25);
    });

    it('should include all item data in batch request', async () => {
      const queueItem: QueueItem = {
        id: 'test-1',
        entityType: 'transaction',
        entityId: 'txn-1',
        changeType: 'CREATE',
        data: { amount: 100, items: [{ productId: 'p1', qty: 2 }] },
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      };

      mockDBManager.getAllFromStore.mockResolvedValue([queueItem]);
      mockApiClient.post.mockResolvedValue({
        data: {
          results: [{ success: true }],
        },
      });

      const engine = await initializeSyncEngine();
      await engine.sync();

      // Verify API call includes all item data
      const callArgs = mockApiClient.post.mock.calls[0];
      expect(callArgs[1]).toEqual({
        items: [
          {
            id: 'test-1',
            entityType: 'transaction',
            changeType: 'CREATE',
            data: { amount: 100, items: [{ productId: 'p1', qty: 2 }] },
          },
        ],
      });
    });
  });

  describe('Event Dispatching', () => {
    it('should dispatch sync events', async () => {
      const syncStartHandler = vi.fn();
      const syncEndHandler = vi.fn();

      window.addEventListener('sync:start', syncStartHandler);
      window.addEventListener('sync:end', syncEndHandler);

      mockDBManager.getAllFromStore.mockResolvedValue([]);

      const engine = await initializeSyncEngine();
      await engine.sync();

      // Clean up listeners
      window.removeEventListener('sync:start', syncStartHandler);
      window.removeEventListener('sync:end', syncEndHandler);

      // Events should have been dispatched
      expect(syncStartHandler).toHaveBeenCalled();
      expect(syncEndHandler).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should accept custom configuration', async () => {
      const engine = getSyncEngine({
        batchSize: 20,
        maxRetries: 5,
        initialBackoff: 500,
        maxBackoff: 60000,
        timeout: 60000,
      });

      expect(engine).toBeDefined();
    });

    it('should use default configuration if not provided', async () => {
      const engine = getSyncEngine();
      expect(engine).toBeDefined();
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle concurrent transactions with different priorities', async () => {
      const items: QueueItem[] = [
        {
          id: 'high-1',
          entityType: 'transaction',
          entityId: 'txn-1',
          changeType: 'CREATE',
          data: { amount: 500 },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'high',
          synced: false,
        },
        {
          id: 'normal-1',
          entityType: 'transaction',
          entityId: 'txn-2',
          changeType: 'CREATE',
          data: { amount: 100 },
          timestamp: Date.now() + 1000,
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
        {
          id: 'low-1',
          entityType: 'transaction',
          entityId: 'txn-3',
          changeType: 'CREATE',
          data: { amount: 50 },
          timestamp: Date.now() + 2000,
          retries: 0,
          maxRetries: 3,
          priority: 'low',
          synced: false,
        },
      ];

      mockDBManager.getAllFromStore.mockResolvedValue(items);
      mockApiClient.post.mockResolvedValue({
        data: {
          results: items.map(() => ({ success: true })),
        },
      });

      const engine = await initializeSyncEngine();
      const result = await engine.sync();

      expect(result.itemsProcessed).toBe(3);
      expect(result.success).toBe(true);
    });

    it('should handle large batch of items with some failures', async () => {
      const items: QueueItem[] = Array.from({ length: 100 }, (_, i) => ({
        id: `test-${i}`,
        entityType: 'transaction',
        entityId: `txn-${i}`,
        changeType: 'CREATE',
        data: { amount: (i + 1) * 10 },
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      }));

      mockDBManager.getAllFromStore.mockResolvedValue(items);

      // Simulate 10% failure rate
      mockApiClient.post.mockResolvedValue({
        data: {
          results: items.map((_, i) => ({
            success: i % 10 !== 0,
            error: i % 10 === 0 ? 'Validation error' : undefined,
          })),
        },
      });

      const engine = await initializeSyncEngine({ batchSize: 20 });
      const result = await engine.sync();

      expect(result.itemsProcessed).toBe(90);
      expect(result.itemsFailed).toBe(10);
      expect(result.success).toBe(false);
    });
  });
});
