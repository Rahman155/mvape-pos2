/**
 * Store Management API Integration Tests
 * Tests the complete flow of store operations
 */

import request from 'supertest';
import { createApp } from '../app.js';
import { db } from '../database/connection.js';
import { generateAuthToken } from '../utils/auth.js';
import { v4 as uuidv4 } from 'uuid';

describe('Store Management API Integration Tests (Tasks 51-53)', () => {
  let app: any;
  let ownerToken: string;
  let ownerUserId: string;
  const testStores: string[] = [];

  beforeAll(async () => {
    app = createApp();
    
    // Create test owner user
    ownerUserId = uuidv4();
    const now = new Date();
    
    await db.query(
      `INSERT INTO users (id, username, email, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`,
      [
        ownerUserId,
        'integration-test-owner',
        'integration@test.com',
        'hashed_password',
        'OWNER',
        true,
        now,
        now,
      ]
    );

    ownerToken = generateAuthToken({
      id: ownerUserId,
      username: 'integration-test-owner',
      role: 'OWNER',
      storeId: null,
    });
  });

  afterAll(async () => {
    // Cleanup
    for (const storeId of testStores) {
      await db.query('DELETE FROM change_history WHERE entity_id = $1', [storeId]);
      await db.query('DELETE FROM stores WHERE id = $1', [storeId]);
    }
    await db.query('DELETE FROM users WHERE id = $1', [ownerUserId]);
  });

  describe('Complete Store Lifecycle', () => {
    let storeId: string;

    test('should create a store successfully', async () => {
      const storeData = {
        name: 'Integration Test Store',
        address: '123 Integration Ave',
        phone: '555-0001',
        operatingHours: {
          monday: { open: '09:00', close: '18:00' },
          sunday: { open: '10:00', close: '17:00' },
        },
      };

      const res = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(storeData);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(storeData.name);
      expect(res.body.address).toBe(storeData.address);
      expect(res.body.phone).toBe(storeData.phone);
      expect(res.body.isActive).toBe(true);

      storeId = res.body.id;
      testStores.push(storeId);
    });

    test('should fetch the created store by ID', async () => {
      const res = await request(app)
        .get(`/api/stores/${storeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(storeId);
      expect(res.body.name).toBe('Integration Test Store');
    });

    test('should list stores and include the created store', async () => {
      const res = await request(app)
        .get('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ limit: 100 });

      expect(res.status).toBe(200);
      const storeInList = res.body.data.find((s: any) => s.id === storeId);
      expect(storeInList).toBeDefined();
      expect(storeInList.name).toBe('Integration Test Store');
    });

    test('should update the store successfully', async () => {
      const updateData = {
        name: 'Updated Integration Store',
        address: '456 Updated Ave',
        phone: '555-0002',
      };

      const res = await request(app)
        .put(`/api/stores/${storeId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(updateData.name);
      expect(res.body.address).toBe(updateData.address);
      expect(res.body.phone).toBe(updateData.phone);
    });

    test('should record create change in history', async () => {
      const createRes = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'History Test Store',
          address: 'History Test Ave',
        });

      expect(createRes.status).toBe(201);
      const newStoreId = createRes.body.id;
      testStores.push(newStoreId);

      // Verify history exists
      const historyRes = await request(app)
        .get(`/api/stores/${newStoreId}/change-history`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.length).toBeGreaterThan(0);
      const createRecord = historyRes.body.find((h: any) => h.changeType === 'CREATE');
      expect(createRecord).toBeDefined();
      expect(createRecord.changedBy).toBe('integration-test-owner');
    });

    test('should record update change in history with old and new values', async () => {
      const updateRes = await request(app)
        .put(`/api/stores/${storeId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Final Updated Name',
          address: '789 Final Ave',
        });

      expect(updateRes.status).toBe(200);

      // Check history
      const historyRes = await request(app)
        .get(`/api/stores/${storeId}/change-history`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ limit: 1 });

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.length).toBeGreaterThan(0);

      const lastUpdate = historyRes.body[0];
      expect(lastUpdate.changeType).toBe('UPDATE');
      expect(lastUpdate.oldValues).toBeDefined();
      expect(lastUpdate.newValues).toBeDefined();
      expect(lastUpdate.newValues.name).toBe('Final Updated Name');
    });
  });

  describe('Search and Filter Integration', () => {
    test('should search stores by name', async () => {
      // Create a store with unique name
      const uniqueName = `Search Test ${Date.now()}`;
      await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: uniqueName,
          address: 'Search Test Ave',
        })
        .then((res) => {
          if (res.status === 201) {
            testStores.push(res.body.id);
          }
        });

      const res = await request(app)
        .get('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ search: uniqueName });

      expect(res.status).toBe(200);
      const found = res.body.data.some((s: any) => s.name === uniqueName);
      expect(found).toBe(true);
    });

    test('should search stores by address', async () => {
      const uniqueAddr = `Unique Address ${Date.now()}`;
      await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Search Address Test',
          address: uniqueAddr,
        })
        .then((res) => {
          if (res.status === 201) {
            testStores.push(res.body.id);
          }
        });

      const res = await request(app)
        .get('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ search: uniqueAddr });

      expect(res.status).toBe(200);
      const found = res.body.data.some((s: any) => s.address === uniqueAddr);
      expect(found).toBe(true);
    });

    test('should filter stores by active status', async () => {
      const res = await request(app)
        .get('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ status: 'active' });

      expect(res.status).toBe(200);
      expect(res.body.data.every((s: any) => s.isActive === true)).toBe(true);
    });

    test('should filter stores by inactive status', async () => {
      // Create an inactive store
      const createRes = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Inactive Test Store',
          address: 'Inactive Test Ave',
        });

      const storeId = createRes.body.id;
      testStores.push(storeId);

      // Deactivate it
      await request(app)
        .put(`/api/stores/${storeId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isActive: false });

      const res = await request(app)
        .get('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ status: 'inactive' });

      expect(res.status).toBe(200);
      expect(res.body.data.every((s: any) => s.isActive === false)).toBe(true);
    });
  });

  describe('Pagination Integration', () => {
    test('should paginate through stores', async () => {
      const res1 = await request(app)
        .get('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ page: 1, limit: 5 });

      expect(res1.status).toBe(200);
      expect(res1.body.page).toBe(1);
      expect(res1.body.limit).toBe(5);
      expect(res1.body.pages).toBeGreaterThanOrEqual(1);

      if (res1.body.pages > 1) {
        const res2 = await request(app)
          .get('/api/stores')
          .set('Authorization', `Bearer ${ownerToken}`)
          .query({ page: 2, limit: 5 });

        expect(res2.status).toBe(200);
        expect(res2.body.page).toBe(2);
      }
    });

    test('should return correct page data', async () => {
      const res = await request(app)
        .get('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(10);
      expect(res.body.total).toBeDefined();
    });
  });

  describe('Deletion Prevention Integration', () => {
    test('should check deletion eligibility', async () => {
      const createRes = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Deletion Check Store',
          address: 'Deletion Check Ave',
        });

      const storeId = createRes.body.id;
      testStores.push(storeId);

      const res = await request(app)
        .post(`/api/stores/${storeId}/check-deletion`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('canDelete');
      expect(res.body).toHaveProperty('blockers');
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary).toHaveProperty('transactionCount');
      expect(res.body.summary).toHaveProperty('inventoryCount');
      expect(res.body.summary).toHaveProperty('userCount');
    });

    test('should indicate if store has blockers for deletion', async () => {
      const res = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Blocker Test Store',
          address: 'Blocker Test Ave',
        })
        .then((createRes) => {
          testStores.push(createRes.body.id);
          return createRes.body.id;
        })
        .then((storeId) => {
          return request(app)
            .post(`/api/stores/${storeId}/check-deletion`)
            .set('Authorization', `Bearer ${ownerToken}`);
        });

      expect(res).toBeDefined();
      // For new store without data, canDelete should be true
      if (res.status === 200) {
        expect(res.body.canDelete).toBe(true);
        expect(Array.isArray(res.body.blockers)).toBe(true);
      }
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle non-existent store', async () => {
      const fakeId = uuidv4();
      const res = await request(app)
        .get(`/api/stores/${fakeId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    test('should handle validation errors on creation', async () => {
      const res = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          // Missing required fields
          phone: '555-1234',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('should handle unauthorized access', async () => {
      const res = await request(app)
        .get('/api/stores');
      // No token

      expect(res.status).toBe(401);
    });
  });
});
