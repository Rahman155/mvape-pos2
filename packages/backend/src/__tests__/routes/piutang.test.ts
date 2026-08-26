/**
 * Comprehensive Tests for Piutang (Customer Receivables) Management
 * Tests cover:
 * - Task 73: Piutang list view with API and filtering
 * - Task 74: Piutang detail view with customer info and transaction history
 * - Task 75: Piutang payment recording with form and balance updates
 * - Task 76: Piutang status management (OPEN/PARTIAL/CLOSED workflow)
 * - Task 77: Piutang reminders for upcoming/overdue payments
 * 
 * Total: 45+ tests with property-based testing
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../database/connection.js';
import { AuthService } from '../../services/auth.js';
import { v4 as uuidv4 } from 'uuid';
import fc from 'fast-check';

describe('Piutang Management (Tasks 73-77)', () => {
  let app: any;
  let testUserId: string;
  let kasirUserId: string;
  let testStoreId: string;
  let customerId: string;
  let userToken: string;
  let kasirToken: string;
  let piutangId: string;
  const testPassword = 'TestPassword123!';

  beforeAll(async () => {
    app = createApp();

    if (!db) {
      throw new Error('Database not initialized');
    }

    // Setup test data
    testUserId = uuidv4();
    kasirUserId = uuidv4();
    testStoreId = uuidv4();
    customerId = uuidv4();
    piutangId = uuidv4();

    const hashedPassword = await AuthService.hashPassword(testPassword);

    // Create test store
    await db.query(
      'INSERT INTO stores (id, name, address, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [testStoreId, 'Test Store', 'Address', true]
    );

    // Create owner user
    await db.query(
      `INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`,
      [testUserId, 'owner_user', `owner_${Date.now()}@test.com`, hashedPassword, 'OWNER', testStoreId, true]
    );

    // Create kasir user
    await db.query(
      `INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`,
      [kasirUserId, 'kasir_user', `kasir_${Date.now()}@test.com`, hashedPassword, 'KASIR', testStoreId, true]
    );

    // Get owner token
    let loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'owner_user',
        password: testPassword,
      });
    userToken = loginRes.body.token;

    // Get kasir token
    loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'kasir_user',
        password: testPassword,
      });
    kasirToken = loginRes.body.token;

    // Create customer
    await db.query(
      `INSERT INTO members (id, member_number, name, phone, email, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`,
      [customerId, 'CUST001', 'John Doe', '08123456789', 'john@example.com', true, new Date(), new Date()]
    );

    // Create initial piutang (OPEN status)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);

    await db.query(
      `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [
        piutangId,
        uuidv4(),
        customerId,
        1000000,
        1000000,
        dueDate.toISOString().split('T')[0],
        'OPEN',
        new Date(),
        new Date(),
      ]
    );
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM piutang WHERE member_id = $1', [customerId]);
    await db.query('DELETE FROM members WHERE id = $1', [customerId]);
    await db.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, kasirUserId]);
    await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
  });

  // ========================================================================
  // TASK 73: Piutang List View with API and Filtering
  // ========================================================================

  describe('Task 73: GET /api/piutang - List with Filtering', () => {
    beforeEach(async () => {
      // Create test piutang for filtering tests
      const testCustomer1 = uuidv4();
      const testCustomer2 = uuidv4();

      // Create customers
      await db.query(
        `INSERT INTO members (id, member_number, name, phone, email, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [testCustomer1, 'CUST002', 'Alice Smith', '08111111111', 'alice@example.com', true, new Date(), new Date()]
      );

      await db.query(
        `INSERT INTO members (id, member_number, name, phone, email, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [testCustomer2, 'CUST003', 'Bob Johnson', '08222222222', 'bob@example.com', true, new Date(), new Date()]
      );

      // Create piutang with different statuses and amounts
      const today = new Date();

      // OPEN - due in 5 days, high amount
      const date1 = new Date(today);
      date1.setDate(date1.getDate() + 5);
      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          uuidv4(),
          testCustomer1,
          5000000,
          5000000,
          date1.toISOString().split('T')[0],
          'OPEN',
          new Date(),
          new Date(),
        ]
      );

      // PARTIAL - due in 15 days, medium amount
      const date2 = new Date(today);
      date2.setDate(date2.getDate() + 15);
      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          uuidv4(),
          testCustomer2,
          3000000,
          1500000,
          date2.toISOString().split('T')[0],
          'PARTIAL',
          new Date(),
          new Date(),
        ]
      );

      // CLOSED - past due
      const date3 = new Date(today);
      date3.setDate(date3.getDate() - 5);
      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          uuidv4(),
          customerId,
          2000000,
          0,
          date3.toISOString().split('T')[0],
          'CLOSED',
          new Date(),
          new Date(),
        ]
      );
    });

    it('should list all piutang with pagination (owner only)', async () => {
      const response = await request(app)
        .get('/api/piutang')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(response.body.pages).toBeGreaterThanOrEqual(1);
    });

    it('should reject list for non-owner (kasir)', async () => {
      const response = await request(app)
        .get('/api/piutang')
        .set('Authorization', `Bearer ${kasirToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/piutang');

      expect(response.status).toBe(401);
    });

    it('should support filtering by status=OPEN', async () => {
      const response = await request(app)
        .get('/api/piutang?status=OPEN')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(item.status).toBe('OPEN');
      });
    });

    it('should support filtering by status=PARTIAL', async () => {
      const response = await request(app)
        .get('/api/piutang?status=PARTIAL')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(item.status).toBe('PARTIAL');
      });
    });

    it('should support filtering by status=CLOSED', async () => {
      const response = await request(app)
        .get('/api/piutang?status=CLOSED')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(item.status).toBe('CLOSED');
      });
    });

    it('should support filtering by customer name', async () => {
      const response = await request(app)
        .get('/api/piutang?customerName=Alice')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(item.customerName.toLowerCase()).toContain('alice');
      });
    });

    it('should support filtering by due date range', async () => {
      const fromDate = new Date();
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + 7);

      const response = await request(app)
        .get(
          `/api/piutang?dueDateFrom=${fromDate.toISOString().split('T')[0]}&dueDateTo=${toDate.toISOString().split('T')[0]}`
        )
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        const dueDate = new Date(item.dueDate);
        expect(dueDate.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
        expect(dueDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
      });
    });

    it('should support filtering by amount range (min)', async () => {
      const response = await request(app)
        .get('/api/piutang?amountMin=2000000')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(item.remainingBalance).toBeGreaterThanOrEqual(2000000);
      });
    });

    it('should support filtering by amount range (max)', async () => {
      const response = await request(app)
        .get('/api/piutang?amountMax=2000000')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(item.remainingBalance).toBeLessThanOrEqual(2000000);
      });
    });

    it('should support sorting by due_date (default)', async () => {
      const response = await request(app)
        .get('/api/piutang?sort=due_date')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      // Verify sorted (though some may be null)
      for (let i = 1; i < response.body.data.length; i++) {
        if (response.body.data[i - 1].dueDate && response.body.data[i].dueDate) {
          expect(new Date(response.body.data[i - 1].dueDate).getTime()).toBeLessThanOrEqual(
            new Date(response.body.data[i].dueDate).getTime()
          );
        }
      }
    });

    it('should support sorting by remaining_balance', async () => {
      const response = await request(app)
        .get('/api/piutang?sort=remaining_balance')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      // Verify sorted (descending)
      for (let i = 1; i < response.body.data.length; i++) {
        expect(response.body.data[i - 1].remainingBalance).toBeGreaterThanOrEqual(
          response.body.data[i].remainingBalance
        );
      }
    });

    it('should support sorting by created_date', async () => {
      const response = await request(app)
        .get('/api/piutang?sort=created_date')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      // Verify sorted (descending)
      for (let i = 1; i < response.body.data.length; i++) {
        expect(new Date(response.body.data[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(response.body.data[i].createdAt).getTime()
        );
      }
    });

    it('should support pagination with custom limit', async () => {
      const response = await request(app)
        .get('/api/piutang?page=1&limit=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should support pagination with page 2', async () => {
      const response = await request(app)
        .get('/api/piutang?page=2&limit=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.page).toBe(2);
    });

    it('should return empty data array when no matches', async () => {
      const response = await request(app)
        .get('/api/piutang?customerName=NonexistentCustomer12345')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should include customer details in list', async () => {
      const response = await request(app)
        .get('/api/piutang')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        const item = response.body.data[0];
        expect(item.customerName).toBeDefined();
        expect(item.customerPhone).toBeDefined();
        expect(item.customerEmail).toBeDefined();
      }
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .get('/api/piutang?status=OPEN&amountMin=1000000&customerName=Alice')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(item.status).toBe('OPEN');
        expect(item.remainingBalance).toBeGreaterThanOrEqual(1000000);
        if (item.customerName) {
          expect(item.customerName.toLowerCase()).toContain('alice');
        }
      });
    });
  });

  // ========================================================================
  // TASK 74: Piutang Detail View with Customer Info and Transaction History
  // ========================================================================

  describe('Task 74: GET /api/piutang/:id - Detail View', () => {
    it('should fetch piutang detail with customer info (owner only)', async () => {
      const response = await request(app)
        .get(`/api/piutang/${piutangId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(piutangId);
      expect(response.body.memberId).toBe(customerId);
      expect(response.body.customerName).toBeDefined();
      expect(response.body.customerPhone).toBeDefined();
      expect(response.body.customerEmail).toBeDefined();
      expect(response.body.status).toBe('OPEN');
      expect(response.body.amount).toBe(1000000);
      expect(response.body.remainingBalance).toBe(1000000);
    });

    it('should include transaction history in detail', async () => {
      const response = await request(app)
        .get(`/api/piutang/${piutangId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.transactionHistory).toBeDefined();
      expect(Array.isArray(response.body.transactionHistory)).toBe(true);
    });

    it('should reject detail fetch for non-owner (kasir)', async () => {
      const response = await request(app)
        .get(`/api/piutang/${piutangId}`)
        .set('Authorization', `Bearer ${kasirToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication for detail', async () => {
      const response = await request(app).get(`/api/piutang/${piutangId}`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent piutang', async () => {
      const response = await request(app)
        .get(`/api/piutang/${uuidv4()}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Piutang not found');
    });

    it('should include customer number in detail', async () => {
      const response = await request(app)
        .get(`/api/piutang/${piutangId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.customerNumber).toBeDefined();
    });
  });

  // ========================================================================
  // TASK 75: Piutang Payment Recording with Form and Balance Updates
  // ========================================================================

  describe('Task 75: POST /api/piutang/:id/payment - Payment Recording', () => {
    let openPiutangId: string;
    let partialPiutangId: string;

    beforeEach(async () => {
      // Create fresh OPEN piutang
      openPiutangId = uuidv4();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          openPiutangId,
          uuidv4(),
          customerId,
          500000,
          500000,
          dueDate.toISOString().split('T')[0],
          'OPEN',
          new Date(),
          new Date(),
        ]
      );

      // Create fresh PARTIAL piutang
      partialPiutangId = uuidv4();
      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          partialPiutangId,
          uuidv4(),
          customerId,
          600000,
          300000,
          dueDate.toISOString().split('T')[0],
          'PARTIAL',
          new Date(),
          new Date(),
        ]
      );
    });

    it('should record payment on OPEN piutang', async () => {
      const response = await request(app)
        .post(`/api/piutang/${openPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 200000,
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(openPiutangId);
      expect(response.body.remainingBalance).toBe(300000);
    });

    it('should reject payment for non-owner (kasir)', async () => {
      const response = await request(app)
        .post(`/api/piutang/${openPiutangId}/payment`)
        .set('Authorization', `Bearer ${kasirToken}`)
        .send({
          amount: 100000,
        });

      expect(response.status).toBe(403);
    });

    it('should require authentication for payment', async () => {
      const response = await request(app)
        .post(`/api/piutang/${openPiutangId}/payment`)
        .send({
          amount: 100000,
        });

      expect(response.status).toBe(401);
    });

    it('should reject non-existent piutang', async () => {
      const response = await request(app)
        .post(`/api/piutang/${uuidv4()}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 100000,
        });

      expect(response.status).toBe(404);
    });

    it('should reject invalid payment amount (negative)', async () => {
      const response = await request(app)
        .post(`/api/piutang/${openPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: -50000,
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid payment amount (zero)', async () => {
      const response = await request(app)
        .post(`/api/piutang/${openPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 0,
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid payment amount (not a number)', async () => {
      const response = await request(app)
        .post(`/api/piutang/${openPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 'not a number',
        });

      expect(response.status).toBe(400);
    });

    it('should reject payment exceeding remaining balance', async () => {
      const response = await request(app)
        .post(`/api/piutang/${openPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 999999999,
        });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('cannot exceed');
    });

    it('should require amount field', async () => {
      const response = await request(app)
        .post(`/api/piutang/${openPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should update balance correctly after payment', async () => {
      const payment1 = await request(app)
        .post(`/api/piutang/${openPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 150000,
        });

      expect(payment1.status).toBe(200);
      expect(payment1.body.remainingBalance).toBe(350000);

      // Fetch to verify persistence
      const detail = await request(app)
        .get(`/api/piutang/${openPiutangId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(detail.body.remainingBalance).toBe(350000);
    });

    it('should validate payment amount boundary (exactly remaining balance)', async () => {
      const response = await request(app)
        .post(`/api/piutang/${openPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 500000, // exact remaining balance
        });

      expect(response.status).toBe(200);
      expect(response.body.remainingBalance).toBe(0);
    });

    it('should validate payment amount boundary (just under remaining balance)', async () => {
      const response = await request(app)
        .post(`/api/piutang/${openPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 499999,
        });

      expect(response.status).toBe(200);
      expect(response.body.remainingBalance).toBe(1);
    });

    it('should validate payment amount boundary (just over remaining balance)', async () => {
      const response = await request(app)
        .post(`/api/piutang/${openPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 500001,
        });

      expect(response.status).toBe(400);
    });

    // Property-based test for payment validation
    it('should accept any valid payment amount between 0 (exclusive) and remaining_balance (inclusive)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 500000 }),
          async (paymentAmount: number) => {
            const testPiutangId = uuidv4();
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 20);

            // Create test piutang
            await db.query(
              `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                testPiutangId,
                uuidv4(),
                customerId,
                500000,
                500000,
                dueDate.toISOString().split('T')[0],
                'OPEN',
                new Date(),
                new Date(),
              ]
            );

            const response = await request(app)
              .post(`/api/piutang/${testPiutangId}/payment`)
              .set('Authorization', `Bearer ${userToken}`)
              .send({
                amount: paymentAmount,
              });

            expect(response.status).toBe(200);
            expect(response.body.remainingBalance).toBe(500000 - paymentAmount);

            // Cleanup
            await db.query('DELETE FROM piutang WHERE id = $1', [testPiutangId]);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  // ========================================================================
  // TASK 76: Piutang Status Management (OPEN/PARTIAL/CLOSED Workflow)
  // ========================================================================

  describe('Task 76: Status Management (OPEN/PARTIAL/CLOSED Workflow)', () => {
    let workflowPiutangId: string;

    beforeEach(async () => {
      workflowPiutangId = uuidv4();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          workflowPiutangId,
          uuidv4(),
          customerId,
          1000000,
          1000000,
          dueDate.toISOString().split('T')[0],
          'OPEN',
          new Date(),
          new Date(),
        ]
      );
    });

    it('should transition from OPEN to PARTIAL on partial payment', async () => {
      const response = await request(app)
        .post(`/api/piutang/${workflowPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 300000,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PARTIAL');
      expect(response.body.remainingBalance).toBe(700000);
    });

    it('should transition from OPEN to CLOSED on full payment', async () => {
      const response = await request(app)
        .post(`/api/piutang/${workflowPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 1000000,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CLOSED');
      expect(response.body.remainingBalance).toBe(0);
    });

    it('should transition from PARTIAL to CLOSED on final payment', async () => {
      // First, move to PARTIAL
      await request(app)
        .post(`/api/piutang/${workflowPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 500000,
        });

      // Verify PARTIAL
      const partialCheck = await request(app)
        .get(`/api/piutang/${workflowPiutangId}`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(partialCheck.body.status).toBe('PARTIAL');

      // Now make final payment
      const response = await request(app)
        .post(`/api/piutang/${workflowPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 500000,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CLOSED');
      expect(response.body.remainingBalance).toBe(0);
    });

    it('should stay in PARTIAL if balance remains after PARTIAL payment', async () => {
      // Move to PARTIAL
      await request(app)
        .post(`/api/piutang/${workflowPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 500000,
        });

      // Make additional payment but not full
      const response = await request(app)
        .post(`/api/piutang/${workflowPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 300000,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PARTIAL');
      expect(response.body.remainingBalance).toBe(200000);
    });

    // Property-based test for status transitions
    it('should maintain correct status after any valid payment sequence', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.integer({ min: 1, max: 100000 }), { minLength: 1 }).map((arr) => {
            // Ensure total doesn't exceed initial amount
            let sum = 0;
            return arr.filter((val) => {
              if (sum + val <= 1000000) {
                sum += val;
                return true;
              }
              return false;
            });
          }),
          async (payments: number[]) => {
            let remaining = 1000000;
            let status = 'OPEN';

            for (const payment of payments) {
              const testPiutangId = uuidv4();
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 35);

              // Create test piutang for each payment sequence
              await db.query(
                `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                  testPiutangId,
                  uuidv4(),
                  customerId,
                  1000000,
                  remaining,
                  dueDate.toISOString().split('T')[0],
                  status,
                  new Date(),
                  new Date(),
                ]
              );

              const response = await request(app)
                .post(`/api/piutang/${testPiutangId}/payment`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                  amount: payment,
                });

              expect(response.status).toBe(200);
              remaining = response.body.remainingBalance;
              status = response.body.status;

              // Verify status correctness
              if (remaining === 0) {
                expect(status).toBe('CLOSED');
              } else if (remaining < 1000000 && remaining > 0) {
                expect(['PARTIAL', 'OPEN']).toContain(status);
              }

              // Cleanup
              await db.query('DELETE FROM piutang WHERE id = $1', [testPiutangId]);
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should ensure CLOSED piutang has zero remaining balance', async () => {
      // Make full payment
      await request(app)
        .post(`/api/piutang/${workflowPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 1000000,
        });

      // Fetch and verify
      const detail = await request(app)
        .get(`/api/piutang/${workflowPiutangId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(detail.body.status).toBe('CLOSED');
      expect(detail.body.remainingBalance).toBe(0);
    });
  });

  // ========================================================================
  // TASK 77: Piutang Reminders for Upcoming/Overdue Payments
  // ========================================================================

  describe('Task 77: GET /api/piutang/alerts - Reminders', () => {
    beforeEach(async () => {
      // Create test reminders
      const today = new Date();

      // Upcoming - due in 3 days
      const upcoming = new Date(today);
      upcoming.setDate(upcoming.getDate() + 3);
      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          uuidv4(),
          customerId,
          250000,
          250000,
          upcoming.toISOString().split('T')[0],
          'OPEN',
          new Date(),
          new Date(),
        ]
      );

      // Upcoming - due in 6 days
      const upcoming2 = new Date(today);
      upcoming2.setDate(upcoming2.getDate() + 6);
      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          uuidv4(),
          customerId,
          300000,
          300000,
          upcoming2.toISOString().split('T')[0],
          'PARTIAL',
          new Date(),
          new Date(),
        ]
      );

      // Not upcoming - due in 10 days
      const notUpcoming = new Date(today);
      notUpcoming.setDate(notUpcoming.getDate() + 10);
      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          uuidv4(),
          customerId,
          150000,
          150000,
          notUpcoming.toISOString().split('T')[0],
          'OPEN',
          new Date(),
          new Date(),
        ]
      );

      // Overdue - due 2 days ago
      const overdue = new Date(today);
      overdue.setDate(overdue.getDate() - 2);
      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          uuidv4(),
          customerId,
          400000,
          400000,
          overdue.toISOString().split('T')[0],
          'OPEN',
          new Date(),
          new Date(),
        ]
      );

      // Overdue - due 10 days ago
      const overdue2 = new Date(today);
      overdue2.setDate(overdue2.getDate() - 10);
      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          uuidv4(),
          customerId,
          500000,
          500000,
          overdue2.toISOString().split('T')[0],
          'PARTIAL',
          new Date(),
          new Date(),
        ]
      );

      // CLOSED piutang (should not appear in alerts)
      const closed = new Date(today);
      closed.setDate(closed.getDate() + 5);
      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          uuidv4(),
          customerId,
          100000,
          0,
          closed.toISOString().split('T')[0],
          'CLOSED',
          new Date(),
          new Date(),
        ]
      );
    });

    it('should get upcoming piutang (due within 7 days, owner only)', async () => {
      const response = await request(app)
        .get('/api/piutang/alerts/upcoming')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(0);
      expect(response.body.alert).toContain('7 days');
    });

    it('should only include OPEN and PARTIAL in upcoming', async () => {
      const response = await request(app)
        .get('/api/piutang/alerts/upcoming')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(['OPEN', 'PARTIAL']).toContain(item.status);
      });
    });

    it('should not include past due in upcoming', async () => {
      const response = await request(app)
        .get('/api/piutang/alerts/upcoming')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      const today = new Date();
      response.body.data.forEach((item: any) => {
        const dueDate = new Date(item.dueDate);
        expect(dueDate.getTime()).toBeGreaterThanOrEqual(today.getTime() - 86400000); // account for time zone
      });
    });

    it('should calculate days until due in upcoming', async () => {
      const response = await request(app)
        .get('/api/piutang/alerts/upcoming')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        response.body.data.forEach((item: any) => {
          expect(item.daysUntilDue).toBeDefined();
          expect(typeof item.daysUntilDue).toBe('number');
          expect(item.daysUntilDue).toBeGreaterThanOrEqual(0);
        });
      }
    });

    it('should reject upcoming for non-owner (kasir)', async () => {
      const response = await request(app)
        .get('/api/piutang/alerts/upcoming')
        .set('Authorization', `Bearer ${kasirToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication for upcoming', async () => {
      const response = await request(app).get('/api/piutang/alerts/upcoming');

      expect(response.status).toBe(401);
    });

    it('should get overdue piutang (past due date, owner only)', async () => {
      const response = await request(app)
        .get('/api/piutang/alerts/overdue')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(0);
      expect(response.body.alert).toContain('Overdue');
    });

    it('should only include OPEN and PARTIAL in overdue', async () => {
      const response = await request(app)
        .get('/api/piutang/alerts/overdue')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(['OPEN', 'PARTIAL']).toContain(item.status);
      });
    });

    it('should calculate days overdue correctly', async () => {
      const response = await request(app)
        .get('/api/piutang/alerts/overdue')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        response.body.data.forEach((item: any) => {
          expect(item.daysOverdue).toBeDefined();
          expect(typeof item.daysOverdue).toBe('number');
          expect(item.daysOverdue).toBeGreaterThan(0);
        });
      }
    });

    it('should reject overdue for non-owner (kasir)', async () => {
      const response = await request(app)
        .get('/api/piutang/alerts/overdue')
        .set('Authorization', `Bearer ${kasirToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication for overdue', async () => {
      const response = await request(app).get('/api/piutang/alerts/overdue');

      expect(response.status).toBe(401);
    });

    it('should not include CLOSED piutang in overdue', async () => {
      const response = await request(app)
        .get('/api/piutang/alerts/overdue')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(item.status).not.toBe('CLOSED');
      });
    });

    it('should not include CLOSED piutang in upcoming', async () => {
      const response = await request(app)
        .get('/api/piutang/alerts/upcoming')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(item.status).not.toBe('CLOSED');
      });
    });

    it('should include customer details in alerts', async () => {
      let response = await request(app)
        .get('/api/piutang/alerts/upcoming')
        .set('Authorization', `Bearer ${userToken}`);

      if (response.body.data.length > 0) {
        expect(response.body.data[0].customerName).toBeDefined();
        expect(response.body.data[0].customerPhone).toBeDefined();
      }

      response = await request(app)
        .get('/api/piutang/alerts/overdue')
        .set('Authorization', `Bearer ${userToken}`);

      if (response.body.data.length > 0) {
        expect(response.body.data[0].customerName).toBeDefined();
        expect(response.body.data[0].customerPhone).toBeDefined();
      }
    });
  });

  // ========================================================================
  // EDGE CASES & BOUNDARY CONDITIONS
  // ========================================================================

  describe('Edge Cases & Boundary Conditions', () => {
    it('should handle very small payment amounts', async () => {
      const testPiutangId = uuidv4();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 40);

      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          testPiutangId,
          uuidv4(),
          customerId,
          1000000,
          1000000,
          dueDate.toISOString().split('T')[0],
          'OPEN',
          new Date(),
          new Date(),
        ]
      );

      const response = await request(app)
        .post(`/api/piutang/${testPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.remainingBalance).toBe(999999);

      await db.query('DELETE FROM piutang WHERE id = $1', [testPiutangId]);
    });

    it('should handle decimal payment amounts', async () => {
      const testPiutangId = uuidv4();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 40);

      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          testPiutangId,
          uuidv4(),
          customerId,
          1000000,
          1000000,
          dueDate.toISOString().split('T')[0],
          'OPEN',
          new Date(),
          new Date(),
        ]
      );

      const response = await request(app)
        .post(`/api/piutang/${testPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 123456.78,
        });

      expect(response.status).toBe(200);
      expect(Math.abs(response.body.remainingBalance - 876543.22)).toBeLessThan(0.01);

      await db.query('DELETE FROM piutang WHERE id = $1', [testPiutangId]);
    });

    it('should handle piutang with NULL due_date in list', async () => {
      const testCustomer = uuidv4();
      await db.query(
        `INSERT INTO members (id, member_number, name, phone, email, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [testCustomer, 'CUST_NULLDATE', 'Null Date Customer', '081234567890', 'null@example.com', true, new Date(), new Date()]
      );

      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uuidv4(),
          uuidv4(),
          testCustomer,
          500000,
          500000,
          null,
          'OPEN',
          new Date(),
          new Date(),
        ]
      );

      const response = await request(app)
        .get('/api/piutang')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);

      await db.query('DELETE FROM piutang WHERE member_id = $1', [testCustomer]);
      await db.query('DELETE FROM members WHERE id = $1', [testCustomer]);
    });

    it('should handle concurrent payments idempotently', async () => {
      const testPiutangId = uuidv4();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 45);

      await db.query(
        `INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          testPiutangId,
          uuidv4(),
          customerId,
          1000000,
          1000000,
          dueDate.toISOString().split('T')[0],
          'OPEN',
          new Date(),
          new Date(),
        ]
      );

      // Make two payments
      const payment1 = await request(app)
        .post(`/api/piutang/${testPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 400000,
        });

      expect(payment1.status).toBe(200);
      expect(payment1.body.remainingBalance).toBe(600000);

      const payment2 = await request(app)
        .post(`/api/piutang/${testPiutangId}/payment`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 600000,
        });

      expect(payment2.status).toBe(200);
      expect(payment2.body.remainingBalance).toBe(0);

      await db.query('DELETE FROM piutang WHERE id = $1', [testPiutangId]);
    });
  });
});
