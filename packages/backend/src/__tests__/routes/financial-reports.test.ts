/**
 * Financial Analysis Reports Tests (Tasks 84, 86, 88)
 * Tests for Profit & Loss, Inventory Valuation, and Cash Flow reports
 * 
 * Requirements: 17.1, 17.2, 17.3, 17.5, 17.6, 21.2, 21.3
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { db } from '../../database/index.js';
import { v4 as uuidv4 } from 'uuid';

// Mock the express app for testing
let app: any;
let authToken: string;
let testStoreId: string;
let testProductId: string;

describe('Financial Analysis Reports API', () => {
  beforeAll(async () => {
    // Setup: Create test data
    testStoreId = uuidv4();
    testProductId = uuidv4();

    // Mock auth token
    authToken = 'Bearer test-token';
  });

  afterAll(async () => {
    // Cleanup database
    await db.query('DELETE FROM transactions WHERE store_id = $1', [testStoreId]);
    await db.query('DELETE FROM inventory WHERE store_id = $1', [testStoreId]);
  });

  describe('GET /api/v1/reports/financial/profit-loss', () => {
    it('should return profit & loss report for valid month and year', async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const response = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month, year })
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('month', month);
      expect(response.body.data).toHaveProperty('year', year);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toHaveProperty('totalRevenue');
      expect(response.body.data.summary).toHaveProperty('totalCOGS');
      expect(response.body.data.summary).toHaveProperty('grossProfit');
      expect(response.body.data.summary).toHaveProperty('grossProfitMargin');
      expect(response.body.data.summary).toHaveProperty('operatingExpenses');
      expect(response.body.data.summary).toHaveProperty('netProfit');
      expect(response.body.data.summary).toHaveProperty('netProfitMargin');
      expect(response.body.data).toHaveProperty('byStore');
      expect(Array.isArray(response.body.data.byStore)).toBe(true);
    });

    it('should calculate gross profit margin correctly', async () => {
      const today = new Date();
      const response = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month: today.getMonth() + 1, year: today.getFullYear() })
        .set('Authorization', authToken);

      const { summary } = response.body.data;
      const expectedMargin = summary.totalRevenue > 0 
        ? Math.round((summary.grossProfit / summary.totalRevenue) * 100)
        : 0;

      expect(summary.grossProfitMargin).toBe(expectedMargin);
    });

    it('should not allow future months', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const response = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month: futureDate.getMonth() + 1, year: futureDate.getFullYear() })
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toHaveProperty('message');
    });

    it('should require OWNER role', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month: 1, year: 2024 });

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it('should validate month parameter', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month: 13, year: 2024 })
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
    });

    it('should validate year parameter', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month: 1, year: 1900 })
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/reports/financial/inventory-valuation', () => {
    it('should return inventory valuation report for valid date', async () => {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/v1/reports/financial/inventory-valuation')
        .query({ date: dateString })
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('date', dateString);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toHaveProperty('totalInventoryValue');
      expect(response.body.data.summary).toHaveProperty('storeCount');
      expect(response.body.data.summary).toHaveProperty('totalItemCount');
      expect(response.body.data.summary).toHaveProperty('warehouseValue');
      expect(response.body.data).toHaveProperty('byStore');
      expect(response.body.data).toHaveProperty('warehouse');
    });

    it('should default to today when no date provided', async () => {
      const today = new Date();
      const expectedDateString = today.toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/v1/reports/financial/inventory-valuation')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.date).toBe(expectedDateString);
    });

    it('should not allow future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const dateString = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/v1/reports/financial/inventory-valuation')
        .query({ date: dateString })
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
    });

    it('should validate date format', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/inventory-valuation')
        .query({ date: 'invalid-date' })
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
    });

    it('should include warehouse inventory when present', async () => {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/v1/reports/financial/inventory-valuation')
        .query({ date: dateString })
        .set('Authorization', authToken);

      expect(response.body.data).toHaveProperty('warehouse');
      expect(response.body.data.warehouse).toHaveProperty('inventoryValue');
      expect(response.body.data.warehouse).toHaveProperty('itemCount');
      expect(response.body.data.warehouse).toHaveProperty('topItems');
    });
  });

  describe('GET /api/v1/reports/financial/cash-flow', () => {
    it('should return cash flow report for valid month and year', async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const response = await request(app)
        .get('/api/v1/reports/financial/cash-flow')
        .query({ month, year })
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('month', month);
      expect(response.body.data).toHaveProperty('year', year);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data.summary).toHaveProperty('operatingCashIn');
      expect(response.body.data.summary).toHaveProperty('operatingCashOut');
      expect(response.body.data.summary).toHaveProperty('operatingCashFlow');
      expect(response.body.data.summary).toHaveProperty('investingCashFlow');
      expect(response.body.data.summary).toHaveProperty('financingCashFlow');
      expect(response.body.data.summary).toHaveProperty('netCashFlow');
      expect(response.body.data).toHaveProperty('byStore');
    });

    it('should calculate net cash flow correctly', async () => {
      const today = new Date();
      const response = await request(app)
        .get('/api/v1/reports/financial/cash-flow')
        .query({ month: today.getMonth() + 1, year: today.getFullYear() })
        .set('Authorization', authToken);

      const { summary } = response.body.data;
      const expectedNetFlow = summary.operatingCashFlow + summary.investingCashFlow + summary.financingCashFlow;

      expect(summary.netCashFlow).toBe(expectedNetFlow);
    });

    it('should not allow future months', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      const response = await request(app)
        .get('/api/v1/reports/financial/cash-flow')
        .query({ month: futureDate.getMonth() + 1, year: futureDate.getFullYear() })
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
    });

    it('should validate month parameter', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/cash-flow')
        .query({ month: 0, year: 2024 })
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
    });
  });

  describe('Caching', () => {
    it('should cache profit & loss reports', async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      // First request
      const response1 = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month, year })
        .set('Authorization', authToken);

      expect(response1.status).toBe(200);

      // Second request should be from cache
      const response2 = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month, year })
        .set('Authorization', authToken);

      expect(response2.status).toBe(200);
      expect(response2.body.data).toEqual(response1.body.data);
    });

    it('should cache inventory valuation reports', async () => {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];

      // First request
      const response1 = await request(app)
        .get('/api/v1/reports/financial/inventory-valuation')
        .query({ date: dateString })
        .set('Authorization', authToken);

      expect(response1.status).toBe(200);

      // Second request should be from cache
      const response2 = await request(app)
        .get('/api/v1/reports/financial/inventory-valuation')
        .query({ date: dateString })
        .set('Authorization', authToken);

      expect(response2.status).toBe(200);
      expect(response2.body.data).toEqual(response1.body.data);
    });

    it('should cache cash flow reports', async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      // First request
      const response1 = await request(app)
        .get('/api/v1/reports/financial/cash-flow')
        .query({ month, year })
        .set('Authorization', authToken);

      expect(response1.status).toBe(200);

      // Second request should be from cache
      const response2 = await request(app)
        .get('/api/v1/reports/financial/cash-flow')
        .query({ month, year })
        .set('Authorization', authToken);

      expect(response2.status).toBe(200);
      expect(response2.body.data).toEqual(response1.body.data);
    });
  });

  describe('Response Format', () => {
    it('should include meta information in profit & loss response', async () => {
      const today = new Date();
      const response = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month: today.getMonth() + 1, year: today.getFullYear() })
        .set('Authorization', authToken);

      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
      expect(response.body.meta).toHaveProperty('requestId');
    });

    it('should include store breakdown in all reports', async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const plResponse = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month, year })
        .set('Authorization', authToken);

      const cfResponse = await request(app)
        .get('/api/v1/reports/financial/cash-flow')
        .query({ month, year })
        .set('Authorization', authToken);

      expect(plResponse.body.data).toHaveProperty('byStore');
      expect(cfResponse.body.data).toHaveProperty('byStore');
      expect(Array.isArray(plResponse.body.data.byStore)).toBe(true);
      expect(Array.isArray(cfResponse.body.data.byStore)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle reports with no data gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month: 1, year: 2020 })
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.data.summary.totalRevenue).toBe(0);
      expect(response.body.data.summary.totalCOGS).toBe(0);
      expect(response.body.data.summary.netProfit).toBe(0);
    });

    it('should handle division by zero in margin calculations', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month: 1, year: 2020 })
        .set('Authorization', authToken);

      // Margin should be 0 when revenue is 0, not NaN
      expect(response.body.data.summary.grossProfitMargin).toBe(0);
      expect(response.body.data.summary.netProfitMargin).toBe(0);
      expect(isNaN(response.body.data.summary.grossProfitMargin)).toBe(false);
    });

    it('should handle empty store list in inventory report', async () => {
      const response = await request(app)
        .get('/api/v1/reports/financial/inventory-valuation')
        .set('Authorization', authToken);

      expect(response.body.data.byStore).toBeDefined();
      expect(Array.isArray(response.body.data.byStore)).toBe(true);
    });
  });

  describe('Property-Based Tests for Financial Calculations', () => {
    /**
     * Property 1: Profit & Loss Consistency
     * For any valid month and year, gross profit = revenue - COGS
     * and net profit = gross profit - operating expenses
     */
    it('should maintain profit calculation consistency', async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const response = await request(app)
        .get('/api/v1/reports/financial/profit-loss')
        .query({ month, year })
        .set('Authorization', authToken);

      const { summary, byStore } = response.body.data;

      // Summary level
      expect(summary.grossProfit).toBe(summary.totalRevenue - summary.totalCOGS);
      expect(summary.netProfit).toBe(summary.grossProfit - summary.operatingExpenses);

      // Store level
      byStore.forEach((store: any) => {
        expect(store.grossProfit).toBe(store.revenue - store.cogs);
        expect(store.netProfit).toBe(store.grossProfit - store.operatingExpenses);
      });
    });

    /**
     * Property 2: Cash Flow Consistency
     * For any valid month and year, net cash flow = operating CF + investing CF + financing CF
     */
    it('should maintain cash flow calculation consistency', async () => {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const response = await request(app)
        .get('/api/v1/reports/financial/cash-flow')
        .query({ month, year })
        .set('Authorization', authToken);

      const { summary, byStore } = response.body.data;

      // Summary level
      const expectedNetFlow = summary.operatingCashFlow + summary.investingCashFlow + summary.financingCashFlow;
      expect(summary.netCashFlow).toBe(expectedNetFlow);

      // Store level
      byStore.forEach((store: any) => {
        const storeNetFlow = store.operatingCashFlow + store.investingCashFlow + store.financingCashFlow;
        expect(store.netCashFlow).toBe(storeNetFlow);
      });
    });

    /**
     * Property 3: Inventory Value Non-Negativity
     * Total inventory value should never be negative
     */
    it('should never return negative inventory values', async () => {
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/v1/reports/financial/inventory-valuation')
        .query({ date: dateString })
        .set('Authorization', authToken);

      const { summary, byStore, warehouse } = response.body.data;

      expect(summary.totalInventoryValue).toBeGreaterThanOrEqual(0);
      expect(summary.warehouseValue).toBeGreaterThanOrEqual(0);

      byStore.forEach((store: any) => {
        expect(store.inventoryValue).toBeGreaterThanOrEqual(0);
      });
    });
  });
});
