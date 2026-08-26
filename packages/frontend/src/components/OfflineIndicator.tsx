/**
 * OfflineIndicator Component
 * Displays connectivity status and sync state to the user
 * Shows at top or bottom of screen, only when offline or syncing
 */

'use client';

import React, { useEffect, useState } from 'react';
import { OnlineStatus, OfflineIndicatorProps } from '@/types';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Connectivity Status Indicator Component
 *
 * Displays network connectivity status with visual feedback.
 * Features:
 * - Shows offline, syncing, and sync error states
 * - Responsive design for mobile and desktop
 * - Auto-dismissable notifications
 * - Pending changes counter
 * - Retry functionality
 *
 * @example
 * ```tsx
 * // Basic usage
 * <OfflineIndicator />
 *
 * // With custom options
 * <OfflineIndicator
 *   position="bottom"
 *   showSyncStatus
 *   showPendingCount
 * />
 *
 * // Only show when offline
 * <OfflineIndicator onlyShowOffline={true} />
 * ```
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  position = 'top',
  onlyShowOffline = true,
  className,
  showSyncStatus = false,
  offlineText = 'You are offline',
  syncingText = 'Syncing changes...',
  syncErrorText = 'Sync failed',
  autoDismissTimeout = 0,
  showPendingCount = false,
}) => {
  const { status, isSyncing, lastError, pendingChanges, triggerSync, clearError } =
    useOnlineStatus();

  const [isVisible, setIsVisible] = useState(false);
  const [dismissTimeout, setDismissTimeout] = useState<NodeJS.Timeout | null>(null);

  /**
   * Determine if indicator should be visible
   */
  useEffect(() => {
    let shouldShow = false;
    let autoDismissMs = 0;

    switch (status) {
      case OnlineStatus.Online:
        shouldShow = !onlyShowOffline;
        break;
      case OnlineStatus.Offline:
        shouldShow = true;
        break;
      case OnlineStatus.Syncing:
        shouldShow = true;
        break;
      case OnlineStatus.SyncError:
        shouldShow = true;
        autoDismissMs = autoDismissTimeout;
        break;
    }

    setIsVisible(shouldShow);

    // Handle auto-dismiss
    if (shouldShow && autoDismissMs > 0) {
      const timeout = setTimeout(() => {
        setIsVisible(false);
        clearError();
      }, autoDismissMs);
      setDismissTimeout(timeout);

      return () => clearTimeout(timeout);
    }

    return () => {
      if (dismissTimeout) {
        clearTimeout(dismissTimeout);
      }
    };
  }, [status, onlyShowOffline, autoDismissTimeout, clearError, dismissTimeout]);

  if (!isVisible) {
    return null;
  }

  /**
   * Determine styles based on status
   */
  const getStatusStyles = () => {
    switch (status) {
      case OnlineStatus.Offline:
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-800 dark:text-red-200',
          icon: 'text-red-600 dark:text-red-400',
          dot: 'bg-red-600 dark:bg-red-400',
        };
      case OnlineStatus.Syncing:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-800 dark:text-blue-200',
          icon: 'text-blue-600 dark:text-blue-400',
          dot: 'bg-blue-600 dark:bg-blue-400',
        };
      case OnlineStatus.SyncError:
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-800 dark:text-orange-200',
          icon: 'text-orange-600 dark:text-orange-400',
          dot: 'bg-orange-600 dark:bg-orange-400',
        };
      case OnlineStatus.Online:
      default:
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-800 dark:text-green-200',
          icon: 'text-green-600 dark:text-green-400',
          dot: 'bg-green-600 dark:bg-green-400',
        };
    }
  };

  const styles = getStatusStyles();

  /**
   * Get status icon
   */
  const renderStatusIcon = () => {
    switch (status) {
      case OnlineStatus.Offline:
        return (
          <svg
            className={`w-5 h-5 ${styles.icon}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
            />
          </svg>
        );
      case OnlineStatus.Syncing:
        return (
          <svg
            className={`w-5 h-5 ${styles.icon} animate-spin`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        );
      case OnlineStatus.SyncError:
        return (
          <svg
            className={`w-5 h-5 ${styles.icon}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case OnlineStatus.Online:
      default:
        return (
          <svg
            className={`w-5 h-5 ${styles.icon}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  /**
   * Get status message
   */
  const getMessage = () => {
    switch (status) {
      case OnlineStatus.Offline:
        return offlineText;
      case OnlineStatus.Syncing:
        return syncingText;
      case OnlineStatus.SyncError:
        return syncErrorText;
      case OnlineStatus.Online:
      default:
        return 'Back online';
    }
  };

  /**
   * Get status message for detail text
   */
  const getDetailMessage = () => {
    if (showSyncStatus && status === OnlineStatus.Syncing && showPendingCount) {
      return `Syncing ${pendingChanges} ${pendingChanges === 1 ? 'change' : 'changes'}...`;
    }
    if (showPendingCount && status === OnlineStatus.Offline && pendingChanges > 0) {
      return `${pendingChanges} ${pendingChanges === 1 ? 'change' : 'changes'} waiting to sync`;
    }
    return null;
  };

  const detailMessage = getDetailMessage();

  /**
   * Position styles
   */
  const positionClass =
    position === 'top'
      ? 'top-0 rounded-b-lg'
      : 'bottom-0 rounded-t-lg';

  return (
    <div
      className={`fixed ${positionClass} left-0 right-0 z-50 mx-auto max-w-full sm:mx-2 sm:max-w-sm transition-all duration-300 ${className || ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={`
          border ${styles.border}
          ${styles.bg}
          ${styles.text}
          px-4 py-3 sm:px-4 sm:py-3
          shadow-lg
          backdrop-blur-sm
        `}
      >
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {renderStatusIcon()}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{getMessage()}</p>
              {status === OnlineStatus.SyncError && (
                <button
                  onClick={() => {
                    clearError();
                    triggerSync();
                  }}
                  className={`
                    flex-shrink-0 text-sm font-medium
                    hover:underline
                    transition-colors duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-2
                    ${styles.icon}
                  `}
                  aria-label="Retry sync"
                >
                  Retry
                </button>
              )}
            </div>

            {/* Detail Message */}
            {detailMessage && (
              <p className="text-xs mt-1 opacity-90">{detailMessage}</p>
            )}

            {/* Last Error Message */}
            {status === OnlineStatus.SyncError && lastError && (
              <p className="text-xs mt-1 opacity-75">{lastError}</p>
            )}
          </div>

          {/* Close Button */}
          {(status === OnlineStatus.Online || status === OnlineStatus.SyncError) && (
            <button
              onClick={() => {
                setIsVisible(false);
                if (status === OnlineStatus.SyncError) {
                  clearError();
                }
              }}
              className={`
                flex-shrink-0 p-1
                hover:opacity-70
                transition-opacity duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2
                ${styles.icon}
              `}
              aria-label="Dismiss"
            >
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;
