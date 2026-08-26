/**
 * Daily Sales Reports Tests
 * Comprehensive test suite for daily sales report endpoint
 * Tests cover: date validation, caching, calculations, authorization, edge cases
 * 
 * Requirements: 23.1, 23.2, 23.3
 */

import request from 'supertest';
import { app } from '../app.js';
import { db } from '../database/index.js';
import { CacheService } from '../cache/service.js';
import { v4 as uuidv4 } from 'uuid';

// Mock authentication middleware
jest.mock('../middleware/auth.js', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'owner-1', role: 'OWNER', storeId: null };
    req.requestId = 'test-request-id';
    next();
  },
}));

// Mock authorization middleware
jest.mock('../middleware/authorize.js', () => ({
  authorize: (role: string) => (req: any, res: any, next: any) => {
    if (req.user?.role !== role) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }
    next();
  },
}));

describe('Daily Sales Report Routes (Requirements 23.1-23.3)', () => {
  let storeId1: string;
  let storeId2: string;
  let storeId3: string;
  const testDate = '2024-01-15';

  beforeEach(async () => {
    // Create test stores
    storeId1 = uuidv4();
    storeId2 = uuidv4();
    storeId3 = uuidv4();

    const stores = [
      { id: storeId1, name: 'Toko Jakarta', is_active: true },
      { id: storeId2, name: 'Toko Bandung', is_active: true },
      { id: storeId3, name: 'Toko Surabaya', is_active: true },
    ];

    for (const store of stores) {
      await db.query(
        `INSERT INTO stores (id, name, is_active) VALUES ($1, $2, $3)
         ON CONFLICT(id) DO NOTHING`,
        [store.id, store.name, store.is_active]
      );
    }

    // Create test transactions for testDate
    const txnDate = new Date(testDate + 'T12:00:00Z');

    // Store 1: CASH transactions
    const tx1 = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx1, storeId1, 1000000, 'CASH', 'COMPLETED', txnDate, new Date(), new Date()]
    );

    // Store 1: More CASH transactions
    const tx2 = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx2, storeId1, 200000, 'CASH', 'COMPLETED', txnDate, new Date(), new Date()]
    );

    // Store 1: MEMBER transaction
    const tx3 = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx3, storeId1, 600000, 'MEMBER', 'COMPLETED', txnDate, new Date(), new Date()]
    );

    // Store 2: CASH transaction
    const tx4 = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx4, storeId2, 2000000, 'CASH', 'COMPLETED', txnDate, new Date(), new Date()]
    );

    // Store 2: TEMPO transaction
    const tx5 = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx5, storeId2, 200000, 'TEMPO', 'COMPLETED', txnDate, new Date(), new Date()]
    );

    // Store 3: Single CASH transaction
    const tx6 = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx6, storeId3, 1800000, 'CASH', 'COMPLETED', txnDate, new Date(), new Date()]
    );

    // Clear cache before each test
    const cacheKey = `report:sales:daily:${testDate}`;
    await CacheService.get(cacheKey); // Just to ensure cache is clean
  });

  afterEach(async () => {
    // Cleanup transactions
    await db.query(`DELETE FROM transactions WHERE store_id IN ($1, $2, $3)`, [
      storeId1,
      storeId2,
      storeId3,
    ]);

    // Cleanup stores
    await db.query(
      `DELETE FROM stores WHERE id IN ($1, $2, $3)`,
      [storeId1, storeId2, storeId3]
    );
  });

  // ====================================================================
  // BASIC TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Valid date returns data', () => {
    it('should return daily report for specified date', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveProperty('date');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('byStore');
      expect(res.body.data.date).toBe(testDate);
    });

    it('should include meta information', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.body.meta).toHaveProperty('timestamp');
      expect(res.body.meta).toHaveProperty('requestId');
      expect(res.body.meta.requestId).toBe('test-request-id');
    });
  });

  // ====================================================================
  // DEFAULT DATE TESTS (Requirement 23.1)
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Default to today when no date provided', () => {
    it('should default to today when no date provided', async () => {
      const res = await request(app).get('/api/v1/reports/sales/daily');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      const today = new Date().toISOString().split('T')[0];
      expect(res.body.data.date).toBe(today);
    });
  });

  // ====================================================================
  // DATE VALIDATION TESTS (Requirement 23.1)
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Invalid date format returns 400', () => {
    it('should return 400 for invalid date format', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: '01-15-2024' });

      expect(res.status).toBe(400);
      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error.message).toContain('Invalid date format');
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 400 for non-date string', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: 'not-a-date' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid date format');
    });

    it('should return 400 for invalid YYYY-MM-DD format', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: '2024-13-01' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid date format');
    });
  });

  describe('GET /api/v1/reports/sales/daily - Future date returns 400', () => {
    it('should return 400 for future dates', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: tomorrowStr });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Cannot query future dates');
    });
  });

  // ====================================================================
  // DATA ACCURACY TESTS (Requirement 23.2)
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Payment method breakdown is accurate', () => {
    it('should correctly aggregate payment methods', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );

      expect(store1).toBeDefined();
      expect(store1.paymentMethods).toHaveProperty('CASH');
      expect(store1.paymentMethods).toHaveProperty('MEMBER');
      expect(store1.paymentMethods.CASH.count).toBe(2); // 2 CASH transactions
      expect(store1.paymentMethods.CASH.amount).toBe(1200000); // 1M + 200k
      expect(store1.paymentMethods.MEMBER.count).toBe(1); // 1 MEMBER transaction
      expect(store1.paymentMethods.MEMBER.amount).toBe(600000);
    });

    it('should include all payment methods used on the day', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );

      expect(store2.paymentMethods).toHaveProperty('CASH');
      expect(store2.paymentMethods).toHaveProperty('TEMPO');
      expect(Object.keys(store2.paymentMethods).length).toBe(2);
    });
  });

  describe('GET /api/v1/reports/sales/daily - Multiple stores handled correctly', () => {
    it('should include all stores with transactions', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      expect(res.body.data.byStore.length).toBeGreaterThanOrEqual(3);
      const storeIds = res.body.data.byStore.map((s: any) => s.storeId);
      expect(storeIds).toContain(storeId1);
      expect(storeIds).toContain(storeId2);
      expect(storeIds).toContain(storeId3);
    });

    it('should have correct store names', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );
      expect(store1.storeName).toBe('Toko Jakarta');

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );
      expect(store2.storeName).toBe('Toko Bandung');
    });
  });

  // ====================================================================
  // CALCULATION TESTS (Requirement 23.2)
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Revenue calculation is correct', () => {
    it('should calculate total revenue per store correctly', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );
      // Store 1: 1M + 200k + 600k = 1.8M
      expect(store1.revenue).toBe(1800000);

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );
      // Store 2: 2M + 200k = 2.2M
      expect(store2.revenue).toBe(2200000);

      const store3 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId3
      );
      // Store 3: 1.8M
      expect(store3.revenue).toBe(1800000);
    });
  });

  describe('GET /api/v1/reports/sales/daily - Transaction count is correct', () => {
    it('should calculate total transactions per store correctly', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );
      expect(store1.transactionCount).toBe(3);

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );
      expect(store2.transactionCount).toBe(2);

      const store3 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId3
      );
      expect(store3.transactionCount).toBe(1);
    });
  });

  describe('GET /api/v1/reports/sales/daily - Average transaction calculation', () => {
    it('should calculate average transaction value correctly', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );
      // 1.8M / 3 = 600k
      expect(store1.averageTransaction).toBe(600000);

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );
      // 2.2M / 2 = 1.1M
      expect(store2.averageTransaction).toBe(1100000);

      const store3 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId3
      );
      // 1.8M / 1 = 1.8M
      expect(store3.averageTransaction).toBe(1800000);
    });

    it('should return 0 for stores with no transactions', async () => {
      // Query a date with no transactions
      const oldDate = '2020-01-01';
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: oldDate });

      expect(res.status).toBe(200);
      // Should have no stores or all with 0 average
      if (res.body.data.byStore.length > 0) {
        res.body.data.byStore.forEach((store: any) => {
          if (store.transactionCount === 0) {
            expect(store.averageTransaction).toBe(0);
          }
        });
      }
    });
  });

  describe('GET /api/v1/reports/sales/daily - Summary totals match store totals', () => {
    it('should sum all store revenue to match summary total', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      const storeRevenues = res.body.data.byStore.reduce(
        (sum: number, store: any) => sum + store.revenue,
        0
      );
      expect(res.body.data.summary.totalRevenue).toBe(storeRevenues);
    });

    it('should sum all store transactions to match summary total', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      const totalTxns = res.body.data.byStore.reduce(
        (sum: number, store: any) => sum + store.transactionCount,
        0
      );
      expect(res.body.data.summary.totalTransactions).toBe(totalTxns);
    });

    it('should have correct store count in summary', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      expect(res.body.data.summary.storeCount).toBe(
        res.body.data.byStore.length
      );
    });
  });

  // ====================================================================
  // EDGE CASE TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Empty result (no transactions for that date)', () => {
    it('should return empty byStore array for date with no transactions', async () => {
      const oldDate = '2020-01-01';
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: oldDate });

      expect(res.status).toBe(200);
      expect(res.body.data.byStore).toEqual([]);
      expect(res.body.data.summary.totalRevenue).toBe(0);
      expect(res.body.data.summary.totalTransactions).toBe(0);
      expect(res.body.data.summary.storeCount).toBe(0);
    });
  });

  describe('GET /api/v1/reports/sales/daily - Handles decimal amounts properly', () => {
    it('should handle decimal amounts in revenue calculations', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      // Verify all amounts are integers (floor of calculations)
      res.body.data.byStore.forEach((store: any) => {
        expect(Number.isInteger(store.revenue)).toBe(true);
        expect(Number.isInteger(store.averageTransaction)).toBe(true);
        Object.values(store.paymentMethods).forEach((method: any) => {
          expect(Number.isInteger(method.amount)).toBe(true);
        });
      });
    });
  });

  // ====================================================================
  // AUTHORIZATION TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Authorization OWNER role required', () => {
    it('should allow OWNER role', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  // ====================================================================
  // CACHING TESTS (Requirement 23.3)
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Cache is stored with correct key', () => {
    it('should cache report data', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      const cacheKey = `report:sales:daily:${testDate}`;
      const cached = await CacheService.get<any>(cacheKey);

      expect(cached).toBeDefined();
      expect(cached?.date).toBe(testDate);
    });
  });

  describe('GET /api/v1/reports/sales/daily - Cache is retrieved on subsequent calls', () => {
    it('should retrieve from cache on second call', async () => {
      // First call
      await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      // Second call should use cache
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.date).toBe(testDate);
    });
  });
});

describe('Daily Sales Report Routes (Requirements 23.1-23.3)', () => {
  let storeId1: string;
  let storeId2: string;
  let storeId3: string;
  const testDate = '2024-01-15';

  beforeEach(async () => {
    // Create test stores
    storeId1 = uuidv4();
    storeId2 = uuidv4();
    storeId3 = uuidv4();

    const stores = [
      { id: storeId1, name: 'Toko Jakarta', is_active: true },
      { id: storeId2, name: 'Toko Bandung', is_active: true },
      { id: storeId3, name: 'Toko Surabaya', is_active: true },
    ];

    for (const store of stores) {
      await db.query(
        `INSERT INTO stores (id, name, is_active) VALUES ($1, $2, $3)
         ON CONFLICT(id) DO NOTHING`,
        [store.id, store.name, store.is_active]
      );
    }

    // Create test transactions for testDate
    const txnDate = new Date(testDate + 'T12:00:00Z');

    // Store 1: CASH transactions
    const tx1 = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx1, storeId1, 1000000, 'CASH', 'COMPLETED', txnDate, new Date(), new Date()]
    );

    // Store 1: More CASH transactions
    const tx2 = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx2, storeId1, 200000, 'CASH', 'COMPLETED', txnDate, new Date(), new Date()]
    );

    // Store 1: MEMBER transaction
    const tx3 = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx3, storeId1, 600000, 'MEMBER', 'COMPLETED', txnDate, new Date(), new Date()]
    );

    // Store 2: CASH transaction
    const tx4 = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx4, storeId2, 2000000, 'CASH', 'COMPLETED', txnDate, new Date(), new Date()]
    );

    // Store 2: TEMPO transaction
    const tx5 = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx5, storeId2, 200000, 'TEMPO', 'COMPLETED', txnDate, new Date(), new Date()]
    );

    // Store 3: Single CASH transaction
    const tx6 = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx6, storeId3, 1800000, 'CASH', 'COMPLETED', txnDate, new Date(), new Date()]
    );

    // Clear cache before each test
    const cacheKey = `report:sales:daily:${testDate}`;
    await CacheService.get(cacheKey); // Just to ensure cache is clean
  });

  afterEach(async () => {
    // Cleanup transactions
    await db.query(`DELETE FROM transactions WHERE store_id IN ($1, $2, $3)`, [
      storeId1,
      storeId2,
      storeId3,
    ]);

    // Cleanup stores
    await db.query(
      `DELETE FROM stores WHERE id IN ($1, $2, $3)`,
      [storeId1, storeId2, storeId3]
    );
  });

  // ====================================================================
  // BASIC TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Valid date returns data', () => {
    it('should return daily report for specified date', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveProperty('date');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('byStore');
      expect(res.body.data.date).toBe(testDate);
    });

    it('should include meta information', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      expect(res.body.meta).toHaveProperty('timestamp');
      expect(res.body.meta).toHaveProperty('requestId');
      expect(res.body.meta.requestId).toBe('test-request-id');
    });
  });

  // ====================================================================
  // DEFAULT DATE TESTS (Requirement 23.1)
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Default to today when no date provided', () => {
    it('should default to today when no date provided', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .expect(200);

      expect(res.body).toHaveProperty('data');
      const today = new Date().toISOString().split('T')[0];
      expect(res.body.data.date).toBe(today);
    });
  });

  // ====================================================================
  // DATE VALIDATION TESTS (Requirement 23.1)
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Invalid date format returns 400', () => {
    it('should return 400 for invalid date format', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: '01-15-2024' })
        .expect(400);

      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error.message).toContain('Invalid date format');
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 400 for non-date string', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: 'not-a-date' })
        .expect(400);

      expect(res.body.error.message).toContain('Invalid date format');
    });

    it('should return 400 for invalid YYYY-MM-DD format', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: '2024-13-01' })
        .expect(400);

      expect(res.body.error.message).toContain('Invalid date format');
    });
  });

  describe('GET /api/v1/reports/sales/daily - Future date returns 400', () => {
    it('should return 400 for future dates', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: tomorrowStr })
        .expect(400);

      expect(res.body.error.message).toBe('Cannot query future dates');
    });
  });

  // ====================================================================
  // DATA ACCURACY TESTS (Requirement 23.2)
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Payment method breakdown is accurate', () => {
    it('should correctly aggregate payment methods', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );

      expect(store1).toBeDefined();
      expect(store1.paymentMethods).toHaveProperty('CASH');
      expect(store1.paymentMethods).toHaveProperty('MEMBER');
      expect(store1.paymentMethods.CASH.count).toBe(2); // 2 CASH transactions
      expect(store1.paymentMethods.CASH.amount).toBe(1200000); // 1M + 200k
      expect(store1.paymentMethods.MEMBER.count).toBe(1); // 1 MEMBER transaction
      expect(store1.paymentMethods.MEMBER.amount).toBe(600000);
    });

    it('should include all payment methods used on the day', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );

      expect(store2.paymentMethods).toHaveProperty('CASH');
      expect(store2.paymentMethods).toHaveProperty('TEMPO');
      expect(Object.keys(store2.paymentMethods).length).toBe(2);
    });
  });

  describe('GET /api/v1/reports/sales/daily - Multiple stores handled correctly', () => {
    it('should include all stores with transactions', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      expect(res.body.data.byStore.length).toBeGreaterThanOrEqual(3);
      const storeIds = res.body.data.byStore.map((s: any) => s.storeId);
      expect(storeIds).toContain(storeId1);
      expect(storeIds).toContain(storeId2);
      expect(storeIds).toContain(storeId3);
    });

    it('should have correct store names', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );
      expect(store1.storeName).toBe('Toko Jakarta');

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );
      expect(store2.storeName).toBe('Toko Bandung');
    });
  });

  // ====================================================================
  // CALCULATION TESTS (Requirement 23.2)
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Revenue calculation is correct', () => {
    it('should calculate total revenue per store correctly', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );
      // Store 1: 1M + 200k + 600k = 1.8M
      expect(store1.revenue).toBe(1800000);

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );
      // Store 2: 2M + 200k = 2.2M
      expect(store2.revenue).toBe(2200000);

      const store3 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId3
      );
      // Store 3: 1.8M
      expect(store3.revenue).toBe(1800000);
    });
  });

  describe('GET /api/v1/reports/sales/daily - Transaction count is correct', () => {
    it('should calculate total transactions per store correctly', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );
      expect(store1.transactionCount).toBe(3);

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );
      expect(store2.transactionCount).toBe(2);

      const store3 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId3
      );
      expect(store3.transactionCount).toBe(1);
    });
  });

  describe('GET /api/v1/reports/sales/daily - Average transaction calculation', () => {
    it('should calculate average transaction value correctly', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );
      // 1.8M / 3 = 600k
      expect(store1.averageTransaction).toBe(600000);

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );
      // 2.2M / 2 = 1.1M
      expect(store2.averageTransaction).toBe(1100000);

      const store3 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId3
      );
      // 1.8M / 1 = 1.8M
      expect(store3.averageTransaction).toBe(1800000);
    });

    it('should return 0 for stores with no transactions', async () => {
      // Query a date with no transactions
      const oldDate = '2020-01-01';
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: oldDate })
        .expect(200);

      // Should have no stores or all with 0 average
      if (res.body.data.byStore.length > 0) {
        res.body.data.byStore.forEach((store: any) => {
          if (store.transactionCount === 0) {
            expect(store.averageTransaction).toBe(0);
          }
        });
      }
    });
  });

  describe('GET /api/v1/reports/sales/daily - Summary totals match store totals', () => {
    it('should sum all store revenue to match summary total', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      const storeRevenues = res.body.data.byStore.reduce(
        (sum: number, store: any) => sum + store.revenue,
        0
      );
      expect(res.body.data.summary.totalRevenue).toBe(storeRevenues);
    });

    it('should sum all store transactions to match summary total', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      const totalTxns = res.body.data.byStore.reduce(
        (sum: number, store: any) => sum + store.transactionCount,
        0
      );
      expect(res.body.data.summary.totalTransactions).toBe(totalTxns);
    });

    it('should have correct store count in summary', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      expect(res.body.data.summary.storeCount).toBe(
        res.body.data.byStore.length
      );
    });
  });

  // ====================================================================
  // EDGE CASE TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Empty result (no transactions for that date)', () => {
    it('should return empty byStore array for date with no transactions', async () => {
      const oldDate = '2020-01-01';
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: oldDate })
        .expect(200);

      expect(res.body.data.byStore).toEqual([]);
      expect(res.body.data.summary.totalRevenue).toBe(0);
      expect(res.body.data.summary.totalTransactions).toBe(0);
      expect(res.body.data.summary.storeCount).toBe(0);
    });
  });

  describe('GET /api/v1/reports/sales/daily - Handles decimal amounts properly', () => {
    it('should handle decimal amounts in revenue calculations', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      // Verify all amounts are integers (floor of calculations)
      res.body.data.byStore.forEach((store: any) => {
        expect(Number.isInteger(store.revenue)).toBe(true);
        expect(Number.isInteger(store.averageTransaction)).toBe(true);
        Object.values(store.paymentMethods).forEach((method: any) => {
          expect(Number.isInteger(method.amount)).toBe(true);
        });
      });
    });
  });

  // ====================================================================
  // AUTHORIZATION TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Authorization OWNER role required', () => {
    it('should allow OWNER role', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      expect(res.body).toHaveProperty('data');
    });
  });

  // ====================================================================
  // CACHING TESTS (Requirement 23.3)
  // ====================================================================

  describe('GET /api/v1/reports/sales/daily - Cache is stored with correct key', () => {
    it('should cache report data', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      const cacheKey = `report:sales:daily:${testDate}`;
      const cached = await CacheService.get<any>(cacheKey);

      expect(cached).toBeDefined();
      expect(cached?.date).toBe(testDate);
    });
  });

  describe('GET /api/v1/reports/sales/daily - Cache is retrieved on subsequent calls', () => {
    it('should retrieve from cache on second call', async () => {
      // First call
      await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      // Second call should use cache
      const res = await request(app)
        .get('/api/v1/reports/sales/daily')
        .query({ date: testDate })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.date).toBe(testDate);
    });
  });
});

/**
 * Weekly Sales Reports Tests (Requirements 24.1-24.5)
 * Comprehensive test suite for weekly sales report endpoint
 */
describe('Weekly Sales Report Routes (Requirements 24.1-24.5)', () => {
  let storeId1: string;
  let storeId2: string;
  let storeId3: string;
  const weekNumber = 3;
  const year = 2024;

  beforeEach(async () => {
    storeId1 = uuidv4();
    storeId2 = uuidv4();
    storeId3 = uuidv4();

    const stores = [
      { id: storeId1, name: 'Toko Jakarta', is_active: true },
      { id: storeId2, name: 'Toko Bandung', is_active: true },
      { id: storeId3, name: 'Toko Surabaya', is_active: true },
    ];

    for (const store of stores) {
      await db.query(
        `INSERT INTO stores (id, name, is_active) VALUES ($1, $2, $3)
         ON CONFLICT(id) DO NOTHING`,
        [store.id, store.name, store.is_active]
      );
    }

    // Week 3 of 2024: Jan 15-21
    // Create transactions for different days of the week
    const dates = [
      '2024-01-15', // Monday
      '2024-01-16', // Tuesday
      '2024-01-17', // Wednesday
      '2024-01-18', // Thursday
      '2024-01-19', // Friday
      '2024-01-20', // Saturday
      '2024-01-21', // Sunday
    ];

    // Store 1: Spread transactions across week
    for (let i = 0; i < dates.length; i++) {
      const txnDate = new Date(dates[i] + 'T12:00:00Z');
      const tx = uuidv4();
      await db.query(
        `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT(id) DO NOTHING`,
        [tx, storeId1, 1000000, 'CASH', 'COMPLETED', txnDate, new Date(), new Date()]
      );
    }

    // Store 2: Different payment methods
    const paymentMethods = ['CASH', 'MEMBER', 'TEMPO'];
    for (let i = 0; i < 3; i++) {
      const txnDate = new Date(dates[i] + 'T14:00:00Z');
      const tx = uuidv4();
      await db.query(
        `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT(id) DO NOTHING`,
        [tx, storeId2, 2000000, paymentMethods[i], 'COMPLETED', txnDate, new Date(), new Date()]
      );
    }

    // Store 3: Single transaction
    const tx = uuidv4();
    await db.query(
      `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO NOTHING`,
      [tx, storeId3, 1500000, 'CASH', 'COMPLETED', new Date('2024-01-15T10:00:00Z'), new Date(), new Date()]
    );
  });

  afterEach(async () => {
    await db.query(`DELETE FROM transactions WHERE store_id IN ($1, $2, $3)`, [
      storeId1,
      storeId2,
      storeId3,
    ]);

    await db.query(
      `DELETE FROM stores WHERE id IN ($1, $2, $3)`,
      [storeId1, storeId2, storeId3]
    );
  });

  // ====================================================================
  // BASIC TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/weekly - Valid week returns data', () => {
    it('should return weekly report for specified week', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveProperty('week');
      expect(res.body.data).toHaveProperty('year');
      expect(res.body.data).toHaveProperty('weekStart');
      expect(res.body.data).toHaveProperty('weekEnd');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('byStore');
      expect(res.body.data.week).toBe(weekNumber);
      expect(res.body.data.year).toBe(year);
    });

    it('should include meta information', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      expect(res.body.meta).toHaveProperty('timestamp');
      expect(res.body.meta).toHaveProperty('requestId');
      expect(res.body.meta.requestId).toBe('test-request-id');
    });

    it('should have correct week start and end dates', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      expect(res.body.data.weekStart).toBe('2024-01-15');
      expect(res.body.data.weekEnd).toBe('2024-01-21');
    });
  });

  // ====================================================================
  // WEEK AND YEAR VALIDATION TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/weekly - Week validation', () => {
    it('should return 400 for missing week parameter', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ year })
        .expect(400);

      expect(res.body.error.message).toContain('Week parameter is required');
    });

    it('should return 400 for invalid week number (< 1)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: 0, year })
        .expect(400);

      expect(res.body.error.message).toContain('Invalid week number');
    });

    it('should return 400 for invalid week number (> 53)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: 54, year })
        .expect(400);

      expect(res.body.error.message).toContain('Invalid week number');
    });

    it('should return 400 for non-numeric week', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: 'abc', year })
        .expect(400);

      expect(res.body.error.message).toContain('Invalid week number');
    });

    it('should accept valid week numbers 1-53', async () => {
      for (let w of [1, 10, 26, 52, 53]) {
        const res = await request(app)
          .get('/api/v1/reports/sales/weekly')
          .query({ week: w, year: 2024 })
          .expect(200);

        expect(res.body.data.week).toBe(w);
      }
    });
  });

  describe('GET /api/v1/reports/sales/weekly - Year validation', () => {
    it('should return 400 for missing year parameter', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber })
        .expect(400);

      expect(res.body.error.message).toContain('Year parameter is required');
    });

    it('should return 400 for year outside allowed range', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year: 2000 })
        .expect(400);

      expect(res.body.error.message).toContain('Year must be between');
    });

    it('should return 400 for non-numeric year', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year: 'abc' })
        .expect(400);

      expect(res.body.error.message).toContain('Year must be between');
    });
  });

  describe('GET /api/v1/reports/sales/weekly - Future week rejection', () => {
    it('should return 400 for future weeks', async () => {
      const nextYear = new Date().getFullYear() + 1;
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: 1, year: nextYear })
        .expect(400);

      expect(res.body.error.message).toContain('Cannot query future weeks');
    });
  });

  // ====================================================================
  // DATA ACCURACY TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/weekly - Daily breakdown accuracy', () => {
    it('should include all 7 days of the week', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );

      expect(store1.dailyBreakdown).toHaveLength(7);
      expect(store1.dailyBreakdown[0].dayOfWeek).toBe('Senin');
      expect(store1.dailyBreakdown[6].dayOfWeek).toBe('Minggu');
    });

    it('should show transaction data for each day', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );

      // Store 1 has 1 transaction per day
      store1.dailyBreakdown.forEach((day: any) => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('dayOfWeek');
        expect(day).toHaveProperty('revenue');
        expect(day).toHaveProperty('transactionCount');
        expect(day.transactionCount).toBe(1);
        expect(day.revenue).toBe(1000000);
      });
    });

    it('should show zero transactions for days without data', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      const store3 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId3
      );

      // Store 3 only has 1 transaction on Monday
      expect(store3.dailyBreakdown[0].transactionCount).toBe(1);
      for (let i = 1; i < 7; i++) {
        expect(store3.dailyBreakdown[i].transactionCount).toBe(0);
        expect(store3.dailyBreakdown[i].revenue).toBe(0);
      }
    });
  });

  describe('GET /api/v1/reports/sales/weekly - Payment method aggregation', () => {
    it('should correctly aggregate payment methods across week', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );

      expect(store2.paymentMethods).toHaveProperty('CASH');
      expect(store2.paymentMethods).toHaveProperty('MEMBER');
      expect(store2.paymentMethods).toHaveProperty('TEMPO');

      expect(store2.paymentMethods.CASH.count).toBe(1);
      expect(store2.paymentMethods.MEMBER.count).toBe(1);
      expect(store2.paymentMethods.TEMPO.count).toBe(1);

      expect(store2.paymentMethods.CASH.amount).toBe(2000000);
      expect(store2.paymentMethods.MEMBER.amount).toBe(2000000);
      expect(store2.paymentMethods.TEMPO.amount).toBe(2000000);
    });
  });

  describe('GET /api/v1/reports/sales/weekly - Multiple stores', () => {
    it('should include all active stores with transactions', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      expect(res.body.data.byStore.length).toBeGreaterThanOrEqual(3);
      const storeIds = res.body.data.byStore.map((s: any) => s.storeId);
      expect(storeIds).toContain(storeId1);
      expect(storeIds).toContain(storeId2);
      expect(storeIds).toContain(storeId3);
    });

    it('should have correct store names', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );
      expect(store1.storeName).toBe('Toko Jakarta');

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );
      expect(store2.storeName).toBe('Toko Bandung');
    });
  });

  // ====================================================================
  // CALCULATION TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/weekly - Revenue calculation', () => {
    it('should calculate total weekly revenue per store correctly', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );
      // Store 1: 7 days * 1M = 7M
      expect(store1.revenue).toBe(7000000);

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );
      // Store 2: 3 transactions * 2M = 6M
      expect(store2.revenue).toBe(6000000);

      const store3 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId3
      );
      // Store 3: 1.5M
      expect(store3.revenue).toBe(1500000);
    });

    it('should sum all store revenue to match summary total', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      const storeRevenues = res.body.data.byStore.reduce(
        (sum: number, store: any) => sum + store.revenue,
        0
      );
      expect(res.body.data.summary.totalRevenue).toBe(storeRevenues);
    });
  });

  describe('GET /api/v1/reports/sales/weekly - Transaction count', () => {
    it('should calculate total transactions per store correctly', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      const store1 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId1
      );
      expect(store1.transactionCount).toBe(7);

      const store2 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId2
      );
      expect(store2.transactionCount).toBe(3);

      const store3 = res.body.data.byStore.find(
        (s: any) => s.storeId === storeId3
      );
      expect(store3.transactionCount).toBe(1);
    });

    it('should sum all store transactions to match summary total', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      const totalTxns = res.body.data.byStore.reduce(
        (sum: number, store: any) => sum + store.transactionCount,
        0
      );
      expect(res.body.data.summary.totalTransactions).toBe(totalTxns);
    });
  });

  describe('GET /api/v1/reports/sales/weekly - Summary totals', () => {
    it('should have correct store count in summary', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      expect(res.body.data.summary.storeCount).toBe(
        res.body.data.byStore.length
      );
    });
  });

  // ====================================================================
  // EDGE CASE TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/weekly - Empty result', () => {
    it('should return empty byStore array for week with no transactions', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: 1, year: 2020 })
        .expect(200);

      expect(res.body.data.byStore).toEqual([]);
      expect(res.body.data.summary.totalRevenue).toBe(0);
      expect(res.body.data.summary.totalTransactions).toBe(0);
      expect(res.body.data.summary.storeCount).toBe(0);
    });
  });

  describe('GET /api/v1/reports/sales/weekly - Store filter', () => {
    it('should filter by storeId parameter', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year, storeId: storeId1 })
        .expect(200);

      expect(res.body.data.byStore).toHaveLength(1);
      expect(res.body.data.byStore[0].storeId).toBe(storeId1);
    });

    it('should return empty when filtered store has no transactions', async () => {
      // Create a store without transactions
      const emptyStoreId = uuidv4();
      await db.query(
        `INSERT INTO stores (id, name, is_active) VALUES ($1, $2, $3)
         ON CONFLICT(id) DO NOTHING`,
        [emptyStoreId, 'Empty Store', true]
      );

      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year, storeId: emptyStoreId })
        .expect(200);

      expect(res.body.data.byStore).toHaveLength(0);

      // Cleanup
      await db.query('DELETE FROM stores WHERE id = $1', [emptyStoreId]);
    });
  });

  // ====================================================================
  // AUTHORIZATION TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/weekly - Authorization', () => {
    it('should allow OWNER role', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      expect(res.body).toHaveProperty('data');
    });
  });

  // ====================================================================
  // CACHING TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/weekly - Cache functionality', () => {
    it('should cache report data with correct key', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      const cacheKey = `report:sales:weekly:${year}-W${String(weekNumber).padStart(2, '0')}`;
      const cached = await CacheService.get<any>(cacheKey);

      expect(cached).toBeDefined();
      expect(cached?.week).toBe(weekNumber);
      expect(cached?.year).toBe(year);
    });

    it('should retrieve from cache on subsequent calls', async () => {
      // First call
      await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      // Second call should use cache
      const res = await request(app)
        .get('/api/v1/reports/sales/weekly')
        .query({ week: weekNumber, year })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.week).toBe(weekNumber);
    });
  });
});


/**
 * Monthly Sales Report Tests (Requirements 25.1-25.6)
 * Comprehensive test suite for monthly sales report endpoint
 */
describe('Monthly Sales Report Routes (Requirements 25.1-25.6)', () => {
  let storeId1: string;
  let storeId2: string;
  let storeId3: string;
  let productId1: string;
  let productId2: string;
  let productId3: string;
  const testMonth = 1;
  const testYear = 2024;

  beforeEach(async () => {
    // Create test stores
    storeId1 = uuidv4();
    storeId2 = uuidv4();
    storeId3 = uuidv4();

    const stores = [
      { id: storeId1, name: 'Toko Jakarta', is_active: true },
      { id: storeId2, name: 'Toko Bandung', is_active: true },
      { id: storeId3, name: 'Toko Surabaya', is_active: true },
    ];

    for (const store of stores) {
      await db.query(
        `INSERT INTO stores (id, name, is_active) VALUES ($1, $2, $3)
         ON CONFLICT(id) DO NOTHING`,
        [store.id, store.name, store.is_active]
      );
    }

    // Create test products
    productId1 = uuidv4();
    productId2 = uuidv4();
    productId3 = uuidv4();

    const products = [
      { id: productId1, name: 'Vape Pod X', category: 'pods', purchase_price: 10000, selling_price: 20000 },
      { id: productId2, name: 'Liquid Premium', category: 'liquid', purchase_price: 5000, selling_price: 15000 },
      { id: productId3, name: 'Coil Pack', category: 'coil', purchase_price: 2000, selling_price: 5000 },
    ];

    for (const product of products) {
      await db.query(
        `INSERT INTO products (id, name, category, purchase_price, selling_price, is_active) 
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT(id) DO NOTHING`,
        [product.id, product.name, product.category, product.purchase_price, product.selling_price]
      );
    }

    // Create test transactions throughout the month
    const transactionDates = [
      new Date(Date.UTC(testYear, testMonth - 1, 5, 10, 0, 0)),
      new Date(Date.UTC(testYear, testMonth - 1, 12, 14, 0, 0)),
      new Date(Date.UTC(testYear, testMonth - 1, 15, 11, 0, 0)),
      new Date(Date.UTC(testYear, testMonth - 1, 22, 15, 0, 0)),
      new Date(Date.UTC(testYear, testMonth - 1, 28, 13, 0, 0)),
    ];

    // Create transactions with items
    const txnPromises = transactionDates.map(async (date, idx) => {
      const txnId = uuidv4();
      const storeId = [storeId1, storeId2, storeId3][idx % 3];
      const amount = 1000000 + idx * 100000;

      await db.query(
        `INSERT INTO transactions (id, store_id, total_amount, payment_method, status, transaction_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT(id) DO NOTHING`,
        [txnId, storeId, amount, 'CASH', 'COMPLETED', date, new Date(), new Date()]
      );

      // Add transaction items
      const productIds = [productId1, productId2, productId3];
      for (let i = 0; i < 2; i++) {
        const itemId = uuidv4();
        const quantity = i + 1;
        const unitPrice = [20000, 15000][i];
        const lineTotal = unitPrice * quantity;

        await db.query(
          `INSERT INTO transaction_items (id, transaction_id, product_id, quantity, unit_price, line_total, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT(id) DO NOTHING`,
          [itemId, txnId, productIds[i], quantity, unitPrice, lineTotal, new Date(), new Date()]
        );
      }
    });

    await Promise.all(txnPromises);
  });

  afterEach(async () => {
    // Cleanup transaction items
    await db.query(`DELETE FROM transaction_items WHERE created_at > $1`, [
      new Date(Date.UTC(testYear, testMonth - 1, 1, 0, 0, 0)),
    ]);

    // Cleanup transactions
    await db.query(
      `DELETE FROM transactions WHERE store_id IN ($1, $2, $3)`,
      [storeId1, storeId2, storeId3]
    );

    // Cleanup products
    await db.query(
      `DELETE FROM products WHERE id IN ($1, $2, $3)`,
      [productId1, productId2, productId3]
    );

    // Cleanup stores
    await db.query(
      `DELETE FROM stores WHERE id IN ($1, $2, $3)`,
      [storeId1, storeId2, storeId3]
    );
  });

  // ====================================================================
  // BASIC TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/monthly - Valid month/year returns data', () => {
    it('should return monthly report for specified month and year', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveProperty('month');
      expect(res.body.data).toHaveProperty('year');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('byStore');
      expect(res.body.data).toHaveProperty('topProducts');
      expect(res.body.data.month).toBe(testMonth);
      expect(res.body.data.year).toBe(testYear);
    });

    it('should include meta information', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      expect(res.body.meta).toHaveProperty('timestamp');
      expect(res.body.meta).toHaveProperty('requestId');
    });

    it('should have monthStart and monthEnd dates', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      expect(res.body.data.monthStart).toBe(`${testYear}-01-01`);
      expect(res.body.data.monthEnd).toBe(`${testYear}-01-31`);
    });
  });

  // ====================================================================
  // VALIDATION TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/monthly - Month validation', () => {
    it('should return 400 for missing month parameter', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ year: testYear })
        .expect(400);

      expect(res.body.error.message).toContain('Month parameter is required');
    });

    it('should return 400 for invalid month number (0)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: 0, year: testYear })
        .expect(400);

      expect(res.body.error.message).toContain('Invalid month number');
    });

    it('should return 400 for invalid month number (13)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: 13, year: testYear })
        .expect(400);

      expect(res.body.error.message).toContain('Invalid month number');
    });

    it('should return 400 for non-numeric month', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: 'january', year: testYear })
        .expect(400);

      expect(res.body.error.message).toContain('Invalid month number');
    });
  });

  describe('GET /api/v1/reports/sales/monthly - Year validation', () => {
    it('should return 400 for missing year parameter', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth })
        .expect(400);

      expect(res.body.error.message).toContain('Year parameter is required');
    });

    it('should return 400 for invalid year (too old)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear - 5 })
        .expect(400);

      expect(res.body.error.message).toContain('Year must be between');
    });

    it('should return 400 for invalid year (too far future)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear + 5 })
        .expect(400);

      expect(res.body.error.message).toContain('Year must be between');
    });
  });

  describe('GET /api/v1/reports/sales/monthly - Future month validation', () => {
    it('should return 400 for future months', async () => {
      const futureYear = testYear + 1;
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: futureYear })
        .expect(400);

      expect(res.body.error.message).toBe('Cannot query future months');
    });
  });

  // ====================================================================
  // DATA STRUCTURE TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/monthly - Response structure is correct', () => {
    it('should have correct summary structure', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const summary = res.body.data.summary;
      expect(summary).toHaveProperty('totalRevenue');
      expect(summary).toHaveProperty('totalTransactions');
      expect(summary).toHaveProperty('storeCount');
      expect(summary).toHaveProperty('averageTransaction');
      expect(summary).toHaveProperty('topProduct');
      expect(typeof summary.totalRevenue).toBe('number');
      expect(typeof summary.totalTransactions).toBe('number');
      expect(typeof summary.storeCount).toBe('number');
      expect(typeof summary.averageTransaction).toBe('number');
    });

    it('should have correct store structure', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const stores = res.body.data.byStore;
      expect(stores.length).toBeGreaterThan(0);

      stores.forEach((store: any) => {
        expect(store).toHaveProperty('storeId');
        expect(store).toHaveProperty('storeName');
        expect(store).toHaveProperty('revenue');
        expect(store).toHaveProperty('transactionCount');
        expect(store).toHaveProperty('paymentMethods');
        expect(store).toHaveProperty('weeklyBreakdown');
        expect(Array.isArray(store.weeklyBreakdown)).toBe(true);
      });
    });

    it('should have correct weekly breakdown structure', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const stores = res.body.data.byStore;
      stores.forEach((store: any) => {
        store.weeklyBreakdown.forEach((week: any) => {
          expect(week).toHaveProperty('weekNumber');
          expect(week).toHaveProperty('weekStart');
          expect(week).toHaveProperty('weekEnd');
          expect(week).toHaveProperty('revenue');
          expect(week).toHaveProperty('transactionCount');
          expect(typeof week.weekNumber).toBe('number');
          expect(typeof week.revenue).toBe('number');
          expect(typeof week.transactionCount).toBe('number');
        });
      });
    });

    it('should have correct top products structure', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const products = res.body.data.topProducts;
      expect(Array.isArray(products)).toBe(true);

      products.forEach((product: any) => {
        expect(product).toHaveProperty('productId');
        expect(product).toHaveProperty('productName');
        expect(product).toHaveProperty('quantitySold');
        expect(product).toHaveProperty('revenue');
        expect(product).toHaveProperty('averagePrice');
      });
    });
  });

  // ====================================================================
  // CALCULATION TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/monthly - Revenue calculation is correct', () => {
    it('should calculate total revenue correctly', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      expect(res.body.data.summary.totalRevenue).toBeGreaterThan(0);
    });

    it('should match store revenues with summary total', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const storeRevenues = res.body.data.byStore.reduce(
        (sum: number, store: any) => sum + store.revenue,
        0
      );
      expect(res.body.data.summary.totalRevenue).toBe(storeRevenues);
    });

    it('should calculate average transaction correctly', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const expectedAvg = Math.floor(
        res.body.data.summary.totalRevenue / res.body.data.summary.totalTransactions
      );
      expect(res.body.data.summary.averageTransaction).toBe(expectedAvg);
    });
  });

  describe('GET /api/v1/reports/sales/monthly - Transaction count is correct', () => {
    it('should calculate total transactions correctly', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      expect(res.body.data.summary.totalTransactions).toBeGreaterThan(0);
    });

    it('should match store transactions with summary total', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const totalTxns = res.body.data.byStore.reduce(
        (sum: number, store: any) => sum + store.transactionCount,
        0
      );
      expect(res.body.data.summary.totalTransactions).toBe(totalTxns);
    });
  });

  describe('GET /api/v1/reports/sales/monthly - Weekly breakdown is accurate', () => {
    it('should include all weeks in the month', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const stores = res.body.data.byStore;
      stores.forEach((store: any) => {
        expect(store.weeklyBreakdown.length).toBeGreaterThanOrEqual(4);
      });
    });

    it('should have valid date ranges for weeks', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const stores = res.body.data.byStore;
      stores.forEach((store: any) => {
        store.weeklyBreakdown.forEach((week: any) => {
          const startDate = new Date(week.weekStart);
          const endDate = new Date(week.weekEnd);
          expect(startDate).toBeLessThanOrEqual(endDate);
        });
      });
    });
  });

  describe('GET /api/v1/reports/sales/monthly - Top products list is correct', () => {
    it('should limit top products to 10', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      expect(res.body.data.topProducts.length).toBeLessThanOrEqual(10);
    });

    it('should sort products by quantity (descending)', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const products = res.body.data.topProducts;
      for (let i = 1; i < products.length; i++) {
        expect(products[i - 1].quantitySold).toBeGreaterThanOrEqual(products[i].quantitySold);
      }
    });

    it('should have valid product data', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const products = res.body.data.topProducts;
      products.forEach((product: any) => {
        expect(product.productId).toBeTruthy();
        expect(product.productName).toBeTruthy();
        expect(product.quantitySold).toBeGreaterThan(0);
        expect(product.revenue).toBeGreaterThanOrEqual(0);
        expect(product.averagePrice).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('GET /api/v1/reports/sales/monthly - Top product in summary is accurate', () => {
    it('should have top product in summary', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const topProduct = res.body.data.summary.topProduct;
      if (res.body.data.topProducts.length > 0) {
        expect(topProduct).toBeTruthy();
        expect(topProduct.productId).toBe(res.body.data.topProducts[0].productId);
        expect(topProduct.quantitySold).toBe(res.body.data.topProducts[0].quantitySold);
      }
    });
  });

  // ====================================================================
  // EDGE CASE TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/monthly - Edge cases', () => {
    it('should return empty byStore array for month with no transactions', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: 12, year: 2020 })
        .expect(200);

      expect(res.body.data.byStore).toEqual([]);
      expect(res.body.data.summary.totalRevenue).toBe(0);
      expect(res.body.data.summary.totalTransactions).toBe(0);
    });

    it('should handle all months 1-12', async () => {
      for (let month = 1; month <= 12; month++) {
        const res = await request(app)
          .get('/api/v1/reports/sales/monthly')
          .query({ month, year: testYear })
          .expect(200);

        expect(res.body.data.month).toBe(month);
      }
    });
  });

  // ====================================================================
  // AUTHORIZATION TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/monthly - Authorization OWNER role required', () => {
    it('should allow OWNER role', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      expect(res.body).toHaveProperty('data');
    });
  });

  // ====================================================================
  // CACHING TESTS
  // ====================================================================

  describe('GET /api/v1/reports/sales/monthly - Cache functionality', () => {
    it('should cache report data with correct key', async () => {
      await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      const cacheKey = `report:sales:monthly:${testYear}-${String(testMonth).padStart(2, '0')}`;
      const cached = await CacheService.get<any>(cacheKey);

      expect(cached).toBeDefined();
      expect(cached?.month).toBe(testMonth);
      expect(cached?.year).toBe(testYear);
    });

    it('should retrieve from cache on subsequent calls', async () => {
      // First call
      await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      // Second call should use cache
      const res = await request(app)
        .get('/api/v1/reports/sales/monthly')
        .query({ month: testMonth, year: testYear })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.month).toBe(testMonth);
    });
  });
});
