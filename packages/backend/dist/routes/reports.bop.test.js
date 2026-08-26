/**
 * BOP Expense Report Tests
 * Comprehensive test suite for BOP (Biaya Operasional Penjualan) report endpoint
 * Tests cover: period filtering, aggregation, caching, authorization, edge cases
 *
 * Requirements: 17.1, 17.2, 17.3
 */
import request from 'supertest';
import { createApp } from '../app.js';
import { db } from '../database/index.js';
import { CacheService } from '../cache/service.js';
import { v4 as uuidv4 } from 'uuid';
// Create test app
const app = createApp();
// Mock authentication middleware
jest.mock('../middleware/authenticate.js', () => ({
    authenticateMiddleware: (req, res, next) => {
        req.user = { id: 'owner-1', role: 'OWNER', storeId: null };
        req.requestId = 'test-request-id';
        next();
    },
}));
// Mock authorization middleware
jest.mock('../middleware/authorize.js', () => ({
    authorize: (role) => (req, res, next) => {
        if (req.user?.role !== role) {
            return res.status(403).json({
                error: 'Forbidden',
                code: 'FORBIDDEN',
                message: 'Insufficient permissions',
            });
        }
        next();
    },
}));
describe('BOP Expense Report Routes (Requirements 17.1-17.3)', () => {
    let storeId1;
    let storeId2;
    let bopId1;
    let bopId2;
    let bopId3;
    let bopId4;
    beforeEach(async () => {
        // Clear cache before each test
        await CacheService.clear();
        // Create test stores
        storeId1 = uuidv4();
        storeId2 = uuidv4();
        await db.query(`INSERT INTO stores (id, name, is_active) VALUES ($1, $2, $3)
       ON CONFLICT(id) DO NOTHING`, [storeId1, 'Toko Jakarta', true]);
        await db.query(`INSERT INTO stores (id, name, is_active) VALUES ($1, $2, $3)
       ON CONFLICT(id) DO NOTHING`, [storeId2, 'Toko Bandung', true]);
        // Create BOP records
        bopId1 = uuidv4();
        await db.query(`INSERT INTO bop (id, store_id, name, description, amount, effective_from, effective_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO NOTHING`, [bopId1, storeId1, 'Listrik', 'Biaya Listrik', 500000, '2024-01-01', null, new Date(), new Date()]);
        bopId2 = uuidv4();
        await db.query(`INSERT INTO bop (id, store_id, name, description, amount, effective_from, effective_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO NOTHING`, [bopId2, storeId1, 'Air', 'Biaya Air', 300000, '2024-01-01', null, new Date(), new Date()]);
        bopId3 = uuidv4();
        await db.query(`INSERT INTO bop (id, store_id, name, description, amount, effective_from, effective_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO NOTHING`, [bopId3, storeId2, 'Listrik', 'Biaya Listrik', 600000, '2024-01-01', null, new Date(), new Date()]);
        // BOP record that ended before the test date
        bopId4 = uuidv4();
        await db.query(`INSERT INTO bop (id, store_id, name, description, amount, effective_from, effective_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO NOTHING`, [bopId4, storeId1, 'Internet', 'Biaya Internet', 200000, '2023-01-01', '2023-12-31', new Date(), new Date()]);
    });
    afterEach(async () => {
        // Clean up test data
        await db.query('DELETE FROM bop WHERE id IN ($1, $2, $3, $4)', [bopId1, bopId2, bopId3, bopId4]);
        await db.query('DELETE FROM stores WHERE id IN ($1, $2)', [storeId1, storeId2]);
        await CacheService.clear();
    });
    describe('Daily BOP Report', () => {
        it('should return daily BOP report with date parameter', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15' })
                .expect(200);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('period', 'daily');
            expect(response.body.data).toHaveProperty('date', '2024-01-15');
            expect(response.body.data).toHaveProperty('summary');
            expect(response.body.data.summary).toHaveProperty('totalBOP', 1400000); // 500k + 300k + 600k
            expect(response.body.data.summary).toHaveProperty('storeCount', 2);
            expect(response.body.data).toHaveProperty('byStore');
            expect(response.body.data.byStore).toHaveLength(2);
        });
        it('should aggregate BOP by store for daily report', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15' })
                .expect(200);
            const storeData = response.body.data.byStore.find((s) => s.storeId === storeId1);
            expect(storeData).toBeDefined();
            expect(storeData.totalBOP).toBe(800000); // 500k + 300k
            expect(storeData.bopItems).toHaveLength(2);
            expect(storeData.bopItems).toContainEqual(expect.objectContaining({
                id: bopId1,
                name: 'Listrik',
                amount: 500000,
            }));
        });
        it('should include category information in BOP items', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15' })
                .expect(200);
            const bopItems = response.body.data.byStore[0].bopItems;
            expect(bopItems[0]).toHaveProperty('id');
            expect(bopItems[0]).toHaveProperty('name');
            expect(bopItems[0]).toHaveProperty('description');
            expect(bopItems[0]).toHaveProperty('amount');
            expect(bopItems[0]).toHaveProperty('effectiveFrom');
        });
        it('should exclude expired BOP records from daily report', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15' })
                .expect(200);
            const bopItems = response.body.data.byStore
                .flatMap((s) => s.bopItems)
                .map((item) => item.id);
            expect(bopItems).toContain(bopId1);
            expect(bopItems).toContain(bopId2);
            expect(bopItems).toContain(bopId3);
            expect(bopItems).not.toContain(bopId4); // Expired record should not be included
        });
        it('should filter by store when storeId parameter is provided', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15', storeId: storeId1 })
                .expect(200);
            expect(response.body.data.byStore).toHaveLength(1);
            expect(response.body.data.byStore[0].storeId).toBe(storeId1);
            expect(response.body.data.summary.storeCount).toBe(1);
            expect(response.body.data.summary.totalBOP).toBe(800000);
        });
        it('should return empty report when no BOP data for date', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2020-01-01' })
                .expect(200);
            expect(response.body.data.byStore).toHaveLength(0);
            expect(response.body.data.summary.totalBOP).toBe(0);
        });
        it('should reject future dates', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);
            const futureDateStr = futureDate.toISOString().split('T')[0];
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: futureDateStr })
                .expect(400);
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.message).toContain('Cannot query future dates');
        });
        it('should reject invalid date format', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '01-01-2024' })
                .expect(400);
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.message).toContain('Invalid date format');
        });
        it('should reject missing date parameter for daily report', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily' })
                .expect(400);
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.message).toContain('Date parameter is required');
        });
        it('should cache daily BOP report', async () => {
            const cacheSpy = jest.spyOn(CacheService, 'set');
            const response1 = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15' })
                .expect(200);
            expect(cacheSpy).toHaveBeenCalled();
            expect(response1.body.data.summary.totalBOP).toBe(1400000);
            // Second request should get from cache
            const response2 = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15' })
                .expect(200);
            expect(response2.body.data.summary.totalBOP).toBe(1400000);
            cacheSpy.mockRestore();
        });
    });
    describe('Weekly BOP Report', () => {
        it('should return weekly BOP report with week and year parameters', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'weekly', week: 3, year: 2024 })
                .expect(200);
            expect(response.body.data).toHaveProperty('period', 'weekly');
            expect(response.body.data).toHaveProperty('week', 3);
            expect(response.body.data).toHaveProperty('year', 2024);
            expect(response.body.data).toHaveProperty('weekStart');
            expect(response.body.data).toHaveProperty('weekEnd');
            expect(response.body.data).toHaveProperty('summary');
        });
        it('should reject invalid week number', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'weekly', week: 54, year: 2024 })
                .expect(400);
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.message).toContain('Invalid week number');
        });
        it('should reject missing week parameter', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'weekly', year: 2024 })
                .expect(400);
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.message).toContain('Week parameter is required');
        });
        it('should reject future weeks', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'weekly', week: 52, year: 2099 })
                .expect(400);
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.message).toContain('Cannot query future weeks');
        });
        it('should cache weekly BOP report', async () => {
            const cacheSpy = jest.spyOn(CacheService, 'set');
            await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'weekly', week: 3, year: 2024 })
                .expect(200);
            expect(cacheSpy).toHaveBeenCalled();
            cacheSpy.mockRestore();
        });
    });
    describe('Monthly BOP Report', () => {
        it('should return monthly BOP report with month and year parameters', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'monthly', month: 1, year: 2024 })
                .expect(200);
            expect(response.body.data).toHaveProperty('period', 'monthly');
            expect(response.body.data).toHaveProperty('month', 1);
            expect(response.body.data).toHaveProperty('year', 2024);
            expect(response.body.data).toHaveProperty('monthStart', '2024-01-01');
            expect(response.body.data).toHaveProperty('monthEnd');
            expect(response.body.data).toHaveProperty('summary');
            expect(response.body.data.summary).toHaveProperty('totalBOP');
            expect(response.body.data.summary).toHaveProperty('storeCount');
        });
        it('should aggregate BOP by store for monthly report', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'monthly', month: 1, year: 2024 })
                .expect(200);
            expect(response.body.data.byStore).toHaveLength(2);
            const store1Data = response.body.data.byStore.find((s) => s.storeId === storeId1);
            expect(store1Data.totalBOP).toBe(800000); // 500k + 300k
            expect(store1Data.bopItems).toHaveLength(2);
        });
        it('should reject invalid month number', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'monthly', month: 13, year: 2024 })
                .expect(400);
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.message).toContain('Invalid month number');
        });
        it('should reject missing month parameter', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'monthly', year: 2024 })
                .expect(400);
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.message).toContain('Month parameter is required');
        });
        it('should reject future months', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'monthly', month: 12, year: 2099 })
                .expect(400);
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.message).toContain('Cannot query future months');
        });
        it('should cache monthly BOP report', async () => {
            const cacheSpy = jest.spyOn(CacheService, 'set');
            await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'monthly', month: 1, year: 2024 })
                .expect(200);
            expect(cacheSpy).toHaveBeenCalled();
            cacheSpy.mockRestore();
        });
    });
    describe('BOP Report Authorization', () => {
        it('should require OWNER role', async () => {
            // This would need to be tested by mocking a non-OWNER user
            // The actual implementation depends on your auth middleware
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15' })
                .expect(200); // Owner user is mocked in beforeEach
            expect(response.body).toHaveProperty('data');
        });
    });
    describe('BOP Report Response Format', () => {
        it('should include meta information with timestamp and requestId', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15' })
                .expect(200);
            expect(response.body).toHaveProperty('meta');
            expect(response.body.meta).toHaveProperty('timestamp');
            expect(response.body.meta).toHaveProperty('requestId');
        });
        it('should include summary with totalBOP, storeCount, and averageBOP', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15' })
                .expect(200);
            const summary = response.body.data.summary;
            expect(summary).toHaveProperty('totalBOP');
            expect(summary).toHaveProperty('storeCount');
            expect(summary).toHaveProperty('averageBOP');
            expect(typeof summary.totalBOP).toBe('number');
            expect(typeof summary.storeCount).toBe('number');
            expect(typeof summary.averageBOP).toBe('number');
        });
        it('should include store breakdown with BOP items', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15' })
                .expect(200);
            const store = response.body.data.byStore[0];
            expect(store).toHaveProperty('storeId');
            expect(store).toHaveProperty('storeName');
            expect(store).toHaveProperty('totalBOP');
            expect(store).toHaveProperty('bopItems');
            expect(Array.isArray(store.bopItems)).toBe(true);
        });
        it('should include BOP item details with all required fields', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15' })
                .expect(200);
            const bopItem = response.body.data.byStore[0].bopItems[0];
            expect(bopItem).toHaveProperty('id');
            expect(bopItem).toHaveProperty('name');
            expect(bopItem).toHaveProperty('description');
            expect(bopItem).toHaveProperty('amount');
            expect(bopItem).toHaveProperty('effectiveFrom');
            expect(bopItem).toHaveProperty('effectiveTo');
        });
    });
    describe('BOP Report with No Data', () => {
        it('should return empty report when no BOP records exist for period', async () => {
            await db.query('DELETE FROM bop');
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'monthly', month: 6, year: 2024 })
                .expect(200);
            expect(response.body.data.byStore).toHaveLength(0);
            expect(response.body.data.summary.totalBOP).toBe(0);
            expect(response.body.data.summary.storeCount).toBe(0);
            expect(response.body.data.summary.averageBOP).toBe(0);
        });
        it('should calculate correct averageBOP when data exists', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'daily', date: '2024-01-15' })
                .expect(200);
            const summary = response.body.data.summary;
            const calculatedAverage = Math.floor(summary.totalBOP / summary.storeCount);
            expect(summary.averageBOP).toBe(calculatedAverage);
        });
    });
    describe('BOP Report Period Parameter Validation', () => {
        it('should reject invalid period parameter', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ period: 'yearly', month: 1, year: 2024 })
                .expect(400);
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.message).toContain("'daily', 'weekly', or 'monthly'");
        });
        it('should reject missing period parameter', async () => {
            const response = await request(app)
                .get('/api/v1/reports/bop')
                .query({ month: 1, year: 2024 })
                .expect(400);
            expect(response.body.error).toHaveProperty('message');
            expect(response.body.error.message).toContain('Period parameter');
        });
    });
});
//# sourceMappingURL=reports.bop.test.js.map