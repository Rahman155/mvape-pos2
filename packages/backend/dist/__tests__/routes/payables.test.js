/**
 * Unit Tests for Payables Management
 * Tests owner-only payable tracking, payment recording, and alerts
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../app.js';
import { db } from '../../database/connection.js';
import { AuthService } from '../../services/auth.js';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';
describe('Payables Management', () => {
    let app;
    let testUserId;
    let testStoreId;
    let supplierId;
    let payableId;
    let userToken;
    let kasirUserId;
    let kasirToken;
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
        payableId = uuidv4();
        const hashedPassword = await AuthService.hashPassword(testPassword);
        // Create test store
        await db.query('INSERT INTO stores (id, name, address, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [testStoreId, 'Test Store', 'Address', true]);
        // Create owner user
        await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`, [testUserId, 'owner_user', `owner_${Date.now()}@test.com`, hashedPassword, 'OWNER', testStoreId, true]);
        // Create kasir user
        await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`, [kasirUserId, 'kasir_user', `kasir_${Date.now()}@test.com`, hashedPassword, 'KASIR', testStoreId, true]);
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
        await db.query(`INSERT INTO suppliers (id, name, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`, [supplierId, 'Test Supplier', true, new Date(), new Date()]);
        // Create initial payable (OPEN status)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 10);
        await db.query(`INSERT INTO piutang (id, supplier_id, amount, remaining_balance, due_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`, [
            payableId,
            supplierId,
            1000000,
            1000000,
            dueDate.toISOString().split('T')[0],
            'OPEN',
            new Date(),
            new Date(),
        ]);
    });
    afterAll(async () => {
        // Cleanup
        await db.query('DELETE FROM piutang WHERE supplier_id = $1', [supplierId]);
        await db.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
        await db.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, kasirUserId]);
        await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
    });
    describe('GET /api/payables', () => {
        it('should list all payables (owner only)', async () => {
            const response = await request(app)
                .get('/api/payables')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.total).toBeDefined();
        });
        it('should reject payables list for non-owner (kasir)', async () => {
            const response = await request(app)
                .get('/api/payables')
                .set('Authorization', `Bearer ${kasirToken}`);
            expect(response.status).toBe(403);
        });
        it('should require authentication for payables list', async () => {
            const response = await request(app)
                .get('/api/payables');
            expect(response.status).toBe(401);
        });
        it('should support filtering by status', async () => {
            const response = await request(app)
                .get('/api/payables?status=OPEN')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            response.body.data.forEach((payable) => {
                expect(payable.status).toBe('OPEN');
            });
        });
        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/payables?page=1&limit=5')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body.limit).toBe(5);
        });
    });
    describe('GET /api/payables/:id', () => {
        it('should fetch specific payable (owner only)', async () => {
            const response = await request(app)
                .get(`/api/payables/${payableId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(payableId);
            expect(response.body.supplierId).toBe(supplierId);
            expect(response.body.status).toBe('OPEN');
        });
        it('should reject fetch for non-owner (kasir)', async () => {
            const response = await request(app)
                .get(`/api/payables/${payableId}`)
                .set('Authorization', `Bearer ${kasirToken}`);
            expect(response.status).toBe(403);
        });
        it('should return 404 for non-existent payable', async () => {
            const response = await request(app)
                .get(`/api/payables/${uuidv4()}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(404);
        });
    });
    describe('PUT /api/payables/:id/payment', () => {
        let openPayableId;
        beforeAll(async () => {
            // Create a fresh OPEN payable
            openPayableId = uuidv4();
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 15);
            await db.query(`INSERT INTO piutang (id, supplier_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                openPayableId,
                supplierId,
                500000,
                500000,
                dueDate.toISOString().split('T')[0],
                'OPEN',
                new Date(),
                new Date(),
            ]);
        });
        it('should record partial payment and update to PARTIAL status (owner only)', async () => {
            const response = await request(app)
                .put(`/api/payables/${openPayableId}/payment`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                paymentAmount: 200000,
            });
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(openPayableId);
            expect(response.body.remainingBalance).toBe(300000);
            expect(response.body.status).toBe('PARTIAL');
        });
        it('should record full payment and update to CLOSED status', async () => {
            const response = await request(app)
                .put(`/api/payables/${openPayableId}/payment`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                paymentAmount: 300000,
            });
            expect(response.status).toBe(200);
            expect(response.body.remainingBalance).toBe(0);
            expect(response.body.status).toBe('CLOSED');
        });
        it('should record payment on PARTIAL payable and keep PARTIAL if balance remains', async () => {
            // Create a PARTIAL payable
            const partialPayableId = uuidv4();
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 20);
            await db.query(`INSERT INTO piutang (id, supplier_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                partialPayableId,
                supplierId,
                600000,
                300000,
                dueDate.toISOString().split('T')[0],
                'PARTIAL',
                new Date(),
                new Date(),
            ]);
            const response = await request(app)
                .put(`/api/payables/${partialPayableId}/payment`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                paymentAmount: 100000,
            });
            expect(response.status).toBe(200);
            expect(response.body.remainingBalance).toBe(200000);
            expect(response.body.status).toBe('PARTIAL');
            // Cleanup
            await db.query('DELETE FROM piutang WHERE id = $1', [partialPayableId]);
        });
        it('should reject payment for non-owner (kasir)', async () => {
            const tempPayableId = uuidv4();
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 5);
            await db.query(`INSERT INTO piutang (id, supplier_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                tempPayableId,
                supplierId,
                400000,
                400000,
                dueDate.toISOString().split('T')[0],
                'OPEN',
                new Date(),
                new Date(),
            ]);
            const response = await request(app)
                .put(`/api/payables/${tempPayableId}/payment`)
                .set('Authorization', `Bearer ${kasirToken}`)
                .send({
                paymentAmount: 100000,
            });
            expect(response.status).toBe(403);
            // Cleanup
            await db.query('DELETE FROM piutang WHERE id = $1', [tempPayableId]);
        });
        it('should require authentication', async () => {
            const response = await request(app)
                .put(`/api/payables/${payableId}/payment`)
                .send({
                paymentAmount: 100000,
            });
            expect(response.status).toBe(401);
        });
        it('should reject non-existent payable', async () => {
            const response = await request(app)
                .put(`/api/payables/${uuidv4()}/payment`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                paymentAmount: 100000,
            });
            expect(response.status).toBe(404);
        });
        it('should reject invalid payment amount', async () => {
            const response = await request(app)
                .put(`/api/payables/${payableId}/payment`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                paymentAmount: -50000,
            });
            expect(response.status).toBe(400);
        });
        it('should reject payment exceeding remaining balance', async () => {
            const response = await request(app)
                .put(`/api/payables/${payableId}/payment`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                paymentAmount: 999999999,
            });
            expect(response.status).toBe(400);
        });
    });
    describe('GET /api/payables/alerts/upcoming', () => {
        beforeAll(async () => {
            // Create payables due within 7 days
            const inTwoDays = new Date();
            inTwoDays.setDate(inTwoDays.getDate() + 2);
            await db.query(`INSERT INTO piutang (id, supplier_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                uuidv4(),
                supplierId,
                250000,
                250000,
                inTwoDays.toISOString().split('T')[0],
                'OPEN',
                new Date(),
                new Date(),
            ]);
            // Create payable due after 7 days (should not appear in upcoming)
            const inNineDays = new Date();
            inNineDays.setDate(inNineDays.getDate() + 9);
            await db.query(`INSERT INTO piutang (id, supplier_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                uuidv4(),
                supplierId,
                300000,
                300000,
                inNineDays.toISOString().split('T')[0],
                'OPEN',
                new Date(),
                new Date(),
            ]);
        });
        it('should get payables due within 7 days (owner only)', async () => {
            const response = await request(app)
                .get('/api/payables/alerts/upcoming')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.alert).toContain('7 days');
            // Verify all returned payables are due within 7 days
            const today = new Date();
            const sevenDaysFromNow = new Date(today);
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
            response.body.data.forEach((payable) => {
                const dueDate = new Date(payable.dueDate);
                expect(dueDate.getTime()).toBeLessThanOrEqual(sevenDaysFromNow.getTime());
            });
        });
        it('should reject upcoming payables fetch for non-owner (kasir)', async () => {
            const response = await request(app)
                .get('/api/payables/alerts/upcoming')
                .set('Authorization', `Bearer ${kasirToken}`);
            expect(response.status).toBe(403);
        });
    });
    describe('GET /api/payables/alerts/overdue', () => {
        beforeAll(async () => {
            // Create overdue payables
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            await db.query(`INSERT INTO piutang (id, supplier_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                uuidv4(),
                supplierId,
                150000,
                150000,
                yesterday.toISOString().split('T')[0],
                'OPEN',
                new Date(),
                new Date(),
            ]);
            // Create payable due today (not overdue)
            const today = new Date();
            await db.query(`INSERT INTO piutang (id, supplier_id, amount, remaining_balance, due_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                uuidv4(),
                supplierId,
                100000,
                100000,
                today.toISOString().split('T')[0],
                'OPEN',
                new Date(),
                new Date(),
            ]);
        });
        it('should get overdue payables (owner only)', async () => {
            const response = await request(app)
                .get('/api/payables/alerts/overdue')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            expect(response.body.data).toBeDefined();
            expect(response.body.alert).toContain('Overdue');
            // Verify all returned payables are overdue
            const today = new Date().toISOString().split('T')[0];
            response.body.data.forEach((payable) => {
                expect(payable.dueDate).toBeLessThan(today);
            });
        });
        it('should reject overdue payables fetch for non-owner (kasir)', async () => {
            const response = await request(app)
                .get('/api/payables/alerts/overdue')
                .set('Authorization', `Bearer ${kasirToken}`);
            expect(response.status).toBe(403);
        });
        it('should only include OPEN and PARTIAL payables', async () => {
            const response = await request(app)
                .get('/api/payables/alerts/overdue')
                .set('Authorization', `Bearer ${userToken}`);
            expect(response.status).toBe(200);
            response.body.data.forEach((payable) => {
                expect(['OPEN', 'PARTIAL']).toContain(payable.status);
            });
        });
    });
});
//# sourceMappingURL=payables.test.js.map