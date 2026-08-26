'use client';

import { useEffect, useState } from 'react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mb-6">
          <div className="text-6xl mx-auto w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            {isOnline ? '📡' : '📵'}
          </div>
        </div>

        {/* Status */}
        <h1 className="text-3xl font-bold mb-4">
          {isOnline ? 'You\'re Back Online!' : 'You\'re Offline'}
        </h1>

        {/* Message */}
        {isOnline ? (
          <div>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              Your connection has been restored. You can now access all features of Vapestore POS.
            </p>
            <a
              href="/login"
              className="inline-block bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Login
            </a>
          </div>
        ) : (
          <div>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              It looks like you've lost your internet connection. Don't worry! Vapestore POS can still work offline.
              Your changes will be automatically synced when you're back online.
            </p>
            
            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                You can still:
              </h2>
              <ul className="text-left space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span>View cached transaction history</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span>Create transactions (will sync when online)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span>Manage member information</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span>View inventory status</span>
                </li>
              </ul>
            </div>

            <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
              Waiting for connection...
            </p>
          </div>
        )}

        {/* Syncing Indicator */}
        {!isOnline && (
          <div className="mt-8 flex justify-center">
            <div className="animate-spin">
              <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 rounded-full"></div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
