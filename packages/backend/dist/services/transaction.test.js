/**
 * Transaction Service Tests
 * Tests for member credit payment processing and validation
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { validateMemberCredit, deductMemberCredit, } from './transaction.js';
import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
describe('Transaction Service', () => {
    let testMemberId;
    let testStoreId;
    let testProductId;
    let testKasirId;
    beforeAll(async () => {
        // Setup test data
        testMemberId = uuidv4();
        testStoreId = uuidv4();
        testProductId = uuidv4();
        testKasirId = uuidv4();
        const now = new Date();
        // Create test member with sufficient credit
        await db.query(`INSERT INTO members 
       (id, member_number, name, phone, credit_balance, total_spent, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            testMemberId,
            'MBR_TEST_TXN',
            'Test Member',
            '081234567890',
            '5000000',
            '0',
            true,
            now,
            now,
        ]);
        // Create test store
        await db.query(`INSERT INTO stores 
       (id, name, is_active, created_at, updated_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`, [testStoreId, 'Test Store', true, now, now, '{}']);
        // Create test product
        await db.query(`INSERT INTO products 
       (id, name, sku, cost_price, selling_price, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            testProductId,
            'Test Product',
            'SKU_TEST',
            '100000',
            '150000',
            true,
            now,
            now,
        ]);
        // Create inventory for test product
        await db.query(`INSERT INTO inventory 
       (id, product_id, store_id, quantity, reserved, reorder_level, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [uuidv4(), testProductId, testStoreId, 100, 0, 10, now, now]);
    });
    afterAll(async () => {
        // Cleanup
        if (db) {
            await db.query('DELETE FROM inventory WHERE product_id = $1', [testProductId]);
            await db.query('DELETE FROM products WHERE id = $1', [testProductId]);
            await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
            await db.query('DELETE FROM members WHERE id = $1', [testMemberId]);
        }
    });
    describe('validateMemberCredit', () => {
        it('should validate member has sufficient credit', async () => {
            const requiredAmount = 1000000;
            const result = await validateMemberCredit(testMemberId, requiredAmount);
            expect(result.valid).toBe(true);
            expect(result.currentBalance).toBeGreaterThanOrEqual(requiredAmount);
            expect(result.error).toBeUndefined();
        });
        it('should detect insufficient credit', async () => {
            const requiredAmount = 10000000; // More than available
            const result = await validateMemberCredit(testMemberId, requiredAmount);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Insufficient credit balance');
        });
        it('should handle non-existent member', async () => {
            const nonExistentId = uuidv4();
            const result = await validateMemberCredit(nonExistentId, 1000000);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Member not found');
        });
        it('should validate exact balance match', async () => {
            const memberResult = await db.query('SELECT credit_balance FROM members WHERE id = $1', [testMemberId]);
            const exactBalance = Number(memberResult.rows[0].credit_balance);
            const result = await validateMemberCredit(testMemberId, exactBalance);
            expect(result.valid).toBe(true);
            expect(result.currentBalance).toBe(exactBalance);
        });
    });
    describe('deductMemberCredit', () => {
        beforeEach(async () => {
            // Reset member credit to 5000000 before each test
            await db.query('UPDATE members SET credit_balance = $1 WHERE id = $2', ['5000000', testMemberId]);
        });
        it('should successfully deduct credit', async () => {
            const deductAmount = 1000000;
            const result = await deductMemberCredit(testMemberId, deductAmount);
            expect(result.success).toBe(true);
            expect(result.newBalance).toBe(4000000);
            expect(result.error).toBeUndefined();
            // Verify in database
            const memberResult = await db.query('SELECT credit_balance FROM members WHERE id = $1', [testMemberId]);
            expect(Number(memberResult.rows[0].credit_balance)).toBe(4000000);
        });
        it('should prevent deduction with insufficient balance', async () => {
            const deductAmount = 10000000;
            const result = await deductMemberCredit(testMemberId, deductAmount);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Insufficient credit balance');
            // Verify balance unchanged
            const memberResult = await db.query('SELECT credit_balance FROM members WHERE id = $1', [testMemberId]);
            expect(Number(memberResult.rows[0].credit_balance)).toBe(5000000);
        });
        it('should handle multiple sequential deductions', async () => {
            // First deduction
            const result1 = await deductMemberCredit(testMemberId, 1000000);
            expect(result1.success).toBe(true);
            expect(result1.newBalance).toBe(4000000);
            // Second deduction
            const result2 = await deductMemberCredit(testMemberId, 1000000);
            expect(result2.success).toBe(true);
            expect(result2.newBalance).toBe(3000000);
            // Verify final balance
            const memberResult = await db.query('SELECT credit_balance FROM members WHERE id = $1', [testMemberId]);
            expect(Number(memberResult.rows[0].credit_balance)).toBe(3000000);
        });
        it('should be atomic (all or nothing)', async () => {
            const initialBalance = 5000000;
            const deductAmount = 10000000; // More than available
            // Attempt deduction that should fail
            const result = await deductMemberCredit(testMemberId, deductAmount);
            expect(result.success).toBe(false);
            // Verify balance wasn't partially deducted
            const memberResult = await db.query('SELECT credit_balance FROM members WHERE id = $1', [testMemberId]);
            expect(Number(memberResult.rows[0].credit_balance)).toBe(initialBalance);
        });
    });
    describe('Member Credit Payment - Property-Based Tests', () => {
        it('should maintain credit balance conservation on successful deduction', async () => {
            // Test that total credits in system don't disappear
            await db.query('UPDATE members SET credit_balance = $1 WHERE id = $2', ['5000000', testMemberId]);
            const beforeResult = await db.query('SELECT SUM(CAST(credit_balance AS DECIMAL)) as total FROM members');
            const totalBefore = beforeResult.rows[0].total;
            await deductMemberCredit(testMemberId, 1000000);
            const afterResult = await db.query('SELECT SUM(CAST(credit_balance AS DECIMAL)) as total FROM members');
            const totalAfter = afterResult.rows[0].total;
            // Total should decrease by exactly the deducted amount
            expect(totalBefore - totalAfter).toBeCloseTo(1000000, 0);
        });
        it('should ensure credit never goes negative', async () => {
            // Create test values
            const testCases = [100, 500, 1000, 5000, 10000];
            for (const amount of testCases) {
                // Reset balance
                await db.query('UPDATE members SET credit_balance = $1 WHERE id = $2', ['100000', testMemberId]);
                // Try to deduct various amounts
                const result = await deductMemberCredit(testMemberId, amount);
                // Get final balance
                const memberResult = await db.query('SELECT credit_balance FROM members WHERE id = $1', [testMemberId]);
                const finalBalance = Number(memberResult.rows[0].credit_balance);
                // Balance should never be negative
                expect(finalBalance).toBeGreaterThanOrEqual(0);
                if (result.success) {
                    // If successful, new balance should be between 0 and initial
                    expect(finalBalance).toBeLessThanOrEqual(100000);
                }
                else {
                    // If failed, balance should be unchanged
                    expect(finalBalance).toBe(100000);
                }
            }
        });
        it('should handle boundary condition: exact amount equals balance', async () => {
            // Set balance to exact test amount
            const testAmount = 2500000;
            await db.query('UPDATE members SET credit_balance = $1 WHERE id = $2', [testAmount.toString(), testMemberId]);
            // Deduct exactly the balance
            const result = await deductMemberCredit(testMemberId, testAmount);
            expect(result.success).toBe(true);
            expect(result.newBalance).toBe(0);
            // Verify balance is exactly zero
            const memberResult = await db.query('SELECT credit_balance FROM members WHERE id = $1', [testMemberId]);
            expect(Number(memberResult.rows[0].credit_balance)).toBe(0);
        });
    });
});
//# sourceMappingURL=transaction.test.js.map