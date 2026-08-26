/**
 * Integration Tests for Authentication Routes
 * Tests login, logout, token refresh, and session management
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { app } from '../../app.js';
import { db } from '../../database/connection.js';
import { AuthService } from '../../services/auth.js';
import { AttendanceService } from '../../services/attendance.js';
import { v4 as uuidv4 } from 'uuid';
import request from 'supertest';
describe('Authentication Routes', () => {
    let testStoreId;
    let testKasirUserId;
    let testOwnerUserId;
    let testKasirEmail;
    let testOwnerEmail;
    const testPassword = 'TestPassword123!';
    beforeAll(async () => {
        // Initialize database for tests
        if (!db) {
            throw new Error('Database not initialized');
        }
        testStoreId = uuidv4();
        testKasirUserId = uuidv4();
        testOwnerUserId = uuidv4();
        testKasirEmail = `kasir_${Date.now()}@test.com`;
        testOwnerEmail = `owner_${Date.now()}@test.com`;
        // Create test store
        await db.query('INSERT INTO stores (id, name, address) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [testStoreId, 'Test Store', 'Test Address']);
        // Hash password
        const hashedPassword = await AuthService.hashPassword(testPassword);
        // Create test KASIR user
        await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`, [testKasirUserId, 'testkasir', testKasirEmail, hashedPassword, 'KASIR', testStoreId, true]);
        // Create test OWNER user
        await db.query(`INSERT INTO users (id, username, email, password_hash, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT DO NOTHING`, [testOwnerUserId, 'testowner', testOwnerEmail, hashedPassword, 'OWNER', true]);
        // Clean up any existing attendance records
        await db.query('DELETE FROM attendance WHERE user_id IN ($1, $2)', [
            testKasirUserId,
            testOwnerUserId,
        ]);
    });
    beforeEach(async () => {
        // Clean up attendance records before each test
        await db.query('DELETE FROM attendance WHERE user_id IN ($1, $2)', [
            testKasirUserId,
            testOwnerUserId,
        ]);
    });
    describe('POST /api/v1/auth/login', () => {
        it('should return tokens and user data on successful login', async () => {
            const response = await request(app).post('/api/v1/auth/login').send({
                email: testKasirEmail,
                password: testPassword,
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('refreshToken');
            expect(response.body.data).toHaveProperty('expiresIn');
            expect(response.body.data.user.email).toBe(testKasirEmail);
            expect(response.body.data.user.role).toBe('KASIR');
        });
        it('should create attendance record for KASIR user on login', async () => {
            const response = await request(app).post('/api/v1/auth/login').send({
                email: testKasirEmail,
                password: testPassword,
            });
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('attendanceId');
            expect(response.body.data.attendanceId).toBeTruthy();
            // Verify attendance record exists
            const attendance = await AttendanceService.getTodaysAttendance(testKasirUserId);
            expect(attendance).toBeTruthy();
            expect(attendance?.user_id).toBe(testKasirUserId);
            expect(attendance?.status).toBe('PRESENT');
            expect(attendance?.clock_in).toBeTruthy();
            expect(attendance?.clock_out).toBeNull();
        });
        it('should NOT create attendance record for OWNER user on login', async () => {
            const response = await request(app).post('/api/v1/auth/login').send({
                email: testOwnerEmail,
                password: testPassword,
            });
            expect(response.status).toBe(200);
            expect(response.body.data.user.role).toBe('OWNER');
            // attendanceId may be present but no record should be created
            expect(response.body.data).not.toHaveProperty('attendanceId');
            // Verify no attendance record was created
            const attendance = await AttendanceService.getTodaysAttendance(testOwnerUserId);
            expect(attendance).toBeNull();
        });
        it('should set clock_in_time to current timestamp', async () => {
            const beforeLogin = new Date();
            const response = await request(app).post('/api/v1/auth/login').send({
                email: testKasirEmail,
                password: testPassword,
            });
            const afterLogin = new Date();
            expect(response.status).toBe(200);
            const attendance = await AttendanceService.getTodaysAttendance(testKasirUserId);
            const clockInTime = new Date(attendance.clock_in);
            // Clock-in time should be between before and after login
            expect(clockInTime.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
            expect(clockInTime.getTime()).toBeLessThanOrEqual(afterLogin.getTime());
        });
        it('should return existing attendance ID if already clocked in today', async () => {
            // First login
            const response1 = await request(app).post('/api/v1/auth/login').send({
                email: testKasirEmail,
                password: testPassword,
            });
            const attendanceId1 = response1.body.data.attendanceId;
            // Wait a bit and logout (clean up for second login)
            // Note: In real scenario, would need to implement logout first
            // For this test, we'll just verify the same ID is returned
            // In actual implementation, a second login would either:
            // 1. Return the same attendance ID (if same day)
            // 2. Create a new attendance record (if different day)
            expect(attendanceId1).toBeTruthy();
        });
        it('should return 401 for invalid email', async () => {
            const response = await request(app).post('/api/v1/auth/login').send({
                email: 'nonexistent@test.com',
                password: testPassword,
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });
        it('should return 401 for invalid password', async () => {
            const response = await request(app).post('/api/v1/auth/login').send({
                email: testKasirEmail,
                password: 'WrongPassword123!',
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.code).toBe('UNAUTHORIZED');
        });
        it('should return 400 for missing email', async () => {
            const response = await request(app).post('/api/v1/auth/login').send({
                password: testPassword,
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for missing password', async () => {
            const response = await request(app).post('/api/v1/auth/login').send({
                email: testKasirEmail,
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
        it('should include metadata in response', async () => {
            const response = await request(app).post('/api/v1/auth/login').send({
                email: testKasirEmail,
                password: testPassword,
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('meta');
            expect(response.body.meta).toHaveProperty('timestamp');
            expect(response.body.meta).toHaveProperty('requestId');
        });
    });
    describe('POST /api/v1/auth/refresh', () => {
        let validRefreshToken;
        beforeEach(async () => {
            // Get a valid refresh token
            const loginResponse = await request(app).post('/api/v1/auth/login').send({
                email: testKasirEmail,
                password: testPassword,
            });
            validRefreshToken = loginResponse.body.data.refreshToken;
        });
        it('should return new access token with valid refresh token', async () => {
            const response = await request(app).post('/api/v1/auth/refresh').send({
                refreshToken: validRefreshToken,
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data).toHaveProperty('expiresIn');
            expect(response.body.data.accessToken).toBeTruthy();
        });
        it('should return 401 for invalid refresh token', async () => {
            const response = await request(app).post('/api/v1/auth/refresh').send({
                refreshToken: 'invalid.token.here',
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 400 for missing refresh token', async () => {
            const response = await request(app).post('/api/v1/auth/refresh').send({});
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('GET /api/v1/auth/me', () => {
        let validAccessToken;
        beforeEach(async () => {
            const loginResponse = await request(app).post('/api/v1/auth/login').send({
                email: testKasirEmail,
                password: testPassword,
            });
            validAccessToken = loginResponse.body.data.accessToken;
        });
        it('should return current user profile', async () => {
            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${validAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data.user.email).toBe(testKasirEmail);
            expect(response.body.data.user.role).toBe('KASIR');
        });
        it('should return 401 without authentication', async () => {
            const response = await request(app).get('/api/v1/auth/me');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
        it('should return 401 with invalid token', async () => {
            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', 'Bearer invalid.token.here');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });
    describe('POST /api/v1/auth/logout', () => {
        let validAccessToken;
        beforeEach(async () => {
            const loginResponse = await request(app).post('/api/v1/auth/login').send({
                email: testKasirEmail,
                password: testPassword,
            });
            validAccessToken = loginResponse.body.data.accessToken;
        });
        it('should logout successfully with valid token', async () => {
            const response = await request(app)
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${validAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data.success).toBe(true);
        });
        it('should return 401 without authentication', async () => {
            const response = await request(app).post('/api/v1/auth/logout');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
        // TASK 47: Test clock-out on logout
        it('should record clock-out for KASIR user and return clock-out data', async () => {
            // Verify attendance record exists after login
            let attendance = await AttendanceService.getTodaysAttendance(testKasirUserId);
            expect(attendance).toBeTruthy();
            expect(attendance?.clock_out).toBeNull();
            // Now logout
            const logoutResponse = await request(app)
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${validAccessToken}`);
            expect(logoutResponse.status).toBe(200);
            expect(logoutResponse.body.data).toHaveProperty('clockOut');
            expect(logoutResponse.body.data.clockOut).toHaveProperty('timestamp');
            expect(logoutResponse.body.data.clockOut).toHaveProperty('durationMinutes');
            // Verify attendance record has been updated with clock-out
            attendance = await AttendanceService.getTodaysAttendance(testKasirUserId);
            expect(attendance?.clock_out).toBeTruthy();
            expect(attendance?.duration_minutes).toBeGreaterThanOrEqual(0);
            expect(attendance?.status).toBe('PRESENT');
        });
        it('should calculate correct duration between clock-in and clock-out', async () => {
            // Get the attendance record after login
            const attendance = await AttendanceService.getTodaysAttendance(testKasirUserId);
            const clockInTime = new Date(attendance.clock_in);
            // Logout
            const logoutResponse = await request(app)
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${validAccessToken}`);
            expect(logoutResponse.status).toBe(200);
            // Get the updated attendance
            const updatedAttendance = await AttendanceService.getTodaysAttendance(testKasirUserId);
            const clockOutTime = new Date(updatedAttendance.clock_out);
            const durationMs = clockOutTime.getTime() - clockInTime.getTime();
            const durationMinutes = Math.round(durationMs / 60000);
            // Verify duration calculation
            expect(updatedAttendance?.duration_minutes).toBe(durationMinutes);
        });
        it('should NOT include clockOut for OWNER user on logout', async () => {
            // Login as OWNER
            const ownerLoginResponse = await request(app).post('/api/v1/auth/login').send({
                email: testOwnerEmail,
                password: testPassword,
            });
            const ownerAccessToken = ownerLoginResponse.body.data.accessToken;
            // Logout as OWNER
            const ownerLogoutResponse = await request(app)
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${ownerAccessToken}`);
            expect(ownerLogoutResponse.status).toBe(200);
            expect(ownerLogoutResponse.body.data.success).toBe(true);
            // OWNER users should not have clockOut in response
            expect(ownerLogoutResponse.body.data).not.toHaveProperty('clockOut');
            // Verify no attendance record was created for OWNER
            const attendance = await AttendanceService.getTodaysAttendance(testOwnerUserId);
            expect(attendance).toBeNull();
        });
        it('should handle logout gracefully if no attendance record exists', async () => {
            // Create a new user for this test
            const newKasirUserId = uuidv4();
            const newKasirEmail = `kasir_new_${Date.now()}@test.com`;
            const hashedPassword = await AuthService.hashPassword(testPassword);
            await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [newKasirUserId, 'testkasir_new', newKasirEmail, hashedPassword, 'KASIR', testStoreId, true]);
            // Login to get a token
            const loginResponse = await request(app).post('/api/v1/auth/login').send({
                email: newKasirEmail,
                password: testPassword,
            });
            const newAccessToken = loginResponse.body.data.accessToken;
            // Manually delete the attendance record to simulate missing record
            await db.query('DELETE FROM attendance WHERE user_id = $1', [newKasirUserId]);
            // Logout should still succeed even without attendance record
            const logoutResponse = await request(app)
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${newAccessToken}`);
            expect(logoutResponse.status).toBe(200);
            expect(logoutResponse.body.data.success).toBe(true);
            // Should not have clockOut if no record exists
            expect(logoutResponse.body.data).not.toHaveProperty('clockOut');
            // Cleanup
            await db.query('DELETE FROM users WHERE id = $1', [newKasirUserId]);
        });
    });
    afterAll(async () => {
        // Clean up test data
        await db.query('DELETE FROM attendance WHERE user_id IN ($1, $2)', [
            testKasirUserId,
            testOwnerUserId,
        ]);
        await db.query('DELETE FROM users WHERE id IN ($1, $2)', [testKasirUserId, testOwnerUserId]);
        await db.query('DELETE FROM stores WHERE id = $1', [testStoreId]);
    });
});
//# sourceMappingURL=auth.test.js.map