/**
 * Tempo Payment Integration Tests
 * End-to-end integration tests for tempo payment processing
 * 
 * **Validates: Requirements 7.7, 18.2**
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { db } from '../../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

describe('Tempo Payment Integration Tests', () => {
  let testStoreId: string;
  let testKasirId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Initialize database
    await db.initialize();
  });

  afterAll(async () => {
    // Close database
    await db.close();
  });

  beforeEach(async () => {
    // Generate test IDs
    testStoreId = uuidv4();
    testKasirId = uuidv4();
    testProductId = uuidv4();

    // Clean up test data
    try {
      await db.query('BEGIN');
      
      await db.query('DELETE FROM transaction_items WHERE transaction_id IN (SELECT id FROM transactions WHERE store_id = $1)', [testStoreId]);
      await db.query('DELETE FROM transactions WHERE store_id = $1', [testStoreId]);
      await db.query('DELETE FROM piutang WHERE transaction_id IN (SELECT id FROM transactions WHERE store_id = $1)', [testStoreId]);
      await db.query('DELETE FROM inventory WHERE store_id = $1 AND product_id = $2', [testStoreId, testProductId]);
      await db.query('DELETE FROM products WHERE id = $1', [testProductId]);
      await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
      await db.query('DELETE FROM users WHERE id = $1', [testKasirId]);
      
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
    }

    // Create test data
    try {
      await db.query('BEGIN');
      
      // Create store
      await db.query(
        'INSERT INTO stores (id, name, address, phone) VALUES ($1, $2, $3, $4)',
        [testStoreId, 'Test Store', 'Test Address', '08123456789']
      );

      // Create kasir
      await db.query(
        'INSERT INTO users (id, username, email, password_hash, role, store_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [testKasirId, 'kasir_test', 'kasir@test.com', 'hashed_password', 'KASIR', testStoreId]
      );

      // Create product
      await db.query(
        'INSERT INTO products (id, name, sku, cost_price, selling_price) VALUES ($1, $2, $3, $4, $5)',
        [testProductId, 'Test Product', 'TST001', '5000', '10000']
      );

      // Create inventory
      await db.query(
        'INSERT INTO inventory (id, product_id, store_id, quantity) VALUES ($1, $2, $3, $4)',
        [uuidv4(), testProductId, testStoreId, 100]
      );

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  });

  describe('Tempo Payment Transaction Lifecycle', () => {
    it('should complete full tempo payment transaction workflow', async () => {
      const transactionId = uuidv4();
      const piutangId = uuidv4();
      const itemId = uuidv4();
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 14);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const totalAmount = 20000;
      const quantity = 2;

      try {
        await db.query('BEGIN');

        // 1. Create transaction
        await db.query(
          `INSERT INTO transactions 
           (id, store_id, kasir_id, transaction_date, total_amount, payment_method, status, notes, created_at, updated_at, is_edited, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            transactionId,
            testStoreId,
            testKasirId,
            now,
            totalAmount.toString(),
            'TEMPO',
            'COMPLETED',
            'Test tempo transaction',
            now,
            now,
            false,
            1,
          ]
        );

        // 2. Create transaction items
        await db.query(
          `INSERT INTO transaction_items 
           (id, transaction_id, product_id, quantity, unit_price, total_price, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            itemId,
            transactionId,
            testProductId,
            quantity,
            '10000',
            totalAmount.toString(),
            now,
          ]
        );

        // 3. Deduct inventory
        await db.query(
          'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2 AND store_id = $3',
          [quantity, testProductId, testStoreId]
        );

        // 4. Create piutang record
        await db.query(
          `INSERT INTO piutang 
           (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            piutangId,
            transactionId,
            null,
            totalAmount.toString(),
            totalAmount.toString(),
            dueDateStr,
            'OPEN',
            now,
            now,
          ]
        );

        await db.query('COMMIT');

        // Verification: Check all records were created correctly
        const txnResult = await db.query(
          'SELECT * FROM transactions WHERE id = $1',
          [transactionId]
        );
        expect(txnResult.rows.length).toBe(1);
        expect(txnResult.rows[0].payment_method).toBe('TEMPO');
        expect(txnResult.rows[0].status).toBe('COMPLETED');
        expect(Number(txnResult.rows[0].total_amount)).toBe(totalAmount);

        const itemResult = await db.query(
          'SELECT * FROM transaction_items WHERE id = $1',
          [itemId]
        );
        expect(itemResult.rows.length).toBe(1);
        expect(itemResult.rows[0].quantity).toBe(quantity);

        const piutangResult = await db.query(
          'SELECT * FROM piutang WHERE id = $1',
          [piutangId]
        );
        expect(piutangResult.rows.length).toBe(1);
        expect(piutangResult.rows[0].status).toBe('OPEN');
        expect(Number(piutangResult.rows[0].amount)).toBe(totalAmount);
        expect(piutangResult.rows[0].due_date).toBe(dueDateStr);

        const inventoryResult = await db.query(
          'SELECT quantity FROM inventory WHERE product_id = $1 AND store_id = $2',
          [testProductId, testStoreId]
        );
        expect(inventoryResult.rows[0].quantity).toBe(98); // 100 - 2
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    });

    it('should handle multiple tempo transactions independently', async () => {
      const tx1Id = uuidv4();
      const tx2Id = uuidv4();
      const piutang1Id = uuidv4();
      const piutang2Id = uuidv4();
      const now = new Date();
      const dueDate1 = new Date(now);
      dueDate1.setDate(dueDate1.getDate() + 7);
      const dueDate2 = new Date(now);
      dueDate2.setDate(dueDate2.getDate() + 14);

      try {
        await db.query('BEGIN');

        // Transaction 1
        await db.query(
          `INSERT INTO transactions 
           (id, store_id, kasir_id, transaction_date, total_amount, payment_method, status, created_at, updated_at, is_edited, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            tx1Id,
            testStoreId,
            testKasirId,
            now,
            '30000',
            'TEMPO',
            'COMPLETED',
            now,
            now,
            false,
            1,
          ]
        );

        // Piutang 1
        await db.query(
          `INSERT INTO piutang 
           (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            piutang1Id,
            tx1Id,
            null,
            '30000',
            '30000',
            dueDate1.toISOString().split('T')[0],
            'OPEN',
            now,
            now,
          ]
        );

        // Transaction 2
        await db.query(
          `INSERT INTO transactions 
           (id, store_id, kasir_id, transaction_date, total_amount, payment_method, status, created_at, updated_at, is_edited, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            tx2Id,
            testStoreId,
            testKasirId,
            now,
            '50000',
            'TEMPO',
            'COMPLETED',
            now,
            now,
            false,
            1,
          ]
        );

        // Piutang 2
        await db.query(
          `INSERT INTO piutang 
           (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            piutang2Id,
            tx2Id,
            null,
            '50000',
            '50000',
            dueDate2.toISOString().split('T')[0],
            'OPEN',
            now,
            now,
          ]
        );

        await db.query('COMMIT');

        // Verify both piutang records
        const piutangResult = await db.query(
          'SELECT * FROM piutang WHERE transaction_id IN ($1, $2) ORDER BY created_at',
          [tx1Id, tx2Id]
        );

        expect(piutangResult.rows.length).toBe(2);
        expect(Number(piutangResult.rows[0].amount)).toBe(30000);
        expect(Number(piutangResult.rows[1].amount)).toBe(50000);
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    });

    it('should maintain referential integrity between transaction and piutang', async () => {
      const transactionId = uuidv4();
      const piutangId = uuidv4();
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 30);

      try {
        await db.query('BEGIN');

        // Create transaction
        await db.query(
          `INSERT INTO transactions 
           (id, store_id, kasir_id, transaction_date, total_amount, payment_method, status, created_at, updated_at, is_edited, version)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            transactionId,
            testStoreId,
            testKasirId,
            now,
            '100000',
            'TEMPO',
            'COMPLETED',
            now,
            now,
            false,
            1,
          ]
        );

        // Create piutang linked to transaction
        await db.query(
          `INSERT INTO piutang 
           (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            piutangId,
            transactionId,
            null,
            '100000',
            '100000',
            dueDate.toISOString().split('T')[0],
            'OPEN',
            now,
            now,
          ]
        );

        await db.query('COMMIT');

        // Query to verify relationship
        const result = await db.query(
          `SELECT t.id as transaction_id, p.id as piutang_id, p.transaction_id as piutang_transaction_id
           FROM transactions t
           LEFT JOIN piutang p ON t.id = p.transaction_id
           WHERE t.id = $1`,
          [transactionId]
        );

        expect(result.rows.length).toBe(1);
        expect(result.rows[0].transaction_id).toBe(transactionId);
        expect(result.rows[0].piutang_id).toBe(piutangId);
        expect(result.rows[0].piutang_transaction_id).toBe(transactionId);
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    });
  });

  describe('Piutang Status Transitions', () => {
    it('should support status transition from OPEN to PARTIAL', async () => {
      const piutangId = uuidv4();
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 7);

      try {
        await db.query('BEGIN');

        // Create piutang
        await db.query(
          `INSERT INTO piutang 
           (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            piutangId,
            uuidv4(),
            null,
            '100000',
            '100000',
            dueDate.toISOString().split('T')[0],
            'OPEN',
            now,
            now,
          ]
        );

        await db.query('COMMIT');

        // Simulate partial payment
        await db.query(
          'UPDATE piutang SET remaining_balance = $1, status = $2, updated_at = $3 WHERE id = $4',
          ['50000', 'PARTIAL', new Date(), piutangId]
        );

        // Verify status changed
        const result = await db.query(
          'SELECT status, remaining_balance FROM piutang WHERE id = $1',
          [piutangId]
        );

        expect(result.rows[0].status).toBe('PARTIAL');
        expect(Number(result.rows[0].remaining_balance)).toBe(50000);
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    });

    it('should support status transition from PARTIAL to CLOSED', async () => {
      const piutangId = uuidv4();
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 14);

      try {
        await db.query('BEGIN');

        // Create piutang with PARTIAL status
        await db.query(
          `INSERT INTO piutang 
           (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            piutangId,
            uuidv4(),
            null,
            '100000',
            '50000',
            dueDate.toISOString().split('T')[0],
            'PARTIAL',
            now,
            now,
          ]
        );

        await db.query('COMMIT');

        // Simulate final payment
        await db.query(
          'UPDATE piutang SET remaining_balance = $1, status = $2, updated_at = $3 WHERE id = $4',
          ['0', 'CLOSED', new Date(), piutangId]
        );

        // Verify status changed
        const result = await db.query(
          'SELECT status, remaining_balance FROM piutang WHERE id = $1',
          [piutangId]
        );

        expect(result.rows[0].status).toBe('CLOSED');
        expect(Number(result.rows[0].remaining_balance)).toBe(0);
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    });
  });

  describe('Tempo Payment Queries', () => {
    it('should retrieve all open piutang records', async () => {
      const now = new Date();
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + 7);

      try {
        await db.query('BEGIN');

        // Create multiple piutang records with different statuses
        const piutang1Id = uuidv4();
        const piutang2Id = uuidv4();
        const piutang3Id = uuidv4();

        await db.query(
          `INSERT INTO piutang 
           (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [piutang1Id, uuidv4(), null, '30000', '30000', dueDate.toISOString().split('T')[0], 'OPEN', now, now]
        );

        await db.query(
          `INSERT INTO piutang 
           (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [piutang2Id, uuidv4(), null, '50000', '25000', dueDate.toISOString().split('T')[0], 'PARTIAL', now, now]
        );

        await db.query(
          `INSERT INTO piutang 
           (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [piutang3Id, uuidv4(), null, '20000', '0', dueDate.toISOString().split('T')[0], 'CLOSED', now, now]
        );

        await db.query('COMMIT');

        // Query only open or partial piutang
        const result = await db.query(
          'SELECT id, status FROM piutang WHERE status IN ($1, $2) ORDER BY created_at',
          ['OPEN', 'PARTIAL']
        );

        expect(result.rows.length).toBe(2);
        expect(result.rows.map((r: any) => r.status)).toContain('OPEN');
        expect(result.rows.map((r: any) => r.status)).toContain('PARTIAL');
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    });

    it('should retrieve piutang by due date range', async () => {
      const now = new Date();
      const dueDate1 = new Date(now);
      dueDate1.setDate(dueDate1.getDate() + 5);
      const dueDate2 = new Date(now);
      dueDate2.setDate(dueDate2.getDate() + 15);

      try {
        await db.query('BEGIN');

        const piutang1Id = uuidv4();
        const piutang2Id = uuidv4();

        await db.query(
          `INSERT INTO piutang 
           (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [piutang1Id, uuidv4(), null, '30000', '30000', dueDate1.toISOString().split('T')[0], 'OPEN', now, now]
        );

        await db.query(
          `INSERT INTO piutang 
           (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [piutang2Id, uuidv4(), null, '50000', '50000', dueDate2.toISOString().split('T')[0], 'OPEN', now, now]
        );

        await db.query('COMMIT');

        // Query piutang within 7 days
        const result = await db.query(
          'SELECT id FROM piutang WHERE due_date <= $1 AND status = $2',
          [new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 'OPEN']
        );

        expect(result.rows.length).toBeGreaterThanOrEqual(1);
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    });
  });
});
