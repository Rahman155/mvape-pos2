/**
 * React Hooks for Conflict Notifications
 * Provides UI components access to conflict notifications during synchronization
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getConflictNotificationHandler,
  type ConflictNotification,
} from '@/lib/conflictNotificationHandler';

/**
 * Hook to access all conflict notifications with management functions
 */
export function useConflictNotifications() {
  const [notifications, setNotifications] = useState<ConflictNotification[]>([]);
  const handler = getConflictNotificationHandler();

  useEffect(() => {
    // Get initial notifications
    setNotifications(handler.getAll());

    // Subscribe to new notifications
    const unsubscribe = handler.subscribe(() => {
      setNotifications(handler.getAll());
    });

    return unsubscribe;
  }, [handler]);

  const clearNotification = useCallback(
    (id: string) => {
      handler.clear(id);
      setNotifications(handler.getAll());
    },
    [handler]
  );

  const clearAll = useCallback(() => {
    handler.clearAll();
    setNotifications([]);
  }, [handler]);

  return {
    notifications,
    count: notifications.length,
    clearNotification,
    clearAll,
  };
}

/**
 * Hook to access conflicts for a specific entity
 */
export function useEntityConflicts(entityType: string, entityId?: string) {
  const [conflicts, setConflicts] = useState<ConflictNotification[]>([]);
  const handler = getConflictNotificationHandler();

  useEffect(() => {
    // Get initial conflicts
    if (entityId) {
      setConflicts(handler.getByEntity(entityType, entityId));
    } else {
      setConflicts(handler.getByEntityType(entityType));
    }

    // Subscribe to updates
    const unsubscribe = handler.subscribe(() => {
      if (entityId) {
        setConflicts(handler.getByEntity(entityType, entityId));
      } else {
        setConflicts(handler.getByEntityType(entityType));
      }
    });

    return unsubscribe;
  }, [entityType, entityId, handler]);

  return conflicts;
}

/**
 * Hook to access conflict statistics
 */
export function useConflictStats() {
  const [stats, setStats] = useState({
    total: 0,
    byStrategy: {} as Record<string, number>,
    byEntityType: {} as Record<string, number>,
  });

  const handler = getConflictNotificationHandler();

  useEffect(() => {
    // Get initial stats
    setStats(handler.getStats());

    // Subscribe to updates
    const unsubscribe = handler.subscribe(() => {
      setStats(handler.getStats());
    });

    return unsubscribe;
  }, [handler]);

  return stats;
}

export default useConflictNotifications;
