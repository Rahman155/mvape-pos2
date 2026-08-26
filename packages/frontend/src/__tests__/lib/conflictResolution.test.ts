/**
 * Property-Based Tests for Conflict Resolution
 * 
 * **Validates: Requirements 4.5, 26.5**
 * 
 * These tests use property-based testing to verify that the conflict resolution
 * system maintains critical invariants across a wide range of inputs.
 * 
 * Property 2: Conflict resolution idempotency
 * - Applying conflict resolution multiple times produces the same result
 * - This is critical for ensuring consistency in offline-first sync
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveLWW,
  resolveMultipleConflicts,
  mergeWithConflictResolution,
  getLatestVersion,
  createVersionedData,
  applyResolution,
  areVersionsIdentical,
  DataConflict,
  VersionedData,
  ConflictResolution,
} from '@/lib/conflictResolution';

/**
 * Utility function to generate random timestamps
 * Ensures timestamps are reasonable (within last year)
 */
function generateRandomTimestamp(now = Date.now()): number {
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  return now - Math.floor(Math.random() * oneYearMs);
}

/**
 * Utility to create test transaction data
 */
interface MockTransaction {
  id: string;
  amount: number;
  paymentMethod: string;
}

function createMockTransaction(id: string, amount: number): MockTransaction {
  return {
    id,
    amount,
    paymentMethod: 'CASH',
  };
}

describe('Conflict Resolution - Idempotency Property Tests', () => {
  /**
   * PROPERTY 1: Applying resolution twice with local winner
   * 
   * Test that when local version wins initially, applying resolution again
   * with the winner always produces the same result.
   */
  describe('Property: LWW Resolution Idempotency - Local Winner', () => {
    it('should return identical result when applying resolution multiple times (local newer)', () => {
      // Arrange: Local version is newer
      const now = Date.now();
      const serverTimestamp = now - 1000;
      const localTimestamp = now;

      const localVersion = createVersionedData(
        'txn-123',
        createMockTransaction('txn-123', 50000),
        localTimestamp
      );
      const serverVersion = createVersionedData(
        'txn-123',
        createMockTransaction('txn-123', 30000),
        serverTimestamp
      );

      // Act: Resolve conflict multiple times
      const resolution1 = resolveLWW(localVersion, serverVersion);
      const resolution2 = resolveLWW(resolution1.winner, serverVersion);
      const resolution3 = resolveLWW(resolution2.winner, serverVersion);

      // Assert: Results must be identical
      expect(resolution1.winner.timestamp).toBe(resolution2.winner.timestamp);
      expect(resolution2.winner.timestamp).toBe(resolution3.winner.timestamp);
      expect(resolution1.winner.id).toBe(resolution2.winner.id);
      expect(resolution2.winner.id).toBe(resolution3.winner.id);
      expect(resolution1.winner.timestamp).toBe(localTimestamp);
    });

    it('should always select local when local timestamp is consistently newer', () => {
      // Arrange: Multiple conflicts with local always newer
      const now = Date.now();
      const conflicts: Array<{
        local: VersionedData;
        server: VersionedData;
      }> = [];

      // Generate 5 conflicts where local is always newer
      for (let i = 0; i < 5; i++) {
        const serverTs = now - (1000 * (i + 2));
        const localTs = now - (1000 * (i + 1));

        conflicts.push({
          local: createVersionedData(`txn-${i}`, { amount: 1000 * (i + 1) }, localTs),
          server: createVersionedData(`txn-${i}`, { amount: 500 * (i + 1) }, serverTs),
        });
      }

      // Act: Resolve each conflict three times
      conflicts.forEach((conflict) => {
        const res1 = resolveLWW(conflict.local, conflict.server);
        const res2 = resolveLWW(res1.winner, conflict.server);
        const res3 = resolveLWW(res2.winner, conflict.server);

        // Assert: Winner never changes
        expect(res1.winner).toEqual(res2.winner);
        expect(res2.winner).toEqual(res3.winner);
        expect(res1.winner.timestamp).toBe(conflict.local.timestamp);
      });
    });
  });

  /**
   * PROPERTY 2: Applying resolution twice with server winner
   * 
   * Test that when server version wins initially, applying resolution again
   * with the winner always produces the same result.
   */
  describe('Property: LWW Resolution Idempotency - Server Winner', () => {
    it('should return identical result when applying resolution multiple times (server newer)', () => {
      // Arrange: Server version is newer
      const now = Date.now();
      const localTimestamp = now - 1000;
      const serverTimestamp = now;

      const localVersion = createVersionedData(
        'txn-456',
        createMockTransaction('txn-456', 30000),
        localTimestamp
      );
      const serverVersion = createVersionedData(
        'txn-456',
        createMockTransaction('txn-456', 50000),
        serverTimestamp
      );

      // Act: Resolve conflict multiple times
      const resolution1 = resolveLWW(localVersion, serverVersion);
      const resolution2 = resolveLWW(resolution1.winner, localVersion);
      const resolution3 = resolveLWW(resolution2.winner, localVersion);

      // Assert: Results must be identical
      expect(resolution1.winner.timestamp).toBe(resolution2.winner.timestamp);
      expect(resolution2.winner.timestamp).toBe(resolution3.winner.timestamp);
      expect(resolution1.winner.id).toBe(resolution2.winner.id);
      expect(resolution2.winner.id).toBe(resolution3.winner.id);
      expect(resolution1.winner.timestamp).toBe(serverTimestamp);
    });

    it('should always select server when server timestamp is consistently newer', () => {
      // Arrange: Multiple conflicts with server always newer
      const now = Date.now();
      const conflicts: Array<{
        local: VersionedData;
        server: VersionedData;
      }> = [];

      // Generate 5 conflicts where server is always newer
      for (let i = 0; i < 5; i++) {
        const localTs = now - (1000 * (i + 2));
        const serverTs = now - (1000 * (i + 1));

        conflicts.push({
          local: createVersionedData(`member-${i}`, { balance: 100 * i }, localTs),
          server: createVersionedData(`member-${i}`, { balance: 200 * i }, serverTs),
        });
      }

      // Act: Resolve each conflict three times
      conflicts.forEach((conflict) => {
        const res1 = resolveLWW(conflict.local, conflict.server);
        const res2 = resolveLWW(res1.winner, conflict.local);
        const res3 = resolveLWW(res2.winner, conflict.local);

        // Assert: Winner never changes
        expect(res1.winner).toEqual(res2.winner);
        expect(res2.winner).toEqual(res3.winner);
        expect(res1.winner.timestamp).toBe(conflict.server.timestamp);
      });
    });
  });

  /**
   * PROPERTY 3: Equal timestamps always select server
   * 
   * Test that when timestamps are equal, server always wins,
   * and this behavior is consistent across multiple calls.
   */
  describe('Property: LWW Resolution Idempotency - Equal Timestamps', () => {
    it('should consistently select server when timestamps are equal', () => {
      // Arrange: Both versions have same timestamp
      const timestamp = Date.now();

      const localVersion = createVersionedData(
        'inventory-789',
        { quantity: 10 },
        timestamp
      );
      const serverVersion = createVersionedData(
        'inventory-789',
        { quantity: 15 },
        timestamp
      );

      // Act: Resolve conflict multiple times
      const resolution1 = resolveLWW(localVersion, serverVersion);
      const resolution2 = resolveLWW(resolution1.winner, localVersion);
      const resolution3 = resolveLWW(resolution2.winner, localVersion);

      // Assert: Server always wins
      expect(resolution1.winner).toBe(serverVersion);
      expect(resolution2.winner).toBe(serverVersion);
      expect(resolution3.winner).toBe(serverVersion);
      expect(resolution1.reason).toContain('server version takes precedence');
    });

    it('should maintain consistency with multiple equal-timestamp conflicts', () => {
      // Arrange: Create multiple conflicts with equal timestamps
      const timestamp = Date.now();
      const pairs: Array<[VersionedData, VersionedData]> = [];

      for (let i = 0; i < 10; i++) {
        const local = createVersionedData(`entity-${i}`, { value: i }, timestamp);
        const server = createVersionedData(`entity-${i}`, { value: i * 2 }, timestamp);
        pairs.push([local, server]);
      }

      // Act & Assert: For each pair, applying resolution multiple times always yields server
      pairs.forEach(([local, server]) => {
        for (let attempt = 0; attempt < 3; attempt++) {
          const resolution = resolveLWW(local, server);
          expect(resolution.winner.id).toBe(server.id);
          expect(resolution.winner.data).toEqual(server.data);
        }
      });
    });
  });

  /**
   * PROPERTY 4: Multiple conflicts merge idempotently
   * 
   * Test that merging conflicts multiple times produces identical results.
   */
  describe('Property: Merge With Conflict Resolution Idempotency', () => {
    it('should produce identical merge results when called multiple times', () => {
      // Arrange: Create arrays of local and server versions with conflicts
      const now = Date.now();

      const localItems: VersionedData[] = [
        createVersionedData('item-1', { value: 'local1' }, now - 2000),
        createVersionedData('item-2', { value: 'local2' }, now),
        createVersionedData('item-3', { value: 'local3' }, now - 1000),
      ];

      const serverItems: VersionedData[] = [
        createVersionedData('item-1', { value: 'server1' }, now - 1000), // Server wins
        createVersionedData('item-2', { value: 'server2' }, now - 2000), // Local wins
        createVersionedData('item-4', { value: 'server4' }, now), // Server only
      ];

      // Act: Merge multiple times
      const merge1 = mergeWithConflictResolution(localItems, serverItems);
      const merge2 = mergeWithConflictResolution(localItems, serverItems);
      const merge3 = mergeWithConflictResolution(localItems, serverItems);

      // Assert: All merges produce identical results
      expect(merge1.size).toBe(merge2.size);
      expect(merge2.size).toBe(merge3.size);

      merge1.forEach((value, key) => {
        expect(merge2.get(key)).toEqual(value);
        expect(merge3.get(key)).toEqual(value);
      });

      // Verify specific winners
      expect(merge1.get('item-1')?.timestamp).toBe(now - 1000); // Server
      expect(merge1.get('item-2')?.timestamp).toBe(now); // Local
      expect(merge1.get('item-3')?.timestamp).toBe(now - 1000); // Local (no conflict)
      expect(merge1.get('item-4')?.timestamp).toBe(now); // Server only
    });

    it('should handle large numbers of conflicts idempotently', () => {
      // Arrange: Generate 100 conflicts with various timestamps
      const now = Date.now();
      const localItems: VersionedData[] = [];
      const serverItems: VersionedData[] = [];

      for (let i = 0; i < 100; i++) {
        const localTs = now - Math.random() * 100000;
        const serverTs = now - Math.random() * 100000;

        localItems.push(
          createVersionedData(`item-${i}`, { index: i, source: 'local' }, localTs)
        );
        serverItems.push(
          createVersionedData(`item-${i}`, { index: i, source: 'server' }, serverTs)
        );
      }

      // Act: Merge multiple times
      const merges = [
        mergeWithConflictResolution(localItems, serverItems),
        mergeWithConflictResolution(localItems, serverItems),
        mergeWithConflictResolution(localItems, serverItems),
      ];

      // Assert: All merges are identical
      const [merge1, merge2, merge3] = merges;

      Array.from(merge1.entries()).forEach(([key, value1]) => {
        const value2 = merge2.get(key);
        const value3 = merge3.get(key);

        expect(value2).toEqual(value1);
        expect(value3).toEqual(value1);
        expect(value1.timestamp).toBe(value2?.timestamp);
        expect(value2?.timestamp).toBe(value3?.timestamp);
      });
    });
  });

  /**
   * PROPERTY 5: Get Latest Version idempotency
   * 
   * Test that getLatestVersion always returns the same result when called multiple times.
   */
  describe('Property: Get Latest Version Idempotency', () => {
    it('should return the same version consistently', () => {
      // Arrange
      const now = Date.now();
      const version1 = createVersionedData('doc-1', { content: 'v1' }, now - 5000);
      const version2 = createVersionedData('doc-1', { content: 'v2' }, now);

      // Act: Get latest multiple times
      const latest1 = getLatestVersion(version1, version2);
      const latest2 = getLatestVersion(version1, version2);
      const latest3 = getLatestVersion(version1, version2);

      // Assert
      expect(latest1).toBe(latest2);
      expect(latest2).toBe(latest3);
      expect(latest1.timestamp).toBe(now);
    });

    it('should handle edge case with equal timestamps consistently', () => {
      // Arrange: Both versions have same timestamp
      const timestamp = Date.now();
      const version1 = createVersionedData('doc-2', { content: 'content1' }, timestamp);
      const version2 = createVersionedData('doc-2', { content: 'content2' }, timestamp);

      // Act: Get latest multiple times
      const latest1 = getLatestVersion(version1, version2);
      const latest2 = getLatestVersion(version1, version2);
      const latest3 = getLatestVersion(version1, version2);

      // Assert: Should consistently return the same one (local when equal)
      expect(latest1).toBe(latest2);
      expect(latest2).toBe(latest3);
      expect(latest1.timestamp).toBe(timestamp);
    });
  });

  /**
   * PROPERTY 6: Apply resolution idempotency
   * 
   * Test that applying a resolution multiple times produces identical results.
   */
  describe('Property: Apply Resolution Idempotency', () => {
    it('should always return the same winner when applied multiple times', () => {
      // Arrange
      const now = Date.now();
      const local = createVersionedData('order-1', { total: 100000 }, now);
      const server = createVersionedData('order-1', { total: 150000 }, now - 5000);

      const resolution = resolveLWW(local, server);

      // Act: Apply resolution multiple times
      const applied1 = applyResolution(resolution);
      const applied2 = applyResolution(resolution);
      const applied3 = applyResolution(resolution);

      // Assert: All applications return the same winner
      expect(applied1).toEqual(applied2);
      expect(applied2).toEqual(applied3);
      expect(applied1.timestamp).toBe(local.timestamp);
    });
  });

  /**
   * PROPERTY 7: Complex conflict scenarios
   * 
   * Test realistic multi-step conflict resolution scenarios
   * where changes cascade and idempotency must hold.
   */
  describe('Property: Complex Conflict Resolution Scenarios', () => {
    it('should maintain idempotency through multi-step conflict resolution', () => {
      // Arrange: Simulate a realistic scenario with 3 conflicting transactions
      const now = Date.now();

      const scenario1 = {
        local: createVersionedData('txn-A', { amount: 100000, status: 'PENDING' }, now),
        server: createVersionedData('txn-A', { amount: 100000, status: 'COMPLETED' }, now - 1000),
      };

      const scenario2 = {
        local: createVersionedData('txn-B', { amount: 50000, status: 'LOCAL' }, now - 500),
        server: createVersionedData('txn-B', { amount: 50000, status: 'SERVER' }, now - 1500),
      };

      const scenario3 = {
        local: createVersionedData('txn-C', { amount: 75000 }, now - 2000),
        server: createVersionedData('txn-C', { amount: 75000 }, now - 3000),
      };

      // Act: Resolve conflicts in sequence
      const res1A = resolveLWW(scenario1.local, scenario1.server);
      const res1B = resolveLWW(scenario2.local, scenario2.server);
      const res1C = resolveLWW(scenario3.local, scenario3.server);

      // Resolve again with winners
      const res2A = resolveLWW(res1A.winner, scenario1.server);
      const res2B = resolveLWW(res1B.winner, scenario2.server);
      const res2C = resolveLWW(res1C.winner, scenario3.server);

      // Assert: Winners must be identical
      expect(res1A.winner.timestamp).toBe(res2A.winner.timestamp);
      expect(res1B.winner.timestamp).toBe(res2B.winner.timestamp);
      expect(res1C.winner.timestamp).toBe(res2C.winner.timestamp);

      expect(res1A.winner.id).toBe(res2A.winner.id);
      expect(res1B.winner.id).toBe(res2B.winner.id);
      expect(res1C.winner.id).toBe(res2C.winner.id);
    });

    it('should produce consistent results when re-resolving with alternating versions', () => {
      // Arrange
      const now = Date.now();
      const local = createVersionedData('record-1', { data: 'LOCAL' }, now);
      const server = createVersionedData('record-1', { data: 'SERVER' }, now - 1000);

      // Act: Resolve and re-resolve alternately
      let current = local;
      const winners: string[] = [];

      for (let i = 0; i < 6; i++) {
        const resolution = resolveLWW(current, server);
        winners.push(resolution.winner.data as string);
        current = resolution.winner;
      }

      // Assert: Should alternate consistently or remain stable
      // Since local has newer timestamp, it should always win
      expect(winners.every((w) => w === 'LOCAL')).toBe(true);
    });
  });

  /**
   * PROPERTY 8: Version identity tracking
   * 
   * Test that identical versions are correctly identified across calls.
   */
  describe('Property: Version Identity Tracking Idempotency', () => {
    it('should consistently identify identical versions', () => {
      // Arrange
      const version1 = createVersionedData('item-1', { value: 100 }, Date.now());
      const version2 = createVersionedData('item-1', { value: 100 }, version1.timestamp);
      const version3 = createVersionedData('item-1', { value: 200 }, version1.timestamp);

      // Act: Check identity multiple times
      const identical1 = areVersionsIdentical(version1, version2);
      const identical2 = areVersionsIdentical(version1, version2);

      const different1 = areVersionsIdentical(version1, version3);
      const different2 = areVersionsIdentical(version1, version3);

      // Assert: Results must be consistent
      expect(identical1).toBe(identical2);
      expect(different1).toBe(different2);
      expect(identical1).toBe(true);
      expect(different1).toBe(false);
    });
  });
});
