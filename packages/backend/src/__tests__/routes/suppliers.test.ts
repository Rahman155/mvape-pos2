/**
 * Unit Tests for Suppliers CRUD Operations
 * Tests owner-only supplier management (create, read, update, delete)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../app.js';
import { db } from '../../database/connection.js';
import { AuthService } from '../../services/auth.js';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';

describe('Suppliers Management', () => {
  let app: any;
  let testUserId: string;
  let testStoreId: string;
  let supplierId: string;
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

    // Create initial supplier
    await db.query(
      `INSERT INTO suppliers (id, name, phone, email, address, payment_terms, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [supplierId, 'Initial Supplier', '081234567890', 'supplier@test.com', 'Supplier Address', 'Net 30', true, new Date(), new Date()]
    );
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM suppliers WHERE id = $1 OR name LIKE $2', [supplierId, '%Test%']);
    await db.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, kasirUserId]);
    await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
  });

  describe('GET /api/suppliers', () => {
    it('should list all suppliers with pagination (owner only)', async () => {
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeDefined();
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
    });

    it('should reject suppliers list for non-owner (kasir)', async () => {
      const response = await request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${kasirToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication for suppliers list', async () => {
      const response = await request(app)
        .get('/api/suppliers');

      expect(response.status).toBe(401);
    });

    it('should filter suppliers by search term', async () => {
      const response = await request(app)
        .get('/api/suppliers?search=Initial')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name).toContain('Initial');
    });

    it('should support pagination with custom limit', async () => {
      const response = await request(app)
        .get('/api/suppliers?page=1&limit=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(5);
    });
  });

  describe('POST /api/suppliers', () => {
    it('should create a new supplier (owner only)', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'New Supplier',
          phone: '082123456789',
          email: 'newsupplier@test.com',
          address: 'New Address',
          paymentTerms: 'Net 45',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('New Supplier');
      expect(response.body.isActive).toBe(true);
    });

    it('should reject supplier creation for non-owner (kasir)', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${kasirToken}`)
        .send({
          name: 'Kasir Cannot Create',
        });

      expect(response.status).toBe(403);
    });

    it('should require authentication for supplier creation', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .send({
          name: 'No Auth Supplier',
        });

      expect(response.status).toBe(401);
    });

    it('should reject supplier creation without name', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          phone: '081234567890',
        });

      expect(response.status).toBe(400);
    });

    it('should reject supplier creation with empty name', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: '   ',
        });

      expect(response.status).toBe(400);
    });

    it('should reject duplicate supplier names', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Initial Supplier', // Already exists
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Invalid Email Supplier',
          email: 'invalid-email',
        });

      expect(response.status).toBe(400);
    });

    it('should create supplier with only name (required field)', async () => {
      const response = await request(app)
        .post('/api/suppliers')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Minimal Supplier',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Minimal Supplier');
      expect(response.body.phone).toBeNull();
      expect(response.body.email).toBeNull();
    });
  });

  describe('GET /api/suppliers/:id', () => {
    it('should get specific supplier by ID (owner only)', async () => {
      const response = await request(app)
        .get(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(supplierId);
      expect(response.body.name).toBe('Initial Supplier');
    });

    it('should reject supplier fetch for non-owner (kasir)', async () => {
      const response = await request(app)
        .get(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${kasirToken}`);

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent supplier', async () => {
      const response = await request(app)
        .get(`/api/suppliers/${uuidv4()}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/suppliers/:id', () => {
    it('should update supplier with valid data (owner only)', async () => {
      const response = await request(app)
        .put(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Supplier Name',
          phone: '089999999999',
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(supplierId);
      expect(response.body.name).toBe('Updated Supplier Name');
      expect(response.body.phone).toBe('089999999999');
    });

    it('should reject supplier update for non-owner (kasir)', async () => {
      const response = await request(app)
        .put(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${kasirToken}`)
        .send({
          name: 'Kasir Cannot Update',
        });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent supplier', async () => {
      const response = await request(app)
        .put(`/api/suppliers/${uuidv4()}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(404);
    });

    it('should reject update with no fields provided', async () => {
      const response = await request(app)
        .put(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should update only email field', async () => {
      const response = await request(app)
        .put(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'newemail@test.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('newemail@test.com');
    });

    it('should toggle isActive status', async () => {
      const response = await request(app)
        .put(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          isActive: false,
        });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
    });

    it('should reject duplicate supplier name during update', async () => {
      // Create another supplier first
      const newSupplierId = uuidv4();
      await db.query(
        `INSERT INTO suppliers (id, name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [newSupplierId, 'Unique Supplier Name', true, new Date(), new Date()]
      );

      // Try to update supplierId to have the same name
      const response = await request(app)
        .put(`/api/suppliers/${supplierId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Unique Supplier Name',
        });

      expect(response.status).toBe(409);
      
      // Cleanup
      await db.query('DELETE FROM suppliers WHERE id = $1', [newSupplierId]);
    });
  });

  describe('DELETE /api/suppliers/:id', () => {
    let deletableSupplierId: string;

    beforeAll(async () => {
      deletableSupplierId = uuidv4();
      await db.query(
        `INSERT INTO suppliers (id, name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [deletableSupplierId, 'Deletable Supplier', true, new Date(), new Date()]
      );
    });

    it('should delete supplier with no conflicts (owner only)', async () => {
      const response = await request(app)
        .delete(`/api/suppliers/${deletableSupplierId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/suppliers/${deletableSupplierId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should reject supplier deletion for non-owner (kasir)', async () => {
      // Create a temporary supplier
      const tempSupplierId = uuidv4();
      await db.query(
        `INSERT INTO suppliers (id, name, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [tempSupplierId, 'Temp Supplier', true, new Date(), new Date()]
      );

      const response = await request(app)
        .delete(`/api/suppliers/${tempSupplierId}`)
        .set('Authorization', `Bearer ${kasirToken}`);

      expect(response.status).toBe(403);

      // Cleanup
      await db.query('DELETE FROM suppliers WHERE id = $1', [tempSupplierId]);
    });

    it('should return 404 for non-existent supplier', async () => {
      const response = await request(app)
        .delete(`/api/suppliers/${uuidv4()}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });
  });
});
