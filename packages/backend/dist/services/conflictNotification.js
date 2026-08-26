/**
 * Conflict Notification Service
 *
 * Manages user notifications for detected conflicts during synchronization.
 * Tracks conflicts that require manual resolution and notifies users.
 *
 * **Validates: Requirements 4.5, 26.5**
 */
import { logger } from '../utils/logger.js';
/**
 * Conflict Notification Manager
 */
export class ConflictNotificationManager {
    notifications = new Map();
    subscribers = new Set();
    /**
     * Create and track a new conflict notification
     */
    notifyConflict(entityType, entityId, strategy, reason, requiresReview = strategy === 'MANUAL') {
        const id = `${entityType}:${entityId}:${Date.now()}`;
        const notification = {
            id,
            entityType,
            entityId,
            strategy,
            reason,
            timestamp: Date.now(),
            requiresReview,
            createdAt: new Date(),
        };
        this.notifications.set(id, notification);
        logger.info(`Conflict notification created: ${entityType} ${entityId} (${strategy}, requires review: ${requiresReview})`);
        // Notify all subscribers
        this.subscribers.forEach((subscriber) => subscriber(notification));
        return notification;
    }
    /**
     * Mark a conflict as resolved
     */
    resolveNotification(notificationId, resolution) {
        const notification = this.notifications.get(notificationId);
        if (!notification) {
            logger.warn(`Conflict notification not found: ${notificationId}`);
            return;
        }
        notification.resolvedAt = new Date();
        notification.resolution = resolution;
        logger.info(`Conflict notification resolved: ${notification.entityType} ${notification.entityId}`);
    }
    /**
     * Get all unresolved conflict notifications
     */
    getUnresolvedConflicts() {
        return Array.from(this.notifications.values()).filter((n) => !n.resolvedAt);
    }
    /**
     * Get conflict notifications requiring manual review
     */
    getManualReviewConflicts() {
        return Array.from(this.notifications.values()).filter((n) => n.requiresReview && !n.resolvedAt);
    }
    /**
     * Get notifications by entity type
     */
    getByEntityType(entityType) {
        return Array.from(this.notifications.values()).filter((n) => n.entityType === entityType);
    }
    /**
     * Get notifications by entity ID
     */
    getByEntityId(entityId) {
        return Array.from(this.notifications.values()).filter((n) => n.entityId === entityId);
    }
    /**
     * Get notification statistics
     */
    getStatistics() {
        const notifications = Array.from(this.notifications.values());
        const unresolvedCount = notifications.filter((n) => !n.resolvedAt).length;
        const manualReviewCount = notifications.filter((n) => n.requiresReview && !n.resolvedAt).length;
        const byStrategy = {
            LWW: notifications.filter((n) => n.strategy === 'LWW').length,
            MERGE: notifications.filter((n) => n.strategy === 'MERGE').length,
            MANUAL: notifications.filter((n) => n.strategy === 'MANUAL').length,
        };
        const byEntityType = {};
        notifications.forEach((n) => {
            byEntityType[n.entityType] = (byEntityType[n.entityType] || 0) + 1;
        });
        return {
            total: notifications.length,
            unresolved: unresolvedCount,
            manualReview: manualReviewCount,
            byStrategy,
            byEntityType,
        };
    }
    /**
     * Subscribe to conflict notifications
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }
    /**
     * Clear all notifications (for testing)
     */
    clear() {
        this.notifications.clear();
        logger.debug('All conflict notifications cleared');
    }
}
// Singleton instance
let instance = null;
/**
 * Get singleton instance of ConflictNotificationManager
 */
export function getConflictNotificationManager() {
    if (!instance) {
        instance = new ConflictNotificationManager();
    }
    return instance;
}
//# sourceMappingURL=conflictNotification.js.map