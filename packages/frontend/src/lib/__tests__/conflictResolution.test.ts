/**
 * Tests for conflictResolution.ts
 * Tests conflict detection, resolution strategies, and merging logic
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ConflictResolver,
  ConflictItem,
  getConflictResolver,
  ConflictResolutionStrategy,
} from '../conflictResolution';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver('LWW', 'auto');
  });

  afterEach(() => {
    resolver.clearHistory();
  });

  describe('Conflict Detection', () => {
    it('should detect no conflict when versions are identical', () => {
      const localVersion = { name: 'John', age: 30 };
      const remoteVersion = { name: 'John', age: 30 };
      const timestamp = Date.now();

      const conflict = resolver.detectConflicts(
        localVersion,
        remoteVersion,
        timestamp,
        timestamp,
        'item-1',
        'member'
      );

      expect(conflict).toBeNull();
    });

    it('should detect conflict when versions differ with same timestamp', () => {
      const localVersion = { name: 'John', age: 30 };
      const remoteVersion = { name: 'John', age: 31 };
      const timestamp = Date.now();

      const conflict = resolver.detectConflicts(
        localVersion,
        remoteVersion,
        timestamp,
        timestamp,
        'item-1',
        'member'
      );

      expect(conflict).not.toBeNull();
      expect(conflict?.localVersion).toEqual(localVersion);
      expect(conflict?.remoteVersion).toEqual(remoteVersion);
    });

    it('should detect conflict when versions differ with different timestamps', () => {
      const localVersion = { name: 'John', age: 30 };
      const remoteVersion = { name: 'John', age: 31 };
      const localTimestamp = Date.now();
      const remoteTimestamp = localTimestamp + 1000;

      const conflict = resolver.detectConflicts(
        localVersion,
        remoteVersion,
        localTimestamp,
        remoteTimestamp,
        'item-1',
        'member'
      );

      expect(conflict).not.toBeNull();
      expect(conflict?.localTimestamp).toBe(localTimestamp);
      expect(conflict?.remoteTimestamp).toBe(remoteTimestamp);
    });

    it('should detect no conflict for equal primitive values', () => {
      const conflict = resolver.detectConflicts(
        42,
        42,
        Date.now(),
        Date.now(),
        'item-1',
        'value'
      );

      expect(conflict).toBeNull();
    });

    it('should detect conflict for different primitive values', () => {
      const timestamp = Date.now();
      const conflict = resolver.detectConflicts(
        42,
        43,
        timestamp,
        timestamp,
        'item-1',
        'value'
      );

      expect(conflict).not.toBeNull();
    });

    it('should detect conflict for null vs value', () => {
      const timestamp = Date.now();
      const conflict = resolver.detectConflicts(
        null,
        { value: 'test' },
        timestamp,
        timestamp,
        'item-1',
        'data'
      );

      expect(conflict).not.toBeNull();
    });

    it('should handle arrays in conflict detection', () => {
      const timestamp = Date.now();
      const conflict = resolver.detectConflicts(
        [1, 2, 3],
        [1, 2, 3],
        timestamp,
        timestamp,
        'item-1',
        'list'
      );

      expect(conflict).toBeNull();
    });
  });

  describe('LWW Resolution Strategy', () => {
    it('should resolve to local version when local is newer', () => {
      const localTimestamp = Date.now();
      const remoteTimestamp = localTimestamp - 1000;

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John', age: 30 },
        remoteVersion: { name: 'John', age: 29 },
        localTimestamp,
        remoteTimestamp,
      };

      const resolution = resolver.resolveConflict(conflict);

      expect(resolution.winner).toBe('local');
      expect(resolution.resolvedValue).toEqual(conflict.localVersion);
      expect(resolution.strategy).toBe('LWW');
    });

    it('should resolve to remote version when remote is newer', () => {
      const localTimestamp = Date.now();
      const remoteTimestamp = localTimestamp + 1000;

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John', age: 30 },
        remoteVersion: { name: 'John', age: 31 },
        localTimestamp,
        remoteTimestamp,
      };

      const resolution = resolver.resolveConflict(conflict);

      expect(resolution.winner).toBe('remote');
      expect(resolution.resolvedValue).toEqual(conflict.remoteVersion);
    });

    it('should resolve to local when timestamps are equal', () => {
      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John', age: 30 },
        remoteVersion: { name: 'Jane', age: 31 },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp,
      };

      const resolution = resolver.resolveConflict(conflict);

      expect(resolution.winner).toBe('local');
    });
  });

  describe('Merge Resolution Strategy', () => {
    beforeEach(() => {
      resolver = new ConflictResolver('MERGE', 'auto');
    });

    it('should merge object properties', () => {
      const localTimestamp = Date.now();
      const remoteTimestamp = localTimestamp - 1000;

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John', age: 30, email: 'john@test.com' },
        remoteVersion: { name: 'John', phone: '555-1234' },
        localTimestamp,
        remoteTimestamp,
      };

      const resolution = resolver.resolveConflict(conflict);

      expect(resolution.resolvedValue).toEqual(
        expect.objectContaining({
          name: 'John',
          age: 30,
          email: 'john@test.com',
          phone: '555-1234',
        })
      );
    });

    it('should prioritize local values when merging objects', () => {
      const localTimestamp = Date.now();
      const remoteTimestamp = localTimestamp - 1000;

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John', age: 31 },
        remoteVersion: { name: 'Jane', age: 30 },
        localTimestamp,
        remoteTimestamp,
      };

      const resolution = resolver.resolveConflict(conflict);

      const merged = resolution.resolvedValue as Record<string, unknown>;
      expect(merged.name).toBe('John');
      expect(merged.age).toBe(31);
    });

    it('should fall back to priority for non-objects', () => {
      resolver = new ConflictResolver('MERGE', 'local');

      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'value',
        localVersion: 'local-value',
        remoteVersion: 'remote-value',
        localTimestamp: timestamp,
        remoteTimestamp: timestamp,
      };

      const resolution = resolver.resolveConflict(conflict);

      expect(resolution.winner).toBe('local');
    });
  });

  describe('Manual Resolution Strategy', () => {
    beforeEach(() => {
      resolver = new ConflictResolver('MANUAL', 'auto');
    });

    it('should mark conflicts for manual review', () => {
      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John' },
        remoteVersion: { name: 'Jane' },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp,
      };

      const resolution = resolver.resolveConflict(conflict);

      expect(resolution.strategy).toBe('MANUAL');
      expect(resolution.winner).toBe('local');
      expect(resolution.reason).toContain('manual review');
    });
  });

  describe('Resolve Multiple Conflicts', () => {
    it('should resolve multiple conflicts', async () => {
      const timestamp = Date.now();

      const conflicts: ConflictItem[] = [
        {
          id: 'item-1',
          entityType: 'member',
          localVersion: { name: 'John' },
          remoteVersion: { name: 'Jane' },
          localTimestamp: timestamp,
          remoteTimestamp: timestamp - 1000,
        },
        {
          id: 'item-2',
          entityType: 'product',
          localVersion: { sku: '123', price: 100 },
          remoteVersion: { sku: '123', price: 95 },
          localTimestamp: timestamp,
          remoteTimestamp: timestamp + 1000,
        },
      ];

      const result = await resolver.resolveMultiple(conflicts);

      expect(result.conflicts).toHaveLength(2);
      expect(result.resolutions).toHaveLength(2);
      expect(result.requiresManualReview).toBe(false);
    });

    it('should mark multiple manual resolutions', async () => {
      resolver = new ConflictResolver('MANUAL', 'auto');

      const timestamp = Date.now();

      const conflicts: ConflictItem[] = [
        {
          id: 'item-1',
          entityType: 'member',
          localVersion: { name: 'John' },
          remoteVersion: { name: 'Jane' },
          localTimestamp: timestamp,
          remoteTimestamp: timestamp,
        },
        {
          id: 'item-2',
          entityType: 'product',
          localVersion: { price: 100 },
          remoteVersion: { price: 95 },
          localTimestamp: timestamp,
          remoteTimestamp: timestamp,
        },
      ];

      const result = await resolver.resolveMultiple(conflicts);

      expect(result.requiresManualReview).toBe(true);
    });
  });

  describe('Apply Resolution', () => {
    it('should apply resolution to update value', () => {
      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John' },
        remoteVersion: { name: 'Jane' },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp - 1000,
      };

      const resolution = resolver.resolveConflict(conflict);
      const applied = resolver.applyResolution(conflict.localVersion, resolution);

      expect(applied).toEqual(resolution.resolvedValue);
    });

    it('should apply multiple resolutions', () => {
      const timestamp = Date.now();

      const items = [
        {
          original: { name: 'John' },
          resolution: {
            id: 'item-1',
            strategy: 'LWW' as const,
            resolvedValue: { name: 'Jane' },
            winner: 'remote' as const,
            timestamp,
            reason: 'Newer version',
          },
        },
        {
          original: { price: 100 },
          resolution: {
            id: 'item-2',
            strategy: 'LWW' as const,
            resolvedValue: { price: 95 },
            winner: 'remote' as const,
            timestamp,
            reason: 'Newer version',
          },
        },
      ];

      const result = resolver.applyMultipleResolutions(items);

      expect(result.size).toBe(2);
      expect(result.get('item-1')).toEqual({ name: 'Jane' });
      expect(result.get('item-2')).toEqual({ price: 95 });
    });
  });

  describe('History Tracking', () => {
    it('should record conflict history', async () => {
      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John' },
        remoteVersion: { name: 'Jane' },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp - 1000,
      };

      const resolution = resolver.resolveConflict(conflict);

      const history = resolver.getHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    it('should get history for specific entity', async () => {
      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John' },
        remoteVersion: { name: 'Jane' },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp - 1000,
      };

      resolver.resolveConflict(conflict);

      const history = resolver.getHistoryForEntity('item-1');

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('item-1');
    });

    it('should clear history', () => {
      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John' },
        remoteVersion: { name: 'Jane' },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp - 1000,
      };

      resolver.resolveConflict(conflict);
      expect(resolver.getHistory().length).toBeGreaterThan(0);

      resolver.clearHistory();
      expect(resolver.getHistory().length).toBe(0);
    });

    it('should maintain history size limit', () => {
      const timestamp = Date.now();

      // Add more than max history size (1000)
      for (let i = 0; i < 1100; i++) {
        const conflict: ConflictItem = {
          id: `item-${i}`,
          entityType: 'member',
          localVersion: { index: i },
          remoteVersion: { index: i + 1 },
          localTimestamp: timestamp,
          remoteTimestamp: timestamp - 1000,
        };

        resolver.resolveConflict(conflict);
      }

      const history = resolver.getHistory();
      expect(history.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Statistics', () => {
    it('should calculate resolution statistics', async () => {
      resolver = new ConflictResolver('LWW', 'auto');

      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John' },
        remoteVersion: { name: 'Jane' },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp - 1000,
      };

      resolver.resolveConflict(conflict);

      const stats = resolver.getStats();

      expect(stats.totalConflicts).toBe(1);
      expect(stats.lwwResolutions).toBe(1);
      expect(stats.mergeResolutions).toBe(0);
      expect(stats.manualResolutions).toBe(0);
    });

    it('should track different resolution types', async () => {
      const timestamp = Date.now();

      // LWW resolution
      resolver = new ConflictResolver('LWW', 'auto');
      let conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John' },
        remoteVersion: { name: 'Jane' },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp - 1000,
      };
      resolver.resolveConflict(conflict);

      // Manual resolution
      resolver = new ConflictResolver('MANUAL', 'auto');
      conflict = {
        id: 'item-2',
        entityType: 'product',
        localVersion: { price: 100 },
        remoteVersion: { price: 95 },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp,
      };
      resolver.resolveConflict(conflict);

      const stats = resolver.getStats();

      expect(stats.totalConflicts).toBe(2);
    });
  });

  describe('Strategy Management', () => {
    it('should change strategy', () => {
      resolver.setStrategy('MERGE');
      expect(resolver.getStrategy()).toBe('MERGE');

      resolver.setStrategy('MANUAL');
      expect(resolver.getStrategy()).toBe('MANUAL');
    });

    it('should change priority', () => {
      resolver.setPriority('local');
      expect(resolver.getPriority()).toBe('local');

      resolver.setPriority('remote');
      expect(resolver.getPriority()).toBe('remote');
    });
  });

  describe('Deep Equality', () => {
    it('should detect deep equality for nested objects', () => {
      const obj1 = {
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'Anytown',
        },
      };

      const obj2 = {
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'Anytown',
        },
      };

      const conflict = resolver.detectConflicts(
        obj1,
        obj2,
        Date.now(),
        Date.now(),
        'item-1',
        'member'
      );

      expect(conflict).toBeNull();
    });

    it('should detect differences in nested objects', () => {
      const obj1 = {
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'Anytown',
        },
      };

      const obj2 = {
        name: 'John',
        address: {
          street: '456 Oak Ave',
          city: 'Anytown',
        },
      };

      const conflict = resolver.detectConflicts(
        obj1,
        obj2,
        Date.now(),
        Date.now(),
        'item-1',
        'member'
      );

      expect(conflict).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: null,
        remoteVersion: { name: 'John' },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp - 1000,
      };

      const resolution = resolver.resolveConflict(conflict);
      expect(resolution).toBeDefined();
    });

    it('should handle undefined values', () => {
      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: undefined,
        remoteVersion: { name: 'John' },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp - 1000,
      };

      const resolution = resolver.resolveConflict(conflict);
      expect(resolution).toBeDefined();
    });

    it('should handle empty objects', () => {
      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: {},
        remoteVersion: { name: 'John' },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp - 1000,
      };

      const resolution = resolver.resolveConflict(conflict);
      expect(resolution).toBeDefined();
    });

    it('should handle boolean values', () => {
      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'setting',
        localVersion: true,
        remoteVersion: false,
        localTimestamp: timestamp,
        remoteTimestamp: timestamp - 1000,
      };

      const resolution = resolver.resolveConflict(conflict);
      expect(resolution.winner).toBe('local');
    });

    it('should idempotently apply resolutions', () => {
      const timestamp = Date.now();

      const conflict: ConflictItem = {
        id: 'item-1',
        entityType: 'member',
        localVersion: { name: 'John' },
        remoteVersion: { name: 'Jane' },
        localTimestamp: timestamp,
        remoteTimestamp: timestamp - 1000,
      };

      const resolution1 = resolver.resolveConflict(conflict);
      const applied1 = resolver.applyResolution(conflict.localVersion, resolution1);

      const applied2 = resolver.applyResolution(applied1, resolution1);

      expect(applied1).toEqual(applied2);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const resolver1 = getConflictResolver();
      const resolver2 = getConflictResolver();

      expect(resolver1).toBe(resolver2);
    });
  });
});
