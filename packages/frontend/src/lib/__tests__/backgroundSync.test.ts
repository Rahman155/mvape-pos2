/**
 * Tests for backgroundSync.ts
 * Tests background sync registration, triggering, and event handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BackgroundSyncManager,
  getBackgroundSyncManager,
  initializeBackgroundSync,
} from '../backgroundSync';

describe('BackgroundSyncManager', () => {
  let manager: BackgroundSyncManager;

  beforeEach(() => {
    manager = new BackgroundSyncManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Initialization', () => {
    it('should initialize without errors', async () => {
      // Should not throw
      await expect(manager.initialize()).resolves.not.toThrow();
    });

    it('should detect background sync support', async () => {
      await manager.initialize();

      const isSupported = manager.isBackgroundSyncSupported();
      expect(typeof isSupported).toBe('boolean');
    });

    it('should handle initialization errors gracefully', async () => {
      // Temporarily make service worker unavailable
      const originalNavigator = navigator.serviceWorker;
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
      });

      const manager2 = new BackgroundSyncManager();
      await expect(manager2.initialize()).rejects.toThrow();

      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalNavigator,
        writable: true,
      });
    });
  });

  describe('Sync Registration', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should register sync with tag', async () => {
      const result = await manager.registerSync('test-sync');

      expect(result).toBe(true);
      expect(manager.getRegistration('test-sync')).not.toBeNull();
    });

    it('should register sync with options', async () => {
      const result = await manager.registerSync('test-sync', {
        period: 30000,
        tag: 'test-sync',
      });

      expect(result).toBe(true);

      const registration = manager.getRegistration('test-sync');
      expect(registration?.period).toBe(30000);
    });

    it('should register multiple syncs', async () => {
      const result1 = await manager.registerSync('sync-1');
      const result2 = await manager.registerSync('sync-2');
      const result3 = await manager.registerSync('sync-3');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(result3).toBe(true);

      expect(manager.getAllRegistrations()).toHaveLength(3);
    });

    it('should setup periodic timer for registered sync', async () => {
      const result = await manager.registerSync('periodic-sync', {
        period: 5000,
      });

      expect(result).toBe(true);

      // Wait a bit and verify timer is active
      await new Promise((resolve) => setTimeout(resolve, 100));

      const registration = manager.getRegistration('periodic-sync');
      expect(registration).not.toBeNull();
    });

    it('should handle registration without period', async () => {
      const result = await manager.registerSync('no-period-sync');

      expect(result).toBe(true);
      const registration = manager.getRegistration('no-period-sync');
      expect(registration?.period).toBeDefined();
    });
  });

  describe('Sync Triggering', () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.registerSync('test-sync');
    });

    it('should trigger sync manually', async () => {
      const eventSpy = vi.fn();
      window.addEventListener('bg:sync:test-sync', eventSpy);

      await manager.triggerSync('test-sync');

      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener('bg:sync:test-sync', eventSpy);
    });

    it('should update last sync time', async () => {
      const before = manager.getRegistration('test-sync')?.lastSyncTime;

      await new Promise((resolve) => setTimeout(resolve, 100));
      await manager.triggerSync('test-sync');

      const after = manager.getRegistration('test-sync')?.lastSyncTime;

      expect(after).not.toBeNull();
      if (before !== null) {
        expect(after! > before).toBe(true);
      }
    });

    it('should calculate next sync time', async () => {
      const registration = manager.getRegistration('test-sync');
      const initialNext = registration?.nextSyncTime;

      await manager.triggerSync('test-sync');

      const updatedNext = manager.getRegistration('test-sync')?.nextSyncTime;

      expect(updatedNext).not.toBeNull();
      if (initialNext) {
        expect(updatedNext! > initialNext).toBe(true);
      }
    });

    it('should throw when triggering unregistered sync', async () => {
      await expect(manager.triggerSync('unregistered')).rejects.toThrow();
    });
  });

  describe('Sync Unregistration', () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.registerSync('test-sync');
    });

    it('should unregister sync', async () => {
      expect(manager.getRegistration('test-sync')).not.toBeNull();

      await manager.unregisterSync('test-sync');

      expect(manager.getRegistration('test-sync')).toBeNull();
    });

    it('should clear periodic timer on unregister', async () => {
      await manager.registerSync('timer-sync', { period: 5000 });

      expect(manager.getRegistration('timer-sync')).not.toBeNull();

      await manager.unregisterSync('timer-sync');

      expect(manager.getRegistration('timer-sync')).toBeNull();
    });

    it('should handle unregistering non-existent sync', async () => {
      // Should not throw
      await expect(
        manager.unregisterSync('non-existent')
      ).resolves.not.toThrow();
    });
  });

  describe('Event Listeners', () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.registerSync('test-sync');
    });

    it('should add event listener', async () => {
      const listener = vi.fn();
      manager.addEventListener('test-sync', listener);

      await manager.triggerSync('test-sync');

      // Give time for event to dispatch
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(listener).toHaveBeenCalled();
    });

    it('should remove event listener', async () => {
      const listener = vi.fn();
      manager.addEventListener('test-sync', listener);

      manager.removeEventListener('test-sync', listener);

      await manager.triggerSync('test-sync');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      manager.addEventListener('test-sync', listener1);
      manager.addEventListener('test-sync', listener2);
      manager.addEventListener('test-sync', listener3);

      await manager.triggerSync('test-sync');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      expect(listener3).toHaveBeenCalled();
    });

    it('should emit sync event with correct data', async () => {
      const listener = vi.fn();
      manager.addEventListener('test-sync', listener);

      await manager.triggerSync('test-sync');

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          tag: 'test-sync',
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('Registration Queries', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should get registration by tag', async () => {
      await manager.registerSync('sync-1');
      await manager.registerSync('sync-2');

      const reg = manager.getRegistration('sync-1');

      expect(reg).not.toBeNull();
      expect(reg?.tag).toBe('sync-1');
    });

    it('should return null for non-existent registration', () => {
      const reg = manager.getRegistration('non-existent');

      expect(reg).toBeNull();
    });

    it('should get all registrations', async () => {
      await manager.registerSync('sync-1');
      await manager.registerSync('sync-2');
      await manager.registerSync('sync-3');

      const all = manager.getAllRegistrations();

      expect(all).toHaveLength(3);
      expect(all.map((r) => r.tag)).toContain('sync-1');
      expect(all.map((r) => r.tag)).toContain('sync-2');
      expect(all.map((r) => r.tag)).toContain('sync-3');
    });

    it('should get empty list when no registrations', () => {
      const all = manager.getAllRegistrations();

      expect(all).toHaveLength(0);
    });
  });

  describe('Registration Details', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should have registered flag set to true', async () => {
      await manager.registerSync('test-sync');

      const reg = manager.getRegistration('test-sync');

      expect(reg?.registered).toBe(true);
    });

    it('should have correct period', async () => {
      await manager.registerSync('test-sync', { period: 60000 });

      const reg = manager.getRegistration('test-sync');

      expect(reg?.period).toBe(60000);
    });

    it('should default period to 60000ms', async () => {
      await manager.registerSync('test-sync');

      const reg = manager.getRegistration('test-sync');

      expect(reg?.period).toBe(60000);
    });

    it('should track last sync time', async () => {
      await manager.registerSync('test-sync');

      let reg = manager.getRegistration('test-sync');
      expect(reg?.lastSyncTime).toBeNull();

      await manager.triggerSync('test-sync');

      reg = manager.getRegistration('test-sync');
      expect(reg?.lastSyncTime).not.toBeNull();
      expect(typeof reg?.lastSyncTime).toBe('number');
    });

    it('should calculate next sync time', async () => {
      await manager.registerSync('test-sync', { period: 10000 });

      const reg = manager.getRegistration('test-sync');

      expect(reg?.nextSyncTime).not.toBeNull();
      expect(reg?.nextSyncTime! > Date.now()).toBe(true);
    });
  });

  describe('Background Sync Support Detection', () => {
    it('should detect support status', async () => {
      const manager2 = new BackgroundSyncManager();
      await manager2.initialize();

      const isSupported = manager2.isBackgroundSyncSupported();

      expect(typeof isSupported).toBe('boolean');

      manager2.destroy();
    });

    it('should identify registration method', async () => {
      await manager.registerSync('test-sync');

      const method = manager.getRegistrationMethod('test-sync');

      expect(['native', 'fallback']).toContain(method);
    });

    it('should return none for unregistered sync', () => {
      const method = manager.getRegistrationMethod('unregistered');

      expect(method).toBe('none');
    });
  });

  describe('Window Events', () => {
    beforeEach(async () => {
      await manager.initialize();
      await manager.registerSync('test-sync');
    });

    it('should dispatch custom window events', async () => {
      const eventSpy = vi.fn();
      window.addEventListener('bg:sync:test-sync', eventSpy);

      await manager.triggerSync('test-sync');

      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener('bg:sync:test-sync', eventSpy);
    });

    it('should include event details', async () => {
      const eventSpy = vi.fn();
      window.addEventListener('bg:sync:test-sync', (e: any) => {
        eventSpy(e.detail);
      });

      await manager.triggerSync('test-sync');

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          tag: 'test-sync',
        })
      );

      window.removeEventListener('bg:sync:test-sync', eventSpy);
    });
  });

  describe('Periodic Sync', () => {
    it('should trigger periodic sync after interval', async () => {
      await manager.initialize();

      const eventSpy = vi.fn();
      window.addEventListener('bg:sync:periodic-test', eventSpy);

      await manager.registerSync('periodic-test', { period: 100 });

      // Wait for first interval
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(eventSpy).toHaveBeenCalled();

      window.removeEventListener('bg:sync:periodic-test', eventSpy);

      await manager.unregisterSync('periodic-test');
    });

    it('should continue periodic sync', async () => {
      await manager.initialize();

      const eventSpy = vi.fn();
      window.addEventListener('bg:sync:periodic-test2', eventSpy);

      await manager.registerSync('periodic-test2', { period: 100 });

      // Wait for multiple intervals
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Should have been called multiple times
      expect(eventSpy.mock.calls.length).toBeGreaterThanOrEqual(2);

      window.removeEventListener('bg:sync:periodic-test2', eventSpy);

      await manager.unregisterSync('periodic-test2');
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should destroy manager', async () => {
      await manager.registerSync('sync-1');
      await manager.registerSync('sync-2');

      manager.destroy();

      expect(manager.getAllRegistrations()).toHaveLength(0);
    });

    it('should clear timers on destroy', async () => {
      await manager.registerSync('timer-sync', { period: 5000 });

      manager.destroy();

      expect(manager.getAllRegistrations()).toHaveLength(0);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const manager1 = getBackgroundSyncManager();
      const manager2 = getBackgroundSyncManager();

      expect(manager1).toBe(manager2);
    });

    it('should initialize singleton', async () => {
      const manager = await initializeBackgroundSync();

      expect(manager).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await manager.initialize();
    });

    it('should handle listener errors gracefully', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });

      const normalListener = vi.fn();

      manager.addEventListener('test-sync', errorListener);
      manager.addEventListener('test-sync', normalListener);

      await manager.registerSync('test-sync');

      // Should not throw despite error in first listener
      await expect(manager.triggerSync('test-sync')).resolves.not.toThrow();

      // Second listener should still be called
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(normalListener).toHaveBeenCalled();
    });

    it('should handle fallback sync', async () => {
      const result = await manager.registerSync('fallback-sync');

      expect(result).toBe(true);
    });
  });
});
