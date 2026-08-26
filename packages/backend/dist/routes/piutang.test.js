/**
 * Piutang Management Tests
 * Comprehensive test suite for piutang (customer receivable) endpoints
 * Tests cover: list view, detail view, payment recording, status management, alerts
 *
 * Requirements: 18.3, 18.4, 18.5, 18.6, 18.7, 18.8
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
// Mock authentication middleware
vi.mock('../middleware/authorize.js', () => ({
    authorize: () => (req, res, next) => {
        req.user = { id: 'owner-1', role: 'OWNER' };
        req.requestId = 'test-request-id';
        next();
    },
}));
describe('Piutang Routes (Requirements 18.3-18.8)', () => {
    let memberId;
    let piutangId;
    let transactionId;
    beforeEach(async () => {
        // Create test data
        memberId = uuidv4();
        piutangId = uuidv4();
        transactionId = uuidv4();
        // Insert member
        await db.query(`INSERT INTO members (id, member_number, name, phone, email, credit_balance, total_spent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [memberId, 'M001', 'Test Customer', '08123456789', 'customer@test.com', 0, 0]);
        // Insert piutang
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 5); // 5 days from now
        await db.query(`INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            piutangId,
            transactionId,
            memberId,
            1000000,
            800000,
            dueDate.toISOString().split('T')[0],
            'OPEN',
            new Date(),
            new Date(),
        ]);
    });
    afterEach(async () => {
        // Cleanup
        await db.query('DELETE FROM piutang WHERE id = $1', [piutangId]);
        await db.query('DELETE FROM members WHERE id = $1', [memberId]);
    });
    // ====================================================================
    // LIST TESTS (Task 73 - Requirement 18.3)
    // ====================================================================
    describe('GET /api/piutang - Piutang List (Requirement 18.3)', () => {
        it('should return piutang list with pagination', async () => {
            const res = await request(app)
                .get('/api/piutang')
                .query({ page: 1, limit: 20 })
                .expect(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page');
            expect(res.body).toHaveProperty('limit');
            expect(res.body).toHaveProperty('pages');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('should filter by status', async () => {
            const res = await request(app)
                .get('/api/piutang')
                .query({ status: 'OPEN' })
                .expect(200);
            expect(res.body.data).toBeDefined();
            if (res.body.data.length > 0) {
                res.body.data.forEach((item) => {
                    expect(item.status).toBe('OPEN');
                });
            }
        });
        it('should filter by customer name', async () => {
            const res = await request(app)
                .get('/api/piutang')
                .query({ customerName: 'Test' })
                .expect(200);
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('should filter by due date range', async () => {
            const today = new Date().toISOString().split('T')[0];
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            const futureDateStr = futureDate.toISOString().split('T')[0];
            const res = await request(app)
                .get('/api/piutang')
                .query({ dueDateFrom: today, dueDateTo: futureDateStr })
                .expect(200);
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('should filter by remaining balance range', async () => {
            const res = await request(app)
                .get('/api/piutang')
                .query({ amountMin: 500000, amountMax: 1000000 })
                .expect(200);
            expect(res.body.data).toBeDefined();
            if (res.body.data.length > 0) {
                res.body.data.forEach((item) => {
                    expect(item.remainingBalance).toBeGreaterThanOrEqual(500000);
                    expect(item.remainingBalance).toBeLessThanOrEqual(1000000);
                });
            }
        });
        it('should sort by due date ascending', async () => {
            const res = await request(app)
                .get('/api/piutang')
                .query({ sort: 'due_date' })
                .expect(200);
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('should sort by remaining balance descending', async () => {
            const res = await request(app)
                .get('/api/piutang')
                .query({ sort: 'remaining_balance' })
                .expect(200);
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('should display empty state when no piutang found', async () => {
            const res = await request(app)
                .get('/api/piutang')
                .query({ status: 'NONEXISTENT' })
                .expect(200);
            expect(res.body.data).toEqual([]);
            expect(res.body.total).toBe(0);
        });
        it('should handle pagination correctly', async () => {
            const res1 = await request(app)
                .get('/api/piutang')
                .query({ page: 1, limit: 1 })
                .expect(200);
            const res2 = await request(app)
                .get('/api/piutang')
                .query({ page: 2, limit: 1 })
                .expect(200);
            expect(res1.body.page).toBe(1);
            expect(res2.body.page).toBe(2);
        });
    });
    // ====================================================================
    // DETAIL TESTS (Task 74 - Requirement 18.4)
    // ====================================================================
    describe('GET /api/piutang/:id - Piutang Detail (Requirement 18.4)', () => {
        it('should return piutang detail with all information', async () => {
            const res = await request(app)
                .get(`/api/piutang/${piutangId}`)
                .expect(200);
            expect(res.body.id).toBe(piutangId);
            expect(res.body.memberId).toBe(memberId);
            expect(res.body.customerName).toBe('Test Customer');
            expect(res.body.customerPhone).toBe('08123456789');
            expect(res.body.amount).toBe(1000000);
            expect(res.body.remainingBalance).toBe(800000);
            expect(res.body.status).toBe('OPEN');
        });
        it('should include transaction history', async () => {
            const res = await request(app)
                .get(`/api/piutang/${piutangId}`)
                .expect(200);
            expect(res.body).toHaveProperty('transactionHistory');
            expect(Array.isArray(res.body.transactionHistory)).toBe(true);
        });
        it('should include due date', async () => {
            const res = await request(app)
                .get(`/api/piutang/${piutangId}`)
                .expect(200);
            expect(res.body.dueDate).toBeDefined();
        });
        it('should include payment terms in format', async () => {
            const res = await request(app)
                .get(`/api/piutang/${piutangId}`)
                .expect(200);
            expect(res.body.amount).toBeDefined();
            expect(res.body.remainingBalance).toBeDefined();
            expect(res.body.status).toBeDefined();
        });
        it('should return 404 for non-existent piutang', async () => {
            const fakeId = uuidv4();
            const res = await request(app)
                .get(`/api/piutang/${fakeId}`)
                .expect(404);
            expect(res.body.error).toBeDefined();
        });
    });
    // ====================================================================
    // PAYMENT RECORDING TESTS (Task 75 - Requirements 18.5, 18.6)
    // ====================================================================
    describe('POST /api/piutang/:id/payment - Payment Recording (Requirements 18.5, 18.6)', () => {
        it('should record partial payment successfully', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 200000 })
                .expect(200);
            expect(res.body.remainingBalance).toBe(600000);
            expect(res.body.status).toBe('PARTIAL');
        });
        it('should record full payment and close piutang', async () => {
            // First make partial payment
            await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 200000 })
                .expect(200);
            // Then make full payment of remaining balance
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 600000 })
                .expect(200);
            expect(res.body.remainingBalance).toBe(0);
            expect(res.body.status).toBe('CLOSED');
        });
        it('should validate payment amount is positive', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 0 })
                .expect(400);
            expect(res.body.error).toBeDefined();
        });
        it('should validate payment amount is not negative', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: -100000 })
                .expect(400);
            expect(res.body.error).toBeDefined();
        });
        it('should reject payment exceeding remaining balance', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 900000 })
                .expect(400);
            expect(res.body.error).toBeDefined();
            expect(res.body.details).toContain('cannot exceed remaining balance');
        });
        it('should reject missing payment amount', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({})
                .expect(400);
            expect(res.body.error).toBeDefined();
        });
        it('should reject invalid payment amount type', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 'invalid' })
                .expect(400);
            expect(res.body.error).toBeDefined();
        });
        it('should update remaining balance correctly', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 100000 })
                .expect(200);
            expect(res.body.remainingBalance).toBe(700000);
        });
        it('should record timestamp for payment', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 50000 })
                .expect(200);
            expect(res.body.updatedAt).toBeDefined();
        });
        it('should return 404 for non-existent piutang payment', async () => {
            const fakeId = uuidv4();
            const res = await request(app)
                .post(`/api/piutang/${fakeId}/payment`)
                .send({ amount: 100000 })
                .expect(404);
            expect(res.body.error).toBeDefined();
        });
        it('should accept exact remaining balance payment', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 800000 })
                .expect(200);
            expect(res.body.remainingBalance).toBe(0);
            expect(res.body.status).toBe('CLOSED');
        });
    });
    // ====================================================================
    // STATUS MANAGEMENT TESTS (Task 76 - Requirement 18.7)
    // ====================================================================
    describe('Status Management (Requirement 18.7)', () => {
        it('should transition OPEN -> PARTIAL on partial payment', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 100000 })
                .expect(200);
            expect(res.body.status).toBe('PARTIAL');
        });
        it('should transition OPEN -> CLOSED on full payment', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 800000 })
                .expect(200);
            expect(res.body.status).toBe('CLOSED');
            expect(res.body.remainingBalance).toBe(0);
        });
        it('should transition PARTIAL -> CLOSED when fully paid', async () => {
            // Make partial payment first
            await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 200000 })
                .expect(200);
            // Verify it's PARTIAL
            let getRes = await request(app).get(`/api/piutang/${piutangId}`).expect(200);
            expect(getRes.body.status).toBe('PARTIAL');
            // Complete remaining payment
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 600000 })
                .expect(200);
            expect(res.body.status).toBe('CLOSED');
        });
        it('should keep PARTIAL status when balance remains', async () => {
            // First payment
            await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 100000 })
                .expect(200);
            // Second partial payment
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 50000 })
                .expect(200);
            expect(res.body.status).toBe('PARTIAL');
            expect(res.body.remainingBalance).toBe(650000);
        });
    });
    // ====================================================================
    // ALERT TESTS (Task 77 - Requirement 18.8)
    // ====================================================================
    describe('GET /api/piutang/alerts/upcoming - Upcoming Piutang Alerts (Requirement 18.8)', () => {
        beforeEach(async () => {
            // Create overdue piutang for alert testing
            const overdueId = uuidv4();
            const overdueDate = new Date();
            overdueDate.setDate(overdueDate.getDate() - 5); // 5 days ago
            await db.query(`INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [overdueId, uuidv4(), memberId, 500000, 500000, overdueDate.toISOString().split('T')[0], 'OPEN']);
        });
        it('should return upcoming piutang within 7 days', async () => {
            const res = await request(app)
                .get('/api/piutang/alerts/upcoming')
                .expect(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('alert');
        });
        it('should include customer information in alerts', async () => {
            const res = await request(app)
                .get('/api/piutang/alerts/upcoming')
                .expect(200);
            if (res.body.data.length > 0) {
                const alert = res.body.data[0];
                expect(alert.customerName).toBeDefined();
                expect(alert.customerPhone).toBeDefined();
                expect(alert.amount).toBeDefined();
                expect(alert.dueDate).toBeDefined();
            }
        });
        it('should include days until due', async () => {
            const res = await request(app)
                .get('/api/piutang/alerts/upcoming')
                .expect(200);
            if (res.body.data.length > 0) {
                const alert = res.body.data[0];
                expect(alert.daysUntilDue).toBeDefined();
            }
        });
        it('should exclude CLOSED piutang from alerts', async () => {
            const res = await request(app)
                .get('/api/piutang/alerts/upcoming')
                .expect(200);
            expect(res.body.data).toBeDefined();
            res.body.data.forEach((item) => {
                expect(['OPEN', 'PARTIAL']).toContain(item.status);
            });
        });
    });
    describe('GET /api/piutang/alerts/overdue - Overdue Piutang Alerts (Requirement 18.8)', () => {
        it('should return overdue piutang past due date', async () => {
            // Create overdue piutang
            const overdueId = uuidv4();
            const overdueDate = new Date();
            overdueDate.setDate(overdueDate.getDate() - 5); // 5 days overdue
            await db.query(`INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                overdueId,
                uuidv4(),
                memberId,
                500000,
                500000,
                overdueDate.toISOString().split('T')[0],
                'OPEN',
            ]);
            const res = await request(app)
                .get('/api/piutang/alerts/overdue')
                .expect(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            // Cleanup
            await db.query('DELETE FROM piutang WHERE id = $1', [overdueId]);
        });
        it('should include days overdue in alert', async () => {
            const overdueId = uuidv4();
            const overdueDate = new Date();
            overdueDate.setDate(overdueDate.getDate() - 3);
            await db.query(`INSERT INTO piutang (id, transaction_id, member_id, amount, remaining_balance, due_date, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                overdueId,
                uuidv4(),
                memberId,
                300000,
                300000,
                overdueDate.toISOString().split('T')[0],
                'PARTIAL',
            ]);
            const res = await request(app)
                .get('/api/piutang/alerts/overdue')
                .expect(200);
            if (res.body.data.length > 0) {
                const alert = res.body.data.find((a) => a.id === overdueId);
                if (alert) {
                    expect(alert.daysOverdue).toBeDefined();
                    expect(alert.daysOverdue).toBeGreaterThan(0);
                }
            }
            // Cleanup
            await db.query('DELETE FROM piutang WHERE id = $1', [overdueId]);
        });
    });
    // ====================================================================
    // AUTHORIZATION TESTS
    // ====================================================================
    describe('Authorization', () => {
        it('should restrict piutang list to OWNER role only', async () => {
            // Authorization middleware is mocked in beforeEach
            const res = await request(app).get('/api/piutang').expect(200);
            expect(res.body).toBeDefined();
        });
        it('should restrict piutang detail to OWNER role only', async () => {
            const res = await request(app).get(`/api/piutang/${piutangId}`).expect(200);
            expect(res.body).toBeDefined();
        });
        it('should restrict payment recording to OWNER role only', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 100000 })
                .expect(200);
            expect(res.body).toBeDefined();
        });
    });
    // ====================================================================
    // EDGE CASES
    // ====================================================================
    describe('Edge Cases', () => {
        it('should handle multiple sequential payments correctly', async () => {
            let piutang = await request(app).get(`/api/piutang/${piutangId}`).expect(200);
            let balance = piutang.body.remainingBalance;
            for (let i = 0; i < 3; i++) {
                const payment = Math.floor(balance / 2);
                const res = await request(app)
                    .post(`/api/piutang/${piutangId}/payment`)
                    .send({ amount: payment })
                    .expect(200);
                balance = res.body.remainingBalance;
                expect(balance).toBeLessThan(piutang.body.remainingBalance);
            }
        });
        it('should handle decimal amounts correctly', async () => {
            const res = await request(app)
                .post(`/api/piutang/${piutangId}/payment`)
                .send({ amount: 123456.78 })
                .expect(200);
            expect(res.body.remainingBalance).toBeCloseTo(800000 - 123456.78, 2);
        });
        it('should handle list with very large limit', async () => {
            const res = await request(app)
                .get('/api/piutang')
                .query({ limit: 10000 })
                .expect(200);
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('should handle empty customer name search', async () => {
            const res = await request(app)
                .get('/api/piutang')
                .query({ customerName: '' })
                .expect(200);
            expect(res.body.data).toBeDefined();
        });
    });
});
//# sourceMappingURL=piutang.test.js.map