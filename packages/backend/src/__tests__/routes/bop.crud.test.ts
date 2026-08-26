/**
 * Unit Tests for BOP CRUD Operations (POST, PUT, DELETE)
 * Tests owner-only creation, editing, and deletion of BOP records
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../app.js';
import { db } from '../../database/connection.js';
import { AuthService } from '../../services/auth.js';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';

describe('BOP CRUD Operations', () => {
  let app: any;
  let testUserId: string;
  let testStoreId: string;
  let bopId: string;
  let userToken: string;
  let kasirUserId: string;
  let kasirToken: string;
  const testPassword = 'TestPassword123!';
  const today = new Date().toISOString().split('T')[0];

  beforeAll(async () => {
    app = createApp();

    if (!db) {
      throw new Error('Database not initialized');
    }

    // Setup test data
    testUserId = uuidv4();
    kasirUserId = uuidv4();
    testStoreId = uuidv4();
    bopId = uuidv4();

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

    // Create initial BOP record
    await db.query(
      `INSERT INTO bop (id, store_id, name, description, amount, effective_from, effective_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [bopId, testStoreId, 'Initial BOP', 'Description', '500000', today, null, new Date(), new Date()]
    );
  });

  afterAll(async () => {
    // Cleanup
    await db.query('DELETE FROM bop WHERE store_id = $1', [testStoreId]);
    await db.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, kasirUserId]);
    await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
  });

  describe('POST /api/bop', () => {
    it('should create a new BOP record with valid data (owner only)', async () => {
      const response = await request(app)
        .post('/api/bop')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          storeId: testStoreId,
          name: 'Electricity',
          description: 'Monthly electricity bill',
          amount: 750000,
          effectiveFrom: today,
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('Electricity');
      expect(response.body.amount).toBe(750000);
      expect(response.body.storeId).toBe(testStoreId);
    });

    it('should reject BOP creation for non-owner (kasir)', async () => {
      const response = await request(app)
        .post('/api/bop')
        .set('Authorization', `Bearer ${kasirToken}`)
        .send({
          storeId: testStoreId,
          name: 'Rent',
          amount: 1000000,
          effectiveFrom: today,
        });

      expect(response.status).toBe(403);
    });

    it('should require authentication for BOP creation', async () => {
      const response = await request(app)
        .post('/api/bop')
        .send({
          storeId: testStoreId,
          name: 'Rent',
          amount: 1000000,
          effectiveFrom: today,
        });

      expect(response.status).toBe(401);
    });

    it('should reject BOP creation with missing required fields', async () => {
      const response = await request(app)
        .post('/api/bop')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          storeId: testStoreId,
          name: 'Rent',
          // missing amount and effectiveFrom
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });

    it('should reject BOP creation with invalid amount', async () => {
      const response = await request(app)
        .post('/api/bop')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          storeId: testStoreId,
          name: 'Internet',
          amount: -100,
          effectiveFrom: today,
        });

      expect(response.status).toBe(400);
    });

    it('should reject BOP creation with non-existent store', async () => {
      const response = await request(app)
        .post('/api/bop')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          storeId: uuidv4(),
          name: 'Water',
          amount: 200000,
          effectiveFrom: today,
        });

      expect(response.status).toBe(404);
    });

    it('should reject BOP creation with invalid date format', async () => {
      const response = await request(app)
        .post('/api/bop')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          storeId: testStoreId,
          name: 'Gas',
          amount: 300000,
          effectiveFrom: 'invalid-date',
        });

      expect(response.status).toBe(400);
    });

    it('should reject BOP creation with effectiveTo before effectiveFrom', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/bop')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          storeId: testStoreId,
          name: 'Phone',
          amount: 150000,
          effectiveFrom: tomorrowStr,
          effectiveTo: yesterdayStr,
        });

      expect(response.status).toBe(400);
    });

    it('should create BOP with optional fields (description, effectiveTo)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 30);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/bop')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          storeId: testStoreId,
          name: 'Temporary Expense',
          description: 'Temporary operational expense',
          amount: 100000,
          effectiveFrom: today,
          effectiveTo: tomorrowStr,
        });

      expect(response.status).toBe(201);
      expect(response.body.description).toBe('Temporary Operational expense');
    });
  });

  describe('PUT /api/bop/:id', () => {
    it('should update BOP record with valid data (owner only)', async () => {
      const response = await request(app)
        .put(`/api/bop/${bopId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated BOP Name',
          amount: 600000,
        });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(bopId);
      expect(response.body.name).toBe('Updated BOP Name');
      expect(response.body.amount).toBe(600000);
    });

    it('should reject BOP update for non-owner (kasir)', async () => {
      const response = await request(app)
        .put(`/api/bop/${bopId}`)
        .set('Authorization', `Bearer ${kasirToken}`)
        .send({
          name: 'Kasir Cannot Update',
        });

      expect(response.status).toBe(403);
    });

    it('should require authentication for BOP update', async () => {
      const response = await request(app)
        .put(`/api/bop/${bopId}`)
        .send({
          name: 'No Auth Update',
        });

      expect(response.status).toBe(401);
    });

    it('should reject BOP update with non-existent BOP ID', async () => {
      const response = await request(app)
        .put(`/api/bop/${uuidv4()}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Non-existent BOP',
        });

      expect(response.status).toBe(404);
    });

    it('should reject update with no fields provided', async () => {
      const response = await request(app)
        .put(`/api/bop/${bopId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should update only name field', async () => {
      const response = await request(app)
        .put(`/api/bop/${bopId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Only Name Updated',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Only Name Updated');
    });

    it('should update only amount field', async () => {
      const response = await request(app)
        .put(`/api/bop/${bopId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 999999,
        });

      expect(response.status).toBe(200);
      expect(response.body.amount).toBe(999999);
    });

    it('should reject update with invalid amount', async () => {
      const response = await request(app)
        .put(`/api/bop/${bopId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: -50000,
        });

      expect(response.status).toBe(400);
    });

    it('should clear effectiveTo when set to null', async () => {
      const response = await request(app)
        .put(`/api/bop/${bopId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          effectiveTo: null,
        });

      expect(response.status).toBe(200);
      expect(response.body.effectiveTo).toBeNull();
    });
  });

  describe('DELETE /api/bop/:id', () => {
    let deletableBopId: string;

    beforeAll(async () => {
      // Create a BOP record with a past effective_to date (which can be deleted)
      deletableBopId = uuidv4();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      await db.query(
        `INSERT INTO bop (id, store_id, name, description, amount, effective_from, effective_to, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [deletableBopId, testStoreId, 'Deletable BOP', 'Description', '100000', yesterdayStr, yesterdayStr, new Date(), new Date()]
      );
    });

    it('should delete BOP record with past effective_to date (owner only)', async () => {
      const response = await request(app)
        .delete(`/api/bop/${deletableBopId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/bop/${deletableBopId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should reject BOP deletion for non-owner (kasir)', async () => {
      const response = await request(app)
        .delete(`/api/bop/${bopId}`)
        .set('Authorization', `Bearer ${kasirToken}`);

      expect(response.status).toBe(403);
    });

    it('should require authentication for BOP deletion', async () => {
      const response = await request(app)
        .delete(`/api/bop/${bopId}`);

      expect(response.status).toBe(401);
    });

    it('should reject deletion of non-existent BOP', async () => {
      const response = await request(app)
        .delete(`/api/bop/${uuidv4()}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
    });

    it('should prevent deletion of active BOP (effective_from <= today)', async () => {
      // Try to delete bopId which is still active
      const response = await request(app)
        .delete(`/api/bop/${bopId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('active');
    });

    it('should allow deletion of BOP with effective_to in the past', async () => {
      const oldBopId = uuidv4();
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];

      await db.query(
        `INSERT INTO bop (id, store_id, name, description, amount, effective_from, effective_to, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [oldBopId, testStoreId, 'Old BOP', 'Description', '100000', twoWeeksAgoStr, twoWeeksAgoStr, new Date(), new Date()]
      );

      const response = await request(app)
        .delete(`/api/bop/${oldBopId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(204);
    });
  });
});
