/**
 * useSyncEngine Hook
 * React hook for managing the sync engine
 * Provides sync control, status tracking, and progress monitoring
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getSyncEngine,
  initializeSyncEngine,
  SyncStatus,
  SyncResult,
  SyncOptions,
} from '@/lib/syncEngine';

export interface UseSyncEngineReturn {
  /**
   * Current sync status
   */
  status: SyncStatus;

  /**
   * Is currently syncing
   */
  isSyncing: boolean;

  /**
   * Last sync result
   */
  lastResult: SyncResult | null;

  /**
   * Sync progress (0-100)
   */
  progress: number;

  /**
   * Items processed in current sync
   */
  itemsProcessed: number;

  /**
   * Total items to sync
   */
  totalItems: number;

  /**
   * Items failed in current sync
   */
  itemsFailed: number;

  /**
   * Last sync time
   */
  lastSyncTime: number | null;

  /**
   * Pending items count
   */
  pendingCount: number;

  /**
   * Error message if any
   */
  error: string | null;

  /**
   * Trigger a manual sync
   */
  triggerSync: () => Promise<void>;

  /**
   * Pause syncing
   */
  pause: () => void;

  /**
   * Resume syncing
   */
  resume: () => Promise<void>;

  /**
   * Clear retry state
   */
  clearRetries: () => void;

  /**
   * Refresh pending count
   */
  refreshPendingCount: () => Promise<void>;
}

/**
 * Hook to manage sync engine
 * Provides sync control and status monitoring
 *
 * @example
 * ```tsx
 * const { status, isSyncing, triggerSync } = useSyncEngine();
 *
 * return (
 *   <div>
 *     <p>Status: {status}</p>
 *     <button onClick={triggerSync} disabled={isSyncing}>
 *       Sync
 *     </button>
 *   </div>
 * );
 * ```
 *
 * @param options - Sync engine options
 * @returns Sync engine interface
 */
export function useSyncEngine(options?: SyncOptions): UseSyncEngineReturn {
  const [status, setStatus] = useState<SyncStatus>(SyncStatus.Idle);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [itemsProcessed, setItemsProcessed] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsFailed, setItemsFailed] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const engine = getSyncEngine(options);

  /**
   * Initialize engine and setup listeners
   */
  useEffect(() => {
    let mounted = true;

    const initEngine = async () => {
      try {
        await initializeSyncEngine(options);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize sync engine');
        }
      }
    };

    initEngine();

    // Setup event listeners
    const handleSyncStart = () => {
      if (mounted) {
        setStatus(SyncStatus.Syncing);
        setIsSyncing(true);
        setError(null);
        setProgress(0);
      }
    };

    const handleSyncProgress = (event: CustomEvent) => {
      if (mounted) {
        const { processed, total, failed } = event.detail;
        setItemsProcessed(processed);
        setTotalItems(total);
        setItemsFailed(failed);
        setProgress(total > 0 ? Math.round((processed / total) * 100) : 0);
      }
    };

    const handleSyncEnd = (event: CustomEvent) => {
      if (mounted) {
        const { success, itemsProcessed: processed, itemsFailed: failed, timestamp } = event.detail;
        setStatus(success ? SyncStatus.Complete : SyncStatus.Error);
        setIsSyncing(false);
        setLastSyncTime(timestamp);

        const result: SyncResult = {
          success,
          itemsProcessed: processed,
          itemsFailed: failed,
          totalItems: totalItems,
          duration: timestamp - (lastSyncTime || timestamp),
          errors: [],
          timestamp,
        };

        setLastResult(result);

        if (!success) {
          setError(event.detail.error || 'Sync failed');
        } else {
          setError(null);
        }
      }
    };

    const handleEnginePaused = () => {
      if (mounted) {
        setStatus(SyncStatus.Paused);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('sync:start', handleSyncStart);
      window.addEventListener('sync:progress', handleSyncProgress);
      window.addEventListener('sync:end', handleSyncEnd);
      window.addEventListener('engine:paused', handleEnginePaused);
    }

    return () => {
      mounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('sync:start', handleSyncStart);
        window.removeEventListener('sync:progress', handleSyncProgress);
        window.removeEventListener('sync:end', handleSyncEnd);
        window.removeEventListener('engine:paused', handleEnginePaused);
      }
    };
  }, [options, lastSyncTime, totalItems]);

  /**
   * Trigger manual sync
   */
  const triggerSync = useCallback(async () => {
    try {
      setError(null);
      const result = await engine.sync();
      setLastResult(result);
      setLastSyncTime(result.timestamp);
      await refreshPendingCount();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
      console.error('[useSyncEngine] Sync failed:', err);
    }
  }, [engine]);

  /**
   * Pause syncing
   */
  const pause = useCallback(() => {
    engine.pause();
  }, [engine]);

  /**
   * Resume syncing
   */
  const resume = useCallback(async () => {
    try {
      await engine.resume();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Resume failed';
      setError(errorMessage);
      console.error('[useSyncEngine] Resume failed:', err);
    }
  }, [engine]);

  /**
   * Clear retry state
   */
  const clearRetries = useCallback(() => {
    engine.clearRetries();
  }, [engine]);

  /**
   * Refresh pending count
   */
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await engine.getPendingCount();
      setPendingCount(count);
    } catch (err) {
      console.error('[useSyncEngine] Failed to get pending count:', err);
    }
  }, [engine]);

  /**
   * Initial pending count fetch
   */
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  return {
    status,
    isSyncing,
    lastResult,
    progress,
    itemsProcessed,
    totalItems,
    itemsFailed,
    lastSyncTime,
    pendingCount,
    error,
    triggerSync,
    pause,
    resume,
    clearRetries,
    refreshPendingCount,
  };
}

export default useSyncEngine;
