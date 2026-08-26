/**
 * Sync Route Integration Tests
 * Tests for batch sync HTTP endpoint
 */

import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../database/connection.js';
import { v4 as uuidv4 } from 'uuid';

const app = createApp();

describe('Sync Routes - POST /api/sync/batch', () => {
  let authToken: string;
  let testStoreId: string;
  let testKasirId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Initialize database
    await db.initialize();

    // Create test data
    testStoreId = uuidv4();
    testKasirId = uuidv4();
    testProductId = uuidv4();

    // Insert test store
    await db.query('INSERT INTO stores (id, name, address) VALUES ($1, $2, $3)', [
      testStoreId,
      'Test Store',
      'Test Address',
    ]);

    // Insert test user with password hash
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('testpassword', 10);

    await db.query(
      'INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [testKasirId, 'testuser', 'test@test.com', passwordHash, 'KASIR', testStoreId, true]
    );

    // Insert test product
    await db.query(
      'INSERT INTO products (id, name, sku, cost_price, selling_price) VALUES ($1, $2, $3, $4, $5)',
      [testProductId, 'Test Product', 'SKU-001', 10000, 15000]
    );

    // Insert inventory
    await db.query(
      'INSERT INTO inventory (id, product_id, store_id, quantity) VALUES ($1, $2, $3, $4)',
      [uuidv4(), testProductId, testStoreId, 100]
    );

    // Get auth token by logging in
    const loginResponse = await request(app).post('/api/auth/login').send({
      username: 'testuser',
      password: 'testpassword',
    });

    if (loginResponse.body.token) {
      authToken = loginResponse.body.token;
    } else {
      throw new Error('Failed to get auth token');
    }
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    // Clean up transactions
    await db.query('DELETE FROM transaction_items');
    await db.query('DELETE FROM piutang');
    await db.query('DELETE FROM transactions');
  });

  describe('Batch Sync Endpoint', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/sync/batch')
        .send({ items: [] });

      expect(response.status).toBe(401);
    });

    it('should reject request without items field', async () => {
      const response = await request(app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject request with non-array items', async () => {
      const response = await request(app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: 'not an array' });

      expect(response.status).toBe(400);
    });

    it('should handle empty items array', async () => {
      const response = await request(app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(0);
      expect(response.body.version).toBe('1.0.0');
    });

    it('should process single transaction in batch', async () => {
      const response = await request(app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              id: 'sync-1',
              entityType: 'transaction',
              changeType: 'CREATE',
              data: {
                storeId: testStoreId,
                kasirId: testKasirId,
                items: [
                  {
                    productId: testProductId,
                    quantity: 2,
                    unitPrice: 15000,
                    totalPrice: 30000,
                  },
                ],
                paymentMethod: 'CASH',
                paymentData: {
                  cash: {
                    amountReceived: 50000,
                    change: 20000,
                  },
                },
              },
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].id).toBe('sync-1');
      expect(response.body.results[0].success).toBe(true);
      expect(response.body.results[0].data).toBeDefined();
      expect(response.body.results[0].serverTimestamp).toBeDefined();
    });

    it('should return proper response format', async () => {
      const response = await request(app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              id: 'format-1',
              entityType: 'transaction',
              changeType: 'CREATE',
              data: {
                storeId: testStoreId,
                kasirId: testKasirId,
                items: [
                  {
                    productId: testProductId,
                    quantity: 1,
                    unitPrice: 15000,
                    totalPrice: 15000,
                  },
                ],
                paymentMethod: 'CASH',
                paymentData: {
                  cash: {
                    amountReceived: 20000,
                    change: 5000,
                  },
                },
              },
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');

      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results[0]).toHaveProperty('id');
      expect(response.body.results[0]).toHaveProperty('success');
      expect(response.body.results[0]).toHaveProperty('serverTimestamp');
    });

    it('should process multiple items in single batch', async () => {
      const response = await request(app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              id: 'multi-1',
              entityType: 'transaction',
              changeType: 'CREATE',
              data: {
                storeId: testStoreId,
                kasirId: testKasirId,
                items: [
                  {
                    productId: testProductId,
                    quantity: 1,
                    unitPrice: 15000,
                    totalPrice: 15000,
                  },
                ],
                paymentMethod: 'CASH',
                paymentData: {
                  cash: {
                    amountReceived: 20000,
                    change: 5000,
                  },
                },
              },
            },
            {
              id: 'multi-2',
              entityType: 'member',
              changeType: 'CREATE',
              data: {
                name: 'New Member',
                phone: '08123456789',
              },
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0].success).toBe(true);
      expect(response.body.results[1].success).toBe(true);
    });

    it('should handle failed items in batch', async () => {
      const response = await request(app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              id: 'fail-1',
              entityType: 'member',
              changeType: 'CREATE',
              data: {
                name: 'Member',
                // Missing phone - this will fail
              },
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results[0].success).toBe(false);
      expect(response.body.results[0].error).toBeDefined();
    });

    it('should validate item structure', async () => {
      const response = await request(app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              // Missing id
              entityType: 'transaction',
              changeType: 'CREATE',
              data: {},
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.details).toBeDefined();
    });
  });

  describe('Sync Stats Endpoint', () => {
    it('should require authentication', async () => {
      const response = await request(app).get('/api/sync/stats');

      expect(response.status).toBe(401);
    });

    it('should return sync statistics', async () => {
      const response = await request(app)
        .get('/api/sync/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalQueued');
      expect(response.body).toHaveProperty('totalProcessed');
      expect(response.body).toHaveProperty('totalFailed');
      expect(response.body).toHaveProperty('lastSyncTime');
    });
  });

  describe('Sync Health Endpoint', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/sync/health');

      expect(response.status).toBe(401);
    });

    it('should return health status', async () => {
      const response = await request(app)
        .post('/api/sync/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.version).toBe('1.0.0');
    });
  });

  describe('Content-Type Handling', () => {
    it('should handle JSON content type', async () => {
      const response = await request(app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send({ items: [] });

      expect(response.status).toBe(200);
    });
  });

  describe('Large Batch Handling', () => {
    it('should process batch with many items', async () => {
      const items = [];

      for (let i = 0; i < 100; i++) {
        items.push({
          id: `large-${i}`,
          entityType: 'member',
          changeType: 'CREATE',
          data: {
            name: `Member ${i}`,
            phone: `0812345678${i % 10}`,
          },
        });
      }

      const response = await request(app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toHaveLength(100);
    });
  });

  describe('Timestamp Handling', () => {
    it('should include serverTimestamp in all responses', async () => {
      const response = await request(app)
        .post('/api/sync/batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            {
              id: 'ts-1',
              entityType: 'transaction',
              changeType: 'CREATE',
              data: {
                storeId: testStoreId,
                kasirId: testKasirId,
                items: [
                  {
                    productId: testProductId,
                    quantity: 1,
                    unitPrice: 15000,
                    totalPrice: 15000,
                  },
                ],
                paymentMethod: 'CASH',
                paymentData: {
                  cash: {
                    amountReceived: 20000,
                    change: 5000,
                  },
                },
              },
              clientTimestamp: Date.now(),
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.timestamp).toBeGreaterThan(0);

      for (const result of response.body.results) {
        expect(result.serverTimestamp).toBeDefined();
        expect(result.serverTimestamp).toBeGreaterThan(0);
      }
    });
  });
});
