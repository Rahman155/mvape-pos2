/**
 * Sync Notifications System
 * Manages user notifications for sync events
 * Provides toast, badge, and desktop notifications
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type NotificationDuration = 'short' | 'medium' | 'long' | 'persistent';

export interface NotificationOptions {
  /**
   * Notification type
   */
  type?: NotificationType;

  /**
   * Display duration
   */
  duration?: NotificationDuration;

  /**
   * Action button
   */
  action?: {
    label: string;
    callback: () => void | Promise<void>;
  };

  /**
   * Show badge
   */
  showBadge?: boolean;

  /**
   * Badge count
   */
  badgeCount?: number;

  /**
   * Show desktop notification
   */
  showDesktopNotification?: boolean;
}

export interface SyncNotification {
  id: string;
  title: string;
  message: string;
  options: NotificationOptions;
  createdAt: number;
  displayedAt?: number;
}

/**
 * Notification manager
 */
class SyncNotificationManager {
  private notifications: Map<string, SyncNotification> = new Map();
  private listeners: Set<(notification: SyncNotification) => void> = new Set();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private badgeSupported = false;

  constructor() {
    this.checkBadgeSupport();
  }

  /**
   * Check if badge API is supported
   */
  private checkBadgeSupport(): void {
    this.badgeSupported =
      typeof navigator !== 'undefined' &&
      'setAppBadge' in navigator &&
      'clearAppBadge' in navigator;
  }

  /**
   * Show sync started notification
   */
  async showSyncStarted(pendingCount: number): Promise<string> {
    const id = `sync-started-${Date.now()}`;

    const notification: SyncNotification = {
      id,
      title: 'Syncing Changes',
      message: `Uploading ${pendingCount} pending change${pendingCount !== 1 ? 's' : ''}...`,
      options: {
        type: 'info',
        duration: 'medium',
        showBadge: true,
        badgeCount: pendingCount,
      },
      createdAt: Date.now(),
    };

    return this.show(notification);
  }

  /**
   * Show sync success notification
   */
  async showSyncSuccess(itemsCount: number): Promise<string> {
    const id = `sync-success-${Date.now()}`;

    const notification: SyncNotification = {
      id,
      title: 'Sync Complete',
      message: `Successfully uploaded ${itemsCount} change${itemsCount !== 1 ? 's' : ''}`,
      options: {
        type: 'success',
        duration: 'short',
        showBadge: false,
      },
      createdAt: Date.now(),
    };

    return this.show(notification);
  }

  /**
   * Show sync error notification
   */
  async showSyncError(error: string, failedCount: number): Promise<string> {
    const id = `sync-error-${Date.now()}`;

    const notification: SyncNotification = {
      id,
      title: 'Sync Failed',
      message: `${error} (${failedCount} item${failedCount !== 1 ? 's' : ''} failed)`,
      options: {
        type: 'error',
        duration: 'long',
        showBadge: true,
        badgeCount: failedCount,
        action: {
          label: 'Retry',
          callback: () => {
            this.dispatchEvent('notification:action', { action: 'retry' });
          },
        },
      },
      createdAt: Date.now(),
    };

    return this.show(notification);
  }

  /**
   * Show conflict notification
   */
  async showConflict(entityType: string, entityId: string): Promise<string> {
    const id = `conflict-${entityId}-${Date.now()}`;

    const notification: SyncNotification = {
      id,
      title: 'Conflict Detected',
      message: `Your changes to ${entityType} conflict with server version`,
      options: {
        type: 'warning',
        duration: 'persistent',
        action: {
          label: 'Resolve',
          callback: () => {
            this.dispatchEvent('notification:action', {
              action: 'resolve-conflict',
              entityType,
              entityId,
            });
          },
        },
        showBadge: true,
        badgeCount: 1,
      },
      createdAt: Date.now(),
    };

    return this.show(notification);
  }

  /**
   * Show offline notification
   */
  async showOffline(): Promise<string> {
    const id = `offline-${Date.now()}`;

    const notification: SyncNotification = {
      id,
      title: 'You are Offline',
      message: 'Changes will be synced when you reconnect',
      options: {
        type: 'warning',
        duration: 'persistent',
        showBadge: true,
        badgeCount: 0,
      },
      createdAt: Date.now(),
    };

    return this.show(notification);
  }

  /**
   * Show online notification
   */
  async showOnline(pendingCount: number): Promise<string> {
    const id = `online-${Date.now()}`;

    let message = 'You are back online';
    if (pendingCount > 0) {
      message += `. Syncing ${pendingCount} pending change${pendingCount !== 1 ? 's' : ''}...`;
    }

    const notification: SyncNotification = {
      id,
      title: 'Connection Restored',
      message,
      options: {
        type: 'info',
        duration: 'short',
        showBadge: pendingCount > 0,
        badgeCount: pendingCount,
      },
      createdAt: Date.now(),
    };

    return this.show(notification);
  }

  /**
   * Show notification
   */
  async show(notification: SyncNotification): Promise<string> {
    notification.displayedAt = Date.now();
    this.notifications.set(notification.id, notification);

    // Dispatch event for listeners
    this.dispatchEvent('notification:show', notification);

    // Show desktop notification if enabled
    if (notification.options.showDesktopNotification) {
      this.showDesktopNotification(notification);
    }

    // Update badge if enabled
    if (notification.options.showBadge) {
      this.updateBadge(notification.options.badgeCount || 0);
    }

    // Auto-dismiss after duration
    const duration = this.getDurationMs(notification.options.duration || 'medium');
    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.dismiss(notification.id);
      }, duration);

      this.timeouts.set(notification.id, timeout);
    }

    return notification.id;
  }

  /**
   * Dismiss notification
   */
  dismiss(id: string): void {
    const notification = this.notifications.get(id);
    if (notification) {
      this.notifications.delete(id);

      // Clear timeout
      const timeout = this.timeouts.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.timeouts.delete(id);
      }

      // Dispatch event
      this.dispatchEvent('notification:dismiss', { id });
    }
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    for (const [id] of this.notifications) {
      this.dismiss(id);
    }
  }

  /**
   * Show desktop notification
   */
  private async showDesktopNotification(notification: SyncNotification): Promise<void> {
    if (typeof Notification === 'undefined') {
      console.warn('[SyncNotifications] Desktop Notifications not supported');
      return;
    }

    try {
      // Request permission if needed
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          return;
        }
      }

      const options: NotificationOptions = {
        body: notification.message,
        tag: notification.id,
        requireInteraction: notification.options.duration === 'persistent',
      };

      if (notification.options.type === 'success') {
        options.badge = '✓';
      } else if (notification.options.type === 'error') {
        options.badge = '✕';
      } else if (notification.options.type === 'warning') {
        options.badge = '⚠';
      }

      const desktop = new Notification(notification.title, options);

      // Handle action clicks
      desktop.onclick = () => {
        if (notification.options.action) {
          notification.options.action.callback();
        }
      };
    } catch (error) {
      console.error('[SyncNotifications] Desktop notification failed:', error);
    }
  }

  /**
   * Update app badge
   */
  private async updateBadge(count: number): Promise<void> {
    if (!this.badgeSupported) return;

    try {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    } catch (error) {
      console.warn('[SyncNotifications] Badge update failed:', error);
    }
  }

  /**
   * Get duration in milliseconds
   */
  private getDurationMs(duration: NotificationDuration): number {
    switch (duration) {
      case 'short':
        return 3000;
      case 'medium':
        return 5000;
      case 'long':
        return 10000;
      case 'persistent':
        return 0; // Don't auto-dismiss
      default:
        return 5000;
    }
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (notification: SyncNotification) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (notification: SyncNotification) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Dispatch custom event
   */
  private dispatchEvent(eventName: string, detail: unknown): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent(eventName, { detail });
      window.dispatchEvent(event);
    }

    // Also call listeners
    if (eventName === 'notification:show' && detail instanceof Object && 'id' in detail) {
      for (const listener of this.listeners) {
        try {
          listener(detail as SyncNotification);
        } catch (error) {
          console.error('[SyncNotifications] Listener error:', error);
        }
      }
    }
  }

  /**
   * Get all notifications
   */
  getAll(): SyncNotification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Get active notifications
   */
  getActive(): SyncNotification[] {
    return Array.from(this.notifications.values());
  }

  /**
   * Get notification by ID
   */
  get(id: string): SyncNotification | null {
    return this.notifications.get(id) || null;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();
    this.listeners.clear();
    this.notifications.clear();
    console.log('[SyncNotifications] Destroyed');
  }
}

/**
 * Singleton instance
 */
let notificationManagerInstance: SyncNotificationManager | null = null;

/**
 * Get or create notification manager
 */
export function getSyncNotificationManager(): SyncNotificationManager {
  if (!notificationManagerInstance) {
    notificationManagerInstance = new SyncNotificationManager();
  }
  return notificationManagerInstance;
}

export default SyncNotificationManager;
