/**
 * Member Detail API Integration Tests
 * Tests for member detail endpoint with transaction history
 *
 * Requirements: 14.7 (Member Management)
 * - GET /api/members/:id returns complete member information (14.7)
 * - Returns member transaction history (14.7)
 * - Returns total amount spent (14.7)
 * - Returns transaction details (date, amount, payment method, status) (14.7)
 */
import request from 'supertest';
import { app } from '../app';
import { db } from '../database/connection';
import { v4 as uuidv4 } from 'uuid';
describe('Member Detail API', () => {
    let testStoreId;
    let testUserId;
    let testMemberId;
    let authToken;
    beforeAll(async () => {
        // Clean up any existing test data
        await db.query('DELETE FROM members WHERE member_number LIKE $1', ['TEST%']);
        await db.query('DELETE FROM transactions WHERE id LIKE $1', ['test-txn%']);
    });
    beforeEach(async () => {
        // Create test store
        testStoreId = uuidv4();
        await db.query(`INSERT INTO stores (id, name, address, phone, operating_hours, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [testStoreId, 'Test Store', 'Test Address', '081234567890', '08:00-22:00', new Date(), new Date()]);
        // Create test user
        testUserId = uuidv4();
        const hashedPassword = 'hashed_password'; // In real tests, use proper hashing
        await db.query(`INSERT INTO users (id, username, password, role, store_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [testUserId, 'testuser', hashedPassword, 'KASIR', testStoreId, new Date(), new Date()]);
        // Generate auth token (simplified for testing)
        authToken = 'test-token';
        // Create test member
        testMemberId = uuidv4();
        await db.query(`INSERT INTO members (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
            testMemberId,
            'TESTMBR001',
            'Test Member',
            '081234567890',
            'test@example.com',
            500000,
            2000000,
            true,
            new Date(),
            new Date(),
        ]);
        // Create test transactions
        const txn1Id = 'test-txn-' + uuidv4();
        await db.query(`INSERT INTO transactions (id, store_id, kasir_id, total_amount, payment_method, transaction_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            txn1Id,
            testStoreId,
            testUserId,
            100000,
            'MEMBER_CREDIT',
            new Date(),
            'COMPLETED',
            new Date(),
            new Date(),
        ]);
        const txn2Id = 'test-txn-' + uuidv4();
        await db.query(`INSERT INTO transactions (id, store_id, kasir_id, total_amount, payment_method, transaction_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            txn2Id,
            testStoreId,
            testUserId,
            200000,
            'CASH',
            new Date(),
            'COMPLETED',
            new Date(),
            new Date(),
        ]);
    });
    afterEach(async () => {
        // Clean up test data
        await db.query('DELETE FROM transactions WHERE id LIKE $1', ['test-txn%']);
        await db.query('DELETE FROM members WHERE id = $1', [testMemberId]);
        await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
        await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
    });
    afterAll(async () => {
        // Close database connection
        await db.end();
    });
    describe('GET /api/members/:id', () => {
        it('should return member detail with transaction history', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('member');
            expect(res.body).toHaveProperty('transactions');
        });
        it('should return complete member information', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            const member = res.body.member;
            expect(member).toHaveProperty('id');
            expect(member).toHaveProperty('memberNumber');
            expect(member).toHaveProperty('name');
            expect(member).toHaveProperty('phone');
            expect(member).toHaveProperty('email');
            expect(member).toHaveProperty('creditBalance');
            expect(member).toHaveProperty('totalSpent');
            expect(member).toHaveProperty('isActive');
            expect(member).toHaveProperty('createdAt');
            expect(member).toHaveProperty('updatedAt');
        });
        it('should return correct member data', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            const member = res.body.member;
            expect(member.id).toBe(testMemberId);
            expect(member.memberNumber).toBe('TESTMBR001');
            expect(member.name).toBe('Test Member');
            expect(member.phone).toBe('081234567890');
            expect(member.email).toBe('test@example.com');
            expect(member.creditBalance).toBe(500000);
            expect(member.totalSpent).toBe(2000000);
            expect(member.isActive).toBe(true);
        });
        it('should return transaction history array', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.transactions)).toBe(true);
        });
        it('should include transaction details', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            if (res.body.transactions.length > 0) {
                const transaction = res.body.transactions[0];
                expect(transaction).toHaveProperty('id');
                expect(transaction).toHaveProperty('totalAmount');
                expect(transaction).toHaveProperty('paymentMethod');
                expect(transaction).toHaveProperty('transactionDate');
                expect(transaction).toHaveProperty('status');
            }
        });
        it('should return 404 for non-existent member', async () => {
            const nonExistentId = uuidv4();
            const res = await request(app)
                .get(`/api/members/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Member not found');
        });
        it('should require authentication', async () => {
            const res = await request(app).get(`/api/members/${testMemberId}`);
            expect(res.status).toBe(401);
        });
        it('should format currency fields as numbers', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            const member = res.body.member;
            expect(typeof member.creditBalance).toBe('number');
            expect(typeof member.totalSpent).toBe('number');
        });
        it('should format transaction amounts as numbers', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            if (res.body.transactions.length > 0) {
                const transaction = res.body.transactions[0];
                expect(typeof transaction.totalAmount).toBe('number');
            }
        });
        it('should include only completed transactions', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            res.body.transactions.forEach((txn) => {
                expect(txn.status).toBe('COMPLETED');
            });
        });
        it('should return transactions in descending date order', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            const transactions = res.body.transactions;
            if (transactions.length > 1) {
                for (let i = 0; i < transactions.length - 1; i++) {
                    const date1 = new Date(transactions[i].transactionDate).getTime();
                    const date2 = new Date(transactions[i + 1].transactionDate).getTime();
                    expect(date1).toBeGreaterThanOrEqual(date2);
                }
            }
        });
        it('should limit returned transactions to 50', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            expect(res.body.transactions.length).toBeLessThanOrEqual(50);
        });
        it('should handle member with no transactions', async () => {
            // Create new member without transactions
            const newMemberId = uuidv4();
            await db.query(`INSERT INTO members (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                newMemberId,
                'TESTMBR002',
                'No Trans Member',
                '089876543210',
                null,
                0,
                0,
                true,
                new Date(),
                new Date(),
            ]);
            const res = await request(app)
                .get(`/api/members/${newMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            expect(res.body.member).toBeDefined();
            expect(Array.isArray(res.body.transactions)).toBe(true);
            expect(res.body.transactions.length).toBe(0);
            // Clean up
            await db.query('DELETE FROM members WHERE id = $1', [newMemberId]);
        });
        it('should handle member with null optional fields', async () => {
            // Create member without phone and email
            const newMemberId = uuidv4();
            await db.query(`INSERT INTO members (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [newMemberId, 'TESTMBR003', 'No Contact Member', null, null, 0, 0, true, new Date(), new Date()]);
            const res = await request(app)
                .get(`/api/members/${newMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            const member = res.body.member;
            expect(member.phone).toBeNull();
            expect(member.email).toBeNull();
            // Clean up
            await db.query('DELETE FROM members WHERE id = $1', [newMemberId]);
        });
    });
    describe('Member Detail Page Requirements', () => {
        it('should return data that displays member information correctly', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            const member = res.body.member;
            // Verify all required fields for UI display
            expect(member.name).toBeDefined();
            expect(member.phone).toBeDefined();
            expect(member.email).toBeDefined();
            expect(member.creditBalance).toBeDefined();
        });
        it('should return data that displays transaction history', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            const transactions = res.body.transactions;
            // Verify all required fields for transaction table
            transactions.forEach((txn) => {
                expect(txn.transactionDate).toBeDefined();
                expect(txn.id).toBeDefined();
                expect(txn.paymentMethod).toBeDefined();
                expect(txn.totalAmount).toBeDefined();
                expect(txn.status).toBeDefined();
            });
        });
        it('should return total spent value', async () => {
            const res = await request(app)
                .get(`/api/members/${testMemberId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
            const member = res.body.member;
            expect(member.totalSpent).toBe(2000000);
        });
    });
});
//# sourceMappingURL=members.detail.integration.test.js.map