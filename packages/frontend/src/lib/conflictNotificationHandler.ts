/**
 * Conflict Notification Handler
 * Manages user notifications for detected conflicts during synchronization
 * Provides UI feedback and audit trail for conflict resolutions
 */

import { getSyncNotificationManager } from './syncNotifications';
import { getConflictResolver } from './conflictResolution';

export interface ConflictNotification {
  id: string;
  entityType: string;
  entityId: string;
  strategy: 'LWW' | 'MERGE' | 'MANUAL';
  reason: string;
  timestamp: number;
  userAction?: 'accept' | 'reject' | 'manual_review';
  resolution?: unknown;
}

class ConflictNotificationHandler {
  private notifications: Map<string, ConflictNotification> = new Map();
  private listeners: Array<(notification: ConflictNotification) => void> = [];

  /**
   * Notify user of detected conflict
   */
  async notifyConflict(
    entityType: string,
    entityId: string,
    strategy: 'LWW' | 'MERGE' | 'MANUAL',
    reason: string
  ): Promise<void> {
    const id = `${entityType}-${entityId}-${Date.now()}`;
    const notification: ConflictNotification = {
      id,
      entityType,
      entityId,
      strategy,
      reason,
      timestamp: Date.now(),
    };

    // Store notification
    this.notifications.set(id, notification);

    // Dispatch event to listeners
    this.notifyListeners(notification);

    // Show toast notification
    const notificationManager = getSyncNotificationManager();
    await notificationManager.showConflict(entityType, entityId);

    console.log(`[ConflictNotificationHandler] Conflict notification created:`, {
      entityType,
      entityId,
      strategy,
      reason,
    });
  }

  /**
   * Notify of conflict resolution
   */
  async notifyResolution(
    entityType: string,
    entityId: string,
    strategy: 'LWW' | 'MERGE' | 'MANUAL',
    resolvedValue?: unknown
  ): Promise<void> {
    const id = `${entityType}-${entityId}`;
    const notification: ConflictNotification = {
      id,
      entityType,
      entityId,
      strategy,
      reason: `Conflict resolved using ${strategy} strategy`,
      timestamp: Date.now(),
      userAction: 'accept',
      resolution: resolvedValue,
    };

    // Update notification
    this.notifications.set(id, notification);

    // Dispatch event
    this.notifyListeners(notification);

    console.log(`[ConflictNotificationHandler] Conflict resolution notified:`, {
      entityType,
      entityId,
      strategy,
      resolved: !!resolvedValue,
    });
  }

  /**
   * Get all conflict notifications
   */
  getAll(): ConflictNotification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Get conflicts for specific entity type
   */
  getByEntityType(entityType: string): ConflictNotification[] {
    return Array.from(this.notifications.values()).filter(
      (n) => n.entityType === entityType
    );
  }

  /**
   * Get conflicts for specific entity
   */
  getByEntity(entityType: string, entityId: string): ConflictNotification[] {
    return Array.from(this.notifications.values()).filter(
      (n) => n.entityType === entityType && n.entityId === entityId
    );
  }

  /**
   * Clear notification
   */
  clear(id: string): void {
    this.notifications.delete(id);
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications.clear();
  }

  /**
   * Subscribe to conflict notifications
   */
  subscribe(listener: (notification: ConflictNotification) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(notification: ConflictNotification): void {
    for (const listener of this.listeners) {
      try {
        listener(notification);
      } catch (error) {
        console.error('[ConflictNotificationHandler] Listener error:', error);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byStrategy: Record<string, number>;
    byEntityType: Record<string, number>;
  } {
    const notifications = Array.from(this.notifications.values());
    const stats = {
      total: notifications.length,
      byStrategy: {} as Record<string, number>,
      byEntityType: {} as Record<string, number>,
    };

    for (const notification of notifications) {
      stats.byStrategy[notification.strategy] = (stats.byStrategy[notification.strategy] ?? 0) + 1;
      stats.byEntityType[notification.entityType] = (stats.byEntityType[notification.entityType] ?? 0) + 1;
    }

    return stats;
  }
}

// Singleton instance
let handlerInstance: ConflictNotificationHandler | null = null;

/**
 * Get or create conflict notification handler
 */
export function getConflictNotificationHandler(): ConflictNotificationHandler {
  if (!handlerInstance) {
    handlerInstance = new ConflictNotificationHandler();
  }
  return handlerInstance;
}

export default ConflictNotificationHandler;
