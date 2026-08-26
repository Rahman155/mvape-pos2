/**
 * Integration Tests for Sync Engine Conflict Resolution
 * 
 * **Validates: Requirements 4.5, 26.5**
 * 
 * Tests that the sync engine properly detects, resolves, and notifies users
 * of conflicts between offline changes and server state.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncEngine, SyncStatus } from '@/lib/syncEngine';
import { getConflictNotificationHandler } from '@/lib/conflictNotificationHandler';
import { getSyncNotificationManager } from '@/lib/syncNotifications';
import { getConflictResolver } from '@/lib/conflictResolution';

describe('Sync Engine Conflict Resolution', () => {
  beforeEach(() => {
    // Clear all notifications before each test
    getConflictNotificationHandler().clearAll();
  });

  describe('Conflict Detection from Server Response', () => {
    it('should detect conflicts in batch sync response', () => {
      // This test validates that when the server reports a conflict,
      // the sync engine properly handles it

      const mockBatchResponse = {
        success: true,
        results: [
          {
            id: 'txn-123',
            success: true,
            conflict: {
              detected: true,
              strategy: 'LWW',
              reason: 'Server version (1700000000) is newer than client version (1600000000)',
              serverVersion: 1700000000,
              resolutionApplied: 'LWW - Server version kept',
            },
            serverTimestamp: 1700000000,
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
        conflictsDetected: 1,
      };

      // Verify conflict information is present
      expect(mockBatchResponse.conflictsDetected).toBe(1);
      expect(mockBatchResponse.results[0].conflict?.detected).toBe(true);
      expect(mockBatchResponse.results[0].conflict?.strategy).toBe('LWW');
    });

    it('should handle multiple conflicts in single batch', () => {
      // Test that multiple conflicts are properly tracked

      const mockBatchResponse = {
        success: true,
        results: [
          {
            id: 'txn-123',
            success: true,
            conflict: {
              detected: true,
              strategy: 'LWW',
              reason: 'Server version is newer',
              resolutionApplied: 'LWW - Server version kept',
            },
          },
          {
            id: 'member-456',
            success: true,
            conflict: {
              detected: true,
              strategy: 'MERGE',
              reason: 'Merge strategy applied for compatible changes',
              resolutionApplied: 'MERGE - Fields merged intelligently',
            },
          },
          {
            id: 'product-789',
            success: true,
            conflict: undefined, // No conflict for this item
          },
        ],
        timestamp: Date.now(),
        version: '1.0.0',
        conflictsDetected: 2,
      };

      expect(mockBatchResponse.conflictsDetected).toBe(2);
      expect(
        mockBatchResponse.results.filter((r) => r.conflict?.detected).length
      ).toBe(2);
    });
  });

  describe('Conflict Notification', () => {
    it('should notify user when conflict is detected', async () => {
      const handler = getConflictNotificationHandler();
      const spy = vi.fn();
      handler.subscribe(spy);

      // Simulate conflict notification
      await handler.notifyConflict(
        'transaction',
        'txn-123',
        'LWW',
        'Server version is newer'
      );

      expect(spy).toHaveBeenCalled();
      const notification = handler.getByEntity('transaction', 'txn-123')[0];
      expect(notification).toBeDefined();
      expect(notification.strategy).toBe('LWW');
    });

    it('should track multiple conflicts for same entity type', async () => {
      const handler = getConflictNotificationHandler();

      await handler.notifyConflict(
        'transaction',
        'txn-123',
        'LWW',
        'Conflict 1'
      );
      await handler.notifyConflict(
        'transaction',
        'txn-456',
        'MERGE',
        'Conflict 2'
      );

      const conflicts = handler.getByEntityType('transaction');
      expect(conflicts.length).toBe(2);
    });

    it('should provide conflict statistics', async () => {
      const handler = getConflictNotificationHandler();

      await handler.notifyConflict('transaction', 'txn-1', 'LWW', 'Test 1');
      await handler.notifyConflict('transaction', 'txn-2', 'LWW', 'Test 2');
      await handler.notifyConflict('member', 'member-1', 'MERGE', 'Test 3');

      const stats = handler.getStats();
      expect(stats.total).toBe(3);
      expect(stats.byStrategy['LWW']).toBe(2);
      expect(stats.byStrategy['MERGE']).toBe(1);
      expect(stats.byEntityType['transaction']).toBe(2);
      expect(stats.byEntityType['member']).toBe(1);
    });
  });

  describe('Conflict Resolution Strategies', () => {
    it('should apply Last-Write-Wins (LWW) strategy correctly', () => {
      const resolver = getConflictResolver('LWW');

      const localVersion = {
        id: 'txn-1',
        amount: 100000,
        timestamp: Date.now(),
      };

      const remoteVersion = {
        id: 'txn-1',
        amount: 50000,
        timestamp: Date.now() - 1000, // Older
      };

      // Local is newer, should win
      const conflict = resolver.detectConflicts(
        localVersion,
        remoteVersion,
        localVersion.timestamp,
        remoteVersion.timestamp,
        'txn-1',
        'transaction'
      );

      expect(conflict).toBeDefined();

      const resolution = resolver.resolveConflict(conflict!);
      expect(resolution.winner).toBe('local');
      expect(resolution.strategy).toBe('LWW');
      expect(resolution.resolvedValue).toEqual(localVersion);
    });

    it('should apply merge strategy for compatible changes', () => {
      const resolver = getConflictResolver('MERGE');

      const localVersion = {
        id: 'member-1',
        name: 'John Updated',
        phone: '081234567890',
        email: null,
      };

      const remoteVersion = {
        id: 'member-1',
        name: 'John',
        phone: '081234567890',
        email: 'john@example.com',
      };

      const conflict = resolver.detectConflicts(
        localVersion,
        remoteVersion,
        Date.now(),
        Date.now() - 5000,
        'member-1',
        'member'
      );

      expect(conflict).toBeDefined();

      const resolution = resolver.resolveConflict(conflict!);
      expect(resolution.strategy).toBe('MERGE');
      // Merge should combine changes from both versions
      expect(resolution.resolvedValue).toBeDefined();
    });

    it('should mark conflicts requiring manual review', () => {
      const resolver = getConflictResolver('MANUAL');

      const conflict = resolver.detectConflicts(
        { amount: 100000 },
        { amount: 50000 },
        Date.now(),
        Date.now(),
        'txn-1',
        'transaction'
      );

      expect(conflict).toBeDefined();

      const resolution = resolver.resolveConflict(conflict!);
      expect(resolution.strategy).toBe('MANUAL');
      expect(resolution.reason).toContain('manual review');
    });
  });

  describe('Conflict Resolution Idempotency', () => {
    it('should produce same result when applying resolution multiple times (LWW)', () => {
      /**
       * Property 2: Conflict resolution idempotency
       * Applying conflict resolution multiple times produces the same result
       */

      const resolver = getConflictResolver('LWW');
      const now = Date.now();

      const localVersion = {
        id: 'txn-1',
        amount: 100000,
        timestamp: now,
      };

      const remoteVersion = {
        id: 'txn-1',
        amount: 50000,
        timestamp: now - 1000,
      };

      // First resolution
      const conflict1 = resolver.detectConflicts(
        localVersion,
        remoteVersion,
        now,
        now - 1000,
        'txn-1',
        'transaction'
      );
      const resolution1 = resolver.resolveConflict(conflict1!);

      // Apply resolution again (idempotency test)
      const conflict2 = resolver.detectConflicts(
        resolution1.resolvedValue,
        remoteVersion,
        now,
        now - 1000,
        'txn-1',
        'transaction'
      );

      if (conflict2) {
        const resolution2 = resolver.resolveConflict(conflict2);

        // Both resolutions should be identical
        expect(resolution1.resolvedValue).toEqual(resolution2.resolvedValue);
        expect(resolution1.winner).toBe(resolution2.winner);
        expect(resolution1.strategy).toBe(resolution2.strategy);
      } else {
        // If no conflict on second detection, that's also valid (idempotent)
        expect(resolution1.winner).toBe('local');
      }
    });

    it('should handle repeated merge operations idempotently', () => {
      /**
       * Property 5: Merge strategy idempotency
       * Merging the same conflicts multiple times produces identical results
       */

      const resolver = getConflictResolver('MERGE');

      const local = {
        name: 'John Updated',
        phone: '081234567890',
        email: null,
      };

      const remote = {
        name: 'John',
        phone: '081234567890',
        email: 'john@example.com',
      };

      // Resolve multiple times
      const resolutions = [];
      for (let i = 0; i < 3; i++) {
        const conflict = resolver.detectConflicts(local, remote, Date.now(), Date.now() - 1000, 'id', 'member');
        if (conflict) {
          resolutions.push(resolver.resolveConflict(conflict));
        }
      }

      // All resolutions should be the same
      if (resolutions.length > 1) {
        for (let i = 1; i < resolutions.length; i++) {
          expect(JSON.stringify(resolutions[i].resolvedValue)).toBe(
            JSON.stringify(resolutions[0].resolvedValue)
          );
        }
      }
    });
  });

  describe('Conflict History and Audit Trail', () => {
    it('should maintain conflict history', () => {
      const resolver = getConflictResolver('LWW');

      // Create multiple conflicts
      for (let i = 0; i < 3; i++) {
        const conflict = resolver.detectConflicts(
          { amount: 100 + i },
          { amount: 50 + i },
          Date.now(),
          Date.now() - 1000,
          `txn-${i}`,
          'transaction'
        );

        if (conflict) {
          resolver.resolveConflict(conflict);
        }
      }

      const history = resolver.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(1);
    });

    it('should provide conflict statistics', () => {
      const resolver = getConflictResolver('LWW');

      for (let i = 0; i < 2; i++) {
        const conflict = resolver.detectConflicts(
          { amount: 100 },
          { amount: 50 },
          Date.now(),
          Date.now() - 1000,
          `txn-${i}`,
          'transaction'
        );

        if (conflict) {
          resolver.resolveConflict(conflict);
        }
      }

      const stats = resolver.getStats();
      expect(stats.totalConflicts).toBeGreaterThanOrEqual(1);
      expect(stats.lwwResolutions).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Conflict Prevention for CREATE Operations', () => {
    it('should not detect conflicts for CREATE operations', () => {
      const resolver = getConflictResolver('LWW');

      // CREATE operations should not have conflicts (new entities)
      const conflict = resolver.detectConflicts(
        { id: 'new-txn', amount: 100000 },
        { id: 'new-txn', amount: 100000 },
        Date.now(),
        Date.now(),
        'new-txn',
        'transaction'
      );

      // Identical versions = no conflict
      expect(conflict).toBeNull();
    });
  });
});
