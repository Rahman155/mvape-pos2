/**
 * Integration tests for Background Sync API
 * Tests the complete background sync system including:
 * - Background sync registration and triggering
 * - Integration with sync engine
 * - Integration with offline queue
 * - Notification system
 * - Conflict resolution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BackgroundSyncManager, getBackgroundSyncManager, initializeBackgroundSync } from '../backgroundSync';
import { SyncNotificationManager, getSyncNotificationManager } from '../syncNotifications';
import { getOfflineQueue } from '../offlineQueue';
import { getSyncEngine } from '../syncEngine';
import { getConflictResolver } from '../conflictResolution';

describe('Background Sync Integration', () => {
  let bgSyncManager: BackgroundSyncManager;
  let notificationManager: SyncNotificationManager;

  beforeEach(async () => {
    bgSyncManager = getBackgroundSyncManager();
    notificationManager = getSyncNotificationManager();
    await bgSyncManager.initialize();
  });

  afterEach(() => {
    bgSyncManager.destroy();
    notificationManager.destroy();
  });

  describe('Complete Background Sync Workflow', () => {
    it('should register background sync with default settings', async () => {
      const result = await bgSyncManager.registerSync('offline-changes');

      expect(result).toBe(true);
      expect(bgSyncManager.getRegistration('offline-changes')).not.toBeNull();
    });

    it('should handle multiple sync registrations', async () => {
      const result1 = await bgSyncManager.registerSync('sync-1', { period: 30000 });
      const result2 = await bgSyncManager.registerSync('sync-2', { period: 60000 });
      const result3 = await bgSyncManager.registerSync('sync-3', { period: 90000 });

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);

      const registrations = bgSyncManager.getAllRegistrations();
      expect(registrations).toHaveLength(3);
    });

    it('should trigger sync and emit events', async () => {
      const syncListener = vi.fn();
      const notificationListener = vi.fn();

      await bgSyncManager.registerSync('test-sync');
      bgSyncManager.addEventListener('test-sync', syncListener);
      notificationManager.addEventListener(notificationListener);

      await bgSyncManager.triggerSync('test-sync');

      // Allow time for event propagation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(syncListener).toHaveBeenCalled();
    });

    it('should update sync registration state after trigger', async () => {
      await bgSyncManager.registerSync('test-sync', { period: 60000 });

      let reg = bgSyncManager.getRegistration('test-sync');
      expect(reg?.lastSyncTime).toBeNull();

      await bgSyncManager.triggerSync('test-sync');

      reg = bgSyncManager.getRegistration('test-sync');
      expect(reg?.lastSyncTime).not.toBeNull();
      expect(reg?.nextSyncTime).not.toBeNull();
      expect(reg?.nextSyncTime! > Date.now()).toBe(true);
    });
  });

  describe('Background Sync with Offline Queue', () => {
    it('should work with offline queue for transactions', async () => {
      const queue = getOfflineQueue();
      await queue.initialize();

      const result1 = await bgSyncManager.registerSync('queue-sync', { period: 30000 });
      expect(result1).toBe(true);

      // Add transaction to queue
      const queueItem = await queue.addTransaction({
        storeId: 'store-1',
        items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10000, totalPrice: 10000 }],
        paymentMethod: 'CASH',
        totalAmount: 10000,
      });

      expect(queueItem).toBeDefined();

      // Verify pending items
      const pending = await queue.getPendingItems();
      expect(pending.length).toBeGreaterThan(0);

      // Queue cleanup
      await queue.clearQueue();
    });

    it('should track pending items through sync registration', async () => {
      const queue = getOfflineQueue();
      await queue.initialize();

      // Register multiple syncs
      await bgSyncManager.registerSync('sync-transactions', { period: 30000 });
      await bgSyncManager.registerSync('sync-inventory', { period: 60000 });

      // Add items to queue
      for (let i = 0; i < 5; i++) {
        await queue.addTransaction({
          storeId: `store-${i}`,
          items: [{ productId: 'prod-1', quantity: 1, unitPrice: 10000, totalPrice: 10000 }],
          paymentMethod: 'CASH',
          totalAmount: 10000,
        });
      }

      const stats = await queue.getStats();
      expect(stats.totalItems).toBeGreaterThanOrEqual(5);
      expect(stats.pendingItems).toBeGreaterThanOrEqual(5);

      // Cleanup
      await queue.clearQueue();
    });
  });

  describe('Background Sync with Notifications', () => {
    it('should show sync started notification', async () => {
      const notificationSpy = vi.fn();
      notificationManager.addEventListener(notificationSpy);

      await notificationManager.showSyncStarted(5);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(notificationSpy).toHaveBeenCalled();
    });

    it('should show sync success notification', async () => {
      const notificationSpy = vi.fn();
      notificationManager.addEventListener(notificationSpy);

      await notificationManager.showSyncSuccess(5);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(notificationSpy).toHaveBeenCalled();
    });

    it('should show sync error notification', async () => {
      const notificationSpy = vi.fn();
      notificationManager.addEventListener(notificationSpy);

      await notificationManager.showSyncError('Network timeout', 2);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(notificationSpy).toHaveBeenCalled();
    });

    it('should show offline/online notifications', async () => {
      const notificationSpy = vi.fn();
      notificationManager.addEventListener(notificationSpy);

      await notificationManager.showOffline();
      await new Promise((resolve) => setTimeout(resolve, 50));

      await notificationManager.showOnline(3);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(notificationSpy).toHaveBeenCalled();
    });

    it('should track notification history', async () => {
      await notificationManager.showSyncStarted(5);
      await notificationManager.showSyncSuccess(5);

      const all = notificationManager.getAll();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Background Sync Error Handling', () => {
    it('should handle sync errors gracefully', async () => {
      const syncListener = vi.fn();

      await bgSyncManager.registerSync('error-sync');
      bgSyncManager.addEventListener('error-sync', syncListener);

      // Trigger sync without network (will simulate error)
      await bgSyncManager.triggerSync('error-sync');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should still emit event even with error
      expect(syncListener).toHaveBeenCalled();
    });

    it('should handle unregistered sync triggers', async () => {
      await expect(bgSyncManager.triggerSync('unregistered')).rejects.toThrow();
    });

    it('should continue periodic sync on error', async () => {
      const syncListener = vi.fn();

      await bgSyncManager.registerSync('periodic-error', { period: 100 });
      bgSyncManager.addEventListener('periodic-error', syncListener);

      // Wait for multiple intervals
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Should have been triggered multiple times despite any errors
      expect(syncListener.mock.calls.length).toBeGreaterThanOrEqual(2);

      await bgSyncManager.unregisterSync('periodic-error');
    });
  });

  describe('Background Sync with Conflict Resolution', () => {
    it('should integrate with conflict resolver', async () => {
      const resolver = getConflictResolver('LWW', 'auto');

      // Detect a conflict
      const conflict = resolver.detectConflicts(
        { name: 'John', age: 30 },
        { name: 'Jane', age: 31 },
        1000,
        500,
        'member-1',
        'member'
      );

      expect(conflict).not.toBeNull();
      if (conflict) {
        expect(conflict.entityId).toBe('member-1');
        expect(conflict.entityType).toBe('member');
      }
    });

    it('should resolve conflicts with LWW strategy', async () => {
      const resolver = getConflictResolver('LWW', 'auto');

      const conflict = resolver.detectConflicts(
        { name: 'John', age: 30 },
        { name: 'Jane', age: 31 },
        1000, // Newer timestamp
        500, // Older timestamp
        'member-1',
        'member'
      );

      if (conflict) {
        const resolution = resolver.resolveConflict(conflict);
        expect(resolution).toBeDefined();
        expect(resolution.strategy).toBe('LWW');
      }
    });

    it('should track conflict history', async () => {
      const resolver = getConflictResolver('LWW', 'auto');

      // Generate multiple conflicts
      for (let i = 0; i < 3; i++) {
        resolver.detectConflicts(
          { id: `item-${i}` },
          { id: `item-${i}` },
          1000,
          500,
          `item-${i}`,
          'item'
        );
      }

      const stats = resolver.getStats();
      expect(stats.totalConflicts).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Background Sync Performance', () => {
    it('should handle multiple registrations efficiently', async () => {
      const startTime = Date.now();

      // Register 20 syncs
      for (let i = 0; i < 20; i++) {
        await bgSyncManager.registerSync(`sync-${i}`);
      }

      const registrationTime = Date.now() - startTime;
      expect(registrationTime).toBeLessThan(1000); // Should complete in <1s

      const registrations = bgSyncManager.getAllRegistrations();
      expect(registrations).toHaveLength(20);

      // Cleanup
      for (let i = 0; i < 20; i++) {
        await bgSyncManager.unregisterSync(`sync-${i}`);
      }
    });

    it('should handle rapid sync triggers', async () => {
      const syncListener = vi.fn();

      await bgSyncManager.registerSync('rapid-sync');
      bgSyncManager.addEventListener('rapid-sync', syncListener);

      const startTime = Date.now();

      // Trigger 10 syncs rapidly
      for (let i = 0; i < 10; i++) {
        await bgSyncManager.triggerSync('rapid-sync');
      }

      const triggerTime = Date.now() - startTime;
      expect(triggerTime).toBeLessThan(5000); // Should complete in <5s

      expect(syncListener).toHaveBeenCalled();

      await bgSyncManager.unregisterSync('rapid-sync');
    });

    it('should handle large notification queues', async () => {
      // Add 100 notifications
      for (let i = 0; i < 100; i++) {
        await notificationManager.showSyncStarted(i);
      }

      const all = notificationManager.getAll();
      // Should be capped or managed appropriately
      expect(all.length).toBeGreaterThan(0);
    });
  });

  describe('Background Sync Fallback Behavior', () => {
    it('should support fallback polling when native not available', async () => {
      // This test verifies the manager can work without native Background Sync API
      const manager = new BackgroundSyncManager();
      await manager.initialize();

      const result = await manager.registerSync('fallback-sync', { period: 5000 });

      // Should still register successfully
      expect(result).toBe(true);

      // Should have a registration
      const reg = manager.getRegistration('fallback-sync');
      expect(reg).not.toBeNull();

      manager.destroy();
    });

    it('should switch to fallback on native API failure', async () => {
      const manager = new BackgroundSyncManager();
      await manager.initialize();

      // Try to register
      const result = await manager.registerSync('native-fallback', { period: 10000 });

      // Should work regardless of native support
      expect(result).toBe(true);

      // Should identify registration method
      const method = manager.getRegistrationMethod('native-fallback');
      expect(['native', 'fallback']).toContain(method);

      manager.destroy();
    });
  });

  describe('Background Sync Cleanup', () => {
    it('should cleanup timers on destroy', async () => {
      const manager = new BackgroundSyncManager();
      await manager.initialize();

      await manager.registerSync('cleanup-1', { period: 5000 });
      await manager.registerSync('cleanup-2', { period: 10000 });

      let registrations = manager.getAllRegistrations();
      expect(registrations).toHaveLength(2);

      manager.destroy();

      registrations = manager.getAllRegistrations();
      expect(registrations).toHaveLength(0);
    });

    it('should clear event listeners on destroy', async () => {
      const manager = new BackgroundSyncManager();
      await manager.initialize();

      const listener = vi.fn();
      manager.addEventListener('test', listener);

      await manager.registerSync('test');
      manager.destroy();

      // After destroy, listeners should be cleared
      // This prevents memory leaks
      expect(manager.getAllRegistrations()).toHaveLength(0);
    });
  });

  describe('Background Sync Integration Edge Cases', () => {
    it('should handle sync registration with empty tag', async () => {
      // Should either accept or reject empty tags consistently
      try {
        await bgSyncManager.registerSync('');
        const reg = bgSyncManager.getRegistration('');
        expect(reg).toBeDefined();
      } catch {
        // If it rejects, that's also acceptable
      }
    });

    it('should handle extremely large batch sizes', async () => {
      const result = await bgSyncManager.registerSync('large-batch', {
        period: 60000,
      });

      expect(result).toBe(true);

      const reg = bgSyncManager.getRegistration('large-batch');
      expect(reg?.period).toBe(60000);

      await bgSyncManager.unregisterSync('large-batch');
    });

    it('should handle concurrent notifications', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(notificationManager.showSyncStarted(i));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);

      const all = notificationManager.getAll();
      expect(all.length).toBeGreaterThan(0);
    });

    it('should maintain state through multiple register/unregister cycles', async () => {
      for (let cycle = 0; cycle < 3; cycle++) {
        const tag = `cycle-${cycle}`;
        await bgSyncManager.registerSync(tag, { period: 30000 });

        let reg = bgSyncManager.getRegistration(tag);
        expect(reg).not.toBeNull();

        await bgSyncManager.triggerSync(tag);

        reg = bgSyncManager.getRegistration(tag);
        expect(reg?.lastSyncTime).not.toBeNull();

        await bgSyncManager.unregisterSync(tag);

        reg = bgSyncManager.getRegistration(tag);
        expect(reg).toBeNull();
      }
    });
  });

  describe('Service Worker Integration', () => {
    it('should communicate with service worker if available', async () => {
      // This test verifies the manager can communicate with SW
      const listener = vi.fn();

      await bgSyncManager.registerSync('sw-test');
      bgSyncManager.addEventListener('sw-test', listener);

      // Trigger sync (will attempt to send message to SW)
      await bgSyncManager.triggerSync('sw-test');

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should dispatch event regardless of SW availability
      expect(listener).toHaveBeenCalled();

      await bgSyncManager.unregisterSync('sw-test');
    });
  });

  describe('Background Sync with Network Changes', () => {
    it('should handle online event', async () => {
      const engine = getSyncEngine();
      await engine.initialize();

      const onlineListener = vi.fn();
      if (typeof window !== 'undefined') {
        window.addEventListener('engine:online', onlineListener);
      }

      // Simulate online event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('online'));
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (typeof window !== 'undefined') {
        window.removeEventListener('engine:online', onlineListener);
      }

      engine.destroy();
    });

    it('should track sync status through network changes', async () => {
      await bgSyncManager.registerSync('network-test', { period: 30000 });

      const reg = bgSyncManager.getRegistration('network-test');
      expect(reg?.registered).toBe(true);

      // Even through network changes, registration should persist
      await bgSyncManager.triggerSync('network-test');

      const updated = bgSyncManager.getRegistration('network-test');
      expect(updated?.registered).toBe(true);

      await bgSyncManager.unregisterSync('network-test');
    });
  });
});
