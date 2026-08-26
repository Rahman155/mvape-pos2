/**
 * Unit Tests for BOP (Biaya Operasional Penjualan) Endpoints
 * Tests GET /api/bop and filtering capabilities
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../app.js';
import { db } from '../../database/connection.js';
import { AuthService } from '../../services/auth.js';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';
describe('BOP Endpoints', () => {
    let app;
    let testUserId;
    let testStoreId;
    let store2Id;
    let bopId1;
    let bopId2;
    let userToken;
    const testPassword = 'TestPassword123!';
    const today = new Date().toISOString().split('T')[0];
    beforeAll(async () => {
        app = createApp();
        if (!db) {
            throw new Error('Database not initialized');
        }
        // Setup test data
        testUserId = uuidv4();
        testStoreId = uuidv4();
        store2Id = uuidv4();
        bopId1 = uuidv4();
        bopId2 = uuidv4();
        const hashedPassword = await AuthService.hashPassword(testPassword);
        // Create test stores
        await db.query('INSERT INTO stores (id, name, address, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [testStoreId, 'Test Store 1', 'Address 1', true]);
        await db.query('INSERT INTO stores (id, name, address, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [store2Id, 'Test Store 2', 'Address 2', true]);
        // Create user
        await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`, [testUserId, 'testuser', `user_${Date.now()}@test.com`, hashedPassword, 'OWNER', testStoreId, true]);
        // Create BOP records
        await db.query(`INSERT INTO bop (id, store_id, name, description, amount, effective_from, effective_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`, [bopId1, testStoreId, 'Electricity', 'Monthly electricity cost', '500000', today, null, new Date(), new Date()]);
        await db.query(`INSERT INTO bop (id, store_id, name, description, amount, effective_from, effective_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`, [bopId2, store2Id, 'Rent', 'Monthly rent', '10000000', today, null, new Date(), new Date()]);
        // Get auth token
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
            username: 'testuser',
            password: testPassword,
        });
        userToken = loginRes.body.token;
    });
    afterAll(async () => {
        // Cleanup
        await db.query('DELETE FROM bop WHERE store_id IN ($1, $2)', [testStoreId, store2Id]);
        await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await db.query('DELETE FROM stores WHERE id IN ($1, $2)', [testStoreId, store2Id]);
    });
    describe('GET /api/bop', () => {
        it('should list all BOP records with pagination', async () => {
            const response = await request(app)
                .get('/api/bop')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('page');
            expect(response.body).toHaveProperty('limit');
            expect(response.body).toHaveProperty('pages');
            expect(Array.isArray(response.body.data)).toBe(true);
        });
        it('should return BOP with correct fields', async () => {
            const response = await request(app)
                .get('/api/bop')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            if (response.body.data.length > 0) {
                const bop = response.body.data[0];
                expect(bop).toHaveProperty('id');
                expect(bop).toHaveProperty('storeId');
                expect(bop).toHaveProperty('storeName');
                expect(bop).toHaveProperty('name');
                expect(bop).toHaveProperty('description');
                expect(bop).toHaveProperty('amount');
                expect(bop).toHaveProperty('effectiveFrom');
                expect(bop).toHaveProperty('effectiveTo');
            }
        });
        it('should filter by store ID', async () => {
            const response = await request(app)
                .get(`/api/bop?storeId=${testStoreId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            response.body.data.forEach((bop) => {
                expect(bop.storeId).toBe(testStoreId);
            });
        });
        it('should search by name', async () => {
            const response = await request(app)
                .get('/api/bop?search=Electricity')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            if (response.body.data.length > 0) {
                response.body.data.forEach((bop) => {
                    expect(bop.name.toLowerCase()).toContain('electricity');
                });
            }
        });
        it('should support pagination with custom limit', async () => {
            const response = await request(app)
                .get('/api/bop?page=1&limit=1')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body.limit).toBe(1);
        });
    });
    describe('GET /api/bop/store/:storeId', () => {
        it('should return BOP for specific store', async () => {
            const response = await request(app)
                .get(`/api/bop/store/${testStoreId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
        });
        it('should filter results to only the specified store', async () => {
            const response = await request(app)
                .get(`/api/bop/store/${testStoreId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            response.body.data.forEach((bop) => {
                expect(bop.storeId).toBe(testStoreId);
            });
        });
        it('should return 404 for non-existent store', async () => {
            const nonExistentId = uuidv4();
            const response = await request(app)
                .get(`/api/bop/store/${nonExistentId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(404);
        });
        it('should support pagination', async () => {
            const response = await request(app)
                .get(`/api/bop/store/${testStoreId}?page=1&limit=1`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body.limit).toBe(1);
        });
    });
    describe('GET /api/bop/active', () => {
        it('should return active BOP (effective today)', async () => {
            const response = await request(app)
                .get('/api/bop/active')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
            expect(Array.isArray(response.body.data)).toBe(true);
        });
        it('should only return BOP with effective_from <= today', async () => {
            const response = await request(app)
                .get('/api/bop/active')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            response.body.data.forEach((bop) => {
                // effective_from should be <= today
                expect(new Date(bop.effectiveFrom).getTime()).toBeLessThanOrEqual(new Date(today).getTime());
            });
        });
        it('should include store information', async () => {
            const response = await request(app)
                .get('/api/bop/active')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            if (response.body.data.length > 0) {
                const bop = response.body.data[0];
                expect(bop).toHaveProperty('storeName');
            }
        });
    });
    describe('GET /api/bop/:id', () => {
        it('should return specific BOP record', async () => {
            const response = await request(app)
                .get(`/api/bop/${bopId1}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(bopId1);
            expect(response.body.name).toBe('Electricity');
        });
        it('should include all BOP details', async () => {
            const response = await request(app)
                .get(`/api/bop/${bopId1}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('storeId');
            expect(response.body).toHaveProperty('storeName');
            expect(response.body).toHaveProperty('name');
            expect(response.body).toHaveProperty('amount');
            expect(response.body).toHaveProperty('effectiveFrom');
        });
        it('should return 404 for non-existent BOP', async () => {
            const nonExistentId = uuidv4();
            const response = await request(app)
                .get(`/api/bop/${nonExistentId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(404);
            expect(response.body.error).toContain('BOP record not found');
        });
    });
});
//# sourceMappingURL=bop.test.js.map