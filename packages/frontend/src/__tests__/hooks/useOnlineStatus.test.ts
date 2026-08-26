/**
 * Tests for useOnlineStatus hook
 * Tests online/offline detection, sync status, and state management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OnlineStatus } from '@/types';
import * as serviceWorker from '@/lib/serviceWorker';

// Mock the service worker module
jest.mock('@/lib/serviceWorker', () => ({
  isOffline: jest.fn(),
  listenToOnlineStatusChanges: jest.fn(),
  removeOnlineStatusListeners: jest.fn(),
  triggerSyncQueue: jest.fn(),
}));

describe('useOnlineStatus', () => {
  let mockIsOffline: jest.Mock;
  let mockListenToOnlineStatusChanges: jest.Mock;
  let mockRemoveOnlineStatusListeners: jest.Mock;
  let mockTriggerSyncQueue: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockIsOffline = serviceWorker.isOffline as jest.Mock;
    mockListenToOnlineStatusChanges = serviceWorker.listenToOnlineStatusChanges as jest.Mock;
    mockRemoveOnlineStatusListeners = serviceWorker.removeOnlineStatusListeners as jest.Mock;
    mockTriggerSyncQueue = serviceWorker.triggerSyncQueue as jest.Mock;

    mockIsOffline.mockReturnValue(false);
    mockListenToOnlineStatusChanges.mockImplementation(() => {});
    mockRemoveOnlineStatusListeners.mockImplementation(() => {});
    mockTriggerSyncQueue.mockResolvedValue(undefined);

    // Clear window events
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with online status when navigator is online', () => {
      mockIsOffline.mockReturnValue(false);

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.status).toBe(OnlineStatus.Online);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.pendingChanges).toBe(0);
      expect(result.current.lastError).toBeNull();
    });

    it('should initialize with offline status when navigator is offline', () => {
      mockIsOffline.mockReturnValue(true);

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.status).toBe(OnlineStatus.Offline);
      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });

    it('should setup online/offline event listeners', () => {
      renderHook(() => useOnlineStatus());

      expect(mockListenToOnlineStatusChanges).toHaveBeenCalled();
      const [onOnline, onOffline] = mockListenToOnlineStatusChanges.mock.calls[0];
      expect(typeof onOnline).toBe('function');
      expect(typeof onOffline).toBe('function');
    });
  });

  describe('Online Status Changes', () => {
    it('should update status to online when online event fires', () => {
      mockIsOffline.mockReturnValue(true);
      let onlineCallback: (() => void) | null = null;

      mockListenToOnlineStatusChanges.mockImplementation((onOnline) => {
        onlineCallback = onOnline;
      });

      const { result } = renderHook(() => useOnlineStatus());
      
      expect(result.current.status).toBe(OnlineStatus.Offline);

      act(() => {
        onlineCallback?.();
      });

      expect(result.current.status).toBe(OnlineStatus.Online);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });

    it('should update status to offline when offline event fires', () => {
      mockIsOffline.mockReturnValue(false);
      let offlineCallback: (() => void) | null = null;

      mockListenToOnlineStatusChanges.mockImplementation((onOnline, onOffline) => {
        offlineCallback = onOffline;
      });

      const { result } = renderHook(() => useOnlineStatus());
      
      expect(result.current.status).toBe(OnlineStatus.Online);

      act(() => {
        offlineCallback?.();
      });

      expect(result.current.status).toBe(OnlineStatus.Offline);
      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });

    it('should trigger sync queue when coming back online', async () => {
      mockIsOffline.mockReturnValue(true);
      let onlineCallback: (() => void) | null = null;

      mockListenToOnlineStatusChanges.mockImplementation((onOnline) => {
        onlineCallback = onOnline;
      });

      renderHook(() => useOnlineStatus());

      act(() => {
        onlineCallback?.();
      });

      await waitFor(() => {
        expect(mockTriggerSyncQueue).toHaveBeenCalled();
      });
    });

    it('should clear last error when coming back online', async () => {
      mockIsOffline.mockReturnValue(false);
      let onlineCallback: (() => void) | null = null;

      mockListenToOnlineStatusChanges.mockImplementation((onOnline) => {
        onlineCallback = onOnline;
      });

      const { result } = renderHook(() => useOnlineStatus());

      // Simulate an error
      act(() => {
        const event = new CustomEvent('sync:end', {
          detail: { success: false, error: 'Sync failed' }
        });
        window.dispatchEvent(event);
      });

      expect(result.current.lastError).not.toBeNull();

      // Now come back online
      act(() => {
        onlineCallback?.();
      });

      await waitFor(() => {
        expect(result.current.lastError).toBeNull();
      });
    });
  });

  describe('Sync Status', () => {
    it('should handle sync:start event', () => {
      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        const event = new CustomEvent('sync:start');
        window.dispatchEvent(event);
      });

      expect(result.current.isSyncing).toBe(true);
      expect(result.current.status).toBe(OnlineStatus.Syncing);
    });

    it('should handle sync:end event with success', async () => {
      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        const event = new CustomEvent('sync:start');
        window.dispatchEvent(event);
      });

      expect(result.current.isSyncing).toBe(true);

      act(() => {
        const event = new CustomEvent('sync:end', {
          detail: { success: true, pendingChanges: 0 }
        });
        window.dispatchEvent(event);
      });

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.status).toBe(OnlineStatus.Online);
      expect(result.current.lastError).toBeNull();
      expect(result.current.pendingChanges).toBe(0);
    });

    it('should handle sync:end event with failure', () => {
      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        const event = new CustomEvent('sync:end', {
          detail: { success: false, error: 'Network timeout' }
        });
        window.dispatchEvent(event);
      });

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.status).toBe(OnlineStatus.SyncError);
      expect(result.current.lastError).toBe('Network timeout');
    });

    it('should track pending changes from sync:progress event', () => {
      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        const event = new CustomEvent('sync:progress', {
          detail: { pendingChanges: 5 }
        });
        window.dispatchEvent(event);
      });

      expect(result.current.pendingChanges).toBe(5);
    });

    it('should update last sync time on successful sync', () => {
      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.lastSyncTime).toBeNull();

      act(() => {
        const event = new CustomEvent('sync:end', {
          detail: { success: true, pendingChanges: 0 }
        });
        window.dispatchEvent(event);
      });

      expect(result.current.lastSyncTime).not.toBeNull();
      expect(result.current.lastSyncTime).toBeInstanceOf(Date);
    });
  });

  describe('Trigger Sync Method', () => {
    it('should call triggerSyncQueue when triggerSync is called', async () => {
      const { result } = renderHook(() => useOnlineStatus());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockTriggerSyncQueue).toHaveBeenCalled();
    });

    it('should set syncing state when triggerSync is called', async () => {
      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isSyncing).toBe(false);

      await act(async () => {
        result.current.triggerSync();
      });

      expect(result.current.isSyncing).toBe(true);
      expect(result.current.status).toBe(OnlineStatus.Syncing);
    });

    it('should handle sync errors gracefully', async () => {
      mockTriggerSyncQueue.mockRejectedValue(new Error('Sync failed'));

      const { result } = renderHook(() => useOnlineStatus());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.status).toBe(OnlineStatus.SyncError);
      expect(result.current.lastError).toBe('Sync failed');
    });
  });

  describe('Clear Error Method', () => {
    it('should clear last error', () => {
      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        const event = new CustomEvent('sync:end', {
          detail: { success: false, error: 'Test error' }
        });
        window.dispatchEvent(event);
      });

      expect(result.current.lastError).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.lastError).toBeNull();
    });

    it('should restore online status when clearing error', () => {
      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        const event = new CustomEvent('sync:end', {
          detail: { success: false, error: 'Test error' }
        });
        window.dispatchEvent(event);
      });

      expect(result.current.status).toBe(OnlineStatus.SyncError);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.status).toBe(OnlineStatus.Online);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useOnlineStatus());

      unmount();

      expect(mockRemoveOnlineStatusListeners).toHaveBeenCalled();
    });

    it('should remove custom event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = renderHook(() => useOnlineStatus());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('sync:start', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('sync:end', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('sync:progress', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Server-Side Rendering Safety', () => {
    it('should handle missing window object gracefully', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      try {
        const { result } = renderHook(() => useOnlineStatus());
        
        // Should return default state
        expect(result.current.status).toBe(OnlineStatus.Online);
        expect(result.current.isOnline).toBe(true);
      } finally {
        (global as any).window = originalWindow;
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid online/offline transitions', () => {
      mockIsOffline.mockReturnValue(false);
      let onlineCallback: (() => void) | null = null;
      let offlineCallback: (() => void) | null = null;

      mockListenToOnlineStatusChanges.mockImplementation((onOnline, onOffline) => {
        onlineCallback = onOnline;
        offlineCallback = onOffline;
      });

      const { result } = renderHook(() => useOnlineStatus());

      // Rapid transitions
      act(() => {
        offlineCallback?.();
        onlineCallback?.();
        offlineCallback?.();
        onlineCallback?.();
      });

      expect(result.current.status).toBe(OnlineStatus.Online);
    });

    it('should handle sync event without detail property', () => {
      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        const event = new CustomEvent('sync:end');
        window.dispatchEvent(event);
      });

      // Should not crash
      expect(result.current.status).toBe(OnlineStatus.Online);
    });

    it('should set status to SyncError when still offline after sync ends', () => {
      mockIsOffline.mockReturnValue(true);
      const { result } = renderHook(() => useOnlineStatus());

      act(() => {
        const event = new CustomEvent('sync:end', {
          detail: { success: false, error: 'Sync failed' }
        });
        window.dispatchEvent(event);
      });

      expect(result.current.status).toBe(OnlineStatus.SyncError);
    });
  });
});
