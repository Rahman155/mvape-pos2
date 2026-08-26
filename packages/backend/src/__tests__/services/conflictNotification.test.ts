/**
 * Unit Tests for Conflict Notification Manager
 * 
 * **Validates: Requirements 4.5, 26.5**
 */

import { getConflictNotificationManager } from '../../services/conflictNotification.js';

describe('Conflict Notification Manager', () => {
  beforeEach(() => {
    // Clear notifications before each test
    const manager = getConflictNotificationManager();
    manager.clear();
  });

  describe('Notification Creation', () => {
    it('should create conflict notification', () => {
      const manager = getConflictNotificationManager();

      const notification = manager.notifyConflict(
        'transaction',
        'txn-123',
        'LWW',
        'Client version is newer'
      );

      expect(notification).toBeDefined();
      expect(notification.entityType).toBe('transaction');
      expect(notification.entityId).toBe('txn-123');
      expect(notification.strategy).toBe('LWW');
    });

    it('should track multiple notifications', () => {
      const manager = getConflictNotificationManager();

      manager.notifyConflict('transaction', 'txn-1', 'LWW', 'Conflict 1');
      manager.notifyConflict('member', 'member-1', 'MERGE', 'Conflict 2');

      const allConflicts = manager.getByEntityType('transaction');
      expect(allConflicts.length).toBe(1);
    });
  });

  describe('Notification Querying', () => {
    it('should get unresolved conflicts', () => {
      const manager = getConflictNotificationManager();

      manager.notifyConflict('transaction', 'txn-1', 'LWW', 'Conflict 1');
      manager.notifyConflict('transaction', 'txn-2', 'LWW', 'Conflict 2');

      const unresolved = manager.getUnresolvedConflicts();
      expect(unresolved.length).toBe(2);
    });

    it('should get manual review conflicts', () => {
      const manager = getConflictNotificationManager();

      manager.notifyConflict('transaction', 'txn-1', 'LWW', 'Conflict 1');
      manager.notifyConflict('transaction', 'txn-2', 'MANUAL', 'Conflict 2', true);

      const manualReview = manager.getManualReviewConflicts();
      expect(manualReview.length).toBe(1);
      expect(manualReview[0].strategy).toBe('MANUAL');
    });

    it('should filter by entity type', () => {
      const manager = getConflictNotificationManager();

      manager.notifyConflict('transaction', 'txn-1', 'LWW', 'Conflict 1');
      manager.notifyConflict('transaction', 'txn-2', 'LWW', 'Conflict 2');
      manager.notifyConflict('member', 'member-1', 'MERGE', 'Conflict 3');

      const transactions = manager.getByEntityType('transaction');
      expect(transactions.length).toBe(2);

      const members = manager.getByEntityType('member');
      expect(members.length).toBe(1);
    });

    it('should filter by entity ID', () => {
      const manager = getConflictNotificationManager();

      manager.notifyConflict('transaction', 'txn-1', 'LWW', 'Conflict 1');
      manager.notifyConflict('member', 'member-1', 'MERGE', 'Conflict 2');

      const txnConflicts = manager.getByEntityId('txn-1');
      expect(txnConflicts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Notification Resolution', () => {
    it('should mark notification as resolved', () => {
      const manager = getConflictNotificationManager();

      const notification = manager.notifyConflict(
        'transaction',
        'txn-1',
        'LWW',
        'Conflict 1'
      );

      manager.resolveNotification(notification.id, { winner: 'server' });

      const unresolved = manager.getUnresolvedConflicts();
      expect(unresolved.length).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      const manager = getConflictNotificationManager();

      manager.notifyConflict('transaction', 'txn-1', 'LWW', 'Conflict 1');
      manager.notifyConflict('transaction', 'txn-2', 'LWW', 'Conflict 2');
      manager.notifyConflict('member', 'member-1', 'MERGE', 'Conflict 3');

      const stats = manager.getStatistics();

      expect(stats.total).toBe(3);
      expect(stats.byStrategy.LWW).toBe(2);
      expect(stats.byStrategy.MERGE).toBe(1);
      expect(stats.byEntityType.transaction).toBe(2);
      expect(stats.byEntityType.member).toBe(1);
    });

    it('should track unresolved count', () => {
      const manager = getConflictNotificationManager();

      manager.notifyConflict('transaction', 'txn-1', 'LWW', 'Conflict 1');
      manager.notifyConflict('transaction', 'txn-2', 'LWW', 'Conflict 2');

      const notification = manager.notifyConflict(
        'member',
        'member-1',
        'MERGE',
        'Conflict 3'
      );
      manager.resolveNotification(notification.id, { winner: 'merged' });

      const stats = manager.getStatistics();
      expect(stats.total).toBe(3);
      expect(stats.unresolved).toBe(2);
    });
  });

  describe('Subscription', () => {
    it('should notify subscribers of new conflicts', (done) => {
      const manager = getConflictNotificationManager();

      const unsubscribe = manager.subscribe((notification) => {
        expect(notification.entityType).toBe('transaction');
        expect(notification.entityId).toBe('txn-1');
        unsubscribe();
        done();
      });

      manager.notifyConflict('transaction', 'txn-1', 'LWW', 'Conflict 1');
    });

    it('should allow unsubscribe', () => {
      const manager = getConflictNotificationManager();

      let notificationCount = 0;
      const unsubscribe = manager.subscribe(() => {
        notificationCount++;
      });

      manager.notifyConflict('transaction', 'txn-1', 'LWW', 'Conflict 1');
      expect(notificationCount).toBe(1);

      unsubscribe();
      manager.notifyConflict('transaction', 'txn-2', 'LWW', 'Conflict 2');
      expect(notificationCount).toBe(1);
    });
  });
});

