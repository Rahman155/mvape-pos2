/**
 * Stock Opname Routes Tests
 * Tests for physical inventory counting API endpoints
 * Tasks: 68-72
 */
import request from 'supertest';
import { createApp } from '../app.js';
import { db } from '../database/connection.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
const app = createApp();
// Mock data
let testUserId;
let testStoreId;
let testProductId;
let testOpnameSessionId;
// Helper function to generate test JWT token
const generateToken = (userId, role = 'OWNER') => {
    return jwt.sign({ id: userId, role }, config.jwt.secret, {
        expiresIn: '24h',
    });
};
describe('Stock Opname Routes', () => {
    beforeAll(async () => {
        // Setup test data
        const userResult = await db.query(`INSERT INTO users (username, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`, ['testuser', 'test@example.com', 'hashedpassword', 'OWNER']);
        testUserId = userResult.rows[0].id;
        const storeResult = await db.query(`INSERT INTO stores (name, address) 
       VALUES ($1, $2) 
       RETURNING id`, ['Test Store', 'Test Address']);
        testStoreId = storeResult.rows[0].id;
        const productResult = await db.query(`INSERT INTO products (name, sku, category, cost_price, selling_price) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id`, ['Test Product', 'TEST-001', 'Vape', 10000, 15000]);
        testProductId = productResult.rows[0].id;
        // Create inventory
        await db.query(`INSERT INTO inventory (product_id, store_id, quantity) 
       VALUES ($1, $2, $3)`, [testProductId, testStoreId, 100]);
    });
    afterAll(async () => {
        // Cleanup test data
        await db.query('DELETE FROM opname_details WHERE opname_id IN (SELECT id FROM stock_opnames WHERE store_id = $1)', [
            testStoreId,
        ]);
        await db.query('DELETE FROM stock_opnames WHERE store_id = $1', [
            testStoreId,
        ]);
        await db.query('DELETE FROM inventory WHERE store_id = $1', [testStoreId]);
        await db.query('DELETE FROM products WHERE id = $1', [testProductId]);
        await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
        await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    });
    // =====================================================
    // Task 68: Stock Opname Initiation Tests
    // =====================================================
    describe('POST /api/stock-opname/initiate', () => {
        test('Should create new opname session successfully', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .post('/api/stock-opname/initiate')
                .set('Authorization', `Bearer ${token}`)
                .send({ storeId: testStoreId });
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.sessionId).toBeDefined();
            expect(response.body.data.storeId).toBe(testStoreId);
            expect(response.body.data.status).toBe('ONGOING');
            expect(response.body.data.products.length).toBeGreaterThan(0);
            // Save for later tests
            testOpnameSessionId = response.body.data.sessionId;
        });
        test('Should require owner role', async () => {
            const kasirToken = generateToken(testUserId, 'KASIR');
            const response = await request(app)
                .post('/api/stock-opname/initiate')
                .set('Authorization', `Bearer ${kasirToken}`)
                .send({ storeId: testStoreId });
            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Only owners can initiate');
        });
        test('Should return error for missing storeId', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .post('/api/stock-opname/initiate')
                .set('Authorization', `Bearer ${token}`)
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Store ID is required');
        });
        test('Should return error for non-existent store', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const fakeStoreId = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .post('/api/stock-opname/initiate')
                .set('Authorization', `Bearer ${token}`)
                .send({ storeId: fakeStoreId });
            expect(response.status).toBe(404);
            expect(response.body.error).toContain('Store not found');
        });
        test('Should create opname details for all products', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .post('/api/stock-opname/initiate')
                .set('Authorization', `Bearer ${token}`)
                .send({ storeId: testStoreId });
            expect(response.status).toBe(201);
            // Verify opname details were created
            const opnameId = response.body.data.sessionId;
            const detailsResult = await db.query('SELECT COUNT(*) as count FROM opname_details WHERE opname_id = $1', [opnameId]);
            expect(detailsResult.rows[0].count).toBeGreaterThan(0);
        });
    });
    // =====================================================
    // Task 69: Physical Quantity Input Tests
    // =====================================================
    describe('POST /api/stock-opname/:sessionId/items', () => {
        test('Should update physical quantities successfully', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .post(`/api/stock-opname/${testOpnameSessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 95, // 5 shortage
                    },
                ],
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.updatedItemCount).toBe(1);
        });
        test('Should calculate difference correctly (shortage)', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .post(`/api/stock-opname/${testOpnameSessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 95,
                    },
                ],
            });
            expect(response.status).toBe(200);
            expect(response.body.data.items[0].difference).toBe(-5); // negative = shortage
            expect(response.body.data.items[0].status).toBe('SHORTAGE');
        });
        test('Should calculate difference correctly (excess)', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .post(`/api/stock-opname/${testOpnameSessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 110, // 10 excess
                    },
                ],
            });
            expect(response.status).toBe(200);
            expect(response.body.data.items[0].difference).toBe(10); // positive = excess
            expect(response.body.data.items[0].status).toBe('EXCESS');
        });
        test('Should calculate difference as zero for match', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .post(`/api/stock-opname/${testOpnameSessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 100, // exact match
                    },
                ],
            });
            expect(response.status).toBe(200);
            expect(response.body.data.items[0].difference).toBe(0);
            expect(response.body.data.items[0].status).toBe('MATCH');
        });
        test('Should reject non-numeric quantity', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .post(`/api/stock-opname/${testOpnameSessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 'abc',
                    },
                ],
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid physical quantity');
        });
        test('Should reject negative quantity', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .post(`/api/stock-opname/${testOpnameSessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: -5,
                    },
                ],
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid physical quantity');
        });
        test('Should reject non-integer quantity', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .post(`/api/stock-opname/${testOpnameSessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 95.5,
                    },
                ],
            });
            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid physical quantity');
        });
        test('Should require owner role', async () => {
            const kasirToken = generateToken(testUserId, 'KASIR');
            const response = await request(app)
                .post(`/api/stock-opname/${testOpnameSessionId}/items`)
                .set('Authorization', `Bearer ${kasirToken}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 95,
                    },
                ],
            });
            expect(response.status).toBe(403);
        });
        test('Should return error for non-existent product', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const fakeProductId = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .post(`/api/stock-opname/${testOpnameSessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: fakeProductId,
                        physicalQuantity: 95,
                    },
                ],
            });
            expect(response.status).toBe(404);
            expect(response.body.error).toContain('not found in opname session');
        });
    });
    // =====================================================
    // Task 70: Shortage/Excess Handling Tests
    // =====================================================
    describe('Shortage/Excess Handling', () => {
        test('Should mark items with negative difference as SHORTAGE', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .post(`/api/stock-opname/${testOpnameSessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 90, // 10 shortage
                    },
                ],
            });
            expect(response.status).toBe(200);
            expect(response.body.data.items[0].status).toBe('SHORTAGE');
            expect(response.body.data.items[0].difference).toBeLessThan(0);
        });
        test('Should mark items with positive difference as EXCESS', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .post(`/api/stock-opname/${testOpnameSessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 120, // 20 excess
                    },
                ],
            });
            expect(response.status).toBe(200);
            expect(response.body.data.items[0].status).toBe('EXCESS');
            expect(response.body.data.items[0].difference).toBeGreaterThan(0);
        });
        test('Should require confirmation for excess items on completion', async () => {
            // Create new opname with excess
            const token = generateToken(testUserId, 'OWNER');
            const initResponse = await request(app)
                .post('/api/stock-opname/initiate')
                .set('Authorization', `Bearer ${token}`)
                .send({ storeId: testStoreId });
            const sessionId = initResponse.body.data.sessionId;
            // Add excess quantity
            await request(app)
                .post(`/api/stock-opname/${sessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 150, // 50 excess
                    },
                ],
            });
            // Try to complete without confirmation
            const completeResponse = await request(app)
                .post(`/api/stock-opname/${sessionId}/complete`)
                .set('Authorization', `Bearer ${token}`)
                .send({ confirmExcess: false });
            expect(completeResponse.status).toBe(400);
            expect(completeResponse.body.code).toBe('EXCESS_ITEMS_DETECTED');
            expect(completeResponse.body.excessItems).toBeDefined();
        });
    });
    // =====================================================
    // Task 71: Stock Opname Completion Tests
    // =====================================================
    describe('POST /api/stock-opname/:sessionId/complete', () => {
        test('Should complete opname and update inventory', async () => {
            // Create new opname for completion test
            const token = generateToken(testUserId, 'OWNER');
            const initResponse = await request(app)
                .post('/api/stock-opname/initiate')
                .set('Authorization', `Bearer ${token}`)
                .send({ storeId: testStoreId });
            const sessionId = initResponse.body.data.sessionId;
            // Set physical quantity to 95
            await request(app)
                .post(`/api/stock-opname/${sessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 95,
                    },
                ],
            });
            // Complete opname
            const completeResponse = await request(app)
                .post(`/api/stock-opname/${sessionId}/complete`)
                .set('Authorization', `Bearer ${token}`)
                .send({ confirmExcess: true });
            expect(completeResponse.status).toBe(200);
            expect(completeResponse.body.success).toBe(true);
            expect(completeResponse.body.data.status).toBe('VERIFIED');
            // Verify inventory was updated
            const inventoryResult = await db.query('SELECT quantity FROM inventory WHERE product_id = $1 AND store_id = $2', [testProductId, testStoreId]);
            expect(inventoryResult.rows[0].quantity).toBe(95);
        });
        test('Should require owner role', async () => {
            const kasirToken = generateToken(testUserId, 'KASIR');
            const response = await request(app)
                .post(`/api/stock-opname/${testOpnameSessionId}/complete`)
                .set('Authorization', `Bearer ${kasirToken}`)
                .send({ confirmExcess: true });
            expect(response.status).toBe(403);
        });
        test('Should return error for non-existent session', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const fakeSessionId = '00000000-0000-0000-0000-000000000000';
            const response = await request(app)
                .post(`/api/stock-opname/${fakeSessionId}/complete`)
                .set('Authorization', `Bearer ${token}`)
                .send({ confirmExcess: true });
            expect(response.status).toBe(404);
            expect(response.body.error).toContain('not found');
        });
        test('Should record timestamp and verifier info', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const initResponse = await request(app)
                .post('/api/stock-opname/initiate')
                .set('Authorization', `Bearer ${token}`)
                .send({ storeId: testStoreId });
            const sessionId = initResponse.body.data.sessionId;
            const completeResponse = await request(app)
                .post(`/api/stock-opname/${sessionId}/complete`)
                .set('Authorization', `Bearer ${token}`)
                .send({ confirmExcess: true });
            expect(completeResponse.status).toBe(200);
            // Verify in database
            const result = await db.query('SELECT verified_by, status FROM stock_opnames WHERE id = $1', [sessionId]);
            expect(result.rows[0].verified_by).toBe(testUserId);
            expect(result.rows[0].status).toBe('VERIFIED');
        });
    });
    // =====================================================
    // Task 72: Stock Opname Report Generation Tests
    // =====================================================
    describe('GET /api/stock-opname/:sessionId/report', () => {
        test('Should generate opname report successfully', async () => {
            // Create new opname for report
            const token = generateToken(testUserId, 'OWNER');
            const initResponse = await request(app)
                .post('/api/stock-opname/initiate')
                .set('Authorization', `Bearer ${token}`)
                .send({ storeId: testStoreId });
            const sessionId = initResponse.body.data.sessionId;
            // Set physical quantity
            await request(app)
                .post(`/api/stock-opname/${sessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 95,
                    },
                ],
            });
            // Get report
            const reportResponse = await request(app)
                .get(`/api/stock-opname/${sessionId}/report`)
                .set('Authorization', `Bearer ${token}`);
            expect(reportResponse.status).toBe(200);
            expect(reportResponse.body.success).toBe(true);
            expect(reportResponse.body.data.report).toBeDefined();
        });
        test('Should include system and physical quantities in report', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const initResponse = await request(app)
                .post('/api/stock-opname/initiate')
                .set('Authorization', `Bearer ${token}`)
                .send({ storeId: testStoreId });
            const sessionId = initResponse.body.data.sessionId;
            await request(app)
                .post(`/api/stock-opname/${sessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 95,
                    },
                ],
            });
            const reportResponse = await request(app)
                .get(`/api/stock-opname/${sessionId}/report`)
                .set('Authorization', `Bearer ${token}`);
            const items = reportResponse.body.data.report.items;
            expect(items[0].systemQuantity).toBe(100);
            expect(items[0].physicalQuantity).toBe(95);
            expect(items[0].difference).toBe(-5);
        });
        test('Should calculate financial impact', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const initResponse = await request(app)
                .post('/api/stock-opname/initiate')
                .set('Authorization', `Bearer ${token}`)
                .send({ storeId: testStoreId });
            const sessionId = initResponse.body.data.sessionId;
            await request(app)
                .post(`/api/stock-opname/${sessionId}/items`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                items: [
                    {
                        productId: testProductId,
                        physicalQuantity: 95, // 5 shortage at 10000 cost
                    },
                ],
            });
            const reportResponse = await request(app)
                .get(`/api/stock-opname/${sessionId}/report`)
                .set('Authorization', `Bearer ${token}`);
            const item = reportResponse.body.data.report.items[0];
            // Financial impact = difference * cost_price = -5 * 10000 = -50000
            expect(item.financialImpact).toBe(-50000);
        });
        test('Should include summary totals', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const initResponse = await request(app)
                .post('/api/stock-opname/initiate')
                .set('Authorization', `Bearer ${token}`)
                .send({ storeId: testStoreId });
            const sessionId = initResponse.body.data.sessionId;
            const reportResponse = await request(app)
                .get(`/api/stock-opname/${sessionId}/report`)
                .set('Authorization', `Bearer ${token}`);
            const totals = reportResponse.body.data.report.totals;
            expect(totals.totalItems).toBeGreaterThan(0);
            expect(totals.matchCount).toBeGreaterThanOrEqual(0);
            expect(totals.shortageCount).toBeGreaterThanOrEqual(0);
            expect(totals.excessCount).toBeGreaterThanOrEqual(0);
            expect(totals.netFinancialImpact).toBeDefined();
        });
        test('Should require owner role', async () => {
            const kasirToken = generateToken(testUserId, 'KASIR');
            const response = await request(app)
                .get(`/api/stock-opname/${testOpnameSessionId}/report`)
                .set('Authorization', `Bearer ${kasirToken}`);
            expect(response.status).toBe(403);
        });
    });
    // =====================================================
    // Additional List Tests
    // =====================================================
    describe('GET /api/stock-opname', () => {
        test('Should list opname sessions', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .get('/api/stock-opname')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data.sessions)).toBe(true);
        });
        test('Should filter by store', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .get(`/api/stock-opname?storeId=${testStoreId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data.sessions)).toBe(true);
        });
        test('Should filter by status', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .get('/api/stock-opname?status=ONGOING')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data.sessions)).toBe(true);
        });
        test('Should require owner role', async () => {
            const kasirToken = generateToken(testUserId, 'KASIR');
            const response = await request(app)
                .get('/api/stock-opname')
                .set('Authorization', `Bearer ${kasirToken}`);
            expect(response.status).toBe(403);
        });
    });
    describe('GET /api/stock-opname/:sessionId', () => {
        test('Should return opname session details', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .get(`/api/stock-opname/${testOpnameSessionId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.session).toBeDefined();
            expect(response.body.data.items).toBeDefined();
            expect(response.body.data.summary).toBeDefined();
        });
        test('Should include summary statistics', async () => {
            const token = generateToken(testUserId, 'OWNER');
            const response = await request(app)
                .get(`/api/stock-opname/${testOpnameSessionId}`)
                .set('Authorization', `Bearer ${token}`);
            const summary = response.body.data.summary;
            expect(summary.totalItems).toBeGreaterThan(0);
            expect(summary.matchCount).toBeGreaterThanOrEqual(0);
            expect(summary.shortageCount).toBeGreaterThanOrEqual(0);
            expect(summary.excessCount).toBeGreaterThanOrEqual(0);
        });
        test('Should require owner role', async () => {
            const kasirToken = generateToken(testUserId, 'KASIR');
            const response = await request(app)
                .get(`/api/stock-opname/${testOpnameSessionId}`)
                .set('Authorization', `Bearer ${kasirToken}`);
            expect(response.status).toBe(403);
        });
    });
});
//# sourceMappingURL=stock-opname.test.js.map