/**
 * Unit Tests for Purchase Orders Management
 * Tests owner-only purchase order creation with CASH, TRANSFER, TEMPO payment methods
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../app.js';
import { db } from '../../database/connection.js';
import { AuthService } from '../../services/auth.js';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';

describe('Purchase Orders Management', () => {
  let app: any;
  let testUserId: string;
  let testStoreId: string;
  let supplierId: string;
  let productId: string;
  let userToken: string;
  let kasirUserId: string;
  let kasirToken: string;
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
    supplierId = uuidv4();
    productId = uuidv4();

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

    // Create supplier
    await db.query(
      `INSERT INTO suppliers (id, name, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [supplierId, 'Test Supplier', true, new Date(), new Date()]
    );

    // Create product
    await db.query(
      `INSERT INTO products (id, name, category, buy_price, sell_price, stock, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [productId, 'Test Product', 'Liquid', 50000, 100000, 0, true, new Date(), new Date()]
    );
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM po_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE supplier_id = $1)', [supplierId]);
    await db.query('DELETE FROM purchase_orders WHERE supplier_id = $1', [supplierId]);
    await db.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
    await db.query('DELETE FROM products WHERE id = $1', [productId]);
    await db.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, kasirUserId]);
    await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
  });

  describe('GET /api/purchase-orders', () => {
    it('should list all purchase orders (owner only)', async () => {
      const response = await request(app)
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeDefined();
    });

    it('should reject purchase orders list for non-owner (kasir)', async () => {
      const response = await request(app)
        .get('/api/purchase-orders')
        .set('Authorization', `Bearer ${kasirToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication for purchase orders list', async () => {
      const response = await request(app)
        .get('/api/purchase-orders');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/purchase-orders', () => {
    it('should create CASH payment purchase order (owner only)', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId,
          paymentMethod: 'CASH',
          items: [
            {
              productId,
              quantity: 10,
              unitPrice: 50000,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.paymentMethod).toBe('CASH');
      expect(response.body.totalAmount).toBe(500000);
      expect(response.body.dueDate).toBeNull();
      expect(response.body.items).toHaveLength(1);
    });

    it('should create TRANSFER payment purchase order', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId,
          paymentMethod: 'TRANSFER',
          items: [
            {
              productId,
              quantity: 5,
              unitPrice: 50000,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.paymentMethod).toBe('TRANSFER');
      expect(response.body.dueDate).toBeNull();
    });

    it('should create TEMPO payment purchase order with due date calculation', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId,
          paymentMethod: 'TEMPO',
          durationDays: 30,
          items: [
            {
              productId,
              quantity: 8,
              unitPrice: 50000,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.paymentMethod).toBe('TEMPO');
      expect(response.body.dueDate).toBeDefined();
      expect(response.body.dueDate).not.toBeNull();

      // Verify due date is 30 days in future
      const orderDate = new Date(response.body.orderDate);
      const dueDate = new Date(response.body.dueDate);
      const diffTime = Math.abs(dueDate.getTime() - orderDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });

    it('should create purchase order with multiple items', async () => {
      const product2Id = uuidv4();
      await db.query(
        `INSERT INTO products (id, name, category, buy_price, sell_price, stock, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [product2Id, 'Test Product 2', 'Coil', 75000, 150000, 0, true, new Date(), new Date()]
      );

      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId,
          paymentMethod: 'CASH',
          items: [
            {
              productId,
              quantity: 10,
              unitPrice: 50000,
            },
            {
              productId: product2Id,
              quantity: 5,
              unitPrice: 75000,
            },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.items).toHaveLength(2);
      expect(response.body.totalAmount).toBe(875000); // (10*50000) + (5*75000)

      // Cleanup
      await db.query('DELETE FROM products WHERE id = $1', [product2Id]);
    });

    it('should reject purchase order creation for non-owner (kasir)', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${kasirToken}`)
        .send({
          supplierId,
          paymentMethod: 'CASH',
          items: [
            {
              productId,
              quantity: 10,
              unitPrice: 50000,
            },
          ],
        });

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .send({
          supplierId,
          paymentMethod: 'CASH',
          items: [
            {
              productId,
              quantity: 10,
              unitPrice: 50000,
            },
          ],
        });

      expect(response.status).toBe(401);
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId,
          // missing paymentMethod and items
        });

      expect(response.status).toBe(400);
    });

    it('should reject invalid payment method', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId,
          paymentMethod: 'INVALID',
          items: [
            {
              productId,
              quantity: 10,
              unitPrice: 50000,
            },
          ],
        });

      expect(response.status).toBe(400);
    });

    it('should reject TEMPO without durationDays', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId,
          paymentMethod: 'TEMPO',
          // missing durationDays
          items: [
            {
              productId,
              quantity: 10,
              unitPrice: 50000,
            },
          ],
        });

      expect(response.status).toBe(400);
    });

    it('should reject empty items array', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId,
          paymentMethod: 'CASH',
          items: [],
        });

      expect(response.status).toBe(400);
    });

    it('should reject non-existent supplier', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId: uuidv4(),
          paymentMethod: 'CASH',
          items: [
            {
              productId,
              quantity: 10,
              unitPrice: 50000,
            },
          ],
        });

      expect(response.status).toBe(404);
    });

    it('should reject non-existent product in items', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId,
          paymentMethod: 'CASH',
          items: [
            {
              productId: uuidv4(),
              quantity: 10,
              unitPrice: 50000,
            },
          ],
        });

      expect(response.status).toBe(404);
    });

    it('should reject invalid item quantities', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId,
          paymentMethod: 'CASH',
          items: [
            {
              productId,
              quantity: -5,
              unitPrice: 50000,
            },
          ],
        });

      expect(response.status).toBe(400);
    });

    it('should reject negative unitPrice', async () => {
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId,
          paymentMethod: 'CASH',
          items: [
            {
              productId,
              quantity: 10,
              unitPrice: -50000,
            },
          ],
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/purchase-orders/:id', () => {
    let createdPoId: string;

    beforeAll(async () => {
      // Create a purchase order to fetch
      const response = await request(app)
        .post('/api/purchase-orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          supplierId,
          paymentMethod: 'CASH',
          items: [
            {
              productId,
              quantity: 10,
              unitPrice: 50000,
            },
          ],
        });

      createdPoId = response.body.id;
    });

    it('should fetch specific purchase order (owner only)', async () => {
      const response = await request(app)
        .get(`/api/purchase-orders/${createdPoId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(createdPoId);
      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('should reject fetch for non-owner (kasir)', async () => {
      const response = await request(app)
        .get(`/api/purchase-orders/${createdPoId}`)
        .set('Authorization', `Bearer ${kasirToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent purchase order', async () => {
      const response = await request(app)
        .get(`/api/purchase-orders/${uuidv4()}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });
});
