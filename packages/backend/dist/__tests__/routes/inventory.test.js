/**
 * Unit Tests for Inventory Endpoints
 * Tests GET /api/inventory, /warehouse, and /store/:storeId
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../app.js';
import { db } from '../../database/connection.js';
import { AuthService } from '../../services/auth.js';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';
describe('Inventory Endpoints', () => {
    let app;
    let testUserId;
    let testStoreId;
    let warehouseStoreId;
    let testProductId;
    let userToken;
    const testPassword = 'TestPassword123!';
    beforeAll(async () => {
        app = createApp();
        if (!db) {
            throw new Error('Database not initialized');
        }
        // Setup test data
        testUserId = uuidv4();
        testStoreId = uuidv4();
        warehouseStoreId = uuidv4();
        testProductId = uuidv4();
        const hashedPassword = await AuthService.hashPassword(testPassword);
        // Create warehouse store
        await db.query('INSERT INTO stores (id, name, address) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [warehouseStoreId, 'WAREHOUSE', 'Warehouse Address']);
        // Create test store
        await db.query('INSERT INTO stores (id, name, address) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [testStoreId, 'Test Store', 'Test Address']);
        // Create user
        await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`, [testUserId, 'testuser', `user_${Date.now()}@test.com`, hashedPassword, 'KASIR', testStoreId, true]);
        // Create test product
        await db.query(`INSERT INTO products (id, name, sku, cost_price, selling_price, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`, [testProductId, 'Test Product', 'SKU001', '10000', '15000', true, new Date(), new Date()]);
        // Create warehouse inventory
        await db.query(`INSERT INTO inventory (id, product_id, store_id, quantity, reserved, reorder_level, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (product_id, store_id) DO NOTHING`, [uuidv4(), testProductId, warehouseStoreId, 100, 0, 10, new Date(), new Date()]);
        // Create store inventory
        await db.query(`INSERT INTO inventory (id, product_id, store_id, quantity, reserved, reorder_level, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (product_id, store_id) DO NOTHING`, [uuidv4(), testProductId, testStoreId, 25, 5, 10, new Date(), new Date()]);
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
        await db.query('DELETE FROM inventory WHERE product_id = $1', [testProductId]);
        await db.query('DELETE FROM products WHERE id = $1', [testProductId]);
        await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await db.query('DELETE FROM stores WHERE id IN ($1, $2)', [testStoreId, warehouseStoreId]);
    });
    describe('GET /api/inventory', () => {
        it('should return warehouse and store inventory', async () => {
            const response = await request(app)
                .get('/api/inventory')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('warehouseInventory');
            expect(response.body).toHaveProperty('storeInventory');
            expect(Array.isArray(response.body.warehouseInventory)).toBe(true);
            expect(Array.isArray(response.body.storeInventory)).toBe(true);
        });
        it('should show warehouse inventory correctly', async () => {
            const response = await request(app)
                .get('/api/inventory')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            const warehouseInv = response.body.warehouseInventory;
            if (warehouseInv.length > 0) {
                const item = warehouseInv[0];
                expect(item).toHaveProperty('productId');
                expect(item).toHaveProperty('productName');
                expect(item).toHaveProperty('quantity');
                expect(item).toHaveProperty('costPrice');
                expect(item).toHaveProperty('sellingPrice');
            }
        });
        it('should show store inventory with store names', async () => {
            const response = await request(app)
                .get('/api/inventory')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            const storeInv = response.body.storeInventory;
            if (storeInv.length > 0) {
                const item = storeInv[0];
                expect(item).toHaveProperty('storeId');
                expect(item).toHaveProperty('storeName');
                expect(item).toHaveProperty('productName');
                expect(item).toHaveProperty('quantity');
            }
        });
    });
    describe('GET /api/inventory/warehouse', () => {
        it('should return warehouse inventory with available stock', async () => {
            const response = await request(app)
                .get('/api/inventory/warehouse')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
            expect(Array.isArray(response.body.data)).toBe(true);
        });
        it('should show only items with available quantity', async () => {
            const response = await request(app)
                .get('/api/inventory/warehouse')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            response.body.data.forEach((item) => {
                expect(item.quantity).toBeGreaterThan(0);
            });
        });
        it('should include product details', async () => {
            const response = await request(app)
                .get('/api/inventory/warehouse')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            if (response.body.data.length > 0) {
                const item = response.body.data[0];
                expect(item).toHaveProperty('productName');
                expect(item).toHaveProperty('sku');
                expect(item).toHaveProperty('category');
                expect(item).toHaveProperty('costPrice');
                expect(item).toHaveProperty('sellingPrice');
            }
        });
    });
    describe('GET /api/inventory/store/:storeId', () => {
        it('should return inventory for specific store', async () => {
            const response = await request(app)
                .get(`/api/inventory/store/${testStoreId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
        });
        it('should return 404 for non-existent store', async () => {
            const nonExistentId = uuidv4();
            const response = await request(app)
                .get(`/api/inventory/store/${nonExistentId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(500);
        });
        it('should include store name in response', async () => {
            const response = await request(app)
                .get(`/api/inventory/store/${testStoreId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            if (response.body.data.length > 0) {
                const item = response.body.data[0];
                expect(item).toHaveProperty('storeName');
            }
        });
    });
});
//# sourceMappingURL=inventory.test.js.map