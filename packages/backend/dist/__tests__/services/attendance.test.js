/**
 * Unit and Integration Tests for Attendance Service
 * Tests clock-in/clock-out functionality for kasir users
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AttendanceService } from '../../services/attendance.js';
import { db } from '../../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
describe('Attendance Service', () => {
    let testUserId;
    let testStoreId;
    let testDate;
    beforeAll(async () => {
        // Initialize database for tests
        if (!db) {
            throw new Error('Database not initialized');
        }
    });
    beforeEach(async () => {
        // Set up test data
        testUserId = uuidv4();
        testStoreId = uuidv4();
        testDate = new Date();
        // Create test store
        await db.query('INSERT INTO stores (id, name, address) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [testStoreId, 'Test Store', 'Test Address']);
        // Create test kasir user
        await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       ON CONFLICT DO NOTHING`, [
            testUserId,
            'testkasir_' + Math.random().toString(36).substring(7),
            'testkasir_' + Math.random().toString(36).substring(7) + '@test.com',
            'hashed_password',
            'KASIR',
            testStoreId,
            true,
        ]);
        // Clean up any existing attendance records for this test user
        await db.query('DELETE FROM attendance WHERE user_id = $1', [testUserId]);
    });
    describe('clockIn', () => {
        it('should record clock-in timestamp for kasir user', async () => {
            const clockInTime = new Date();
            const response = await AttendanceService.clockIn({
                userId: testUserId,
                storeId: testStoreId,
                clockInTime,
            });
            expect(response).toHaveProperty('attendanceId');
            expect(response).toHaveProperty('userId', testUserId);
            expect(response).toHaveProperty('clockInTime');
            expect(response).toHaveProperty('date');
            expect(response.userId).toBe(testUserId);
            // Verify record in database
            const record = await AttendanceService.getTodaysAttendance(testUserId, clockInTime);
            expect(record).toBeTruthy();
            expect(record?.user_id).toBe(testUserId);
            expect(record?.status).toBe('PRESENT');
            expect(record?.clock_out).toBeNull();
        });
        it('should link attendance to correct user', async () => {
            const clockInTime = new Date();
            await AttendanceService.clockIn({
                userId: testUserId,
                storeId: testStoreId,
                clockInTime,
            });
            const record = await AttendanceService.getTodaysAttendance(testUserId, clockInTime);
            expect(record?.user_id).toBe(testUserId);
        });
        it('should set clock_in_time to current time', async () => {
            const clockInTime = new Date('2024-01-15T09:00:00Z');
            const response = await AttendanceService.clockIn({
                userId: testUserId,
                storeId: testStoreId,
                clockInTime,
            });
            const record = await AttendanceService.getTodaysAttendance(testUserId, clockInTime);
            expect(new Date(record.clock_in).getTime()).toBeCloseTo(clockInTime.getTime(), 0);
        });
        it('should create attendance record with PRESENT status', async () => {
            const clockInTime = new Date();
            await AttendanceService.clockIn({
                userId: testUserId,
                storeId: testStoreId,
                clockInTime,
            });
            const record = await AttendanceService.getTodaysAttendance(testUserId, clockInTime);
            expect(record?.status).toBe('PRESENT');
        });
        it('should return existing attendance record if already clocked in today', async () => {
            const clockInTime = new Date();
            // First clock-in
            const response1 = await AttendanceService.clockIn({
                userId: testUserId,
                storeId: testStoreId,
                clockInTime,
            });
            // Second clock-in (same day)
            const response2 = await AttendanceService.clockIn({
                userId: testUserId,
                storeId: testStoreId,
                clockInTime: new Date(clockInTime.getTime() + 30000), // 30 seconds later
            });
            // Should return same attendance ID
            expect(response2.attendanceId).toBe(response1.attendanceId);
        });
        it('should not record attendance for non-KASIR users', async () => {
            // Create an OWNER user
            const ownerUserId = uuidv4();
            await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                ownerUserId,
                'testowner_' + Math.random().toString(36).substring(7),
                'testowner_' + Math.random().toString(36).substring(7) + '@test.com',
                'hashed_password',
                'OWNER',
                testStoreId,
                true,
            ]);
            // Attempt to clock in as OWNER
            const response = await AttendanceService.clockIn({
                userId: ownerUserId,
                storeId: testStoreId,
            });
            // Should still return a response but not create a record
            const record = await AttendanceService.getTodaysAttendance(ownerUserId);
            expect(record).toBeNull();
        });
        it('should throw error for non-existent user', async () => {
            const fakeUserId = uuidv4();
            await expect(AttendanceService.clockIn({
                userId: fakeUserId,
                storeId: testStoreId,
            })).rejects.toThrow();
        });
        // TASK 48: Test incomplete clock-out detection
        describe('Incomplete Clock-out Detection (TASK 48)', () => {
            it('should detect incomplete session from previous day', async () => {
                const previousDay = new Date();
                previousDay.setDate(previousDay.getDate() - 1);
                const clockInTime = previousDay;
                const clockInTime2 = new Date();
                // Clock in on previous day
                await AttendanceService.clockIn({
                    userId: testUserId,
                    storeId: testStoreId,
                    clockInTime,
                });
                // Verify previous day record exists without clock_out
                const previousRecord = await AttendanceService.getTodaysAttendance(testUserId, previousDay);
                expect(previousRecord).toBeTruthy();
                expect(previousRecord?.clock_out).toBeNull();
                // Clock in on new day
                await AttendanceService.clockIn({
                    userId: testUserId,
                    storeId: testStoreId,
                    clockInTime: clockInTime2,
                });
                // Verify previous day record now has clock_out set to current clock_in time
                const updatedPreviousRecord = await AttendanceService.getTodaysAttendance(testUserId, previousDay);
                expect(updatedPreviousRecord?.clock_out).toBeTruthy();
                expect(updatedPreviousRecord?.duration_minutes).toBeGreaterThan(0);
                expect(updatedPreviousRecord?.status).toBe('PRESENT');
            });
            it('should calculate correct duration for completed incomplete session', async () => {
                const previousDay = new Date();
                previousDay.setDate(previousDay.getDate() - 1);
                const clockInTime = new Date(previousDay.getFullYear(), previousDay.getMonth(), previousDay.getDate(), 9, 0, 0);
                const clockInTime2 = new Date(previousDay.getFullYear(), previousDay.getMonth(), previousDay.getDate() + 1, 17, 0, 0);
                // Clock in on previous day at 9:00 AM
                await AttendanceService.clockIn({
                    userId: testUserId,
                    storeId: testStoreId,
                    clockInTime,
                });
                // Clock in on new day at 5:00 PM (32 hours later)
                await AttendanceService.clockIn({
                    userId: testUserId,
                    storeId: testStoreId,
                    clockInTime: clockInTime2,
                });
                // Verify duration is 32 hours
                const previousRecord = await AttendanceService.getTodaysAttendance(testUserId, clockInTime);
                expect(previousRecord?.duration_minutes).toBe(32 * 60); // 1920 minutes
            });
            it('should handle multiple consecutive logins without logout', async () => {
                const date1 = new Date('2024-01-15T09:00:00Z');
                const date2 = new Date('2024-01-16T09:00:00Z');
                const date3 = new Date('2024-01-17T09:00:00Z');
                // Day 1: Clock in
                await AttendanceService.clockIn({
                    userId: testUserId,
                    storeId: testStoreId,
                    clockInTime: date1,
                });
                // Day 2: Clock in (should close day 1)
                await AttendanceService.clockIn({
                    userId: testUserId,
                    storeId: testStoreId,
                    clockInTime: date2,
                });
                // Day 3: Clock in (should close day 2)
                await AttendanceService.clockIn({
                    userId: testUserId,
                    storeId: testStoreId,
                    clockInTime: date3,
                });
                // Verify all previous days are closed
                const day1 = await AttendanceService.getTodaysAttendance(testUserId, date1);
                expect(day1?.clock_out).toBeTruthy();
                expect(day1?.duration_minutes).toBe(24 * 60); // 24 hours
                const day2 = await AttendanceService.getTodaysAttendance(testUserId, date2);
                expect(day2?.clock_out).toBeTruthy();
                expect(day2?.duration_minutes).toBe(24 * 60); // 24 hours
            });
        });
    });
    describe('clockOut', () => {
        it('should record clock-out timestamp', async () => {
            const clockInTime = new Date('2024-01-15T09:00:00Z');
            const clockOutTime = new Date('2024-01-15T17:00:00Z');
            // First clock in
            await AttendanceService.clockIn({
                userId: testUserId,
                storeId: testStoreId,
                clockInTime,
            });
            // Then clock out
            const record = await AttendanceService.clockOut(testUserId, clockOutTime);
            expect(record.clock_out).toBeTruthy();
            expect(new Date(record.clock_out).getTime()).toBeCloseTo(clockOutTime.getTime(), 0);
        });
        it('should calculate duration in minutes', async () => {
            const clockInTime = new Date('2024-01-15T09:00:00Z');
            const clockOutTime = new Date('2024-01-15T17:30:00Z'); // 8.5 hours = 510 minutes
            await AttendanceService.clockIn({
                userId: testUserId,
                storeId: testStoreId,
                clockInTime,
            });
            const record = await AttendanceService.clockOut(testUserId, clockOutTime);
            expect(record.duration_minutes).toBe(510);
        });
        it('should set status to PRESENT after clock-out', async () => {
            const clockInTime = new Date();
            const clockOutTime = new Date(clockInTime.getTime() + 3600000); // 1 hour later
            await AttendanceService.clockIn({
                userId: testUserId,
                storeId: testStoreId,
                clockInTime,
            });
            const record = await AttendanceService.clockOut(testUserId, clockOutTime);
            expect(record.status).toBe('PRESENT');
        });
        it('should throw error if no clock-in record found', async () => {
            const clockOutTime = new Date();
            await expect(AttendanceService.clockOut(testUserId, clockOutTime)).rejects.toThrow('No attendance record found');
        });
        // TASK 47: Test clock-out on logout
        it('should handle multiple consecutive clock-out scenarios', async () => {
            const clockInTime = new Date('2024-01-15T09:00:00Z');
            const clockOutTime = new Date('2024-01-15T17:00:00Z');
            await AttendanceService.clockIn({
                userId: testUserId,
                storeId: testStoreId,
                clockInTime,
            });
            const firstClockOut = await AttendanceService.clockOut(testUserId, clockOutTime);
            expect(firstClockOut.duration_minutes).toBe(480); // 8 hours
            // Verify record is properly closed
            const record = await AttendanceService.getTodaysAttendance(testUserId, clockInTime);
            expect(record?.clock_out).toBeTruthy();
            expect(record?.status).toBe('PRESENT');
        });
    });
    describe('getTodaysAttendance', () => {
        it('should return attendance record for today', async () => {
            const clockInTime = new Date();
            await AttendanceService.clockIn({
                userId: testUserId,
                storeId: testStoreId,
                clockInTime,
            });
            const record = await AttendanceService.getTodaysAttendance(testUserId, clockInTime);
            expect(record).toBeTruthy();
            expect(record?.user_id).toBe(testUserId);
        });
        it('should return null if no record exists', async () => {
            const record = await AttendanceService.getTodaysAttendance(testUserId, new Date());
            expect(record).toBeNull();
        });
        it('should return null for different dates', async () => {
            const clockInTime = new Date('2024-01-15T09:00:00Z');
            const otherDate = new Date('2024-01-14T09:00:00Z'); // Previous day
            await AttendanceService.clockIn({
                userId: testUserId,
                storeId: testStoreId,
                clockInTime,
            });
            const record = await AttendanceService.getTodaysAttendance(testUserId, otherDate);
            expect(record).toBeNull();
        });
    });
    describe('getAttendanceByPeriod', () => {
        beforeEach(async () => {
            // Create multiple attendance records
            const baseDate = new Date('2024-01-15T09:00:00Z');
            for (let i = 0; i < 5; i++) {
                const clockInTime = new Date(baseDate.getTime() + i * 86400000); // Each day
                await AttendanceService.clockIn({
                    userId: testUserId,
                    storeId: testStoreId,
                    clockInTime,
                });
            }
        });
        it('should return attendance records for period', async () => {
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-19');
            const { data, total } = await AttendanceService.getAttendanceByPeriod(testUserId, startDate, endDate);
            expect(total).toBeGreaterThan(0);
            expect(data.length).toBeGreaterThan(0);
        });
        it('should return all records when no userId filter', async () => {
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-19');
            const { data, total } = await AttendanceService.getAttendanceByPeriod(null, startDate, endDate);
            expect(total).toBeGreaterThan(0);
            expect(data.length).toBeGreaterThan(0);
        });
        it('should support pagination', async () => {
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-19');
            const { data: page1 } = await AttendanceService.getAttendanceByPeriod(testUserId, startDate, endDate, 2, 0);
            const { data: page2 } = await AttendanceService.getAttendanceByPeriod(testUserId, startDate, endDate, 2, 2);
            expect(page1.length).toBeLessThanOrEqual(2);
            expect(page2.length).toBeLessThanOrEqual(2);
        });
        // TASK 49: Test attendance viewing
        it('should include user details in attendance records', async () => {
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-19');
            const { data } = await AttendanceService.getAttendanceByPeriod(testUserId, startDate, endDate);
            expect(data.length).toBeGreaterThan(0);
            const record = data[0];
            expect(record.user_id).toBeDefined();
            expect(record.date).toBeDefined();
            expect(record.status).toBe('PRESENT');
        });
        // TASK 49: Test date filtering
        it('should properly filter records by date range', async () => {
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-16');
            const { data, total } = await AttendanceService.getAttendanceByPeriod(testUserId, startDate, endDate);
            expect(data.length).toBeGreaterThan(0);
            data.forEach(record => {
                const recordDate = new Date(record.date);
                expect(recordDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
                expect(recordDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
            });
        });
    });
    afterAll(async () => {
        // Clean up test data
        if (testUserId) {
            await db.query('DELETE FROM attendance WHERE user_id = $1', [testUserId]);
            await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
        }
    });
    // TASK 50: Monthly Attendance Report tests
    describe('getMonthlyReport', () => {
        let kasir1Id;
        let kasir2Id;
        beforeEach(async () => {
            // Create two kasir users for report testing
            kasir1Id = uuidv4();
            kasir2Id = uuidv4();
            // Create kasir users
            await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active, name) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                kasir1Id,
                'kasir1_' + Math.random().toString(36).substring(7),
                'kasir1_' + Math.random().toString(36).substring(7) + '@test.com',
                'hashed_password',
                'KASIR',
                testStoreId,
                true,
                'Kasir One',
            ]);
            await db.query(`INSERT INTO users (id, username, email, password_hash, role, store_id, is_active, name) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                kasir2Id,
                'kasir2_' + Math.random().toString(36).substring(7),
                'kasir2_' + Math.random().toString(36).substring(7) + '@test.com',
                'hashed_password',
                'KASIR',
                testStoreId,
                true,
                'Kasir Two',
            ]);
            // Create attendance records for January 2024
            // Kasir 1: 20 working days, 8 hours each = 160 hours total
            for (let i = 1; i <= 20; i++) {
                const clockIn = new Date('2024-01-' + String(i).padStart(2, '0') + 'T09:00:00Z');
                const clockOut = new Date(clockIn.getTime() + 8 * 60 * 60 * 1000); // 8 hours
                await db.query(`INSERT INTO attendance (id, user_id, clock_in, clock_out, duration_minutes, date, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, [uuidv4(), kasir1Id, clockIn, clockOut, 480, '2024-01-' + String(i).padStart(2, '0'), 'PRESENT']);
            }
            // Kasir 2: 15 working days, 8 hours each = 120 hours total
            for (let i = 1; i <= 15; i++) {
                const clockIn = new Date('2024-01-' + String(i).padStart(2, '0') + 'T08:00:00Z');
                const clockOut = new Date(clockIn.getTime() + 8 * 60 * 60 * 1000); // 8 hours
                await db.query(`INSERT INTO attendance (id, user_id, clock_in, clock_out, duration_minutes, date, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`, [uuidv4(), kasir2Id, clockIn, clockOut, 480, '2024-01-' + String(i).padStart(2, '0'), 'PRESENT']);
            }
        });
        it('should generate monthly report with all employees', async () => {
            const report = await AttendanceService.getMonthlyReport(2024, 1);
            expect(report).toHaveProperty('report');
            expect(report).toHaveProperty('summary');
            expect(report.report.length).toBeGreaterThanOrEqual(2);
        });
        it('should calculate correct total work days per employee', async () => {
            const report = await AttendanceService.getMonthlyReport(2024, 1);
            const kasir1 = report.report.find(r => r.userId === kasir1Id);
            const kasir2 = report.report.find(r => r.userId === kasir2Id);
            expect(kasir1?.totalWorkDays).toBe(20);
            expect(kasir2?.totalWorkDays).toBe(15);
        });
        it('should calculate correct total hours per employee', async () => {
            const report = await AttendanceService.getMonthlyReport(2024, 1);
            const kasir1 = report.report.find(r => r.userId === kasir1Id);
            const kasir2 = report.report.find(r => r.userId === kasir2Id);
            expect(kasir1?.totalHours).toBe(160); // 20 days * 8 hours
            expect(kasir2?.totalHours).toBe(120); // 15 days * 8 hours
        });
        it('should calculate correct average hours per day', async () => {
            const report = await AttendanceService.getMonthlyReport(2024, 1);
            const kasir1 = report.report.find(r => r.userId === kasir1Id);
            const kasir2 = report.report.find(r => r.userId === kasir2Id);
            expect(kasir1?.averageHoursPerDay).toBe(8);
            expect(kasir2?.averageHoursPerDay).toBe(8);
        });
        it('should include employee details in report', async () => {
            const report = await AttendanceService.getMonthlyReport(2024, 1);
            const kasir1 = report.report.find(r => r.userId === kasir1Id);
            expect(kasir1).toHaveProperty('userId');
            expect(kasir1).toHaveProperty('username');
            expect(kasir1).toHaveProperty('name');
            expect(kasir1?.name).toBe('Kasir One');
        });
        it('should calculate correct summary statistics', async () => {
            const report = await AttendanceService.getMonthlyReport(2024, 1);
            // Summary should have at least kasir1 and kasir2
            expect(report.summary.totalEmployees).toBeGreaterThanOrEqual(2);
            expect(report.summary.totalWorkDays).toBeGreaterThanOrEqual(35); // 20 + 15
            expect(report.summary.totalHoursWorked).toBeGreaterThanOrEqual(280); // 160 + 120
            expect(report.summary.averageHoursPerEmployee).toBeGreaterThan(0);
        });
        it('should throw error for invalid month', async () => {
            await expect(AttendanceService.getMonthlyReport(2024, 13)).rejects.toThrow('Invalid month');
            await expect(AttendanceService.getMonthlyReport(2024, 0)).rejects.toThrow('Invalid month');
        });
        it('should return zero values for month with no attendance', async () => {
            // Clean up all attendance records
            await db.query('DELETE FROM attendance WHERE user_id IN ($1, $2)', [kasir1Id, kasir2Id]);
            const report = await AttendanceService.getMonthlyReport(2024, 2);
            expect(report.report).toBeDefined();
            expect(report.summary.totalWorkDays).toBe(0);
            expect(report.summary.totalHoursWorked).toBe(0);
        });
        afterEach(async () => {
            // Clean up test users and their records
            await db.query('DELETE FROM attendance WHERE user_id IN ($1, $2)', [kasir1Id, kasir2Id]);
            await db.query('DELETE FROM users WHERE id IN ($1, $2)', [kasir1Id, kasir2Id]);
        });
    });
});
//# sourceMappingURL=attendance.test.js.map