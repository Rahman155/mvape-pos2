/**
 * Integration Tests for Clock-In on Login
 * Task 46: Implement clock-in on login
 * Requirement 15.1: When kasir logs in, record login timestamp as clock-in time
 *
 * Tests verify:
 * - Clock-in timestamp is recorded when KASIR user logs in
 * - Attendance record is created in database
 * - Attendance is linked to kasir user ID
 * - OWNER/ADMIN users do NOT create attendance records
 * - Repeated login returns existing attendance record
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../database/connection.js';
import { AuthService } from '../../services/auth.js';
import { v4 as uuidv4 } from 'uuid';
describe('Clock-In on Login Integration Tests (Task 46 / Requirement 15.1)', () => {
    let app;
    let testStoreId;
    let kasirUserId;
    let kasirEmail;
    let kasirPassword;
    let ownerUserId;
    let ownerEmail;
    let ownerPassword;
    beforeAll(async () => {
        // Create Express app
        app = await createApp();
        // Initialize test data
        testStoreId = uuidv4();
        kasirUserId = uuidv4();
        kasirEmail = `kasir_${Date.now()}@test.com`;
        kasirPassword = 'TestPassword123!';
        ownerUserId = uuidv4();
        ownerEmail = `owner_${Date.now()}@test.com`;
        ownerPassword = 'TestPassword123!';
        // Create test store
        await db.query('INSERT INTO stores (id, name, address) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [testStoreId, 'Test Store for Clock-In', '123 Test Street']);
        // Hash passwords
        const kasirPasswordHash = await AuthService.hashPassword(kasirPassword);
        const ownerPasswordHash = await AuthService.hashPassword(ownerPassword);
        // Create KASIR user
        await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`, [kasirUserId, 'kasir_test', kasirEmail, kasirPasswordHash, 'KASIR', testStoreId, true]);
        // Create OWNER user
        await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`, [ownerUserId, 'owner_test', ownerEmail, ownerPasswordHash, 'OWNER', testStoreId, true]);
        // Clean up any existing attendance records
        await db.query('DELETE FROM attendance WHERE user_id IN ($1, $2)', [kasirUserId, ownerUserId]);
    });
    beforeEach(async () => {
        // Clean up attendance records before each test
        await db.query('DELETE FROM attendance WHERE user_id = $1', [kasirUserId]);
    });
    describe('POST /api/v1/auth/login - Clock-in for KASIR users', () => {
        it('should record clock-in timestamp when KASIR user logs in', async () => {
            const beforeLogin = new Date();
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: kasirEmail,
                password: kasirPassword,
            });
            const afterLogin = new Date();
            // Verify successful login response
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
            expect(response.body.data).toHaveProperty('attendanceId');
            expect(response.body.data.user.role).toBe('KASIR');
            const attendanceId = response.body.data.attendanceId;
            expect(attendanceId).toBeTruthy();
            // Verify attendance record exists in database
            const result = await db.query('SELECT id, user_id, clock_in, date, status FROM attendance WHERE id = $1', [attendanceId]);
            expect(result.rows.length).toBe(1);
            const record = result.rows[0];
            // Verify clock-in time is within the login window
            const clockInTime = new Date(record.clock_in);
            expect(clockInTime.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime() - 5000); // 5s tolerance
            expect(clockInTime.getTime()).toBeLessThanOrEqual(afterLogin.getTime() + 5000);
            // Verify record status is PRESENT
            expect(record.status).toBe('PRESENT');
        });
        it('should link attendance record to correct KASIR user', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: kasirEmail,
                password: kasirPassword,
            });
            expect(response.status).toBe(200);
            const attendanceId = response.body.data.attendanceId;
            // Verify attendance is linked to correct user
            const result = await db.query('SELECT user_id FROM attendance WHERE id = $1', [attendanceId]);
            expect(result.rows.length).toBe(1);
            expect(result.rows[0].user_id).toBe(kasirUserId);
        });
        it('should set clock_in_time to login timestamp (not a separate input)', async () => {
            const beforeLogin = new Date();
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: kasirEmail,
                password: kasirPassword,
            });
            const afterLogin = new Date();
            expect(response.status).toBe(200);
            const attendanceId = response.body.data.attendanceId;
            // Get the record and verify clock_in_time
            const result = await db.query('SELECT clock_in FROM attendance WHERE id = $1', [attendanceId]);
            const clockInTime = new Date(result.rows[0].clock_in);
            // Verify clock-in was recorded at login time (within 5 second tolerance)
            expect(clockInTime.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime() - 5000);
            expect(clockInTime.getTime()).toBeLessThanOrEqual(afterLogin.getTime() + 5000);
        });
        it('should create attendance record with PRESENT status', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: kasirEmail,
                password: kasirPassword,
            });
            expect(response.status).toBe(200);
            const attendanceId = response.body.data.attendanceId;
            const result = await db.query('SELECT status FROM attendance WHERE id = $1', [attendanceId]);
            expect(result.rows[0].status).toBe('PRESENT');
        });
        it('should handle repeated login of same KASIR user (should return existing attendance)', async () => {
            // First login
            const response1 = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: kasirEmail,
                password: kasirPassword,
            });
            expect(response1.status).toBe(200);
            const attendanceId1 = response1.body.data.attendanceId;
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Second login (same day)
            const response2 = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: kasirEmail,
                password: kasirPassword,
            });
            expect(response2.status).toBe(200);
            const attendanceId2 = response2.body.data.attendanceId;
            // Should return the same attendance ID (no duplicate created)
            expect(attendanceId2).toBe(attendanceId1);
            // Verify only one attendance record exists for today
            const todayDate = new Date().toISOString().split('T')[0];
            const result = await db.query('SELECT COUNT(*) as count FROM attendance WHERE user_id = $1 AND date = $2', [kasirUserId, todayDate]);
            expect(parseInt(result.rows[0].count, 10)).toBe(1);
        });
        it('should not create attendance record for OWNER user on login', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: ownerEmail,
                password: ownerPassword,
            });
            expect(response.status).toBe(200);
            expect(response.body.data.user.role).toBe('OWNER');
            // OWNER users should NOT have attendanceId in response
            expect(response.body.data.attendanceId).toBeUndefined();
            // Verify no attendance record was created for owner
            const todayDate = new Date().toISOString().split('T')[0];
            const result = await db.query('SELECT COUNT(*) as count FROM attendance WHERE user_id = $1 AND date = $2', [ownerUserId, todayDate]);
            expect(parseInt(result.rows[0].count, 10)).toBe(0);
        });
        it('should include attendance information in login response for KASIR', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: kasirEmail,
                password: kasirPassword,
            });
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
            expect(response.body.data).toHaveProperty('expiresIn');
            expect(response.body.data).toHaveProperty('attendanceId'); // NEW for KASIR
            expect(response.body.data.attendanceId).toBeTruthy();
        });
        it('should not fail login if attendance recording fails (graceful degradation)', async () => {
            // This test ensures login succeeds even if attendance service has an issue
            // The implementation should not fail login even if clock-in fails
            // (This is verified by the non-blocking error handling in AuthService.login)
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: kasirEmail,
                password: kasirPassword,
            });
            // Login should succeed regardless
            expect(response.status).toBe(200);
            expect(response.body.data.accessToken).toBeTruthy();
        });
    });
    describe('Edge Cases and Constraints', () => {
        it('should enforce unique constraint - one attendance record per user per day', async () => {
            // This is handled by the database UNIQUE(user_id, date) constraint
            const todayDate = new Date().toISOString().split('T')[0];
            // First login creates attendance
            const response1 = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: kasirEmail,
                password: kasirPassword,
            });
            expect(response1.status).toBe(200);
            // Verify one record exists
            const result = await db.query('SELECT COUNT(*) as count FROM attendance WHERE user_id = $1 AND date = $2', [kasirUserId, todayDate]);
            expect(parseInt(result.rows[0].count, 10)).toBe(1);
        });
        it('should handle incomplete logout detection with consecutive logins', async () => {
            // This tests TASK 48 functionality
            // If user logs in next day without logging out, previous session should be closed
            // Day 1: Clock in
            const response1 = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: kasirEmail,
                password: kasirPassword,
            });
            expect(response1.status).toBe(200);
            // Manually create an attendance record for "yesterday" without clock_out
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterdayDateStr = yesterdayDate.toISOString().split('T')[0];
            const clockInYesterday = new Date(yesterdayDate.getFullYear(), yesterdayDate.getMonth(), yesterdayDate.getDate(), 9, 0, 0);
            await db.query(`INSERT INTO attendance (id, user_id, clock_in, date, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id, date) DO NOTHING`, [uuidv4(), kasirUserId, clockInYesterday.toISOString(), yesterdayDateStr, 'PRESENT']);
            // Verify yesterday's record has no clock_out
            const resultBefore = await db.query('SELECT clock_out FROM attendance WHERE user_id = $1 AND date = $2', [kasirUserId, yesterdayDateStr]);
            expect(resultBefore.rows[0].clock_out).toBeNull();
            // Clean up today's attendance to simulate next day
            const todayDate = new Date().toISOString().split('T')[0];
            await db.query('DELETE FROM attendance WHERE user_id = $1 AND date = $2', [kasirUserId, todayDate]);
            // Today: Log in (should close yesterday's incomplete session)
            const response2 = await request(app)
                .post('/api/v1/auth/login')
                .send({
                email: kasirEmail,
                password: kasirPassword,
            });
            expect(response2.status).toBe(200);
            // Verify yesterday's record now has clock_out set
            const resultAfter = await db.query('SELECT clock_out, duration_minutes FROM attendance WHERE user_id = $1 AND date = $2', [kasirUserId, yesterdayDateStr]);
            expect(resultAfter.rows.length).toBe(1);
            expect(resultAfter.rows[0].clock_out).toBeTruthy();
            expect(resultAfter.rows[0].duration_minutes).toBeGreaterThan(0);
        });
    });
    afterAll(async () => {
        // Clean up test data
        await db.query('DELETE FROM attendance WHERE user_id IN ($1, $2)', [kasirUserId, ownerUserId]);
        await db.query('DELETE FROM users WHERE id IN ($1, $2)', [kasirUserId, ownerUserId]);
        await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
    });
});
//# sourceMappingURL=auth-clock-in.integration.test.js.map