/**
 * Transaction Submission and Storage Tests
 * Comprehensive tests for complete transaction submission workflow
 * Validates: Requirement 7.9 - Transaction submission, stock deduction, transaction ID generation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  validateMemberCredit,
  deductMemberCredit,
  createTransaction,
} from './transaction.js';
import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

describe('Transaction Submission and Storage - Requirement 7.9', () => {
  let testStoreId: string;
  let testKasirId: string;
  let testProductId1: string;
  let testProductId2: string;
  let testMemberId: string;
  const now = new Date();

  beforeAll(async () => {
    // Create test data
    testStoreId = uuidv4();
    testKasirId = uuidv4();
    testProductId1 = uuidv4();
    testProductId2 = uuidv4();
    testMemberId = uuidv4();

    // Create test store
    await db.query(
      `INSERT INTO stores 
       (id, name, is_active, created_at, updated_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [testStoreId, 'Test Store for Submission', true, now, now, '{}']
    );

    // Create test kasir user
    await db.query(
      `INSERT INTO users 
       (id, username, email, password_hash, role, store_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testKasirId, 'test_kasir', 'kasir@test.com', 'hash', 'KASIR', testStoreId, true, now, now]
    );

    // Create test member
    await db.query(
      `INSERT INTO members 
       (id, member_number, name, phone, credit_balance, total_spent, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [testMemberId, 'MBR_SUB_TEST', 'Member for Submission Test', '081234567890', '10000000', '0', true, now, now]
    );

    // Create test products
    await db.query(
      `INSERT INTO products 
       (id, name, sku, cost_price, selling_price, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [testProductId1, 'Product 1', 'SKU_P1', '100000', '150000', true, now, now]
    );

    await db.query(
      `INSERT INTO products 
       (id, name, sku, cost_price, selling_price, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [testProductId2, 'Product 2', 'SKU_P2', '200000', '300000', true, now, now]
    );

    // Create inventory for products
    await db.query(
      `INSERT INTO inventory 
       (id, product_id, store_id, quantity, reserved, reorder_level, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), testProductId1, testStoreId, 100, 0, 10, now, now]
    );

    await db.query(
      `INSERT INTO inventory 
       (id, product_id, store_id, quantity, reserved, reorder_level, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [uuidv4(), testProductId2, testStoreId, 50, 0, 10, now, now]
    );
  });

  afterAll(async () => {
    // Cleanup
    if (db) {
      // Delete transactions first (they have foreign keys)
      await db.query('DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE store_id = $1)', [testStoreId]);
      await db.query('DELETE FROM transactions WHERE store_id = $1', [testStoreId]);
      await db.query('DELETE FROM piutang WHERE member_id = $1 OR transaction_id IS NULL', [testMemberId]);
      
      // Delete inventory
      await db.query('DELETE FROM inventory WHERE product_id = $1 OR product_id = $2', [testProductId1, testProductId2]);
      
      // Delete products
      await db.query('DELETE FROM products WHERE id = $1 OR id = $2', [testProductId1, testProductId2]);
      
      // Delete member
      await db.query('DELETE FROM members WHERE id = $1', [testMemberId]);
      
      // Delete user
      await db.query('DELETE FROM users WHERE id = $1', [testKasirId]);
      
      // Delete store
      await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
    }
  });

  describe('Cash Payment Transactions', () => {
    it('should create transaction with cash payment and generate unique ID', async () => {
      const transactionRequest = {
        storeId: testStoreId,
        kasirId: testKasirId,
        items: [
          {
            productId: testProductId1,
            quantity: 2,
            unitPrice: 150000,
            totalPrice: 300000,
          },
        ],
        paymentMethod: 'CASH' as const,
        paymentData: {
          cash: {
            amountReceived: 500000,
            change: 200000,
          },
        },
        notes: 'Cash payment test',
      };

      const result = await createTransaction(transactionRequest);

      expect(result.success).toBe(true);
      expect(result.transaction).toBeDefined();
      expect(result.transaction?.id).toBeDefined();
      expect(result.transaction?.id).toMatch(/^[0-9a-f\-]{36}$/); // UUID format
      expect(result.transaction?.totalAmount).toBe(300000);
      expect(result.transaction?.paymentMethod).toBe('CASH');
      expect(result.transaction?.status).toBe('COMPLETED');
      expect(result.transaction?.items.length).toBe(1);
    });

    it('should deduct inventory on transaction completion', async () => {
      // Get initial inventory
      const beforeResult = await db.query(
        'SELECT quantity FROM inventory WHERE product_id = $1 AND store_id = $2',
        [testProductId1, testStoreId]
      );
      const initialQuantity = beforeResult.rows[0].quantity;

      // Create transaction
      const transactionRequest = {
        storeId: testStoreId,
        kasirId: testKasirId,
        items: [
          {
            productId: testProductId1,
            quantity: 5,
            unitPrice: 150000,
            totalPrice: 750000,
          },
        ],
        paymentMethod: 'CASH' as const,
        paymentData: {
          cash: {
            amountReceived: 800000,
            change: 50000,
          },
        },
      };

      const result = await createTransaction(transactionRequest);
      expect(result.success).toBe(true);

      // Verify inventory was deducted
      const afterResult = await db.query(
        'SELECT quantity FROM inventory WHERE product_id = $1 AND store_id = $2',
        [testProductId1, testStoreId]
      );
      const finalQuantity = afterResult.rows[0].quantity;

      expect(finalQuantity).toBe(initialQuantity - 5);
    });

    it('should store transaction with items in database', async () => {
      const transactionRequest = {
        storeId: testStoreId,
        kasirId: testKasirId,
        items: [
          {
            productId: testProductId1,
            quantity: 1,
            unitPrice: 150000,
            totalPrice: 150000,
          },
          {
            productId: testProductId2,
            quantity: 2,
            unitPrice: 300000,
            totalPrice: 600000,
          },
        ],
        paymentMethod: 'CASH' as const,
        paymentData: {
          cash: {
            amountReceived: 1000000,
            change: 250000,
          },
        },
      };

      const result = await createTransaction(transactionRequest);
      expect(result.success).toBe(true);
      const txnId = result.transaction?.id;

      // Verify transaction in database
      const txnResult = await db.query(
        'SELECT * FROM transactions WHERE id = $1',
        [txnId]
      );
      expect(txnResult.rows.length).toBe(1);
      expect(txnResult.rows[0].total_amount).toBe('750000');
      expect(txnResult.rows[0].payment_method).toBe('CASH');
      expect(txnResult.rows[0].status).toBe('COMPLETED');

      // Verify transaction items in database
      const itemsResult = await db.query(
        'SELECT * FROM transaction_items WHERE transaction_id = $1 ORDER BY created_at',
        [txnId]
      );
      expect(itemsResult.rows.length).toBe(2);
      expect(itemsResult.rows[0].product_id).toBe(testProductId1);
      expect(itemsResult.rows[0].quantity).toBe(1);
      expect(itemsResult.rows[1].product_id).toBe(testProductId2);
      expect(itemsResult.rows[1].quantity).toBe(2);
    });
  });

  describe('Member Credit Payment Transactions', () => {
    it('should create transaction with member credit payment', async () => {
      const transactionRequest = {
        storeId: testStoreId,
        kasirId: testKasirId,
        items: [
          {
            productId: testProductId1,
            quantity: 1,
            unitPrice: 150000,
            totalPrice: 150000,
          },
        ],
        paymentMethod: 'MEMBER_CREDIT' as const,
        paymentData: {
          memberCredit: {
            memberId: testMemberId,
            memberName: 'Member for Submission Test',
            usedCredit: 150000,
          },
        },
      };

      const result = await createTransaction(transactionRequest);

      expect(result.success).toBe(true);
      expect(result.transaction?.paymentMethod).toBe('MEMBER_CREDIT');
      expect(result.transaction?.status).toBe('COMPLETED');
    });

    it('should deduct member credit on successful transaction', async () => {
      const beforeResult = await db.query(
        'SELECT credit_balance FROM members WHERE id = $1',
        [testMemberId]
      );
      const initialBalance = Number(beforeResult.rows[0].credit_balance);

      const transactionRequest = {
        storeId: testStoreId,
        kasirId: testKasirId,
        items: [
          {
            productId: testProductId1,
            quantity: 1,
            unitPrice: 150000,
            totalPrice: 150000,
          },
        ],
        paymentMethod: 'MEMBER_CREDIT' as const,
        paymentData: {
          memberCredit: {
            memberId: testMemberId,
            memberName: 'Member for Submission Test',
            usedCredit: 150000,
          },
        },
      };

      const result = await createTransaction(transactionRequest);
      expect(result.success).toBe(true);

      const afterResult = await db.query(
        'SELECT credit_balance FROM members WHERE id = $1',
        [testMemberId]
      );
      const finalBalance = Number(afterResult.rows[0].credit_balance);

      expect(finalBalance).toBe(initialBalance - 150000);
    });

    it('should prevent transaction with insufficient member credit', async () => {
      const transactionRequest = {
        storeId: testStoreId,
        kasirId: testKasirId,
        items: [
          {
            productId: testProductId1,
            quantity: 1,
            unitPrice: 150000,
            totalPrice: 150000,
          },
        ],
        paymentMethod: 'MEMBER_CREDIT' as const,
        paymentData: {
          memberCredit: {
            memberId: testMemberId,
            memberName: 'Member for Submission Test',
            usedCredit: 15000000, // More than available
          },
        },
      };

      const result = await createTransaction(transactionRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient credit');
    });
  });

  describe('Tempo Payment Transactions', () => {
    it('should create transaction with tempo payment', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const transactionRequest = {
        storeId: testStoreId,
        kasirId: testKasirId,
        items: [
          {
            productId: testProductId1,
            quantity: 1,
            unitPrice: 150000,
            totalPrice: 150000,
          },
        ],
        paymentMethod: 'TEMPO' as const,
        paymentData: {
          tempo: {
            customerName: 'John Doe',
            customerPhone: '081234567890',
            durationDays: 7,
            dueDate: futureDate.toISOString().split('T')[0],
          },
        },
      };

      const result = await createTransaction(transactionRequest);

      expect(result.success).toBe(true);
      expect(result.transaction?.paymentMethod).toBe('TEMPO');
      expect(result.transaction?.status).toBe('COMPLETED');
    });

    it('should create piutang record for tempo payment', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      const dueDateStr = futureDate.toISOString().split('T')[0];

      const transactionRequest = {
        storeId: testStoreId,
        kasirId: testKasirId,
        items: [
          {
            productId: testProductId2,
            quantity: 1,
            unitPrice: 300000,
            totalPrice: 300000,
          },
        ],
        paymentMethod: 'TEMPO' as const,
        paymentData: {
          tempo: {
            customerName: 'Jane Doe',
            customerPhone: '089876543210',
            durationDays: 14,
            dueDate: dueDateStr,
          },
        },
      };

      const result = await createTransaction(transactionRequest);
      expect(result.success).toBe(true);
      const txnId = result.transaction?.id;

      // Verify piutang was created
      const piutangResult = await db.query(
        'SELECT * FROM piutang WHERE transaction_id = $1',
        [txnId]
      );
      expect(piutangResult.rows.length).toBe(1);
      expect(piutangResult.rows[0].amount).toBe('300000');
      expect(piutangResult.rows[0].remaining_balance).toBe('300000');
      expect(piutangResult.rows[0].status).toBe('OPEN');
    });
  });

  describe('Transaction Validation', () => {
    it('should reject transaction with no items', async () => {
      const transactionRequest = {
        storeId: testStoreId,
        kasirId: testKasirId,
        items: [],
        paymentMethod: 'CASH' as const,
        paymentData: {
          cash: {
            amountReceived: 100000,
            change: 100000,
          },
        },
      };

      const result = await createTransaction(transactionRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject transaction with missing payment data for cash', async () => {
      const transactionRequest = {
        storeId: testStoreId,
        kasirId: testKasirId,
        items: [
          {
            productId: testProductId1,
            quantity: 1,
            unitPrice: 150000,
            totalPrice: 150000,
          },
        ],
        paymentMethod: 'CASH' as const,
        paymentData: undefined,
      };

      const result = await createTransaction(transactionRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should calculate total correctly for multi-item transactions', async () => {
      const transactionRequest = {
        storeId: testStoreId,
        kasirId: testKasirId,
        items: [
          {
            productId: testProductId1,
            quantity: 2,
            unitPrice: 150000,
            totalPrice: 300000,
          },
          {
            productId: testProductId2,
            quantity: 1,
            unitPrice: 300000,
            totalPrice: 300000,
          },
        ],
        paymentMethod: 'CASH' as const,
        paymentData: {
          cash: {
            amountReceived: 700000,
            change: 100000,
          },
        },
      };

      const result = await createTransaction(transactionRequest);

      expect(result.success).toBe(true);
      expect(result.transaction?.totalAmount).toBe(600000);
    });
  });

  describe('Transaction ID Generation - Property-Based Tests', () => {
    it('should generate unique transaction IDs for each transaction', async () => {
      const transactionIds = new Set<string>();

      for (let i = 0; i < 5; i++) {
        const transactionRequest = {
          storeId: testStoreId,
          kasirId: testKasirId,
          items: [
            {
              productId: testProductId1,
              quantity: 1,
              unitPrice: 150000,
              totalPrice: 150000,
            },
          ],
          paymentMethod: 'CASH' as const,
          paymentData: {
            cash: {
              amountReceived: 200000,
              change: 50000,
            },
          },
        };

        const result = await createTransaction(transactionRequest);
        expect(result.success).toBe(true);
        transactionIds.add(result.transaction!.id);
      }

      // All transaction IDs should be unique
      expect(transactionIds.size).toBe(5);
    });

    it('should maintain inventory conservation across multiple transactions', async () => {
      // Get initial inventory sum
      const beforeResult = await db.query(
        'SELECT SUM(quantity) as total FROM inventory WHERE store_id = $1',
        [testStoreId]
      );
      const initialTotal = beforeResult.rows[0].total || 0;

      const totalDeducted: number[] = [];

      // Create multiple transactions
      for (let i = 0; i < 3; i++) {
        const quantity = 2 + i;
        totalDeducted.push(quantity);

        const transactionRequest = {
          storeId: testStoreId,
          kasirId: testKasirId,
          items: [
            {
              productId: testProductId1,
              quantity,
              unitPrice: 150000,
              totalPrice: 150000 * quantity,
            },
          ],
          paymentMethod: 'CASH' as const,
          paymentData: {
            cash: {
              amountReceived: 200000 * quantity,
              change: 50000 * quantity,
            },
          },
        };

        const result = await createTransaction(transactionRequest);
        expect(result.success).toBe(true);
      }

      // Get final inventory sum
      const afterResult = await db.query(
        'SELECT SUM(quantity) as total FROM inventory WHERE store_id = $1',
        [testStoreId]
      );
      const finalTotal = afterResult.rows[0].total || 0;

      // Total deducted should match inventory reduction
      const expectedReduction = totalDeducted.reduce((a, b) => a + b, 0);
      expect(initialTotal - finalTotal).toBe(expectedReduction);
    });

    it('should ensure all transaction data persists correctly', async () => {
      const transactionRequest = {
        storeId: testStoreId,
        kasirId: testKasirId,
        items: [
          {
            productId: testProductId1,
            quantity: 3,
            unitPrice: 150000,
            totalPrice: 450000,
          },
          {
            productId: testProductId2,
            quantity: 1,
            unitPrice: 300000,
            totalPrice: 300000,
          },
        ],
        paymentMethod: 'CASH' as const,
        paymentData: {
          cash: {
            amountReceived: 1000000,
            change: 250000,
          },
        },
        notes: 'Test transaction persistence',
      };

      const result = await createTransaction(transactionRequest);
      expect(result.success).toBe(true);
      const txnId = result.transaction?.id;

      // Retrieve transaction and verify all data
      const txnResult = await db.query(
        'SELECT * FROM transactions WHERE id = $1',
        [txnId]
      );
      expect(txnResult.rows.length).toBe(1);

      const transaction = txnResult.rows[0];
      expect(transaction.store_id).toBe(testStoreId);
      expect(transaction.kasir_id).toBe(testKasirId);
      expect(transaction.total_amount).toBe('750000');
      expect(transaction.payment_method).toBe('CASH');
      expect(transaction.status).toBe('COMPLETED');
      expect(transaction.notes).toBe('Test transaction persistence');

      // Verify items persistence
      const itemsResult = await db.query(
        'SELECT * FROM transaction_items WHERE transaction_id = $1',
        [txnId]
      );
      expect(itemsResult.rows.length).toBe(2);
    });
  });
});
