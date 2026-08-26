/**
 * Conflict Notification Center Component
 * 
 * Displays user-friendly notifications for detected conflicts during offline sync.
 * Features:
 * - Shows conflict type, entity, and resolution strategy
 * - Provides action buttons for manual review
 * - Tracks conflict resolution progress
 * - Integrates with ConflictResolutionDialog for manual conflicts
 * 
 * **Validates: Requirements 4.5, 26.5**
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getConflictNotificationHandler, type ConflictNotification } from '@/lib/conflictNotificationHandler';
import ConflictResolutionDialog from './ConflictResolutionDialog';
import { Toast } from './ui/Toast';

export interface ConflictNotificationCenterProps {
  /**
   * CSS class name
   */
  className?: string;
}

/**
 * Get human-readable strategy name
 */
function getStrategyLabel(strategy: 'LWW' | 'MERGE' | 'MANUAL'): string {
  switch (strategy) {
    case 'LWW':
      return 'Automatic (Latest Version)';
    case 'MERGE':
      return 'Automatic (Merged)';
    case 'MANUAL':
      return 'Requires Your Decision';
    default:
      return 'Unknown';
  }
}

/**
 * Get strategy description
 */
function getStrategyDescription(strategy: 'LWW' | 'MERGE' | 'MANUAL'): string {
  switch (strategy) {
    case 'LWW':
      return 'The newest version has been automatically selected based on timestamps.';
    case 'MERGE':
      return 'Changes from both versions have been intelligently combined.';
    case 'MANUAL':
      return 'This conflict requires your review to determine the correct resolution.';
    default:
      return 'Unknown resolution strategy.';
  }
}

/**
 * Get strategy icon and color
 */
function getStrategyStyle(strategy: 'LWW' | 'MERGE' | 'MANUAL'): {
  icon: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
} {
  switch (strategy) {
    case 'LWW':
      return {
        icon: '⚡',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
      };
    case 'MERGE':
      return {
        icon: '🔀',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
      };
    case 'MANUAL':
      return {
        icon: '⚠️',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
      };
    default:
      return {
        icon: '?',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-800',
      };
  }
}

/**
 * Get entity type label
 */
function getEntityTypeLabel(entityType: string): string {
  const labels: Record<string, string> = {
    transaction: 'Transaction',
    member: 'Member',
    product: 'Product',
    inventory: 'Inventory',
    bop: 'Operating Expense',
    store: 'Store',
  };
  return labels[entityType] || entityType;
}

/**
 * Conflict Notification Card Component
 */
const ConflictNotificationCard: React.FC<{
  notification: ConflictNotification;
  onReview?: (notification: ConflictNotification) => void;
  onDismiss?: (id: string) => void;
}> = ({ notification, onReview, onDismiss }) => {
  const style = getStrategyStyle(notification.strategy);
  const isManual = notification.strategy === 'MANUAL';

  return (
    <div className={`${style.bgColor} border-l-4 ${style.borderColor} p-4 rounded-lg`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-2xl flex-shrink-0">{style.icon}</div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`font-semibold ${style.textColor}`}>
                Data Conflict Detected
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {getEntityTypeLabel(notification.entityType)}{' '}
                <span className="font-mono text-xs bg-white px-2 py-1 rounded">
                  {notification.entityId.substring(0, 12)}...
                </span>
              </p>
            </div>
            {onDismiss && !isManual && (
              <button
                onClick={() => onDismiss(notification.id)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            )}
          </div>

          {/* Strategy Info */}
          <div className="mt-3 bg-white bg-opacity-60 p-3 rounded text-sm">
            <p className="font-semibold mb-1">
              Status: {getStrategyLabel(notification.strategy)}
            </p>
            <p className="text-gray-700">{getStrategyDescription(notification.strategy)}</p>
            {notification.reason && (
              <p className="text-xs text-gray-600 mt-2 italic">
                {notification.reason}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {isManual && onReview && (
            <div className="mt-3">
              <button
                onClick={() => onReview(notification)}
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
              >
                Review & Resolve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Conflict Notification Center Component
 */
export const ConflictNotificationCenter: React.FC<ConflictNotificationCenterProps> = ({
  className = '',
}) => {
  const [notifications, setNotifications] = useState<ConflictNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [selectedConflict, setSelectedConflict] = useState<ConflictNotification | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handler = getConflictNotificationHandler();

  /**
   * Load notifications
   */
  useEffect(() => {
    const loadNotifications = () => {
      const all = handler.getAll();
      setNotifications(all);
    };

    loadNotifications();

    // Subscribe to notification updates
    const unsubscribe = handler.subscribe((notification) => {
      setNotifications((prev) => {
        // Remove if already exists (update case)
        const filtered = prev.filter((n) => n.id !== notification.id);
        return [notification, ...filtered];
      });
    });

    return () => unsubscribe();
  }, [handler]);

  /**
   * Handle dismiss
   */
  const handleDismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
    // Optionally remove from handler too
    handler.clear(id);
  }, [handler]);

  /**
   * Handle manual conflict review
   */
  const handleReview = useCallback((notification: ConflictNotification) => {
    setSelectedConflict(notification);
    setIsDialogOpen(true);
  }, []);

  /**
   * Handle conflict resolution from dialog
   */
  const handleResolutionClose = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedConflict(null);
    // Dismiss the notification after resolution
    if (selectedConflict) {
      handleDismiss(selectedConflict.id);
    }
  }, [selectedConflict, handleDismiss]);

  // Filter notifications (show only non-dismissed)
  const visibleNotifications = notifications.filter(
    (n) => !dismissedIds.has(n.id)
  );

  // Get manual notifications that need review
  const manualNotifications = visibleNotifications.filter(
    (n) => n.strategy === 'MANUAL'
  );

  // Get automatic notifications
  const automaticNotifications = visibleNotifications.filter(
    (n) => n.strategy !== 'MANUAL'
  );

  // If no notifications, return null
  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Notification Center Panel */}
      <div className={`space-y-3 ${className}`}>
        {/* Manual Review Section */}
        {manualNotifications.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-yellow-900 mb-2">
              Conflicts Requiring Your Attention ({manualNotifications.length})
            </h3>
            <div className="space-y-2">
              {manualNotifications.map((notification) => (
                <ConflictNotificationCard
                  key={notification.id}
                  notification={notification}
                  onReview={handleReview}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          </div>
        )}

        {/* Automatic Resolution Section */}
        {automaticNotifications.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Conflicts Automatically Resolved ({automaticNotifications.length})
            </h3>
            <div className="space-y-2">
              {automaticNotifications.map((notification) => (
                <ConflictNotificationCard
                  key={notification.id}
                  notification={notification}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        {visibleNotifications.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-600">
            <p>
              Total conflicts detected: {visibleNotifications.length} |
              Manual review needed: {manualNotifications.length} |
              Auto-resolved: {automaticNotifications.length}
            </p>
          </div>
        )}
      </div>

      {/* Conflict Resolution Dialog */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl mx-auto mt-10 p-6">
            <h2 className="text-2xl font-bold mb-4">
              Resolve {getEntityTypeLabel(selectedConflict.entityType)} Conflict
            </h2>
            <p className="text-gray-600 mb-4">
              {selectedConflict.reason}
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={handleResolutionClose}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

ConflictNotificationCenter.displayName = 'ConflictNotificationCenter';

export default ConflictNotificationCenter;
