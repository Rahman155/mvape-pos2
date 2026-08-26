/**
 * Conflict Notification Service
 *
 * Manages user notifications for detected conflicts during synchronization.
 * Tracks conflicts that require manual resolution and notifies users.
 *
 * **Validates: Requirements 4.5, 26.5**
 */
/**
 * Conflict notification information
 */
export interface ConflictNotification {
    id: string;
    entityType: string;
    entityId: string;
    strategy: 'LWW' | 'MERGE' | 'MANUAL';
    reason: string;
    timestamp: number;
    requiresReview: boolean;
    createdAt: Date;
    resolvedAt?: Date;
    resolution?: any;
}
/**
 * Conflict Notification Manager
 */
export declare class ConflictNotificationManager {
    private notifications;
    private subscribers;
    /**
     * Create and track a new conflict notification
     */
    notifyConflict(entityType: string, entityId: string, strategy: 'LWW' | 'MERGE' | 'MANUAL', reason: string, requiresReview?: boolean): ConflictNotification;
    /**
     * Mark a conflict as resolved
     */
    resolveNotification(notificationId: string, resolution: any): void;
    /**
     * Get all unresolved conflict notifications
     */
    getUnresolvedConflicts(): ConflictNotification[];
    /**
     * Get conflict notifications requiring manual review
     */
    getManualReviewConflicts(): ConflictNotification[];
    /**
     * Get notifications by entity type
     */
    getByEntityType(entityType: string): ConflictNotification[];
    /**
     * Get notifications by entity ID
     */
    getByEntityId(entityId: string): ConflictNotification[];
    /**
     * Get notification statistics
     */
    getStatistics(): {
        total: number;
        unresolved: number;
        manualReview: number;
        byStrategy: {
            LWW: number;
            MERGE: number;
            MANUAL: number;
        };
        byEntityType: {
            [key: string]: number;
        };
    };
    /**
     * Subscribe to conflict notifications
     */
    subscribe(callback: (notification: ConflictNotification) => void): () => void;
    /**
     * Clear all notifications (for testing)
     */
    clear(): void;
}
/**
 * Get singleton instance of ConflictNotificationManager
 */
export declare function getConflictNotificationManager(): ConflictNotificationManager;
//# sourceMappingURL=conflictNotification.d.ts.map