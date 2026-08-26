import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  registerServiceWorker,
  onServiceWorkerUpdate,
  onServiceWorkerUpdated,
  skipWaiting,
  isOffline,
  listenToOnlineStatusChanges,
  removeOnlineStatusListeners,
  triggerSyncQueue,
} from '@/lib/serviceWorker';

export enum PWAUpdateStatus {
  INITIAL = 'initial',
  UPDATE_AVAILABLE = 'update-available',
  UPDATE_APPLIED = 'update-applied',
  OFFLINE = 'offline',
  SYNCING = 'syncing',
}

interface PWAContextType {
  isOnline: boolean;
  isOfflineValue: boolean;
  updateStatus: PWAUpdateStatus;
  isSyncing: boolean;
  swRegistration: ServiceWorkerRegistration | undefined;
  acceptUpdate: () => void;
  dismissUpdate: () => void;
  retry: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

interface PWAProviderProps {
  children: React.ReactNode;
}

/**
 * PWAProvider component that manages PWA lifecycle and offline functionality
 *
 * Features:
 * - Registers Service Worker on mount
 * - Detects online/offline status
 * - Notifies user of available updates
 * - Manages app update acceptance
 * - Handles background sync
 */
export function PWAProvider({ children }: PWAProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isOfflineValue, setIsOfflineValue] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<PWAUpdateStatus>(PWAUpdateStatus.INITIAL);
  const [isSyncing, setIsSyncing] = useState(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | undefined>();
  const [mounted, setMounted] = useState(false);

  // Register Service Worker and setup listeners
  useEffect(() => {
    const setupPWA = async () => {
      try {
        // Register service worker
        const registration = await registerServiceWorker();
        setSwRegistration(registration);

        // Listen for updates
        onServiceWorkerUpdate((reg) => {
          console.log('[PWA] Update available');
          setUpdateStatus(PWAUpdateStatus.UPDATE_AVAILABLE);
        });

        onServiceWorkerUpdated((reg) => {
          console.log('[PWA] Update applied');
          setUpdateStatus(PWAUpdateStatus.UPDATE_APPLIED);
        });

        // Setup online/offline listeners
        const handleOnline = () => {
          setIsOnline(true);
          setIsOfflineValue(false);
          setUpdateStatus(PWAUpdateStatus.INITIAL);

          // Trigger sync queue when back online
          console.log('[PWA] Back online, triggering sync');
          triggerSyncQueue();
        };

        const handleOffline = () => {
          setIsOnline(false);
          setIsOfflineValue(true);
          setUpdateStatus(PWAUpdateStatus.OFFLINE);
        };

        listenToOnlineStatusChanges(handleOnline, handleOffline);

        // Set initial offline status
        setIsOfflineValue(isOffline());
        setIsOnline(navigator.onLine);

        setMounted(true);

        return () => {
          removeOnlineStatusListeners(handleOnline, handleOffline);
        };
      } catch (error) {
        console.error('[PWA] Failed to setup PWA:', error);
        setMounted(true);
      }
    };

    setupPWA();
  }, []);

  const acceptUpdate = useCallback(() => {
    console.log('[PWA] User accepted update');
    skipWaiting();
    setUpdateStatus(PWAUpdateStatus.INITIAL);
  }, []);

  const dismissUpdate = useCallback(() => {
    console.log('[PWA] User dismissed update');
    setUpdateStatus(PWAUpdateStatus.INITIAL);
  }, []);

  const retry = useCallback(async () => {
    try {
      setIsSyncing(true);
      console.log('[PWA] Retrying sync');
      await triggerSyncQueue();
    } catch (error) {
      console.error('[PWA] Retry failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <PWAContext.Provider
      value={{
        isOnline,
        isOfflineValue,
        updateStatus,
        isSyncing,
        swRegistration,
        acceptUpdate,
        dismissUpdate,
        retry,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

/**
 * Hook to use PWA context
 * Must be used inside PWAProvider
 */
export function usePWA(): PWAContextType {
  const context = useContext(PWAContext);

  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }

  return context;
}

export default PWAContext;
