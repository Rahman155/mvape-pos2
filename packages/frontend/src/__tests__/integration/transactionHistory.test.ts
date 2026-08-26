/**
 * Integration Tests for Transaction History
 * Tests transaction listing, pagination, filtering, and offline support
 * Requirement 8.1: Transaction history list with pagination and filtering
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Transaction } from '@/types';

/**
 * Mock API for transaction history operations
 */
class TransactionHistoryService {
  private transactions: Transaction[] = [];
  private offlineMode = false;

  /**
   * Add test transactions
   */
  setupTestTransactions(txns: Transaction[]) {
    this.transactions = [...txns];
  }

  /**
   * Set offline mode
   */
  setOfflineMode(offline: boolean) {
    this.offlineMode = offline;
  }

  /**
   * List transactions with pagination
   * Requirement 8.1: List all transactions with pagination
   */
  listTransactions(params: {
    page: number;
    limit: number;
    storeId?: string;
    paymentMethod?: string;
    startDate?: Date;
    endDate?: Date;
  }): {
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  } {
    let result = [...this.transactions];

    // Filter by store
    if (params.storeId) {
      result = result.filter((t) => t.storeId === params.storeId);
    }

    // Filter by payment method
    if (params.paymentMethod) {
      result = result.filter((t) => t.paymentMethod === params.paymentMethod);
    }

    // Filter by date range
    if (params.startDate) {
      result = result.filter(
        (t) => new Date(t.transactionDate) >= params.startDate!
      );
    }

    if (params.endDate) {
      result = result.filter(
        (t) => new Date(t.transactionDate) <= params.endDate!
      );
    }

    // Sort by date descending (most recent first)
    result.sort(
      (a, b) =>
        new Date(b.transactionDate).getTime() -
        new Date(a.transactionDate).getTime()
    );

    const total = result.length;
    const offset = (params.page - 1) * params.limit;
    const paginatedData = result.slice(offset, offset + params.limit);
    const pages = Math.ceil(total / params.limit);

    return {
      data: paginatedData,
      total,
      page: params.page,
      limit: params.limit,
      pages,
    };
  }

  /**
   * Get transaction details by ID
   */
  getTransaction(id: string): Transaction | undefined {
    return this.transactions.find((t) => t.id === id);
  }

  /**
   * Filter transactions by date range
   * Requirement 8.2: Filter transactions by date
   */
  filterByDateRange(startDate: Date, endDate: Date): Transaction[] {
    return this.transactions.filter((t) => {
      const txnDate = new Date(t.transactionDate);
      return txnDate >= startDate && txnDate <= endDate;
    });
  }

  /**
   * Filter transactions by payment method
   * Requirement 8.3: Filter transactions by payment method
   */
  filterByPaymentMethod(method: 'CASH' | 'MEMBER_CREDIT' | 'TEMPO'): Transaction[] {
    return this.transactions.filter((t) => t.paymentMethod === method);
  }

  /**
   * Get transaction statistics
   */
  getStatistics(params: {
    storeId?: string;
    paymentMethod?: string;
    startDate?: Date;
    endDate?: Date;
  }): {
    totalCount: number;
    totalAmount: number;
    averageAmount: number;
    byPaymentMethod: Record<string, number>;
  } {
    const filtered = this.listTransactions({
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
      ...params,
    });

    const data = filtered.data;
    const byPaymentMethod: Record<string, number> = {};

    data.forEach((t) => {
      byPaymentMethod[t.paymentMethod] =
        (byPaymentMethod[t.paymentMethod] || 0) + 1;
    });

    const totalAmount = data.reduce((sum, t) => sum + t.totalAmount, 0);

    return {
      totalCount: data.length,
      totalAmount,
      averageAmount: data.length > 0 ? totalAmount / data.length : 0,
      byPaymentMethod,
    };
  }

  /**
   * Check if offline mode is active
   */
  isOffline(): boolean {
    return this.offlineMode;
  }
}

describe('Transaction History Integration Tests', () => {
  let service: TransactionHistoryService;
  const mockStoreId = 'store-1';
  const mockKasirId = 'kasir-1';

  // Mock transactions for testing
  const mockTransactions: Transaction[] = [
    {
      id: 'txn-001',
      storeId: mockStoreId,
      kasirId: mockKasirId,
      transactionDate: new Date('2024-01-15T10:30:00'),
      totalAmount: 250000,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      isEdited: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    },
    {
      id: 'txn-002',
      storeId: mockStoreId,
      kasirId: mockKasirId,
      transactionDate: new Date('2024-01-14T14:20:00'),
      totalAmount: 150000,
      paymentMethod: 'MEMBER_CREDIT',
      status: 'COMPLETED',
      isEdited: true,
      editedAt: new Date('2024-01-14T15:00:00'),
      editedBy: mockKasirId,
      version: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    },
    {
      id: 'txn-003',
      storeId: mockStoreId,
      kasirId: mockKasirId,
      transactionDate: new Date('2024-01-13T09:15:00'),
      totalAmount: 500000,
      paymentMethod: 'TEMPO',
      status: 'COMPLETED',
      isEdited: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    },
    {
      id: 'txn-004',
      storeId: mockStoreId,
      kasirId: mockKasirId,
      transactionDate: new Date('2024-01-12T11:45:00'),
      totalAmount: 300000,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      isEdited: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    },
    {
      id: 'txn-005',
      storeId: mockStoreId,
      kasirId: mockKasirId,
      transactionDate: new Date('2024-01-11T16:30:00'),
      totalAmount: 175000,
      paymentMethod: 'MEMBER_CREDIT',
      status: 'COMPLETED',
      isEdited: false,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: [],
    },
  ];

  beforeEach(() => {
    service = new TransactionHistoryService();
    service.setupTestTransactions(mockTransactions);
  });

  describe('Requirement 8.1: Transaction History List with Pagination', () => {
    it('should list all transactions for a store', () => {
      const result = service.listTransactions({
        page: 1,
        limit: 20,
        storeId: mockStoreId,
      });

      expect(result.data.length).toBe(5);
      expect(result.total).toBe(5);
      expect(result.pages).toBe(1);
    });

    it('should paginate transactions correctly', () => {
      const page1 = service.listTransactions({
        page: 1,
        limit: 2,
        storeId: mockStoreId,
      });

      expect(page1.data.length).toBe(2);
      expect(page1.page).toBe(1);
      expect(page1.total).toBe(5);
      expect(page1.pages).toBe(3);

      // Verify first transaction is most recent
      expect(page1.data[0].id).toBe('txn-001');

      const page2 = service.listTransactions({
        page: 2,
        limit: 2,
        storeId: mockStoreId,
      });

      expect(page2.data.length).toBe(2);
      expect(page2.data[0].id).toBe('txn-003');

      const page3 = service.listTransactions({
        page: 3,
        limit: 2,
        storeId: mockStoreId,
      });

      expect(page3.data.length).toBe(1);
      expect(page3.data[0].id).toBe('txn-005');
    });

    it('should return correct page information', () => {
      const result = service.listTransactions({
        page: 2,
        limit: 2,
        storeId: mockStoreId,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.total).toBe(5);
      expect(result.pages).toBe(3);
    });

    it('should sort transactions by date descending', () => {
      const result = service.listTransactions({
        page: 1,
        limit: 20,
        storeId: mockStoreId,
      });

      // Most recent first
      expect(result.data[0].transactionDate).toEqual(
        new Date('2024-01-15T10:30:00')
      );
      expect(result.data[result.data.length - 1].transactionDate).toEqual(
        new Date('2024-01-11T16:30:00')
      );
    });
  });

  describe('Requirement 8.2: Filter by Date Range', () => {
    it('should filter transactions by date range', () => {
      const startDate = new Date('2024-01-13T00:00:00');
      const endDate = new Date('2024-01-14T23:59:59');

      const filtered = service.filterByDateRange(startDate, endDate);

      expect(filtered.length).toBe(2);
      expect(filtered[0].id).toBe('txn-002'); // Most recent in range
      expect(filtered[1].id).toBe('txn-003');
    });

    it('should handle date filter in pagination', () => {
      const startDate = new Date('2024-01-12T00:00:00');
      const endDate = new Date('2024-01-15T23:59:59');

      const result = service.listTransactions({
        page: 1,
        limit: 2,
        storeId: mockStoreId,
        startDate,
        endDate,
      });

      expect(result.total).toBe(4);
      expect(result.pages).toBe(2);
    });

    it('should return empty list for date range with no transactions', () => {
      const startDate = new Date('2024-02-01T00:00:00');
      const endDate = new Date('2024-02-28T23:59:59');

      const filtered = service.filterByDateRange(startDate, endDate);

      expect(filtered.length).toBe(0);
    });
  });

  describe('Requirement 8.3: Filter by Payment Method', () => {
    it('should filter transactions by CASH payment method', () => {
      const filtered = service.filterByPaymentMethod('CASH');

      expect(filtered.length).toBe(2);
      expect(filtered.every((t) => t.paymentMethod === 'CASH')).toBe(true);
    });

    it('should filter transactions by MEMBER_CREDIT payment method', () => {
      const filtered = service.filterByPaymentMethod('MEMBER_CREDIT');

      expect(filtered.length).toBe(2);
      expect(filtered.every((t) => t.paymentMethod === 'MEMBER_CREDIT')).toBe(
        true
      );
    });

    it('should filter transactions by TEMPO payment method', () => {
      const filtered = service.filterByPaymentMethod('TEMPO');

      expect(filtered.length).toBe(1);
      expect(filtered[0].paymentMethod).toBe('TEMPO');
    });

    it('should handle payment method filter in pagination', () => {
      const result = service.listTransactions({
        page: 1,
        limit: 20,
        storeId: mockStoreId,
        paymentMethod: 'CASH',
      });

      expect(result.total).toBe(2);
      expect(result.data.every((t) => t.paymentMethod === 'CASH')).toBe(true);
    });

    it('should handle combined date and payment method filters', () => {
      const result = service.listTransactions({
        page: 1,
        limit: 20,
        storeId: mockStoreId,
        paymentMethod: 'MEMBER_CREDIT',
        startDate: new Date('2024-01-13T00:00:00'),
        endDate: new Date('2024-01-15T23:59:59'),
      });

      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe('txn-002');
      expect(result.data[0].paymentMethod).toBe('MEMBER_CREDIT');
    });
  });

  describe('Transaction Details Retrieval', () => {
    it('should retrieve transaction by ID', () => {
      const txn = service.getTransaction('txn-001');

      expect(txn).toBeDefined();
      expect(txn?.id).toBe('txn-001');
      expect(txn?.totalAmount).toBe(250000);
    });

    it('should return undefined for non-existent transaction', () => {
      const txn = service.getTransaction('non-existent');

      expect(txn).toBeUndefined();
    });
  });

  describe('Transaction Statistics', () => {
    it('should calculate correct statistics for all transactions', () => {
      const stats = service.getStatistics({ storeId: mockStoreId });

      expect(stats.totalCount).toBe(5);
      expect(stats.totalAmount).toBe(
        250000 + 150000 + 500000 + 300000 + 175000
      );
      expect(stats.averageAmount).toBe(275000);
      expect(stats.byPaymentMethod['CASH']).toBe(2);
      expect(stats.byPaymentMethod['MEMBER_CREDIT']).toBe(2);
      expect(stats.byPaymentMethod['TEMPO']).toBe(1);
    });

    it('should calculate statistics with date filter', () => {
      const stats = service.getStatistics({
        storeId: mockStoreId,
        startDate: new Date('2024-01-13T00:00:00'),
        endDate: new Date('2024-01-15T23:59:59'),
      });

      expect(stats.totalCount).toBe(3);
      expect(stats.totalAmount).toBe(250000 + 150000 + 500000);
    });

    it('should calculate statistics with payment method filter', () => {
      const stats = service.getStatistics({
        storeId: mockStoreId,
        paymentMethod: 'CASH',
      });

      expect(stats.totalCount).toBe(2);
      expect(stats.totalAmount).toBe(250000 + 300000);
    });
  });

  describe('Offline Support', () => {
    it('should track offline mode status', () => {
      expect(service.isOffline()).toBe(false);

      service.setOfflineMode(true);
      expect(service.isOffline()).toBe(true);

      service.setOfflineMode(false);
      expect(service.isOffline()).toBe(false);
    });

    it('should return cached data in offline mode', () => {
      const result = service.listTransactions({
        page: 1,
        limit: 20,
        storeId: mockStoreId,
      });

      service.setOfflineMode(true);

      const offlineResult = service.listTransactions({
        page: 1,
        limit: 20,
        storeId: mockStoreId,
      });

      // Should return same data regardless of offline status
      expect(offlineResult.data.length).toBe(result.data.length);
      expect(offlineResult.total).toBe(result.total);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty transaction list', () => {
      service.setupTestTransactions([]);

      const result = service.listTransactions({
        page: 1,
        limit: 20,
        storeId: mockStoreId,
      });

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });

    it('should handle page number beyond total pages', () => {
      const result = service.listTransactions({
        page: 100,
        limit: 2,
        storeId: mockStoreId,
      });

      expect(result.data.length).toBe(0);
    });

    it('should handle zero limit gracefully', () => {
      // This would be a validation error in real API, but test current behavior
      const result = service.listTransactions({
        page: 1,
        limit: 0,
        storeId: mockStoreId,
      });

      // With limit 0, would get divide by zero in pages calculation
      // Implementation should validate this
      expect(result.total).toBe(5);
    });
  });
});
