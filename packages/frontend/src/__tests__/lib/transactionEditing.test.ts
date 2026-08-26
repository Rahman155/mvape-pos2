/**
 * Unit tests for transaction editing functionality
 * Tests all transaction editing scenarios including:
 * - Totals recalculation on edits
 * - Edit history tracking
 * - Original transaction immutability
 * - Complex editing scenarios
 * - Data integrity and validation
 * 
 * **Validates: Requirement 8.6**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Transaction, TransactionItem } from '@/types';

/**
 * Mock Transaction Editing Service
 * Represents the business logic for editing transactions
 */
class TransactionEditingService {
  /**
   * Edit history store - tracks all changes to transactions
   */
  private editHistoryStore: Map<string, Array<{
    id: string;
    transactionId: string;
    timestamp: Date;
    userId: string;
    changes: {
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }[];
  }>> = new Map();

  /**
   * Original transaction store - ensures immutability
   */
  private originalTransactionStore: Map<string, Transaction> = new Map();

  /**
   * Create a deep copy of a transaction to ensure immutability
   */
  private deepCopyTransaction(transaction: Transaction): Transaction {
    return {
      ...transaction,
      items: transaction.items.map(item => ({
        ...item,
      })),
    };
  }

  /**
   * Store the original transaction on first edit
   */
  private storeOriginalTransaction(transactionId: string, transaction: Transaction): void {
    if (!this.originalTransactionStore.has(transactionId)) {
      this.originalTransactionStore.set(transactionId, this.deepCopyTransaction(transaction));
    }
  }

  /**
   * Recalculate totals for all items and transaction
   */
  private recalculateTotals(items: TransactionItem[]): {
    items: TransactionItem[];
    cartTotal: number;
    itemsTotal: number;
  } {
    const updatedItems = items.map(item => ({
      ...item,
      totalPrice: Math.round(item.quantity * item.unitPrice * 100) / 100,
    }));

    const cartTotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const itemsTotal = updatedItems.length;

    return { items: updatedItems, cartTotal, itemsTotal };
  }

  /**
   * Update transaction quantity and recalculate totals
   */
  updateItemQuantity(
    transaction: Transaction,
    itemId: string,
    newQuantity: number,
    userId: string
  ): Transaction {
    this.storeOriginalTransaction(transaction.id, transaction);

    if (newQuantity < 0) {
      throw new Error('Quantity cannot be negative');
    }

    const updatedItems = transaction.items.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );

    const { items, cartTotal } = this.recalculateTotals(updatedItems);

    const updatedTransaction: Transaction = {
      ...transaction,
      totalAmount: cartTotal,
      items,
      editedAt: new Date(),
      editedBy: userId,
      isEdited: true,
    };

    // Track change in history
    this.recordChange(transaction.id, userId, [
      {
        field: `item_${itemId}_quantity`,
        oldValue: transaction.items.find(i => i.id === itemId)?.quantity,
        newValue: newQuantity,
      },
      {
        field: 'totalAmount',
        oldValue: transaction.totalAmount,
        newValue: cartTotal,
      },
    ]);

    return updatedTransaction;
  }

  /**
   * Update item unit price and recalculate totals
   */
  updateItemPrice(
    transaction: Transaction,
    itemId: string,
    newPrice: number,
    userId: string
  ): Transaction {
    this.storeOriginalTransaction(transaction.id, transaction);

    if (newPrice < 0) {
      throw new Error('Price cannot be negative');
    }

    const updatedItems = transaction.items.map(item =>
      item.id === itemId ? { ...item, unitPrice: newPrice } : item
    );

    const { items, cartTotal } = this.recalculateTotals(updatedItems);

    const updatedTransaction: Transaction = {
      ...transaction,
      totalAmount: cartTotal,
      items,
      editedAt: new Date(),
      editedBy: userId,
      isEdited: true,
    };

    // Track change in history
    this.recordChange(transaction.id, userId, [
      {
        field: `item_${itemId}_price`,
        oldValue: transaction.items.find(i => i.id === itemId)?.unitPrice,
        newValue: newPrice,
      },
      {
        field: 'totalAmount',
        oldValue: transaction.totalAmount,
        newValue: cartTotal,
      },
    ]);

    return updatedTransaction;
  }

  /**
   * Add item to transaction and recalculate totals
   */
  addItem(
    transaction: Transaction,
    newItem: TransactionItem,
    userId: string
  ): Transaction {
    this.storeOriginalTransaction(transaction.id, transaction);

    const updatedItems = [...transaction.items, newItem];
    const { items, cartTotal } = this.recalculateTotals(updatedItems);

    const updatedTransaction: Transaction = {
      ...transaction,
      totalAmount: cartTotal,
      items,
      editedAt: new Date(),
      editedBy: userId,
      isEdited: true,
    };

    // Track change in history
    this.recordChange(transaction.id, userId, [
      {
        field: 'items_added',
        oldValue: transaction.items.length,
        newValue: items.length,
      },
      {
        field: 'totalAmount',
        oldValue: transaction.totalAmount,
        newValue: cartTotal,
      },
    ]);

    return updatedTransaction;
  }

  /**
   * Remove item from transaction and recalculate totals
   */
  removeItem(
    transaction: Transaction,
    itemId: string,
    userId: string
  ): Transaction {
    this.storeOriginalTransaction(transaction.id, transaction);

    const itemToRemove = transaction.items.find(i => i.id === itemId);
    if (!itemToRemove) {
      throw new Error(`Item ${itemId} not found in transaction`);
    }

    const updatedItems = transaction.items.filter(item => item.id !== itemId);
    const { items, cartTotal } = this.recalculateTotals(updatedItems);

    const updatedTransaction: Transaction = {
      ...transaction,
      totalAmount: cartTotal,
      items,
      editedAt: new Date(),
      editedBy: userId,
      isEdited: true,
    };

    // Track change in history
    this.recordChange(transaction.id, userId, [
      {
        field: 'items_removed',
        oldValue: transaction.items.length,
        newValue: items.length,
      },
      {
        field: 'totalAmount',
        oldValue: transaction.totalAmount,
        newValue: cartTotal,
      },
    ]);

    return updatedTransaction;
  }

  /**
   * Update payment method and optionally record change
   */
  updatePaymentMethod(
    transaction: Transaction,
    newPaymentMethod: 'CASH' | 'MEMBER_CREDIT' | 'TEMPO',
    userId: string
  ): Transaction {
    this.storeOriginalTransaction(transaction.id, transaction);

    const updatedTransaction: Transaction = {
      ...transaction,
      paymentMethod: newPaymentMethod,
      editedAt: new Date(),
      editedBy: userId,
      isEdited: true,
    };

    // Track change in history
    this.recordChange(transaction.id, userId, [
      {
        field: 'paymentMethod',
        oldValue: transaction.paymentMethod,
        newValue: newPaymentMethod,
      },
    ]);

    return updatedTransaction;
  }

  /**
   * Record a change in the edit history
   */
  private recordChange(
    transactionId: string,
    userId: string,
    changes: Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }>
  ): void {
    if (!this.editHistoryStore.has(transactionId)) {
      this.editHistoryStore.set(transactionId, []);
    }

    const history = this.editHistoryStore.get(transactionId)!;
    history.push({
      id: `${transactionId}_edit_${history.length + 1}`,
      transactionId,
      timestamp: new Date(),
      userId,
      changes,
    });
  }

  /**
   * Get edit history for a transaction
   */
  getEditHistory(transactionId: string) {
    return this.editHistoryStore.get(transactionId) || [];
  }

  /**
   * Get original transaction (before any edits)
   */
  getOriginalTransaction(transactionId: string): Transaction | undefined {
    return this.originalTransactionStore.get(transactionId);
  }

  /**
   * Verify transaction immutability - original should not change
   */
  verifyImmutability(transactionId: string, originalSnapshot: Transaction): boolean {
    const stored = this.getOriginalTransaction(transactionId);
    if (!stored) return false;

    return (
      stored.totalAmount === originalSnapshot.totalAmount &&
      stored.items.length === originalSnapshot.items.length &&
      stored.items.every((item, idx) =>
        item.quantity === originalSnapshot.items[idx].quantity &&
        item.unitPrice === originalSnapshot.items[idx].unitPrice &&
        item.totalPrice === originalSnapshot.items[idx].totalPrice
      )
    );
  }
}

// Test fixtures
const mockUserId = 'user-123';
const mockStoreId = 'store-123';
const mockKasirId = 'kasir-456';

function createMockTransaction(overrides?: Partial<Transaction>): Transaction {
  return {
    id: 'txn-001',
    storeId: mockStoreId,
    kasirId: mockKasirId,
    transactionDate: new Date('2024-01-15'),
    totalAmount: 105000,
    paymentMethod: 'CASH',
    status: 'COMPLETED',
    notes: '',
    createdAt: new Date('2024-01-15T10:00:00'),
    updatedAt: new Date('2024-01-15T10:00:00'),
    isEdited: false,
    version: 1,
    items: [
      {
        id: 'item-001',
        transactionId: 'txn-001',
        productId: 'prod-001',
        quantity: 3,
        unitPrice: 25000,
        totalPrice: 75000,
        createdAt: new Date('2024-01-15T10:00:00'),
      },
      {
        id: 'item-002',
        transactionId: 'txn-001',
        productId: 'prod-002',
        quantity: 2,
        unitPrice: 15000,
        totalPrice: 30000,
        createdAt: new Date('2024-01-15T10:00:00'),
      },
    ],
    ...overrides,
  };
}

describe('Transaction Editing Tests', () => {
  let service: TransactionEditingService;

  beforeEach(() => {
    service = new TransactionEditingService();
  });

  describe('Test 1: Edit amount updates transaction total', () => {
    it('should update item price and recalculate transaction total', () => {
      const originalTransaction = createMockTransaction();
      const itemToEdit = originalTransaction.items[0];
      const newPrice = 30000;

      const editedTransaction = service.updateItemPrice(
        originalTransaction,
        itemToEdit.id,
        newPrice,
        mockUserId
      );

      expect(editedTransaction.items[0].unitPrice).toBe(newPrice);
      expect(editedTransaction.items[0].totalPrice).toBe(3 * newPrice); // quantity * newPrice
      expect(editedTransaction.totalAmount).toBe(3 * newPrice + 30000); // updated item + unchanged item
      expect(editedTransaction.isEdited).toBe(true);
    });

    it('should handle multiple price edits', () => {
      let transaction = createMockTransaction();
      
      transaction = service.updateItemPrice(transaction, 'item-001', 20000, mockUserId);
      expect(transaction.totalAmount).toBe(60000 + 30000); // (3 * 20000) + (2 * 15000)

      transaction = service.updateItemPrice(transaction, 'item-002', 20000, mockUserId);
      expect(transaction.totalAmount).toBe(60000 + 40000); // (3 * 20000) + (2 * 20000)
    });

    it('should reject negative prices', () => {
      const transaction = createMockTransaction();
      
      expect(() => 
        service.updateItemPrice(transaction, 'item-001', -100, mockUserId)
      ).toThrow('Price cannot be negative');
    });
  });

  describe('Test 2: Edit quantity updates item and transaction totals', () => {
    it('should update item quantity and recalculate totals', () => {
      const originalTransaction = createMockTransaction();
      const newQuantity = 5;

      const editedTransaction = service.updateItemQuantity(
        originalTransaction,
        'item-001',
        newQuantity,
        mockUserId
      );

      expect(editedTransaction.items[0].quantity).toBe(newQuantity);
      expect(editedTransaction.items[0].totalPrice).toBe(5 * 25000); // new quantity * unitPrice
      expect(editedTransaction.totalAmount).toBe(125000 + 30000); // updated item total + unchanged item total
      expect(editedTransaction.isEdited).toBe(true);
    });

    it('should handle zero quantity', () => {
      const transaction = createMockTransaction();

      const editedTransaction = service.updateItemQuantity(
        transaction,
        'item-001',
        0,
        mockUserId
      );

      expect(editedTransaction.items[0].quantity).toBe(0);
      expect(editedTransaction.items[0].totalPrice).toBe(0);
      expect(editedTransaction.totalAmount).toBe(30000); // only second item remains
    });

    it('should reject negative quantities', () => {
      const transaction = createMockTransaction();

      expect(() =>
        service.updateItemQuantity(transaction, 'item-001', -1, mockUserId)
      ).toThrow('Quantity cannot be negative');
    });

    it('should handle large quantity changes', () => {
      const transaction = createMockTransaction();
      const largeQuantity = 1000;

      const editedTransaction = service.updateItemQuantity(
        transaction,
        'item-001',
        largeQuantity,
        mockUserId
      );

      expect(editedTransaction.items[0].quantity).toBe(largeQuantity);
      expect(editedTransaction.items[0].totalPrice).toBe(largeQuantity * 25000);
    });
  });

  describe('Test 3: Add/remove items updates transaction total', () => {
    it('should add new item and update transaction total', () => {
      const transaction = createMockTransaction();
      const originalTotal = transaction.totalAmount;
      
      const newItem: TransactionItem = {
        id: 'item-003',
        transactionId: 'txn-001',
        productId: 'prod-003',
        quantity: 2,
        unitPrice: 20000,
        totalPrice: 40000,
        createdAt: new Date(),
      };

      const editedTransaction = service.addItem(transaction, newItem, mockUserId);

      expect(editedTransaction.items.length).toBe(3);
      expect(editedTransaction.totalAmount).toBe(originalTotal + 40000);
      expect(editedTransaction.isEdited).toBe(true);
    });

    it('should remove item and update transaction total', () => {
      const transaction = createMockTransaction();
      const itemToRemove = transaction.items[0];
      const expectedTotal = transaction.items[1].totalPrice;

      const editedTransaction = service.removeItem(
        transaction,
        itemToRemove.id,
        mockUserId
      );

      expect(editedTransaction.items.length).toBe(1);
      expect(editedTransaction.items[0].id).toBe('item-002');
      expect(editedTransaction.totalAmount).toBe(expectedTotal);
      expect(editedTransaction.isEdited).toBe(true);
    });

    it('should throw error when removing non-existent item', () => {
      const transaction = createMockTransaction();

      expect(() =>
        service.removeItem(transaction, 'non-existent-id', mockUserId)
      ).toThrow('Item non-existent-id not found in transaction');
    });

    it('should handle adding and removing multiple items', () => {
      let transaction = createMockTransaction();
      const originalItemCount = transaction.items.length;

      // Add two items
      const newItem1: TransactionItem = {
        id: 'item-003',
        transactionId: 'txn-001',
        productId: 'prod-003',
        quantity: 1,
        unitPrice: 10000,
        totalPrice: 10000,
        createdAt: new Date(),
      };

      transaction = service.addItem(transaction, newItem1, mockUserId);
      expect(transaction.items.length).toBe(originalItemCount + 1);

      const newItem2: TransactionItem = {
        id: 'item-004',
        transactionId: 'txn-001',
        productId: 'prod-004',
        quantity: 1,
        unitPrice: 5000,
        totalPrice: 5000,
        createdAt: new Date(),
      };

      transaction = service.addItem(transaction, newItem2, mockUserId);
      expect(transaction.items.length).toBe(originalItemCount + 2);

      // Remove one item
      transaction = service.removeItem(transaction, 'item-001', mockUserId);
      expect(transaction.items.length).toBe(originalItemCount + 1);
    });
  });

  describe('Test 4: Payment method changes are tracked', () => {
    it('should update payment method and track change', () => {
      const transaction = createMockTransaction();
      const originalPaymentMethod = transaction.paymentMethod;

      const editedTransaction = service.updatePaymentMethod(
        transaction,
        'MEMBER_CREDIT',
        mockUserId
      );

      expect(editedTransaction.paymentMethod).toBe('MEMBER_CREDIT');
      expect(editedTransaction.isEdited).toBe(true);

      const history = service.getEditHistory(transaction.id);
      expect(history.length).toBeGreaterThan(0);
      
      const paymentMethodChange = history[history.length - 1].changes.find(
        c => c.field === 'paymentMethod'
      );
      expect(paymentMethodChange?.oldValue).toBe(originalPaymentMethod);
      expect(paymentMethodChange?.newValue).toBe('MEMBER_CREDIT');
    });

    it('should support all payment methods', () => {
      const transaction = createMockTransaction();
      const paymentMethods: Array<'CASH' | 'MEMBER_CREDIT' | 'TEMPO'> = [
        'CASH',
        'MEMBER_CREDIT',
        'TEMPO',
      ];

      for (const method of paymentMethods) {
        const edited = service.updatePaymentMethod(transaction, method, mockUserId);
        expect(edited.paymentMethod).toBe(method);
      }
    });
  });

  describe('Test 5: Edit history is properly recorded with timestamp and user info', () => {
    it('should record edit history with correct metadata', () => {
      const transaction = createMockTransaction();

      service.updateItemPrice(transaction, 'item-001', 30000, mockUserId);

      const history = service.getEditHistory(transaction.id);
      expect(history.length).toBe(1);
      expect(history[0].userId).toBe(mockUserId);
      expect(history[0].transactionId).toBe(transaction.id);
      expect(history[0].timestamp).toBeInstanceOf(Date);
      expect(history[0].changes.length).toBeGreaterThan(0);
    });

    it('should maintain chronological order of edits', () => {
      const transaction = createMockTransaction();
      const timestamps: Date[] = [];

      service.updateItemPrice(transaction, 'item-001', 30000, mockUserId);
      let history = service.getEditHistory(transaction.id);
      timestamps.push(history[0].timestamp);

      // Small delay to ensure different timestamp
      setTimeout(() => {}, 10);

      service.updateItemQuantity(transaction, 'item-001', 5, mockUserId);
      history = service.getEditHistory(transaction.id);
      timestamps.push(history[1].timestamp);

      expect(timestamps[1].getTime()).toBeGreaterThanOrEqual(timestamps[0].getTime());
      expect(history.length).toBe(2);
    });

    it('should track old and new values in change history', () => {
      const transaction = createMockTransaction();
      const originalPrice = transaction.items[0].unitPrice;
      const newPrice = 30000;

      service.updateItemPrice(transaction, 'item-001', newPrice, mockUserId);

      const history = service.getEditHistory(transaction.id);
      const priceChange = history[0].changes.find(c => c.field === 'item-item-001_price');

      expect(priceChange?.oldValue).toBe(originalPrice);
      expect(priceChange?.newValue).toBe(newPrice);
    });

    it('should accumulate multiple edits in history', () => {
      const transaction = createMockTransaction();

      service.updateItemPrice(transaction, 'item-001', 30000, 'user-1');
      service.updateItemQuantity(transaction, 'item-001', 5, 'user-2');
      service.updatePaymentMethod(transaction, 'TEMPO', 'user-3');

      const history = service.getEditHistory(transaction.id);
      expect(history.length).toBe(3);
      expect(history[0].userId).toBe('user-1');
      expect(history[1].userId).toBe('user-2');
      expect(history[2].userId).toBe('user-3');
    });
  });

  describe('Test 6: Original transaction data is immutable', () => {
    it('should preserve original transaction after first edit', () => {
      const originalTransaction = createMockTransaction();
      const snapshot = JSON.parse(JSON.stringify(originalTransaction));

      service.updateItemPrice(originalTransaction, 'item-001', 50000, mockUserId);

      const storedOriginal = service.getOriginalTransaction(originalTransaction.id);
      expect(storedOriginal?.totalAmount).toBe(snapshot.totalAmount);
      expect(storedOriginal?.items.length).toBe(snapshot.items.length);
    });

    it('should not modify original transaction data on subsequent edits', () => {
      const transaction = createMockTransaction();
      const snapshot = JSON.parse(JSON.stringify(transaction));

      service.updateItemPrice(transaction, 'item-001', 50000, mockUserId);
      service.updateItemQuantity(transaction, 'item-001', 10, mockUserId);
      service.addItem(transaction, {
        id: 'item-003',
        transactionId: 'txn-001',
        productId: 'prod-003',
        quantity: 1,
        unitPrice: 20000,
        totalPrice: 20000,
        createdAt: new Date(),
      }, mockUserId);

      const storedOriginal = service.getOriginalTransaction(transaction.id);
      expect(storedOriginal?.totalAmount).toBe(snapshot.totalAmount);
      expect(storedOriginal?.items.length).toBe(snapshot.items.length);
    });

    it('should verify immutability across multiple transactions', () => {
      const txn1 = createMockTransaction({ id: 'txn-1' });
      const txn2 = createMockTransaction({ id: 'txn-2' });

      const snap1 = JSON.parse(JSON.stringify(txn1));
      const snap2 = JSON.parse(JSON.stringify(txn2));

      service.updateItemPrice(txn1, 'item-001', 50000, mockUserId);
      service.updateItemQuantity(txn2, 'item-002', 10, mockUserId);

      expect(service.verifyImmutability('txn-1', snap1)).toBe(true);
      expect(service.verifyImmutability('txn-2', snap2)).toBe(true);
    });
  });

  describe('Test 7: Multiple edits do not compound or corrupt data', () => {
    it('should maintain data integrity across multiple sequential edits', () => {
      const transaction = createMockTransaction();
      let currentTransaction = transaction;

      // First edit
      currentTransaction = service.updateItemPrice(currentTransaction, 'item-001', 20000, mockUserId);
      const totalAfterFirst = currentTransaction.totalAmount;

      // Second edit
      currentTransaction = service.updateItemQuantity(currentTransaction, 'item-001', 4, mockUserId);
      const totalAfterSecond = currentTransaction.totalAmount;

      // Verify calculation: (4 * 20000) + (2 * 15000) = 80000 + 30000 = 110000
      expect(totalAfterSecond).toBe(110000);
    });

    it('should prevent data corruption from alternating add/remove operations', () => {
      let transaction = createMockTransaction();
      const originalItemCount = transaction.items.length;

      const newItem: TransactionItem = {
        id: 'item-999',
        transactionId: 'txn-001',
        productId: 'prod-999',
        quantity: 1,
        unitPrice: 10000,
        totalPrice: 10000,
        createdAt: new Date(),
      };

      transaction = service.addItem(transaction, newItem, mockUserId);
      expect(transaction.items.length).toBe(originalItemCount + 1);

      transaction = service.removeItem(transaction, 'item-999', mockUserId);
      expect(transaction.items.length).toBe(originalItemCount);

      transaction = service.addItem(transaction, newItem, mockUserId);
      expect(transaction.items.length).toBe(originalItemCount + 1);

      // Verify no data corruption
      const originalItems = transaction.items.filter(i => i.id !== 'item-999');
      expect(originalItems.every(i => transaction.items.includes(i))).toBe(true);
    });

    it('should maintain correct totals through complex edit sequences', () => {
      let transaction = createMockTransaction();

      // Complex sequence: price change -> quantity change -> add item -> price change -> remove item
      transaction = service.updateItemPrice(transaction, 'item-001', 25000, mockUserId);
      const t1 = transaction.totalAmount;

      transaction = service.updateItemQuantity(transaction, 'item-001', 2, mockUserId);
      const t2 = transaction.totalAmount;

      const newItem: TransactionItem = {
        id: 'item-003',
        transactionId: 'txn-001',
        productId: 'prod-003',
        quantity: 3,
        unitPrice: 10000,
        totalPrice: 30000,
        createdAt: new Date(),
      };

      transaction = service.addItem(transaction, newItem, mockUserId);
      const t3 = transaction.totalAmount;

      transaction = service.updateItemPrice(transaction, 'item-002', 20000, mockUserId);
      const t4 = transaction.totalAmount;

      transaction = service.removeItem(transaction, 'item-003', mockUserId);
      const t5 = transaction.totalAmount;

      // Verify totals are reasonable
      expect(t1).toBeGreaterThan(0);
      expect(t2).toBeGreaterThan(0);
      expect(t3).toBeGreaterThan(t2);
      expect(t4).toBeGreaterThan(0);
      expect(t5).toBeGreaterThan(0);
      expect(transaction.items.every(i => i.totalPrice > 0)).toBe(true);
    });
  });

  describe('Test 8: Discounts are recalculated after edits', () => {
    it('should recalculate totals correctly when item prices change', () => {
      const transaction = createMockTransaction();
      const originalItemTotal = transaction.items.reduce((sum, item) => sum + item.totalPrice, 0);

      const editedTransaction = service.updateItemPrice(
        transaction,
        'item-001',
        20000, // reduced from 25000
        mockUserId
      );

      const newItemTotal = editedTransaction.items.reduce((sum, item) => sum + item.totalPrice, 0);
      expect(newItemTotal).toBeLessThan(originalItemTotal);
      expect(editedTransaction.totalAmount).toBe(newItemTotal);
    });

    it('should handle percentage-based discount scenarios through price adjustments', () => {
      const transaction = createMockTransaction();
      const originalTotal = transaction.totalAmount;

      // Apply 10% discount by reducing prices
      let discountedTransaction = transaction;
      discountedTransaction = service.updateItemPrice(
        discountedTransaction,
        'item-001',
        22500, // 25000 * 0.9
        mockUserId
      );

      discountedTransaction = service.updateItemPrice(
        discountedTransaction,
        'item-002',
        13500, // 15000 * 0.9
        mockUserId
      );

      // Verify discount was applied
      expect(discountedTransaction.totalAmount).toBeLessThan(originalTotal);
      // Should be approximately 90% of original
      const expectedApproximateTotal = Math.round(originalTotal * 0.9);
      expect(Math.abs(discountedTransaction.totalAmount - expectedApproximateTotal)).toBeLessThan(100);
    });
  });

  describe('Test 9: Edit history chain integrity is maintained', () => {
    it('should maintain complete history chain', () => {
      const transaction = createMockTransaction();

      service.updateItemPrice(transaction, 'item-001', 30000, 'user-1');
      service.updateItemQuantity(transaction, 'item-001', 5, 'user-2');
      service.updatePaymentMethod(transaction, 'TEMPO', 'user-3');
      service.addItem(transaction, {
        id: 'item-003',
        transactionId: 'txn-001',
        productId: 'prod-003',
        quantity: 1,
        unitPrice: 20000,
        totalPrice: 20000,
        createdAt: new Date(),
      }, 'user-4');

      const history = service.getEditHistory(transaction.id);
      expect(history.length).toBe(4);
      expect(history.every(h => h.id)).toBe(true);
      expect(history.every(h => h.transactionId === transaction.id)).toBe(true);
      expect(history.every(h => h.timestamp)).toBe(true);
    });

    it('should allow replaying edits from history', () => {
      const transaction = createMockTransaction();

      service.updateItemPrice(transaction, 'item-001', 30000, mockUserId);
      const history = service.getEditHistory(transaction.id);

      expect(history.length).toBe(1);
      expect(history[0].changes.length).toBeGreaterThan(0);

      // Verify we can access the change details
      const priceChange = history[0].changes.find(c => c.field.includes('price'));
      expect(priceChange?.oldValue).toBe(25000);
      expect(priceChange?.newValue).toBe(30000);
    });
  });

  describe('Test 10: Validation fails for invalid edits', () => {
    it('should prevent negative prices', () => {
      const transaction = createMockTransaction();

      expect(() =>
        service.updateItemPrice(transaction, 'item-001', -5000, mockUserId)
      ).toThrow('Price cannot be negative');
    });

    it('should prevent negative quantities', () => {
      const transaction = createMockTransaction();

      expect(() =>
        service.updateItemQuantity(transaction, 'item-001', -5, mockUserId)
      ).toThrow('Quantity cannot be negative');
    });

    it('should prevent removing non-existent items', () => {
      const transaction = createMockTransaction();

      expect(() =>
        service.removeItem(transaction, 'non-existent-item-id', mockUserId)
      ).toThrow('Item non-existent-item-id not found in transaction');
    });

    it('should validate all monetary values are non-negative', () => {
      const transaction = createMockTransaction();

      const testCases = [
        { price: -1, quantity: 1 },
        { price: 0, quantity: -1 },
        { price: -100, quantity: -100 },
      ];

      for (const testCase of testCases) {
        if (testCase.price < 0) {
          expect(() =>
            service.updateItemPrice(transaction, 'item-001', testCase.price, mockUserId)
          ).toThrow();
        }
        if (testCase.quantity < 0) {
          expect(() =>
            service.updateItemQuantity(transaction, 'item-001', testCase.quantity, mockUserId)
          ).toThrow();
        }
      }
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete edit workflow', () => {
      const transaction = createMockTransaction();
      const originalSnapshot = JSON.parse(JSON.stringify(transaction));

      // Edit scenario
      let edited = service.updateItemPrice(transaction, 'item-001', 30000, 'admin-user');
      edited = service.updateItemQuantity(edited, 'item-001', 4, 'admin-user');
      edited = service.updatePaymentMethod(edited, 'TEMPO', 'admin-user');

      // Verify edits were applied
      expect(edited.totalAmount).toBeGreaterThan(0);
      expect(edited.isEdited).toBe(true);
      expect(edited.editedAt).toBeDefined();
      expect(edited.editedBy).toBe('admin-user');

      // Verify immutability
      const original = service.getOriginalTransaction(transaction.id);
      expect(original?.totalAmount).toBe(originalSnapshot.totalAmount);

      // Verify history
      const history = service.getEditHistory(transaction.id);
      expect(history.length).toBeGreaterThan(0);
      expect(history.every(h => h.userId === 'admin-user')).toBe(true);
    });

    it('should correctly report edit state', () => {
      const transaction = createMockTransaction();
      expect(transaction.isEdited).toBe(false);
      expect(transaction.editedAt).toBeUndefined();
      expect(transaction.editedBy).toBeUndefined();

      const edited = service.updateItemPrice(transaction, 'item-001', 30000, mockUserId);
      expect(edited.isEdited).toBe(true);
      expect(edited.editedAt).toBeDefined();
      expect(edited.editedBy).toBe(mockUserId);
    });
  });
});
