/**
 * useOnlineStatus Hook
 * Detects and tracks network connectivity status
 * Provides online/offline state, sync status, and pending changes information
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { OnlineStatus, UseOnlineStatusReturn } from '@/types';
import {
  isOffline,
  listenToOnlineStatusChanges,
  removeOnlineStatusListeners,
  triggerSyncQueue,
} from '@/lib/serviceWorker';

/**
 * Hook to track online/offline status and sync state
 * Handles network changes, sync status, and error states
 * Safe for SSR (server-side rendering)
 *
 * @example
 * ```tsx
 * const { status, isOnline, isOffline } = useOnlineStatus();
 *
 * return (
 *   <div>
 *     {isOffline && <p>No connection available</p>}
 *   </div>
 * );
 * ```
 *
 * @returns Online status information and control methods
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  // State management
  const [status, setStatus] = useState<OnlineStatus>(OnlineStatus.Online);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Refs for cleanup and callbacks
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onlineFunctionRef = useRef<(() => void) | null>(null);
  const offlineFunctionRef = useRef<(() => void) | null>(null);

  /**
   * Update status based on online/offline state
   */
  const updateStatus = useCallback((newStatus: OnlineStatus) => {
    setStatus(newStatus);
    
    // Clear last error if coming back online
    if (newStatus === OnlineStatus.Online) {
      setLastError(null);
      setIsSyncing(false);
    }
  }, []);

  /**
   * Handle online event
   */
  const handleOnline = useCallback(() => {
    console.log('[useOnlineStatus] Network connection restored');
    updateStatus(OnlineStatus.Online);
    
    // Trigger background sync when coming back online
    triggerSyncQueue().catch((error) => {
      console.error('[useOnlineStatus] Failed to trigger sync:', error);
      setLastError('Failed to sync changes');
    });
  }, [updateStatus]);

  /**
   * Handle offline event
   */
  const handleOffline = useCallback(() => {
    console.log('[useOnlineStatus] Network connection lost');
    updateStatus(OnlineStatus.Offline);
  }, [updateStatus]);

  /**
   * Initialize online status listeners and hydrate from window
   */
  useEffect(() => {
    // Skip on server side
    if (typeof window === 'undefined') {
      return;
    }

    // Initialize status from current navigator state
    const initialStatus = isOffline() ? OnlineStatus.Offline : OnlineStatus.Online;
    setStatus(initialStatus);
    setIsHydrated(true);

    // Store callback references for cleanup
    onlineFunctionRef.current = handleOnline;
    offlineFunctionRef.current = handleOffline;

    // Listen to online/offline events
    listenToOnlineStatusChanges(handleOnline, handleOffline);

    // Listen for custom sync events from service worker
    const handleSyncStart = () => {
      setIsSyncing(true);
      setStatus(OnlineStatus.Syncing);
    };

    const handleSyncEnd = (event: any) => {
      setIsSyncing(false);
      if (event.detail?.success) {
        setLastSyncTime(new Date());
        setLastError(null);
        // Restore to online status if no error
        if (status !== OnlineStatus.Offline) {
          setStatus(OnlineStatus.Online);
        }
      } else {
        setLastError(event.detail?.error || 'Sync failed');
        setStatus(OnlineStatus.SyncError);
      }
      if (event.detail?.pendingChanges !== undefined) {
        setPendingChanges(event.detail.pendingChanges);
      }
    };

    const handleSyncProgress = (event: any) => {
      if (event.detail?.pendingChanges !== undefined) {
        setPendingChanges(event.detail.pendingChanges);
      }
    };

    window.addEventListener('sync:start', handleSyncStart);
    window.addEventListener('sync:end', handleSyncEnd);
    window.addEventListener('sync:progress', handleSyncProgress);

    // Cleanup function
    return () => {
      // Remove listeners
      if (onlineFunctionRef.current && offlineFunctionRef.current) {
        removeOnlineStatusListeners(
          onlineFunctionRef.current,
          offlineFunctionRef.current
        );
      }

      // Remove custom event listeners
      window.removeEventListener('sync:start', handleSyncStart);
      window.removeEventListener('sync:end', handleSyncEnd);
      window.removeEventListener('sync:progress', handleSyncProgress);

      // Clear timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [handleOnline, handleOffline, status]);

  /**
   * Manually trigger sync
   */
  const triggerSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      setStatus(OnlineStatus.Syncing);
      await triggerSyncQueue();
      
      // Auto-resolve syncing state after a timeout
      // (service worker will dispatch actual sync:end event)
      syncTimeoutRef.current = setTimeout(() => {
        if (isSyncing) {
          setIsSyncing(false);
          setStatus(OnlineStatus.Online);
        }
      }, 5000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[useOnlineStatus] Sync failed:', errorMessage);
      setLastError(errorMessage);
      setIsSyncing(false);
      setStatus(OnlineStatus.SyncError);
    }
  }, [isSyncing]);

  /**
   * Clear the last error
   */
  const clearError = useCallback(() => {
    setLastError(null);
    // Only reset status if currently in error state
    if (status === OnlineStatus.SyncError) {
      setStatus(isOffline() ? OnlineStatus.Offline : OnlineStatus.Online);
    }
  }, [status]);

  // Return initial state on server side to prevent hydration mismatch
  if (!isHydrated) {
    return {
      status: OnlineStatus.Online,
      isOnline: true,
      isOffline: false,
      isSyncing: false,
      lastSyncTime: null,
      pendingChanges: 0,
      lastError: null,
      triggerSync: async () => {},
      clearError: () => {},
    };
  }

  return {
    status,
    isOnline: status === OnlineStatus.Online,
    isOffline: status === OnlineStatus.Offline || status === OnlineStatus.SyncError,
    isSyncing,
    lastSyncTime,
    pendingChanges,
    lastError,
    triggerSync,
    clearError,
  };
}

export default useOnlineStatus;
