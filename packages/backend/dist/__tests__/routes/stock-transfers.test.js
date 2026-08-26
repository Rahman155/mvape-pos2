/**
 * Unit Tests for Stock Transfer Endpoints
 * Tests POST /api/stock-transfers and inventory conservation
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../app.js';
import { db } from '../../database/connection.js';
import { AuthService } from '../../services/auth.js';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';
describe('Stock Transfer Endpoints', () => {
    let app;
    let testOwnerId;
    let testKasirId;
    let testStoreId;
    let warehouseStoreId;
    let testProductId;
    let ownerToken;
    let kasirToken;
    const testPassword = 'TestPassword123!';
    beforeAll(async () => {
        app = createApp();
        if (!db) {
            throw new Error('Database not initialized');
        }
        // Setup test data
        testOwnerId = uuidv4();
        testKasirId = uuidv4();
        testStoreId = uuidv4();
        warehouseStoreId = uuidv4();
        testProductId = uuidv4();
        const hashedPassword = await AuthService.hashPassword(testPassword);
        // Create warehouse store
        await db.query('INSERT INTO stores (id, name, address) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [warehouseStoreId, 'WAREHOUSE', 'Warehouse Address']);
        // Create test store
        await db.query('INSERT INTO stores (id, name, address) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [testStoreId, 'Test Store', 'Test Address']);
        // Create OWNER user
        await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`, [testOwnerId, 'testowner', `owner_${Date.now()}@test.com`, hashedPassword, 'OWNER', warehouseStoreId, true]);
        // Create KASIR user
        await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`, [testKasirId, 'testkasir', `kasir_${Date.now()}@test.com`, hashedPassword, 'KASIR', testStoreId, true]);
        // Create test product
        await db.query(`INSERT INTO products (id, name, sku, cost_price, selling_price, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`, [testProductId, 'Test Product', 'SKU001', '10000', '15000', true, new Date(), new Date()]);
        // Create warehouse inventory
        await db.query(`INSERT INTO inventory (id, product_id, store_id, quantity, reserved, reorder_level, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (product_id, store_id) DO NOTHING`, [uuidv4(), testProductId, warehouseStoreId, 100, 0, 10, new Date(), new Date()]);
        // Get auth tokens
        const ownerLoginRes = await request(app)
            .post('/api/auth/login')
            .send({
            username: 'testowner',
            password: testPassword,
        });
        ownerToken = ownerLoginRes.body.token;
        const kasirLoginRes = await request(app)
            .post('/api/auth/login')
            .send({
            username: 'testkasir',
            password: testPassword,
        });
        kasirToken = kasirLoginRes.body.token;
    });
    afterAll(async () => {
        // Cleanup
        await db.query('DELETE FROM stock_transfer_items WHERE stock_transfer_id IN (SELECT id FROM stock_transfers WHERE created_by = $1)', [testOwnerId]);
        await db.query('DELETE FROM stock_transfers WHERE created_by = $1', [testOwnerId]);
        await db.query('DELETE FROM inventory WHERE product_id = $1', [testProductId]);
        await db.query('DELETE FROM products WHERE id = $1', [testProductId]);
        await db.query('DELETE FROM users WHERE id IN ($1, $2)', [testOwnerId, testKasirId]);
        await db.query('DELETE FROM stores WHERE id IN ($1, $2)', [testStoreId, warehouseStoreId]);
    });
    describe('POST /api/stock-transfers', () => {
        it('should create stock transfer when OWNER', async () => {
            const response = await request(app)
                .post('/api/stock-transfers')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        quantity: 20,
                    },
                ],
                destinationStoreId: testStoreId,
                notes: 'Test transfer',
            });
            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Stock transfer completed successfully');
            expect(response.body.transfer).toHaveProperty('id');
            expect(response.body.transfer.status).toBe('COMPLETED');
            expect(response.body.items).toHaveLength(1);
        });
        it('should fail transfer when not OWNER', async () => {
            const response = await request(app)
                .post('/api/stock-transfers')
                .set('Authorization', `Bearer ${kasirToken}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        quantity: 10,
                    },
                ],
                destinationStoreId: testStoreId,
            });
            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Only owner can create stock transfers');
        });
        it('should fail transfer with no items', async () => {
            const response = await request(app)
                .post('/api/stock-transfers')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                items: [],
                destinationStoreId: testStoreId,
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Items array is required and must not be empty');
        });
        it('should fail transfer without destination store', async () => {
            const response = await request(app)
                .post('/api/stock-transfers')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        quantity: 10,
                    },
                ],
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Destination store ID is required');
        });
        it('should fail transfer with invalid quantity', async () => {
            const response = await request(app)
                .post('/api/stock-transfers')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        quantity: -10,
                    },
                ],
                destinationStoreId: testStoreId,
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Each item must have productId and quantity > 0');
        });
        it('should fail transfer with insufficient warehouse stock', async () => {
            const response = await request(app)
                .post('/api/stock-transfers')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        quantity: 10000, // More than available
                    },
                ],
                destinationStoreId: testStoreId,
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Insufficient warehouse stock');
        });
        it('should deduct from warehouse inventory', async () => {
            // Get warehouse inventory before
            const beforeResult = await db.query('SELECT quantity FROM inventory WHERE product_id = $1 AND store_id = $2', [testProductId, (await db.query("SELECT id FROM stores WHERE name = 'WAREHOUSE' LIMIT 1")).rows[0].id]);
            const beforeQty = beforeResult.rows[0].quantity;
            const response = await request(app)
                .post('/api/stock-transfers')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        quantity: 5,
                    },
                ],
                destinationStoreId: testStoreId,
            });
            expect(response.status).toBe(201);
            // Get warehouse inventory after
            const afterResult = await db.query('SELECT quantity FROM inventory WHERE product_id = $1 AND store_id = $2', [testProductId, (await db.query("SELECT id FROM stores WHERE name = 'WAREHOUSE' LIMIT 1")).rows[0].id]);
            const afterQty = afterResult.rows[0].quantity;
            expect(afterQty).toBe(beforeQty - 5);
        });
        it('should add to destination store inventory', async () => {
            const response = await request(app)
                .post('/api/stock-transfers')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        quantity: 10,
                    },
                ],
                destinationStoreId: testStoreId,
            });
            expect(response.status).toBe(201);
            // Check destination store inventory
            const destResult = await db.query('SELECT quantity FROM inventory WHERE product_id = $1 AND store_id = $2', [testProductId, testStoreId]);
            expect(destResult.rows.length).toBeGreaterThan(0);
            expect(destResult.rows[0].quantity).toBeGreaterThan(0);
        });
        it('should verify inventory conservation', async () => {
            const response = await request(app)
                .post('/api/stock-transfers')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        quantity: 8,
                    },
                ],
                destinationStoreId: testStoreId,
            });
            expect(response.status).toBe(201);
            expect(response.body.inventoryConservation).toBeDefined();
            expect(response.body.inventoryConservation.verified).toBe(true);
        });
    });
    describe('GET /api/stock-transfers', () => {
        it('should list stock transfers with pagination', async () => {
            const response = await request(app)
                .get('/api/stock-transfers')
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('page');
            expect(response.body).toHaveProperty('limit');
            expect(response.body).toHaveProperty('pages');
        });
        it('should filter by status', async () => {
            const response = await request(app)
                .get('/api/stock-transfers?status=COMPLETED')
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(response.status).toBe(200);
            response.body.data.forEach((transfer) => {
                expect(transfer.status).toBe('COMPLETED');
            });
        });
    });
    describe('GET /api/stock-transfers/:id', () => {
        it('should get transfer details with items', async () => {
            // Create a transfer first
            const createRes = await request(app)
                .post('/api/stock-transfers')
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        quantity: 3,
                    },
                ],
                destinationStoreId: testStoreId,
            });
            const transferId = createRes.body.transfer.id;
            // Get transfer details
            const response = await request(app)
                .get(`/api/stock-transfers/${transferId}`)
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(response.status).toBe(200);
            expect(response.body.transfer).toBeDefined();
            expect(response.body.items).toBeDefined();
            expect(Array.isArray(response.body.items)).toBe(true);
        });
        it('should return 404 for non-existent transfer', async () => {
            const nonExistentId = uuidv4();
            const response = await request(app)
                .get(`/api/stock-transfers/${nonExistentId}`)
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(response.status).toBe(404);
        });
    });
});
//# sourceMappingURL=stock-transfers.test.js.map