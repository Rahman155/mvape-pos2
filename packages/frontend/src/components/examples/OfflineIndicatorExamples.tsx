/**
 * OfflineIndicator Component Examples
 * Demonstrates various usage patterns and configurations
 */

'use client';

import React from 'react';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { OnlineStatus } from '@/types';

/**
 * Example 1: Basic Usage
 * Minimal configuration, shows only when offline
 */
export const BasicOfflineIndicator: React.FC = () => {
  return (
    <div>
      <OfflineIndicator />
      <div className="p-4">
        <h2>Basic Offline Indicator</h2>
        <p>Shows only when offline (default behavior)</p>
      </div>
    </div>
  );
};

/**
 * Example 2: Always Visible with Sync Status
 * Shows status even when online, displays sync details
 */
export const AlwaysVisibleIndicator: React.FC = () => {
  return (
    <div>
      <OfflineIndicator
        onlyShowOffline={false}
        showSyncStatus={true}
        showPendingCount={true}
      />
      <div className="p-4">
        <h2>Always Visible Indicator</h2>
        <p>Shows connectivity status and sync details at all times</p>
      </div>
    </div>
  );
};

/**
 * Example 3: Bottom Position with Auto-Dismiss
 * Positioned at bottom of screen, auto-dismisses errors
 */
export const BottomAutoDissmisIndicator: React.FC = () => {
  return (
    <div>
      <OfflineIndicator
        position="bottom"
        autoDismissTimeout={5000}
        showPendingCount={true}
      />
      <div className="p-4">
        <h2>Bottom Auto-Dismiss Indicator</h2>
        <p>Positioned at bottom, auto-dismisses after 5 seconds</p>
      </div>
    </div>
  );
};

/**
 * Example 4: Custom Messages
 * Using localized or domain-specific messages
 */
export const CustomMessagesIndicator: React.FC = () => {
  return (
    <div>
      <OfflineIndicator
        offlineText="Internet connection lost - check your network"
        syncingText="Saving your changes..."
        syncErrorText="Failed to save - check connection and retry"
      />
      <div className="p-4">
        <h2>Custom Messages Indicator</h2>
        <p>Using custom, user-friendly messages</p>
      </div>
    </div>
  );
};

/**
 * Example 5: With Hook Integration
 * Shows how to use the hook to conditionally render content
 */
export const HookIntegrationExample: React.FC = () => {
  const { isOffline, pendingChanges, status, triggerSync, isSyncing } =
    useOnlineStatus();

  return (
    <div>
      <OfflineIndicator showPendingCount={true} />
      <div className="p-4 space-y-4">
        <h2>Hook Integration Example</h2>

        {/* Status Display */}
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <p className="font-semibold">Current Status: {status}</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>Offline: {isOffline ? 'Yes' : 'No'}</li>
            <li>Pending Changes: {pendingChanges}</li>
            <li>Syncing: {isSyncing ? 'Yes' : 'No'}</li>
          </ul>
        </div>

        {/* Offline Warning */}
        {isOffline && (
          <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-400 rounded">
            <p className="font-semibold text-red-800 dark:text-red-200">
              You are offline
            </p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {pendingChanges} changes are waiting to sync.
            </p>
          </div>
        )}

        {/* Sync Button */}
        {isOffline && (
          <button
            onClick={() => triggerSync()}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Example 6: Form with Offline Handling
 * Shows form with offline state handling
 */
export const FormWithOfflineHandling: React.FC = () => {
  const { isOffline, status } = useOnlineStatus();

  return (
    <div>
      <OfflineIndicator />
      <div className="p-4 max-w-md">
        <h2>Product Form</h2>
        <form className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium">Product Name</label>
            <input
              type="text"
              className="mt-1 w-full px-3 py-2 border rounded-md"
              placeholder="Enter product name"
              disabled={status === OnlineStatus.Syncing}
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Price</label>
            <input
              type="number"
              className="mt-1 w-full px-3 py-2 border rounded-md"
              placeholder="Enter price"
              disabled={status === OnlineStatus.Syncing}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isOffline || status === OnlineStatus.Syncing}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === OnlineStatus.Syncing ? 'Saving...' : 'Save Product'}
          </button>

          {/* Offline Info */}
          {isOffline && (
            <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
              You are offline. Changes will be saved when you're back online.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

/**
 * Example 7: Transaction List with Sync Status
 * Shows list with sync status indicators
 */
export const TransactionListExample: React.FC = () => {
  const { status, pendingChanges } = useOnlineStatus();

  const transactions = [
    { id: 1, amount: 50000, date: '2024-01-15', status: 'completed' },
    { id: 2, amount: 75000, date: '2024-01-14', status: 'completed' },
    { id: 3, amount: 100000, date: '2024-01-13', status: 'pending' },
  ];

  return (
    <div>
      <OfflineIndicator position="top" showPendingCount={true} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2>Recent Transactions</h2>
          {status === OnlineStatus.Syncing && (
            <span className="text-sm text-blue-600">
              Syncing {pendingChanges} changes...
            </span>
          )}
        </div>

        <div className="space-y-2">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="p-3 border rounded-lg flex justify-between items-center"
            >
              <div>
                <p className="font-semibold">Transaction #{tx.id}</p>
                <p className="text-sm text-gray-600">{tx.date}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">Rp {tx.amount.toLocaleString()}</p>
                <p
                  className={`text-sm ${
                    tx.status === 'completed'
                      ? 'text-green-600'
                      : 'text-amber-600'
                  }`}
                >
                  {tx.status}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Sync Status */}
        {status === OnlineStatus.Offline && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800">
              Offline - {pendingChanges} transactions waiting to sync
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Example 8: Dashboard with Multiple Indicators
 * Shows how to use multiple indicators across app
 */
export const DashboardExample: React.FC = () => {
  const { isOnline, status, lastSyncTime } = useOnlineStatus();

  return (
    <div>
      {/* Global Indicator */}
      <OfflineIndicator position="top" showSyncStatus={true} />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1>Dashboard</h1>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isOnline ? 'bg-green-600' : 'bg-red-600'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Last Sync Info */}
        {lastSyncTime && (
          <div className="mb-4 text-xs text-gray-500">
            Last synced: {lastSyncTime.toLocaleTimeString()}
          </div>
        )}

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-semibold">Sales Today</h3>
            <p className="text-2xl font-bold mt-2">Rp 5,000,000</p>
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-semibold">Transactions</h3>
            <p className="text-2xl font-bold mt-2">24</p>
          </div>
          <div className="p-4 bg-white rounded-lg border">
            <h3 className="font-semibold">Inventory Items</h3>
            <p className="text-2xl font-bold mt-2">128</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Example 9: Minimal Compact Indicator
 * For use in header or navigation
 */
export const CompactIndicator: React.FC = () => {
  const { isOffline } = useOnlineStatus();

  if (!isOffline) return null;

  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
      <div className="w-2 h-2 bg-red-600 rounded-full" />
      Offline
    </div>
  );
};

/**
 * Example 10: Detailed Sync Status Panel
 * Shows detailed sync information
 */
export const DetailedSyncPanel: React.FC = () => {
  const {
    status,
    pendingChanges,
    lastSyncTime,
    lastError,
    triggerSync,
    isSyncing,
    clearError,
  } = useOnlineStatus();

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Sync Status</h3>
        <span
          className={`px-2 py-1 text-xs rounded-full font-medium ${
            status === OnlineStatus.Online
              ? 'bg-green-100 text-green-800'
              : status === OnlineStatus.Offline
                ? 'bg-red-100 text-red-800'
                : status === OnlineStatus.Syncing
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-orange-100 text-orange-800'
          }`}
        >
          {status.toUpperCase()}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Pending Changes:</span>
          <span className="font-medium">{pendingChanges}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Last Sync:</span>
          <span className="font-medium">
            {lastSyncTime
              ? lastSyncTime.toLocaleTimeString()
              : 'Never'}
          </span>
        </div>

        {lastError && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 text-xs">{lastError}</p>
          </div>
        )}

        <button
          onClick={() => triggerSync()}
          disabled={isSyncing || status === OnlineStatus.Online}
          className="w-full mt-3 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>

        {lastError && (
          <button
            onClick={() => clearError()}
            className="w-full px-3 py-2 bg-gray-300 text-gray-800 text-sm rounded hover:bg-gray-400"
          >
            Dismiss Error
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Example 11: Notification-style Indicator
 * Toast-like notification for status changes
 */
export const NotificationStyleIndicator: React.FC = () => {
  return (
    <div>
      <OfflineIndicator
        position="bottom"
        autoDismissTimeout={3000}
        showPendingCount={true}
        className="max-w-sm"
      />
      <div className="p-4">
        <h2>Toast-style Notifications</h2>
        <p>Indicator shows as toast notification with auto-dismiss</p>
      </div>
    </div>
  );
};

/**
 * Example 12: Custom Styling
 * Using custom CSS classes for styling
 */
export const CustomStylingIndicator: React.FC = () => {
  return (
    <div>
      <OfflineIndicator
        className="shadow-2xl border-2 rounded-2xl"
        position="top"
        showPendingCount={true}
      />
      <div className="p-4">
        <h2>Custom Styled Indicator</h2>
        <p>Using custom Tailwind classes for styling</p>
      </div>
    </div>
  );
};

/**
 * Exhibition Component
 * Shows all examples in a grid
 */
export const OfflineIndicatorExamples: React.FC = () => {
  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">
        Offline Indicator Examples
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <BasicOfflineIndicator />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <AlwaysVisibleIndicator />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <BottomAutoDissmisIndicator />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <CustomMessagesIndicator />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden md:col-span-2">
          <HookIntegrationExample />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <FormWithOfflineHandling />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <TransactionListExample />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden md:col-span-2">
          <DashboardExample />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <DetailedSyncPanel />
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
          <CustomStylingIndicator />
        </section>
      </div>
    </div>
  );
};

export default OfflineIndicatorExamples;
