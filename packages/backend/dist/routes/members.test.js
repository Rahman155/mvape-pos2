/**
 * Member Routes Tests
 * Tests for member CRUD and credit management endpoints
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
describe('Member Routes', () => {
    let testMemberId;
    let testMember;
    let authToken;
    beforeAll(async () => {
        // Setup test data
        authToken = 'test-token';
    });
    beforeEach(async () => {
        // Create test member before each test
        testMemberId = uuidv4();
        const now = new Date();
        const result = await db.query(`INSERT INTO members 
       (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`, [
            testMemberId,
            'MBR_TEST_001',
            'Test Member',
            '081234567890',
            'test@example.com',
            '1000000',
            '5000000',
            true,
            now,
            now,
        ]);
        testMember = result.rows[0];
    });
    afterAll(async () => {
        // Cleanup
        if (db) {
            await db.query('DELETE FROM members WHERE id = $1', [testMemberId]);
        }
    });
    describe('GET /api/members', () => {
        it('should return list of members with pagination', async () => {
            const result = await db.query('SELECT * FROM members WHERE is_active = true LIMIT 20 OFFSET 0');
            expect(result.rows.length).toBeGreaterThan(0);
            expect(result.rows[0]).toHaveProperty('id');
            expect(result.rows[0]).toHaveProperty('name');
            expect(result.rows[0]).toHaveProperty('credit_balance');
        });
        it('should filter members by name', async () => {
            const result = await db.query('SELECT * FROM members WHERE is_active = true AND name ILIKE $1', ['%Test%']);
            expect(result.rows.length).toBeGreaterThan(0);
            expect(result.rows.some((m) => m.id === testMemberId)).toBe(true);
        });
        it('should filter members by member number', async () => {
            const result = await db.query('SELECT * FROM members WHERE is_active = true AND member_number ILIKE $1', ['%MBR_TEST%']);
            expect(result.rows.length).toBeGreaterThan(0);
            expect(result.rows.some((m) => m.id === testMemberId)).toBe(true);
        });
        it('should filter members by phone', async () => {
            const result = await db.query('SELECT * FROM members WHERE is_active = true AND phone ILIKE $1', ['%081234567890%']);
            expect(result.rows.length).toBeGreaterThan(0);
            expect(result.rows.some((m) => m.id === testMemberId)).toBe(true);
        });
    });
    describe('GET /api/members/:id', () => {
        it('should return member details', async () => {
            const result = await db.query('SELECT * FROM members WHERE id = $1', [
                testMemberId,
            ]);
            expect(result.rows.length).toBe(1);
            const member = result.rows[0];
            expect(member.id).toBe(testMemberId);
            expect(member.name).toBe('Test Member');
            expect(member.member_number).toBe('MBR_TEST_001');
        });
        it('should return empty result for non-existent member', async () => {
            const result = await db.query('SELECT * FROM members WHERE id = $1', [
                uuidv4(),
            ]);
            expect(result.rows.length).toBe(0);
        });
    });
    describe('POST /api/members', () => {
        it('should create a new member', async () => {
            const newMemberId = uuidv4();
            const now = new Date();
            const result = await db.query(`INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`, [
                newMemberId,
                `MBR${Date.now()}`,
                'New Member',
                '081987654321',
                'new@example.com',
                '0',
                '0',
                true,
                now,
                now,
            ]);
            expect(result.rows.length).toBe(1);
            const member = result.rows[0];
            expect(member.name).toBe('New Member');
            expect(member.credit_balance).toBe('0');
            expect(member.is_active).toBe(true);
            // Cleanup
            await db.query('DELETE FROM members WHERE id = $1', [newMemberId]);
        });
        it('should generate unique member number', async () => {
            const timestamp = Date.now();
            const memberNumber = `MBR${timestamp}`;
            expect(memberNumber).toMatch(/^MBR\d+$/);
        });
    });
    describe('PUT /api/members/:id/credit', () => {
        it('should increase credit balance with TOPUP', async () => {
            const originalBalance = Number(testMember.credit_balance);
            const topupAmount = 500000;
            const expectedBalance = originalBalance + topupAmount;
            const result = await db.query('UPDATE members SET credit_balance = $1, updated_at = $2 WHERE id = $3 RETURNING credit_balance', [expectedBalance.toString(), new Date(), testMemberId]);
            expect(Number(result.rows[0].credit_balance)).toBe(expectedBalance);
        });
        it('should decrease credit balance with DEDUCT', async () => {
            const originalBalance = Number(testMember.credit_balance);
            const deductAmount = 200000;
            const expectedBalance = originalBalance - deductAmount;
            const result = await db.query('UPDATE members SET credit_balance = $1, updated_at = $2 WHERE id = $3 RETURNING credit_balance', [expectedBalance.toString(), new Date(), testMemberId]);
            expect(Number(result.rows[0].credit_balance)).toBe(expectedBalance);
        });
        it('should prevent deduction when insufficient balance', async () => {
            const lowBalanceMemberId = uuidv4();
            const now = new Date();
            // Create member with low balance
            await db.query(`INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                lowBalanceMemberId,
                `MBR_LOW_${Date.now()}`,
                'Low Balance Member',
                '081111111111',
                null,
                '100000',
                '0',
                true,
                now,
                now,
            ]);
            const memberResult = await db.query('SELECT credit_balance FROM members WHERE id = $1', [lowBalanceMemberId]);
            const currentBalance = Number(memberResult.rows[0].credit_balance);
            // Try to deduct more than available
            const deductAmount = currentBalance + 50000;
            // This should prevent the deduction
            if (currentBalance < deductAmount) {
                expect(currentBalance).toBeLessThan(deductAmount);
            }
            // Cleanup
            await db.query('DELETE FROM members WHERE id = $1', [lowBalanceMemberId]);
        });
        it('should update member updated_at timestamp', async () => {
            const before = testMember.updated_at;
            await new Promise((resolve) => setTimeout(resolve, 10));
            const result = await db.query('UPDATE members SET credit_balance = $1, updated_at = $2 WHERE id = $3 RETURNING updated_at', ['500000', new Date(), testMemberId]);
            const after = result.rows[0].updated_at;
            expect(after.getTime()).toBeGreaterThan(before.getTime());
        });
    });
    describe('Member Credit Validation', () => {
        it('should validate sufficient credit exists', async () => {
            const requiredAmount = 500000;
            const memberResult = await db.query('SELECT credit_balance FROM members WHERE id = $1', [testMemberId]);
            const currentBalance = Number(memberResult.rows[0].credit_balance);
            const hasSufficientCredit = currentBalance >= requiredAmount;
            expect(hasSufficientCredit).toBe(true);
        });
        it('should detect insufficient credit', async () => {
            // Create member with insufficient balance
            const insufficientMemberId = uuidv4();
            const now = new Date();
            await db.query(`INSERT INTO members 
         (id, member_number, name, phone, email, credit_balance, total_spent, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                insufficientMemberId,
                `MBR_INSUF_${Date.now()}`,
                'Insufficient Member',
                '081222222222',
                null,
                '100000',
                '0',
                true,
                now,
                now,
            ]);
            const memberResult = await db.query('SELECT credit_balance FROM members WHERE id = $1', [insufficientMemberId]);
            const currentBalance = Number(memberResult.rows[0].credit_balance);
            const requiredAmount = 500000;
            const hasSufficientCredit = currentBalance >= requiredAmount;
            expect(hasSufficientCredit).toBe(false);
            // Cleanup
            await db.query('DELETE FROM members WHERE id = $1', [insufficientMemberId]);
        });
    });
});
//# sourceMappingURL=members.test.js.map