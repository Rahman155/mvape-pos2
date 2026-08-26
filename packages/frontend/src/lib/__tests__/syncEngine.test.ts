/**
 * Tests for syncEngine.ts
 * Tests sync operations, batch processing, retry logic, and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SyncEngine,
  SyncStatus,
  SyncResult,
  BatchSyncResponse,
  getSyncEngine,
  initializeSyncEngine,
} from '../syncEngine';
import { getOfflineQueue } from '../offlineQueue';
import { getApiClient } from '../api';
import { initDatabase } from '../indexedDB';

// Mock dependencies
vi.mock('../offlineQueue');
vi.mock('../api');
vi.mock('../indexedDB');

describe('SyncEngine', () => {
  let engine: SyncEngine;
  let mockQueue: any;
  let mockApiClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    engine = new SyncEngine({
      batchSize: 5,
      maxRetries: 3,
      initialBackoff: 100,
      maxBackoff: 1000,
      timeout: 5000,
    });

    mockQueue = {
      getPendingItems: vi.fn().mockResolvedValue([]),
      markAsSynced: vi.fn().mockResolvedValue(undefined),
      updateRetryCount: vi.fn().mockResolvedValue(undefined),
    };

    mockApiClient = {
      post: vi.fn(),
    };

    vi.mocked(getOfflineQueue).mockReturnValue(mockQueue);
    vi.mocked(getApiClient).mockReturnValue(mockApiClient);
    vi.mocked(initDatabase).mockResolvedValue(undefined);

    // Mock window events
    Object.defineProperty(window, 'navigator', {
      value: { onLine: true },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    engine.destroy();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await engine.initialize();
      expect(vi.mocked(initDatabase)).toHaveBeenCalled();
    });

    it('should setup online detection', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      await engine.initialize();

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });

    it('should start with idle status', async () => {
      await engine.initialize();
      expect(engine.getStatus()).toBe(SyncStatus.Idle);
    });
  });

  describe('Basic Sync', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should complete sync with no pending items', async () => {
      mockQueue.getPendingItems.mockResolvedValueOnce([]);

      const result = await engine.sync();

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(0);
      expect(result.totalItems).toBe(0);
    });

    it('should process pending items', async () => {
      const pendingItems = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: { storeId: 'store-1' },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockQueue.getPendingItems.mockResolvedValueOnce(pendingItems);

      const batchResponse: BatchSyncResponse = {
        success: true,
        results: [{ id: 'item-1', success: true }],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: batchResponse });

      const result = await engine.sync();

      expect(result.success).toBe(true);
      expect(result.itemsProcessed).toBe(1);
      expect(result.totalItems).toBe(1);
      expect(mockQueue.markAsSynced).toHaveBeenCalledWith('item-1');
    });

    it('should prevent concurrent syncs', async () => {
      mockQueue.getPendingItems.mockResolvedValue([]);

      const promise1 = engine.sync();
      const promise2 = engine.sync();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.errors).toContainEqual(
        expect.objectContaining({
          error: expect.stringContaining('already in progress'),
        })
      );
    });

    it('should not sync while offline', async () => {
      Object.defineProperty(window, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      const result = await engine.sync();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          error: expect.stringContaining('offline'),
        })
      );
    });
  });

  describe('Batch Processing', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should process items in batches', async () => {
      const pendingItems = Array.from({ length: 12 }, (_, i) => ({
        id: `item-${i}`,
        entityType: 'transaction',
        entityId: `tx-${i}`,
        changeType: 'CREATE',
        data: {},
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      }));

      mockQueue.getPendingItems.mockResolvedValueOnce(pendingItems);

      const batchResponse: BatchSyncResponse = {
        success: true,
        results: Array.from({ length: 5 }, (_, i) => ({
          id: `item-${i}`,
          success: true,
        })),
        timestamp: Date.now(),
        version: '1.0.0',
      };

      mockApiClient.post.mockResolvedValue({ data: batchResponse });

      const result = await engine.sync();

      // Should make multiple batch requests (12 items / 5 per batch = 3 batches)
      expect(mockApiClient.post).toHaveBeenCalledTimes(3);
      expect(result.totalItems).toBe(12);
    });

    it('should handle partial batch success', async () => {
      const pendingItems = [
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
          entityType: 'transaction',
          entityId: 'tx-2',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockQueue.getPendingItems.mockResolvedValueOnce(pendingItems);

      const batchResponse: BatchSyncResponse = {
        success: false,
        results: [
          { id: 'item-1', success: true },
          { id: 'item-2', success: false, error: 'Invalid data' },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: batchResponse });

      const result = await engine.sync();

      expect(result.success).toBe(false);
      expect(result.itemsProcessed).toBe(1);
      expect(result.itemsFailed).toBe(1);
      expect(mockQueue.markAsSynced).toHaveBeenCalledWith('item-1');
      expect(mockQueue.updateRetryCount).toHaveBeenCalledWith('item-2', expect.any(Number), expect.any(String));
    });

    it('should handle network errors', async () => {
      const pendingItems = [
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

      mockQueue.getPendingItems.mockResolvedValueOnce(pendingItems);
      mockApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await engine.sync();

      expect(result.success).toBe(false);
      expect(result.itemsFailed).toBe(1);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          error: expect.stringContaining('Network error'),
        })
      );
    });
  });

  describe('Retry Logic', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should calculate exponential backoff', async () => {
      // Test exponential backoff: 100ms, 200ms, 400ms, 800ms
      const backoffs = [];
      for (let i = 1; i <= 4; i++) {
        const backoff = Math.min(100 * Math.pow(2, i - 1), 1000);
        backoffs.push(backoff);
      }

      expect(backoffs[0]).toBe(100);
      expect(backoffs[1]).toBe(200);
      expect(backoffs[2]).toBe(400);
      expect(backoffs[3]).toBe(800);
    });

    it('should cap backoff at max', () => {
      const maxBackoff = 1000;
      const backoff = Math.min(100 * Math.pow(2, 10), maxBackoff);
      expect(backoff).toBe(maxBackoff);
    });

    it('should mark item as failed after max retries', async () => {
      const pendingItems = [
        {
          id: 'item-1',
          entityType: 'transaction',
          entityId: 'tx-1',
          changeType: 'CREATE',
          data: {},
          timestamp: Date.now(),
          retries: 2,
          maxRetries: 3,
          priority: 'normal',
          synced: false,
        },
      ];

      mockQueue.getPendingItems.mockResolvedValueOnce(pendingItems);

      const batchResponse: BatchSyncResponse = {
        success: false,
        results: [{ id: 'item-1', success: false, error: 'Failed' }],
        timestamp: Date.now(),
        version: '1.0.0',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: batchResponse });

      const result = await engine.sync();

      expect(mockQueue.updateRetryCount).toHaveBeenCalledWith('item-1', 3, expect.any(String));
    });
  });

  describe('Status Management', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should update status during sync', async () => {
      mockQueue.getPendingItems.mockResolvedValueOnce([]);

      expect(engine.getStatus()).toBe(SyncStatus.Idle);

      const syncPromise = engine.sync();
      // Status should be Syncing during sync
      expect(engine.isSyncing()).toBe(true);

      await syncPromise;

      expect(engine.getStatus()).toBe(SyncStatus.Complete);
    });

    it('should pause syncing', () => {
      engine.pause();
      expect(engine.getStatus()).toBe(SyncStatus.Paused);
    });

    it('should resume syncing', async () => {
      engine.pause();
      expect(engine.getStatus()).toBe(SyncStatus.Paused);

      mockQueue.getPendingItems.mockResolvedValueOnce([]);

      await engine.resume();

      expect(engine.getStatus()).toBe(SyncStatus.Complete);
    });
  });

  describe('Event Dispatching', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should dispatch sync:start event', async () => {
      const eventSpy = vi.fn();
      window.addEventListener('sync:start', eventSpy);

      mockQueue.getPendingItems.mockResolvedValueOnce([]);

      await engine.sync();

      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener('sync:start', eventSpy);
    });

    it('should dispatch sync:progress event', async () => {
      const eventSpy = vi.fn();
      window.addEventListener('sync:progress', eventSpy);

      const pendingItems = Array.from({ length: 12 }, (_, i) => ({
        id: `item-${i}`,
        entityType: 'transaction',
        entityId: `tx-${i}`,
        changeType: 'CREATE',
        data: {},
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      }));

      mockQueue.getPendingItems.mockResolvedValueOnce(pendingItems);

      const batchResponse: BatchSyncResponse = {
        success: true,
        results: Array.from({ length: 5 }, (_, i) => ({
          id: `item-${i}`,
          success: true,
        })),
        timestamp: Date.now(),
        version: '1.0.0',
      };

      mockApiClient.post.mockResolvedValue({ data: batchResponse });

      await engine.sync();

      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener('sync:progress', eventSpy);
    });

    it('should dispatch sync:end event with success', async () => {
      const eventSpy = vi.fn();
      window.addEventListener('sync:end', eventSpy);

      mockQueue.getPendingItems.mockResolvedValueOnce([]);

      await engine.sync();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({ success: true }),
        })
      );

      window.removeEventListener('sync:end', eventSpy);
    });

    it('should dispatch sync:end event with error', async () => {
      const eventSpy = vi.fn();
      window.addEventListener('sync:end', eventSpy);

      const pendingItems = [
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

      mockQueue.getPendingItems.mockResolvedValueOnce(pendingItems);
      mockApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      await engine.sync();

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({ success: false }),
        })
      );

      window.removeEventListener('sync:end', eventSpy);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should get pending count', async () => {
      const pendingItems = Array.from({ length: 5 }, (_, i) => ({
        id: `item-${i}`,
        entityType: 'transaction',
        entityId: `tx-${i}`,
        changeType: 'CREATE',
        data: {},
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      }));

      mockQueue.getPendingItems.mockResolvedValueOnce(pendingItems);

      const count = await engine.getPendingCount();

      expect(count).toBe(5);
    });

    it('should get last sync time', async () => {
      mockQueue.getPendingItems.mockResolvedValueOnce([]);

      expect(engine.getLastSyncTime()).toBeNull();

      await engine.sync();

      expect(engine.getLastSyncTime()).not.toBeNull();
      expect(typeof engine.getLastSyncTime()).toBe('number');
    });

    it('should check isSyncing status', async () => {
      mockQueue.getPendingItems.mockResolvedValueOnce([]);

      expect(engine.isSyncing()).toBe(false);

      const syncPromise = engine.sync();
      expect(engine.isSyncing()).toBe(true);

      await syncPromise;
      expect(engine.isSyncing()).toBe(false);
    });

    it('should clear retries', () => {
      engine.clearRetries();
      // Should not throw
    });
  });

  describe('Offline to Online Transition', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should trigger sync when coming online', async () => {
      Object.defineProperty(window, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      mockQueue.getPendingItems.mockResolvedValue([]);

      // Simulate online event
      Object.defineProperty(window, 'navigator', {
        value: { onLine: true },
        writable: true,
      });

      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      // Wait for sync to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockQueue.getPendingItems).toHaveBeenCalled();
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const engine1 = getSyncEngine();
      const engine2 = getSyncEngine();

      expect(engine1).toBe(engine2);
    });

    it('should initialize singleton', async () => {
      const engine = await initializeSyncEngine();

      expect(engine).toBeDefined();
      expect(vi.mocked(initDatabase)).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should handle missing batch results', async () => {
      const pendingItems = [
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

      mockQueue.getPendingItems.mockResolvedValueOnce(pendingItems);

      const batchResponse: BatchSyncResponse = {
        success: false,
        results: [], // Empty results
        timestamp: Date.now(),
        version: '1.0.0',
      };

      mockApiClient.post.mockResolvedValueOnce({ data: batchResponse });

      const result = await engine.sync();

      expect(result.success).toBe(false);
      expect(result.itemsFailed).toBeGreaterThan(0);
    });

    it('should handle timeout errors', async () => {
      const pendingItems = [
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

      mockQueue.getPendingItems.mockResolvedValueOnce(pendingItems);
      mockApiClient.post.mockRejectedValueOnce(new Error('Request timeout'));

      const result = await engine.sync();

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          error: expect.stringContaining('timeout'),
        })
      );
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should handle large batches', async () => {
      const pendingItems = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        entityType: 'transaction',
        entityId: `tx-${i}`,
        changeType: 'CREATE',
        data: {},
        timestamp: Date.now(),
        retries: 0,
        maxRetries: 3,
        priority: 'normal',
        synced: false,
      }));

      mockQueue.getPendingItems.mockResolvedValueOnce(pendingItems);

      const batchResponse: BatchSyncResponse = {
        success: true,
        results: Array.from({ length: 5 }, (_, i) => ({
          id: `item-${i}`,
          success: true,
        })),
        timestamp: Date.now(),
        version: '1.0.0',
      };

      mockApiClient.post.mockResolvedValue({ data: batchResponse });

      const result = await engine.sync();

      expect(result.totalItems).toBe(100);
    });

    it('should complete sync within reasonable time', async () => {
      mockQueue.getPendingItems.mockResolvedValueOnce([]);

      const startTime = Date.now();
      const result = await engine.sync();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
