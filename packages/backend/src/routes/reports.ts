/**
 * Daily Sales Report routes
 * Handles endpoints for daily sales reporting with caching
 * Requirements: 23.1, 23.2, 23.3
 */

import express, { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { ApiError, ApiErrorCode } from '../utils/errors.js';
import { db } from '../database/index.js';
import { CacheService } from '../cache/service.js';
import { cacheKeys, cacheTTL } from '../cache/keys.js';

export const reportsRouter = express.Router() as ReturnType<typeof express.Router>;

// Apply authentication middleware to all report routes
reportsRouter.use(authenticateToken);

/**
 * GET /api/v1/reports/sales/daily
 * Protected endpoint - returns daily sales report for all stores
 * Requires OWNER role
 *
 * Query parameters:
 * - date (optional): YYYY-MM-DD format, defaults to today
 *
 * Response (200):
 * {
 *   "data": {
 *     "date": "2024-01-15",
 *     "summary": {
 *       "totalRevenue": 5000000,
 *       "totalTransactions": 45,
 *       "storeCount": 3
 *     },
 *     "byStore": [
 *       {
 *         "storeId": "uuid",
 *         "storeName": "Toko Jakarta",
 *         "revenue": 2000000,
 *         "transactionCount": 15,
 *         "averageTransaction": 133333,
 *         "paymentMethods": {
 *           "CASH": { "count": 10, "amount": 1200000 },
 *           "MEMBER": { "count": 3, "amount": 600000 },
 *           "TEMPO": { "count": 2, "amount": 200000 }
 *         }
 *       }
 *     ]
 *   },
 *   "meta": {
 *     "timestamp": "ISO 8601 string",
 *     "requestId": "request ID from middleware"
 *   }
 * }
 *
 * Response (400):
 * {
 *   "error": {
 *     "message": "Invalid date format. Use YYYY-MM-DD",
 *     "code": "BAD_REQUEST",
 *     "statusCode": 400
 *   },
 *   "requestId": "req-123"
 * }
 *
 * Response (403):
 * {
 *   "error": {
 *     "message": "Insufficient permissions",
 *     "code": "FORBIDDEN",
 *     "statusCode": 403
 *   },
 *   "requestId": "req-123"
 * }
 */
reportsRouter.get(
  '/sales/daily',
  authorize('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get date from query or use today
      const dateParam = req.query.date as string;

      // Validate date format if provided
      if (dateParam) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateParam)) {
          throw new ApiError(
            'Invalid date format. Use YYYY-MM-DD',
            ApiErrorCode.BAD_REQUEST,
            400
          );
        }

        // Parse and validate date
        const parsed = new Date(dateParam + 'T00:00:00Z');
        if (isNaN(parsed.getTime())) {
          throw new ApiError(
            'Invalid date format. Use YYYY-MM-DD',
            ApiErrorCode.BAD_REQUEST,
            400
          );
        }
      }

      // Set target date
      const targetDate = dateParam ? new Date(dateParam + 'T00:00:00Z') : new Date();

      // Check for future dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);

      if (targetDate > today) {
        throw new ApiError(
          'Cannot query future dates',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Format date for cache key and display
      const dateString = targetDate.toISOString().split('T')[0];

      // Try to get from cache
      const cacheKey = `report:sales:daily:${dateString}`;
      let cachedReport = await CacheService.get<any>(cacheKey);

      if (cachedReport) {
        logger.info('Daily sales report retrieved from cache', {
          userId: req.user?.id,
          date: dateString,
          requestId: req.requestId,
        });

        return res.status(200).json({
          data: cachedReport,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
          },
        });
      }

      // Calculate date range
      const startOfDay = new Date(targetDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Query all stores with their daily transactions
      const storesResult = await db.query(
        `
        SELECT 
          s.id as store_id,
          s.name as store_name,
          COALESCE(SUM(t.total_amount), 0) as total_revenue,
          COUNT(t.id) as transaction_count,
          t.payment_method
        FROM stores s
        LEFT JOIN transactions t ON s.id = t.store_id 
          AND t.transaction_date >= $1 
          AND t.transaction_date <= $2
          AND t.status = 'COMPLETED'
        WHERE s.is_active = true
        GROUP BY s.id, s.name, t.payment_method
        ORDER BY s.name, t.payment_method
        `,
        [startOfDay, endOfDay]
      );

      // Process results to build the report structure
      const storeMap = new Map<string, any>();
      let summaryRevenue = 0;
      let summaryTransactions = 0;

      storesResult.rows.forEach((row: any) => {
        if (!storeMap.has(row.store_id)) {
          storeMap.set(row.store_id, {
            storeId: row.store_id,
            storeName: row.store_name,
            revenue: 0,
            transactionCount: 0,
            averageTransaction: 0,
            paymentMethods: {},
          });
        }

        const store = storeMap.get(row.store_id);
        const revenue = parseFloat(row.total_revenue) || 0;
        const transCount = parseInt(row.transaction_count) || 0;

        // Only add if there are actual transactions
        if (transCount > 0 && row.payment_method) {
          store.revenue += revenue;
          store.transactionCount += transCount;

          // Initialize payment method if not exists
          if (!store.paymentMethods[row.payment_method]) {
            store.paymentMethods[row.payment_method] = {
              count: 0,
              amount: 0,
            };
          }

          store.paymentMethods[row.payment_method].count += transCount;
          store.paymentMethods[row.payment_method].amount += revenue;

          summaryRevenue += revenue;
          summaryTransactions += transCount;
        }
      });

      // Convert map to array and calculate averages
      const byStore = Array.from(storeMap.values()).map((store: any) => ({
        ...store,
        averageTransaction:
          store.transactionCount > 0
            ? Math.floor(store.revenue / store.transactionCount)
            : 0,
      }));

      const reportData = {
        date: dateString,
        summary: {
          totalRevenue: summaryRevenue,
          totalTransactions: summaryTransactions,
          storeCount: byStore.length,
        },
        byStore,
      };

      // Cache the report
      await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);

      logger.info('Daily sales report generated', {
        userId: req.user?.id,
        date: dateString,
        storeCount: byStore.length,
        totalRevenue: summaryRevenue,
        totalTransactions: summaryTransactions,
        requestId: req.requestId,
      });

      res.status(200).json({
        data: reportData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reports/sales/weekly
 * Protected endpoint - returns weekly sales report for all stores
 * Requires OWNER role
 *
 * Query parameters:
 * - week (required): Week number 1-53 (ISO week)
 * - year (required): Year in YYYY format
 * - storeId (optional): Filter by specific store
 *
 * Response (200):
 * {
 *   "data": {
 *     "week": 3,
 *     "year": 2024,
 *     "weekStart": "2024-01-15",
 *     "weekEnd": "2024-01-21",
 *     "summary": {
 *       "totalRevenue": 10000000,
 *       "totalTransactions": 100,
 *       "storeCount": 3
 *     },
 *     "byStore": [
 *       {
 *         "storeId": "uuid",
 *         "storeName": "Toko Jakarta",
 *         "revenue": 5000000,
 *         "transactionCount": 50,
 *         "paymentMethods": {...},
 *         "dailyBreakdown": [
 *           {
 *             "date": "2024-01-15",
 *             "dayOfWeek": "Senin",
 *             "revenue": 714286,
 *             "transactionCount": 7
 *           }
 *         ]
 *       }
 *     ]
 *   },
 *   "meta": { "timestamp": "...", "requestId": "..." }
 * }
 */

/**
 * Helper function to calculate ISO week start and end dates
 */
function getISOWeekDates(week: number, year: number): { start: Date; end: Date } {
  // January 4th is always in week 1 of ISO 8601
  const jan4 = new Date(Date.UTC(year, 0, 4));
  // Get the Monday of week 1
  const weekOneMonday = new Date(jan4);
  weekOneMonday.setUTCDate(jan4.getUTCDate() - jan4.getUTCDay() + 1);

  // Calculate the Monday of the target week
  const targetMonday = new Date(weekOneMonday);
  targetMonday.setUTCDate(weekOneMonday.getUTCDate() + (week - 1) * 7);

  // Sunday is 6 days after Monday
  const targetSunday = new Date(targetMonday);
  targetSunday.setUTCDate(targetMonday.getUTCDate() + 6);
  targetSunday.setUTCHours(23, 59, 59, 999);

  return {
    start: targetMonday,
    end: targetSunday,
  };
}

/**
 * Helper function to get day of week in Indonesian
 */
function getDayOfWeekIndonesian(date: Date): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getUTCDay()];
}

/**
 * Helper function to get all dates in a week
 */
function getWeekDates(startDate: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + i);
    dates.push(date);
  }
  return dates;
}

reportsRouter.get(
  '/sales/weekly',
  authorize('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const week = req.query.week as string;
      const year = req.query.year as string;
      const storeIdParam = req.query.storeId as string | undefined;

      // Validate week parameter
      if (!week) {
        throw new ApiError(
          'Week parameter is required (1-53)',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      const weekNum = parseInt(week, 10);
      if (isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
        throw new ApiError(
          'Invalid week number. Must be between 1 and 53',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Validate year parameter
      if (!year) {
        throw new ApiError(
          'Year parameter is required (YYYY format)',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      const yearNum = parseInt(year, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(yearNum) || yearNum < currentYear - 2 || yearNum > currentYear + 2) {
        throw new ApiError(
          `Year must be between ${currentYear - 2} and ${currentYear + 2}`,
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Check for future weeks
      const { start: weekStart, end: weekEnd } = getISOWeekDates(weekNum, yearNum);
      const now = new Date();
      if (weekStart > now) {
        throw new ApiError(
          'Cannot query future weeks',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Format dates for display
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const weekEndStr = weekEnd.toISOString().split('T')[0];

      // Try to get from cache
      const cacheKey = `report:sales:weekly:${yearNum}-W${String(weekNum).padStart(2, '0')}`;
      let cachedReport = await CacheService.get<any>(cacheKey);

      if (cachedReport) {
        logger.info('Weekly sales report retrieved from cache', {
          userId: req.user?.id,
          week: weekNum,
          year: yearNum,
          requestId: req.requestId,
        });

        return res.status(200).json({
          data: cachedReport,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
          },
        });
      }

      // Query all transactions for the week
      let query = `
        SELECT 
          s.id as store_id,
          s.name as store_name,
          t.id as transaction_id,
          t.total_amount,
          t.payment_method,
          t.transaction_date
        FROM stores s
        LEFT JOIN transactions t ON s.id = t.store_id 
          AND t.transaction_date >= $1 
          AND t.transaction_date <= $2
          AND t.status = 'COMPLETED'
        WHERE s.is_active = true
      `;

      const params: any[] = [weekStart, weekEnd];

      if (storeIdParam) {
        query += ` AND s.id = $${params.length + 1}`;
        params.push(storeIdParam);
      }

      query += ` ORDER BY s.id, t.transaction_date`;

      const result = await db.query(query, params);

      // Process results to build the report structure
      const storeMap = new Map<string, any>();
      let summaryRevenue = 0;
      let summaryTransactions = 0;

      // Get all dates in the week for daily breakdown
      const weekDates = getWeekDates(weekStart);

      result.rows.forEach((row: any) => {
        if (!storeMap.has(row.store_id)) {
          // Initialize daily breakdown with all 7 days
          const dailyBreakdown = weekDates.map((date) => ({
            date: date.toISOString().split('T')[0],
            dayOfWeek: getDayOfWeekIndonesian(date),
            revenue: 0,
            transactionCount: 0,
          }));

          storeMap.set(row.store_id, {
            storeId: row.store_id,
            storeName: row.store_name,
            revenue: 0,
            transactionCount: 0,
            paymentMethods: {},
            dailyBreakdown,
          });
        }

        const store = storeMap.get(row.store_id);

        // Only process if there's actual transaction data
        if (row.transaction_id && row.total_amount && row.payment_method) {
          const revenue = parseFloat(row.total_amount) || 0;
          const txnDate = new Date(row.transaction_date);
          const txnDateStr = txnDate.toISOString().split('T')[0];

          store.revenue += revenue;
          store.transactionCount += 1;

          // Initialize payment method if not exists
          if (!store.paymentMethods[row.payment_method]) {
            store.paymentMethods[row.payment_method] = {
              count: 0,
              amount: 0,
            };
          }

          store.paymentMethods[row.payment_method].count += 1;
          store.paymentMethods[row.payment_method].amount += revenue;

          // Update daily breakdown
          const dailyEntry = store.dailyBreakdown.find(
            (d: any) => d.date === txnDateStr
          );
          if (dailyEntry) {
            dailyEntry.revenue += revenue;
            dailyEntry.transactionCount += 1;
          }

          summaryRevenue += revenue;
          summaryTransactions += 1;
        }
      });

      // Convert map to array
      const byStore = Array.from(storeMap.values()).map((store: any) => {
        // Ensure all payment methods are included even if empty
        const paymentMethods = store.paymentMethods;
        
        return {
          storeId: store.storeId,
          storeName: store.storeName,
          revenue: store.revenue,
          transactionCount: store.transactionCount,
          paymentMethods,
          dailyBreakdown: store.dailyBreakdown,
        };
      });

      const reportData = {
        week: weekNum,
        year: yearNum,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        summary: {
          totalRevenue: summaryRevenue,
          totalTransactions: summaryTransactions,
          storeCount: byStore.length,
        },
        byStore,
      };

      // Cache the report
      await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);

      logger.info('Weekly sales report generated', {
        userId: req.user?.id,
        week: weekNum,
        year: yearNum,
        storeCount: byStore.length,
        totalRevenue: summaryRevenue,
        totalTransactions: summaryTransactions,
        requestId: req.requestId,
      });

      res.status(200).json({
        data: reportData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reports/sales/monthly
 * Protected endpoint - returns monthly sales report for all stores
 * Requires OWNER role
 *
 * Query parameters:
 * - month (required): Month number 1-12
 * - year (required): Year in YYYY format
 * - storeId (optional): Filter by specific store
 *
 * Response (200):
 * {
 *   "data": {
 *     "month": 1,
 *     "year": 2024,
 *     "monthStart": "2024-01-01",
 *     "monthEnd": "2024-01-31",
 *     "summary": {
 *       "totalRevenue": 50000000,
 *       "totalTransactions": 500,
 *       "storeCount": 3,
 *       "averageTransaction": 100000,
 *       "topProduct": {
 *         "productId": "uuid",
 *         "productName": "Vape Pod X",
 *         "quantitySold": 250,
 *         "revenue": 5000000
 *       }
 *     },
 *     "byStore": [...],
 *     "topProducts": [...]
 *   },
 *   "meta": { "timestamp": "...", "requestId": "..." }
 * }
 */

/**
 * Helper function to get the last day of a month
 */
function getLastDayOfMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Helper function to get all ISO weeks that overlap with a month
 */
function getWeeksInMonth(month: number, year: number): Array<{ week: number; year: number; start: Date; end: Date }> {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const weeks: Array<{ week: number; year: number; start: Date; end: Date }> = [];

  // Get the ISO week of the start and end dates
  const getISOWeek = (date: Date): { week: number; year: number } => {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { week: weekNum, year: d.getUTCFullYear() };
  };

  const startWeek = getISOWeek(monthStart);
  const endWeek = getISOWeek(monthEnd);

  // Collect all weeks
  let currentWeek = startWeek;
  const seenWeeks = new Set<string>();

  while (
    currentWeek.year < endWeek.year ||
    (currentWeek.year === endWeek.year && currentWeek.week <= endWeek.week)
  ) {
    const weekKey = `${currentWeek.year}-W${currentWeek.week}`;
    if (!seenWeeks.has(weekKey)) {
      seenWeeks.add(weekKey);

      // Get week dates
      const { start, end } = getISOWeekDates(currentWeek.week, currentWeek.year);
      weeks.push({
        week: currentWeek.week,
        year: currentWeek.year,
        start,
        end,
      });
    }

    currentWeek.week++;
    if (currentWeek.week > 53) {
      currentWeek.week = 1;
      currentWeek.year++;
    }
  }

  return weeks;
}

/**
 * Helper function to get Indonesian week label
 */
function getWeekLabel(weekStart: Date): string {
  const start = weekStart.toISOString().split('T')[0];
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 6);
  const endStr = end.toISOString().split('T')[0];
  return `${start} - ${endStr}`;
}

reportsRouter.get(
  '/sales/monthly',
  authorize('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const monthParam = req.query.month as string;
      const yearParam = req.query.year as string;
      const storeIdParam = req.query.storeId as string | undefined;

      // Validate month parameter
      if (!monthParam) {
        throw new ApiError(
          'Month parameter is required (1-12)',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      const month = parseInt(monthParam, 10);
      if (isNaN(month) || month < 1 || month > 12) {
        throw new ApiError(
          'Invalid month number. Must be between 1 and 12',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Validate year parameter
      if (!yearParam) {
        throw new ApiError(
          'Year parameter is required (YYYY format)',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      const year = parseInt(yearParam, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < currentYear - 2 || year > currentYear + 2) {
        throw new ApiError(
          `Year must be between ${currentYear - 2} and ${currentYear + 2}`,
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Check for future months
      const now = new Date();
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      if (monthStart > now) {
        throw new ApiError(
          'Cannot query future months',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Format dates for display
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const lastDay = getLastDayOfMonth(month, year);
      const monthEnd = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      // Try to get from cache
      const cacheKey = `report:sales:monthly:${year}-${String(month).padStart(2, '0')}`;
      let cachedReport = await CacheService.get<any>(cacheKey);

      if (cachedReport) {
        logger.info('Monthly sales report retrieved from cache', {
          userId: req.user?.id,
          month,
          year,
          requestId: req.requestId,
        });

        return res.status(200).json({
          data: cachedReport,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
          },
        });
      }

      // Query all transactions for the month
      let query = `
        SELECT 
          s.id as store_id,
          s.name as store_name,
          t.id as transaction_id,
          t.total_amount,
          t.payment_method,
          t.transaction_date,
          ti.product_id,
          p.name as product_name,
          ti.quantity
        FROM stores s
        LEFT JOIN transactions t ON s.id = t.store_id 
          AND t.transaction_date >= $1 
          AND t.transaction_date <= $2
          AND t.status = 'COMPLETED'
        LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
        LEFT JOIN products p ON ti.product_id = p.id
        WHERE s.is_active = true
      `;

      const params: any[] = [monthStart, monthEnd];

      if (storeIdParam) {
        query += ` AND s.id = $${params.length + 1}`;
        params.push(storeIdParam);
      }

      query += ` ORDER BY s.id, t.transaction_date`;

      const result = await db.query(query, params);

      // Process results to build the report structure
      const storeMap = new Map<string, any>();
      const productMap = new Map<string, any>();
      let summaryRevenue = 0;
      let summaryTransactions = 0;

      // Get weeks in month
      const weeksInMonth = getWeeksInMonth(month, year);

      result.rows.forEach((row: any) => {
        // Initialize store if not exists
        if (!storeMap.has(row.store_id)) {
          // Initialize weekly breakdown with all weeks
          const weeklyBreakdown = weeksInMonth.map((w) => ({
            weekNumber: w.week,
            weekStart: w.start.toISOString().split('T')[0],
            weekEnd: w.end.toISOString().split('T')[0],
            revenue: 0,
            transactionCount: 0,
          }));

          storeMap.set(row.store_id, {
            storeId: row.store_id,
            storeName: row.store_name,
            revenue: 0,
            transactionCount: 0,
            paymentMethods: {},
            weeklyBreakdown,
          });
        }

        // Only process if there's actual transaction data
        if (row.transaction_id && row.total_amount && row.payment_method) {
          const revenue = parseFloat(row.total_amount) || 0;
          const txnDate = new Date(row.transaction_date);
          const txnDateStr = txnDate.toISOString().split('T')[0];
          const store = storeMap.get(row.store_id);

          // Only increment once per transaction (multiple items per transaction)
          if (!store.processedTransactions) {
            store.processedTransactions = new Set<string>();
          }

          if (!store.processedTransactions.has(row.transaction_id)) {
            store.processedTransactions.add(row.transaction_id);
            store.revenue += revenue;
            store.transactionCount += 1;
            summaryRevenue += revenue;
            summaryTransactions += 1;

            // Initialize payment method if not exists
            if (!store.paymentMethods[row.payment_method]) {
              store.paymentMethods[row.payment_method] = {
                count: 0,
                amount: 0,
              };
            }

            store.paymentMethods[row.payment_method].count += 1;
            store.paymentMethods[row.payment_method].amount += revenue;

            // Update weekly breakdown
            const weekEntry = store.weeklyBreakdown.find(
              (w: any) =>
                txnDate >= new Date(w.weekStart) && txnDate <= new Date(w.weekEnd + 'T23:59:59Z')
            );
            if (weekEntry) {
              weekEntry.revenue += revenue;
              weekEntry.transactionCount += 1;
            }
          }

          // Process product data separately (can have multiple items per transaction)
          if (row.product_id && row.product_name && row.quantity) {
            if (!productMap.has(row.product_id)) {
              productMap.set(row.product_id, {
                productId: row.product_id,
                productName: row.product_name,
                quantitySold: 0,
                revenue: 0,
              });
            }

            const product = productMap.get(row.product_id);
            const itemRevenue = revenue * (parseInt(row.quantity) / store.transactionCount); // Approximate
            product.quantitySold += parseInt(row.quantity) || 0;
            product.revenue += itemRevenue;
          }
        }
      });

      // Clean up processed transactions set and convert map to array
      const byStore = Array.from(storeMap.values()).map((store: any) => {
        const { processedTransactions, ...cleanStore } = store;
        return cleanStore;
      });

      // Get top 10 products and find top product for summary
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 10)
        .map((product: any) => ({
          productId: product.productId,
          productName: product.productName,
          quantitySold: product.quantitySold,
          revenue: Math.floor(product.revenue),
          averagePrice:
            product.quantitySold > 0 ? Math.floor(product.revenue / product.quantitySold) : 0,
        }));

      const topProduct = topProducts[0] || null;

      const reportData = {
        month,
        year,
        monthStart: monthStartStr,
        monthEnd: monthEndStr,
        summary: {
          totalRevenue: summaryRevenue,
          totalTransactions: summaryTransactions,
          storeCount: byStore.length,
          averageTransaction:
            summaryTransactions > 0
              ? Math.floor(summaryRevenue / summaryTransactions)
              : 0,
          topProduct,
        },
        byStore,
        topProducts,
      };

      // Cache the report
      await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);

      logger.info('Monthly sales report generated', {
        userId: req.user?.id,
        month,
        year,
        storeCount: byStore.length,
        totalRevenue: summaryRevenue,
        totalTransactions: summaryTransactions,
        requestId: req.requestId,
      });

      res.status(200).json({
        data: reportData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reports/financial/profit-loss
 * Protected endpoint - returns profit & loss report
 * Requires OWNER role
 *
 * Query parameters:
 * - month (required): Month number 1-12
 * - year (required): Year in YYYY format
 * - storeId (optional): Filter by specific store
 *
 * Response (200):
 * {
 *   "data": {
 *     "month": 1,
 *     "year": 2024,
 *     "monthStart": "2024-01-01",
 *     "monthEnd": "2024-01-31",
 *     "summary": {
 *       "totalRevenue": 50000000,
 *       "totalCOGS": 20000000,
 *       "grossProfit": 30000000,
 *       "grossProfitMargin": 60,
 *       "operatingExpenses": 5000000,
 *       "netProfit": 25000000,
 *       "netProfitMargin": 50
 *     },
 *     "byStore": [
 *       {
 *         "storeId": "uuid",
 *         "storeName": "Toko Jakarta",
 *         "revenue": 20000000,
 *         "cogs": 8000000,
 *         "grossProfit": 12000000,
 *         "grossProfitMargin": 60,
 *         "operatingExpenses": 2000000,
 *         "netProfit": 10000000,
 *         "netProfitMargin": 50
 *       }
 *     ]
 *   },
 *   "meta": { "timestamp": "...", "requestId": "..." }
 * }
 *
 * Requirements: 17.1, 17.2, 17.3
 */
reportsRouter.get(
  '/financial/profit-loss',
  authorize('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const monthParam = req.query.month as string;
      const yearParam = req.query.year as string;
      const storeIdParam = req.query.storeId as string | undefined;

      // Validate month parameter
      if (!monthParam) {
        throw new ApiError(
          'Month parameter is required (1-12)',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      const month = parseInt(monthParam, 10);
      if (isNaN(month) || month < 1 || month > 12) {
        throw new ApiError(
          'Invalid month number. Must be between 1 and 12',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Validate year parameter
      if (!yearParam) {
        throw new ApiError(
          'Year parameter is required (YYYY format)',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      const year = parseInt(yearParam, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < currentYear - 2 || year > currentYear + 2) {
        throw new ApiError(
          `Year must be between ${currentYear - 2} and ${currentYear + 2}`,
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Check for future months
      const now = new Date();
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      if (monthStart > now) {
        throw new ApiError(
          'Cannot query future months',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Format dates for display
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const lastDay = getLastDayOfMonth(month, year);
      const monthEnd = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      // Try to get from cache
      const cacheKey = `report:financial:profit-loss:${year}-${String(month).padStart(2, '0')}`;
      let cachedReport = await CacheService.get<any>(cacheKey);

      if (cachedReport) {
        logger.info('Profit & Loss report retrieved from cache', {
          userId: req.user?.id,
          month,
          year,
          requestId: req.requestId,
        });

        return res.status(200).json({
          data: cachedReport,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
          },
        });
      }

      // Query all transactions and cost of goods sold for the month
      let query = `
        SELECT 
          s.id as store_id,
          s.name as store_name,
          t.id as transaction_id,
          t.total_amount as revenue,
          SUM(ti.quantity * p.cost_price::numeric) as cogs_amount,
          b.amount as bop_expense
        FROM stores s
        LEFT JOIN transactions t ON s.id = t.store_id 
          AND t.transaction_date >= $1 
          AND t.transaction_date <= $2
          AND t.status = 'COMPLETED'
        LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
        LEFT JOIN products p ON ti.product_id = p.id
        LEFT JOIN bops b ON s.id = b.store_id
          AND b.effective_date <= t.transaction_date
          AND (b.end_date IS NULL OR b.end_date >= t.transaction_date)
        WHERE s.is_active = true
      `;

      const params: any[] = [monthStart, monthEnd];

      if (storeIdParam) {
        query += ` AND s.id = $${params.length + 1}`;
        params.push(storeIdParam);
      }

      query += ` GROUP BY s.id, s.name, t.id, t.total_amount, b.amount
                 ORDER BY s.id, t.transaction_date`;

      const result = await db.query(query, params);

      // Process results
      const storeMap = new Map<string, any>();
      let summaryRevenue = 0;
      let summaryCOGS = 0;
      let summaryBOP = 0;

      result.rows.forEach((row: any) => {
        if (!storeMap.has(row.store_id)) {
          storeMap.set(row.store_id, {
            storeId: row.store_id,
            storeName: row.store_name,
            revenue: 0,
            cogs: 0,
            bopExpenses: 0,
          });
        }

        const store = storeMap.get(row.store_id);

        if (row.transaction_id) {
          const revenue = parseFloat(row.revenue) || 0;
          const cogs = parseFloat(row.cogs_amount) || 0;
          const bop = parseFloat(row.bop_expense) || 0;

          store.revenue += revenue;
          store.cogs += cogs;
          store.bopExpenses += bop;

          summaryRevenue += revenue;
          summaryCOGS += cogs;
          summaryBOP += bop;
        }
      });

      // Convert to array and calculate profit metrics
      const byStore = Array.from(storeMap.values()).map((store: any) => {
        const grossProfit = store.revenue - store.cogs;
        const grossProfitMargin = store.revenue > 0 ? Math.round((grossProfit / store.revenue) * 100) : 0;
        const netProfit = grossProfit - store.bopExpenses;
        const netProfitMargin = store.revenue > 0 ? Math.round((netProfit / store.revenue) * 100) : 0;

        return {
          storeId: store.storeId,
          storeName: store.storeName,
          revenue: Math.floor(store.revenue),
          cogs: Math.floor(store.cogs),
          grossProfit: Math.floor(grossProfit),
          grossProfitMargin,
          operatingExpenses: Math.floor(store.bopExpenses),
          netProfit: Math.floor(netProfit),
          netProfitMargin,
        };
      });

      // Calculate summary metrics
      const grossProfit = summaryRevenue - summaryCOGS;
      const grossProfitMargin = summaryRevenue > 0 ? Math.round((grossProfit / summaryRevenue) * 100) : 0;
      const netProfit = grossProfit - summaryBOP;
      const netProfitMargin = summaryRevenue > 0 ? Math.round((netProfit / summaryRevenue) * 100) : 0;

      const reportData = {
        month,
        year,
        monthStart: monthStartStr,
        monthEnd: monthEndStr,
        summary: {
          totalRevenue: Math.floor(summaryRevenue),
          totalCOGS: Math.floor(summaryCOGS),
          grossProfit: Math.floor(grossProfit),
          grossProfitMargin,
          operatingExpenses: Math.floor(summaryBOP),
          netProfit: Math.floor(netProfit),
          netProfitMargin,
        },
        byStore,
      };

      // Cache the report
      await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);

      logger.info('Profit & Loss report generated', {
        userId: req.user?.id,
        month,
        year,
        storeCount: byStore.length,
        totalRevenue: summaryRevenue,
        netProfit,
        requestId: req.requestId,
      });

      res.status(200).json({
        data: reportData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reports/financial/inventory-valuation
 * Protected endpoint - returns inventory valuation report
 * Requires OWNER role
 *
 * Query parameters:
 * - date (optional): YYYY-MM-DD format, defaults to today
 *
 * Response (200):
 * {
 *   "data": {
 *     "date": "2024-01-15",
 *     "summary": {
 *       "totalInventoryValue": 50000000,
 *       "storeCount": 3,
 *       "warehouseValue": 10000000
 *     },
 *     "byStore": [
 *       {
 *         "storeId": "uuid",
 *         "storeName": "Toko Jakarta",
 *         "inventoryValue": 15000000,
 *         "itemCount": 500,
 *         "topItems": [...]
 *       }
 *     ],
 *     "warehouse": {
 *       "inventoryValue": 10000000,
 *       "itemCount": 100,
 *       "topItems": [...]
 *     }
 *   },
 *   "meta": { "timestamp": "...", "requestId": "..." }
 * }
 *
 * Requirements: 21.2, 21.3
 */
reportsRouter.get(
  '/financial/inventory-valuation',
  authorize('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dateParam = req.query.date as string;

      // Validate date format if provided
      if (dateParam) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(dateParam)) {
          throw new ApiError(
            'Invalid date format. Use YYYY-MM-DD',
            ApiErrorCode.BAD_REQUEST,
            400
          );
        }

        const parsed = new Date(dateParam + 'T00:00:00Z');
        if (isNaN(parsed.getTime())) {
          throw new ApiError(
            'Invalid date format. Use YYYY-MM-DD',
            ApiErrorCode.BAD_REQUEST,
            400
          );
        }
      }

      const targetDate = dateParam ? new Date(dateParam + 'T00:00:00Z') : new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);

      if (targetDate > today) {
        throw new ApiError(
          'Cannot query future dates',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      const dateString = targetDate.toISOString().split('T')[0];

      // Try to get from cache
      const cacheKey = `report:financial:inventory-valuation:${dateString}`;
      let cachedReport = await CacheService.get<any>(cacheKey);

      if (cachedReport) {
        logger.info('Inventory Valuation report retrieved from cache', {
          userId: req.user?.id,
          date: dateString,
          requestId: req.requestId,
        });

        return res.status(200).json({
          data: cachedReport,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
          },
        });
      }

      // Query inventory for all locations
      const inventoryResult = await db.query(`
        SELECT 
          i.store_id,
          s.name as store_name,
          i.product_id,
          p.name as product_name,
          i.quantity,
          p.cost_price::numeric,
          (i.quantity * p.cost_price::numeric) as item_value
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        LEFT JOIN stores s ON i.store_id = s.id
        WHERE i.quantity > 0
        ORDER BY 
          CASE WHEN i.store_id IS NULL THEN 0 ELSE 1 END,
          i.store_id,
          item_value DESC
      `);

      // Process results
      const storeMap = new Map<string, any>();
      let warehouseData = {
        inventoryValue: 0,
        itemCount: 0,
        items: [] as any[],
      };

      let totalInventoryValue = 0;
      let totalItems = 0;

      inventoryResult.rows.forEach((row: any) => {
        const itemValue = parseFloat(row.item_value) || 0;
        const quantity = parseInt(row.quantity) || 0;

        if (!row.store_id) {
          // Warehouse inventory
          warehouseData.inventoryValue += itemValue;
          warehouseData.itemCount += quantity;
          warehouseData.items.push({
            productId: row.product_id,
            productName: row.product_name,
            quantity,
            costPrice: parseFloat(row.cost_price) || 0,
            value: Math.floor(itemValue),
          });
        } else {
          // Store inventory
          if (!storeMap.has(row.store_id)) {
            storeMap.set(row.store_id, {
              storeId: row.store_id,
              storeName: row.store_name,
              inventoryValue: 0,
              itemCount: 0,
              items: [],
            });
          }

          const store = storeMap.get(row.store_id);
          store.inventoryValue += itemValue;
          store.itemCount += quantity;
          store.items.push({
            productId: row.product_id,
            productName: row.product_name,
            quantity,
            costPrice: parseFloat(row.cost_price) || 0,
            value: Math.floor(itemValue),
          });
        }

        totalInventoryValue += itemValue;
        totalItems += quantity;
      });

      // Convert maps to arrays and get top items per location (top 5)
      const byStore = Array.from(storeMap.values()).map((store: any) => ({
        storeId: store.storeId,
        storeName: store.storeName,
        inventoryValue: Math.floor(store.inventoryValue),
        itemCount: store.itemCount,
        topItems: store.items.slice(0, 5),
      }));

      warehouseData = {
        inventoryValue: Math.floor(warehouseData.inventoryValue),
        itemCount: warehouseData.itemCount,
        topItems: warehouseData.items.slice(0, 5),
      };

      const reportData = {
        date: dateString,
        summary: {
          totalInventoryValue: Math.floor(totalInventoryValue),
          storeCount: byStore.length,
          totalItemCount: totalItems,
          warehouseValue: warehouseData.inventoryValue,
        },
        byStore,
        warehouse: warehouseData,
      };

      // Cache the report
      await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);

      logger.info('Inventory Valuation report generated', {
        userId: req.user?.id,
        date: dateString,
        storeCount: byStore.length,
        totalInventoryValue,
        requestId: req.requestId,
      });

      res.status(200).json({
        data: reportData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reports/financial/cash-flow
 * Protected endpoint - returns cash flow report
 * Requires OWNER role
 *
 * Query parameters:
 * - month (required): Month number 1-12
 * - year (required): Year in YYYY format
 * - storeId (optional): Filter by specific store
 *
 * Response (200):
 * {
 *   "data": {
 *     "month": 1,
 *     "year": 2024,
 *     "monthStart": "2024-01-01",
 *     "monthEnd": "2024-01-31",
 *     "summary": {
 *       "operatingCashIn": 50000000,
 *       "operatingCashOut": 20000000,
 *       "operatingCashFlow": 30000000,
 *       "investingCashFlow": -5000000,
 *       "financingCashFlow": -2000000,
 *       "netCashFlow": 23000000
 *     },
 *     "byStore": [...]
 *   },
 *   "meta": { "timestamp": "...", "requestId": "..." }
 * }
 *
 * Requirements: 17.5, 17.6
 */
reportsRouter.get(
  '/financial/cash-flow',
  authorize('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const monthParam = req.query.month as string;
      const yearParam = req.query.year as string;
      const storeIdParam = req.query.storeId as string | undefined;

      // Validate month parameter
      if (!monthParam) {
        throw new ApiError(
          'Month parameter is required (1-12)',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      const month = parseInt(monthParam, 10);
      if (isNaN(month) || month < 1 || month > 12) {
        throw new ApiError(
          'Invalid month number. Must be between 1 and 12',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Validate year parameter
      if (!yearParam) {
        throw new ApiError(
          'Year parameter is required (YYYY format)',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      const year = parseInt(yearParam, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < currentYear - 2 || year > currentYear + 2) {
        throw new ApiError(
          `Year must be between ${currentYear - 2} and ${currentYear + 2}`,
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Check for future months
      const now = new Date();
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      if (monthStart > now) {
        throw new ApiError(
          'Cannot query future months',
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      const monthStartStr = monthStart.toISOString().split('T')[0];
      const lastDay = getLastDayOfMonth(month, year);
      const monthEnd = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      // Try to get from cache
      const cacheKey = `report:financial:cash-flow:${year}-${String(month).padStart(2, '0')}`;
      let cachedReport = await CacheService.get<any>(cacheKey);

      if (cachedReport) {
        logger.info('Cash Flow report retrieved from cache', {
          userId: req.user?.id,
          month,
          year,
          requestId: req.requestId,
        });

        return res.status(200).json({
          data: cachedReport,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId,
          },
        });
      }

      // Query cash flow data: transactions (cash in), purchase orders (cash out), payables (cash out)
      let query = `
        SELECT 
          s.id as store_id,
          s.name as store_name,
          COALESCE(SUM(CASE WHEN t.payment_method = 'CASH' AND t.status = 'COMPLETED' 
                            THEN t.total_amount ELSE 0 END)::numeric, 0) as cash_sales,
          COALESCE(SUM(CASE WHEN po.status = 'COMPLETED' 
                            THEN po.total_amount ELSE 0 END)::numeric, 0) as purchase_outflow,
          COALESCE(SUM(CASE WHEN p.status IN ('OPEN', 'PARTIAL') 
                            THEN p.amount ELSE 0 END)::numeric, 0) as payables_outstanding
        FROM stores s
        LEFT JOIN transactions t ON s.id = t.store_id 
          AND t.transaction_date >= $1 
          AND t.transaction_date <= $2
        LEFT JOIN purchase_orders po ON s.id = po.store_id 
          AND po.created_at >= $1 
          AND po.created_at <= $2
        LEFT JOIN payables p ON po.id = p.purchase_order_id
        WHERE s.is_active = true
      `;

      const params: any[] = [monthStart, monthEnd];

      if (storeIdParam) {
        query += ` AND s.id = $${params.length + 1}`;
        params.push(storeIdParam);
      }

      query += ` GROUP BY s.id, s.name
                 ORDER BY s.name`;

      const result = await db.query(query, params);

      // Process results
      const byStore = result.rows.map((row: any) => {
        const cashIn = parseFloat(row.cash_sales) || 0;
        const cashOut = parseFloat(row.purchase_outflow) || 0;
        const payablesOut = parseFloat(row.payables_outstanding) || 0;

        const operatingCashFlow = cashIn - cashOut;
        const investingCashFlow = -payablesOut; // Simplified: only payables as investing
        const netCashFlow = operatingCashFlow + investingCashFlow;

        return {
          storeId: row.store_id,
          storeName: row.store_name,
          operatingCashIn: Math.floor(cashIn),
          operatingCashOut: Math.floor(cashOut),
          operatingCashFlow: Math.floor(operatingCashFlow),
          investingCashFlow: Math.floor(investingCashFlow),
          financingCashFlow: 0,
          netCashFlow: Math.floor(netCashFlow),
        };
      });

      // Calculate summary
      let summaryOperatingIn = 0;
      let summaryOperatingOut = 0;
      let summaryInvestingFlow = 0;

      byStore.forEach((store: any) => {
        summaryOperatingIn += store.operatingCashIn;
        summaryOperatingOut += store.operatingCashOut;
        summaryInvestingFlow += store.investingCashFlow;
      });

      const summaryOperatingFlow = summaryOperatingIn - summaryOperatingOut;
      const summaryNetCashFlow = summaryOperatingFlow + summaryInvestingFlow;

      const reportData = {
        month,
        year,
        monthStart: monthStartStr,
        monthEnd: monthEndStr,
        summary: {
          operatingCashIn: summaryOperatingIn,
          operatingCashOut: summaryOperatingOut,
          operatingCashFlow: Math.floor(summaryOperatingFlow),
          investingCashFlow: Math.floor(summaryInvestingFlow),
          financingCashFlow: 0,
          netCashFlow: Math.floor(summaryNetCashFlow),
        },
        byStore,
      };

      // Cache the report
      await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);

      logger.info('Cash Flow report generated', {
        userId: req.user?.id,
        month,
        year,
        storeCount: byStore.length,
        netCashFlow: summaryNetCashFlow,
        requestId: req.requestId,
      });

      res.status(200).json({
        data: reportData,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/reports/bop
 * Protected endpoint - returns BOP (Biaya Operasional Penjualan) expense report
 * Requires OWNER role
 *
 * Query parameters:
 * - period (required): 'daily', 'weekly', 'monthly'
 * - date (required for daily): YYYY-MM-DD format
 * - week (required for weekly): Week number 1-53 (ISO week)
 * - month (required for monthly): Month number 1-12
 * - year (required for weekly/monthly): Year in YYYY format
 * - storeId (optional): Filter by specific store
 *
 * Response (200):
 * {
 *   "data": {
 *     "period": "monthly",
 *     "month": 1,
 *     "year": 2024,
 *     "monthStart": "2024-01-01",
 *     "monthEnd": "2024-01-31",
 *     "summary": {
 *       "totalBOP": 1500000,
 *       "storeCount": 3,
 *       "averageBOP": 500000
 *     },
 *     "byStore": [
 *       {
 *         "storeId": "uuid",
 *         "storeName": "Toko Jakarta",
 *         "totalBOP": 600000,
 *         "bopItems": [
 *           {
 *             "id": "bop-1",
 *             "name": "Listrik",
 *             "amount": 300000,
 *             "effectiveFrom": "2024-01-01",
 *             "effectiveTo": "2024-01-31"
 *           }
 *         ]
 *       }
 *     ]
 *   },
 *   "meta": { "timestamp": "...", "requestId": "..." }
 * }
 *
 * Requirements: 17.1, 17.2, 17.3
 */
reportsRouter.get(
  '/bop',
  authorize('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodParam = req.query.period as string;
      const storeIdParam = req.query.storeId as string | undefined;

      // Validate period parameter
      if (!periodParam || !['daily', 'weekly', 'monthly'].includes(periodParam)) {
        throw new ApiError(
          "Period parameter is required and must be 'daily', 'weekly', or 'monthly'",
          ApiErrorCode.BAD_REQUEST,
          400
        );
      }

      // Handle different periods
      if (periodParam === 'daily') {
        return handleBOPDailyReport(req, res, next, storeIdParam);
      } else if (periodParam === 'weekly') {
        return handleBOPWeeklyReport(req, res, next, storeIdParam);
      } else if (periodParam === 'monthly') {
        return handleBOPMonthlyReport(req, res, next, storeIdParam);
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Helper function to handle daily BOP report
 */
async function handleBOPDailyReport(
  req: Request,
  res: Response,
  next: NextFunction,
  storeIdParam?: string
) {
  try {
    const dateParam = req.query.date as string;

    if (!dateParam) {
      throw new ApiError(
        'Date parameter is required for daily report (YYYY-MM-DD)',
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateParam)) {
      throw new ApiError(
        'Invalid date format. Use YYYY-MM-DD',
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    const targetDate = new Date(dateParam + 'T00:00:00Z');
    if (isNaN(targetDate.getTime())) {
      throw new ApiError(
        'Invalid date format. Use YYYY-MM-DD',
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    // Check for future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate > today) {
      throw new ApiError(
        'Cannot query future dates',
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    const dateString = targetDate.toISOString().split('T')[0];

    // Try to get from cache
    const cacheKey = `report:bop:daily:${dateString}${storeIdParam ? `:${storeIdParam}` : ''}`;
    let cachedReport = await CacheService.get<any>(cacheKey);

    if (cachedReport) {
      logger.info('Daily BOP report retrieved from cache', {
        userId: req.user?.id,
        date: dateString,
        requestId: req.requestId,
      });

      return res.status(200).json({
        data: cachedReport,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    }

    // Query BOP records effective on the target date
    let query = `
      SELECT 
        b.id,
        b.store_id,
        b.name,
        b.description,
        b.amount,
        b.effective_from,
        b.effective_to,
        s.name as store_name
      FROM bop b
      JOIN stores s ON b.store_id = s.id
      WHERE b.effective_from <= $1
        AND (b.effective_to IS NULL OR b.effective_to >= $1)
        AND s.is_active = true
    `;

    const params: any[] = [dateString];

    if (storeIdParam) {
      query += ` AND b.store_id = $${params.length + 1}`;
      params.push(storeIdParam);
    }

    query += ` ORDER BY s.name, b.name`;

    const result = await db.query(query, params);

    // Process results to build the report structure
    const storeMap = new Map<string, any>();
    let summaryBOP = 0;

    result.rows.forEach((row: any) => {
      if (!storeMap.has(row.store_id)) {
        storeMap.set(row.store_id, {
          storeId: row.store_id,
          storeName: row.store_name,
          totalBOP: 0,
          bopItems: [],
        });
      }

      const store = storeMap.get(row.store_id);
      const amount = parseFloat(row.amount) || 0;

      const bopItem = {
        id: row.id,
        name: row.name,
        description: row.description,
        amount,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
      };

      store.bopItems.push(bopItem);
      store.totalBOP += amount;
      summaryBOP += amount;
    });

    const byStore = Array.from(storeMap.values());

    const reportData = {
      period: 'daily',
      date: dateString,
      summary: {
        totalBOP: Math.floor(summaryBOP),
        storeCount: byStore.length,
        averageBOP: byStore.length > 0 ? Math.floor(summaryBOP / byStore.length) : 0,
      },
      byStore: byStore.map((store: any) => ({
        ...store,
        totalBOP: Math.floor(store.totalBOP),
      })),
    };

    // Cache the report
    await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);

    logger.info('Daily BOP report generated', {
      userId: req.user?.id,
      date: dateString,
      storeCount: byStore.length,
      totalBOP: summaryBOP,
      requestId: req.requestId,
    });

    res.status(200).json({
      data: reportData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Helper function to handle weekly BOP report
 */
async function handleBOPWeeklyReport(
  req: Request,
  res: Response,
  next: NextFunction,
  storeIdParam?: string
) {
  try {
    const weekParam = req.query.week as string;
    const yearParam = req.query.year as string;

    if (!weekParam) {
      throw new ApiError(
        'Week parameter is required (1-53)',
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    const weekNum = parseInt(weekParam, 10);
    if (isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
      throw new ApiError(
        'Invalid week number. Must be between 1 and 53',
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    if (!yearParam) {
      throw new ApiError(
        'Year parameter is required (YYYY format)',
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    const yearNum = parseInt(yearParam, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(yearNum) || yearNum < currentYear - 2 || yearNum > currentYear + 2) {
      throw new ApiError(
        `Year must be between ${currentYear - 2} and ${currentYear + 2}`,
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    // Get week dates
    const { start: weekStart, end: weekEnd } = getISOWeekDates(weekNum, yearNum);
    const now = new Date();
    if (weekStart > now) {
      throw new ApiError(
        'Cannot query future weeks',
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    // Try to get from cache
    const cacheKey = `report:bop:weekly:${yearNum}-W${String(weekNum).padStart(2, '0')}${
      storeIdParam ? `:${storeIdParam}` : ''
    }`;
    let cachedReport = await CacheService.get<any>(cacheKey);

    if (cachedReport) {
      logger.info('Weekly BOP report retrieved from cache', {
        userId: req.user?.id,
        week: weekNum,
        year: yearNum,
        requestId: req.requestId,
      });

      return res.status(200).json({
        data: cachedReport,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    }

    // Query BOP records that overlap with the week
    let query = `
      SELECT 
        b.id,
        b.store_id,
        b.name,
        b.description,
        b.amount,
        b.effective_from,
        b.effective_to,
        s.name as store_name
      FROM bop b
      JOIN stores s ON b.store_id = s.id
      WHERE b.effective_from <= $2
        AND (b.effective_to IS NULL OR b.effective_to >= $1)
        AND s.is_active = true
    `;

    const params: any[] = [weekStartStr, weekEndStr];

    if (storeIdParam) {
      query += ` AND b.store_id = $${params.length + 1}`;
      params.push(storeIdParam);
    }

    query += ` ORDER BY s.name, b.name`;

    const result = await db.query(query, params);

    // Process results
    const storeMap = new Map<string, any>();
    let summaryBOP = 0;

    result.rows.forEach((row: any) => {
      if (!storeMap.has(row.store_id)) {
        storeMap.set(row.store_id, {
          storeId: row.store_id,
          storeName: row.store_name,
          totalBOP: 0,
          bopItems: [],
        });
      }

      const store = storeMap.get(row.store_id);
      const amount = parseFloat(row.amount) || 0;

      const bopItem = {
        id: row.id,
        name: row.name,
        description: row.description,
        amount,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
      };

      store.bopItems.push(bopItem);
      store.totalBOP += amount;
      summaryBOP += amount;
    });

    const byStore = Array.from(storeMap.values());

    const reportData = {
      period: 'weekly',
      week: weekNum,
      year: yearNum,
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      summary: {
        totalBOP: Math.floor(summaryBOP),
        storeCount: byStore.length,
        averageBOP: byStore.length > 0 ? Math.floor(summaryBOP / byStore.length) : 0,
      },
      byStore: byStore.map((store: any) => ({
        ...store,
        totalBOP: Math.floor(store.totalBOP),
      })),
    };

    // Cache the report
    await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);

    logger.info('Weekly BOP report generated', {
      userId: req.user?.id,
      week: weekNum,
      year: yearNum,
      storeCount: byStore.length,
      totalBOP: summaryBOP,
      requestId: req.requestId,
    });

    res.status(200).json({
      data: reportData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Helper function to handle monthly BOP report
 */
async function handleBOPMonthlyReport(
  req: Request,
  res: Response,
  next: NextFunction,
  storeIdParam?: string
) {
  try {
    const monthParam = req.query.month as string;
    const yearParam = req.query.year as string;

    if (!monthParam) {
      throw new ApiError(
        'Month parameter is required (1-12)',
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    const month = parseInt(monthParam, 10);
    if (isNaN(month) || month < 1 || month > 12) {
      throw new ApiError(
        'Invalid month number. Must be between 1 and 12',
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    if (!yearParam) {
      throw new ApiError(
        'Year parameter is required (YYYY format)',
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    const year = parseInt(yearParam, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < currentYear - 2 || year > currentYear + 2) {
      throw new ApiError(
        `Year must be between ${currentYear - 2} and ${currentYear + 2}`,
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    const now = new Date();
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    if (monthStart > now) {
      throw new ApiError(
        'Cannot query future months',
        ApiErrorCode.BAD_REQUEST,
        400
      );
    }

    const monthStartStr = monthStart.toISOString().split('T')[0];
    const lastDay = getLastDayOfMonth(month, year);
    const monthEnd = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));
    const monthEndStr = monthEnd.toISOString().split('T')[0];

    // Try to get from cache
    const cacheKey = `report:bop:monthly:${year}-${String(month).padStart(2, '0')}${
      storeIdParam ? `:${storeIdParam}` : ''
    }`;
    let cachedReport = await CacheService.get<any>(cacheKey);

    if (cachedReport) {
      logger.info('Monthly BOP report retrieved from cache', {
        userId: req.user?.id,
        month,
        year,
        requestId: req.requestId,
      });

      return res.status(200).json({
        data: cachedReport,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    }

    // Query BOP records that overlap with the month
    let query = `
      SELECT 
        b.id,
        b.store_id,
        b.name,
        b.description,
        b.amount,
        b.effective_from,
        b.effective_to,
        s.name as store_name
      FROM bop b
      JOIN stores s ON b.store_id = s.id
      WHERE b.effective_from <= $2
        AND (b.effective_to IS NULL OR b.effective_to >= $1)
        AND s.is_active = true
    `;

    const params: any[] = [monthStartStr, monthEndStr];

    if (storeIdParam) {
      query += ` AND b.store_id = $${params.length + 1}`;
      params.push(storeIdParam);
    }

    query += ` ORDER BY s.name, b.name`;

    const result = await db.query(query, params);

    // Process results
    const storeMap = new Map<string, any>();
    let summaryBOP = 0;

    result.rows.forEach((row: any) => {
      if (!storeMap.has(row.store_id)) {
        storeMap.set(row.store_id, {
          storeId: row.store_id,
          storeName: row.store_name,
          totalBOP: 0,
          bopItems: [],
        });
      }

      const store = storeMap.get(row.store_id);
      const amount = parseFloat(row.amount) || 0;

      const bopItem = {
        id: row.id,
        name: row.name,
        description: row.description,
        amount,
        effectiveFrom: row.effective_from,
        effectiveTo: row.effective_to,
      };

      store.bopItems.push(bopItem);
      store.totalBOP += amount;
      summaryBOP += amount;
    });

    const byStore = Array.from(storeMap.values());

    const reportData = {
      period: 'monthly',
      month,
      year,
      monthStart: monthStartStr,
      monthEnd: monthEndStr,
      summary: {
        totalBOP: Math.floor(summaryBOP),
        storeCount: byStore.length,
        averageBOP: byStore.length > 0 ? Math.floor(summaryBOP / byStore.length) : 0,
      },
      byStore: byStore.map((store: any) => ({
        ...store,
        totalBOP: Math.floor(store.totalBOP),
      })),
    };

    // Cache the report
    await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);

    logger.info('Monthly BOP report generated', {
      userId: req.user?.id,
      month,
      year,
      storeCount: byStore.length,
      totalBOP: summaryBOP,
      requestId: req.requestId,
    });

    res.status(200).json({
      data: reportData,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/reports/bop/export/pdf
 * Export BOP report to PDF
 * Task 94: Implement BOP report export (PDF/Excel)
 * Requirements: 17.5
 *
 * Query parameters:
 * - period (required): 'daily', 'weekly', or 'monthly'
 * - month (for monthly): Month number 1-12
 * - year (for monthly): Year in YYYY format
 * - week (for weekly): Week number 1-53
 * - year (for weekly): Year in YYYY format
 * - date (for daily): Date in YYYY-MM-DD format
 * - storeId (optional): Filter by specific store
 *
 * Response: PDF file with BOP report data
 */
reportsRouter.get(
  '/bop/export/pdf',
  authorize('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { period, month, year, week, date, storeId } = req.query;

      // Validate period
      if (!period || !['daily', 'weekly', 'monthly'].includes(period as string)) {
        return res.status(400).json({ error: 'Invalid period. Must be daily, weekly, or monthly' });
      }

      // Build appropriate report data based on period
      let reportData: any;
      let filename: string;

      if (period === 'daily') {
        // Get daily BOP report
        const dateStr = (date as string) || new Date().toISOString().split('T')[0];
        const cacheKey = `report:bop:daily:${dateStr}`;
        reportData = await CacheService.get<any>(cacheKey);

        if (!reportData) {
          // Fetch daily report data
          const todayStart = new Date(dateStr + 'T00:00:00Z');
          const todayEnd = new Date(dateStr + 'T23:59:59Z');

          const result = await db.query(
            `SELECT 
              b.id, b.name, b.description, b.amount,
              s.id as store_id, s.name as store_name
            FROM bop b
            JOIN stores s ON b.store_id = s.id
            WHERE b.effective_from <= $1
              AND (b.effective_to IS NULL OR b.effective_to >= $2)
              AND s.is_active = true
            ${storeId ? 'AND s.id = $3' : ''}
            ORDER BY s.name, b.name`,
            storeId ? [todayEnd, todayStart, storeId] : [todayEnd, todayStart]
          );

          const storeMap = new Map<string, any>();
          let summaryBOP = 0;

          result.rows.forEach((row: any) => {
            if (!storeMap.has(row.store_id)) {
              storeMap.set(row.store_id, {
                storeId: row.store_id,
                storeName: row.store_name,
                totalBOP: 0,
                items: [],
              });
            }

            const store = storeMap.get(row.store_id);
            const amount = parseFloat(row.amount) || 0;
            store.items.push({
              id: row.id,
              name: row.name,
              description: row.description,
              amount,
            });
            store.totalBOP += amount;
            summaryBOP += amount;
          });

          reportData = {
            period: 'daily',
            date: dateStr,
            summary: { totalBOP: Math.floor(summaryBOP), storeCount: storeMap.size },
            byStore: Array.from(storeMap.values()),
          };

          await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);
        }

        filename = `BOP_Report_Daily_${(date as string) || new Date().toISOString().split('T')[0]}.pdf`;
      } else if (period === 'weekly') {
        // Get weekly BOP report
        const weekNum = parseInt(week as string) || 1;
        const yearNum = parseInt(year as string) || new Date().getFullYear();
        const cacheKey = `report:bop:weekly:${yearNum}-W${String(weekNum).padStart(2, '0')}`;
        reportData = await CacheService.get<any>(cacheKey);

        if (!reportData) {
          // Similar logic to daily but for week
          const { start: weekStart, end: weekEnd } = getISOWeekDates(weekNum, yearNum);

          const result = await db.query(
            `SELECT 
              b.id, b.name, b.description, b.amount,
              s.id as store_id, s.name as store_name
            FROM bop b
            JOIN stores s ON b.store_id = s.id
            WHERE b.effective_from <= $1
              AND (b.effective_to IS NULL OR b.effective_to >= $2)
              AND s.is_active = true
            ${storeId ? 'AND s.id = $3' : ''}
            ORDER BY s.name, b.name`,
            storeId ? [weekEnd, weekStart, storeId] : [weekEnd, weekStart]
          );

          const storeMap = new Map<string, any>();
          let summaryBOP = 0;

          result.rows.forEach((row: any) => {
            if (!storeMap.has(row.store_id)) {
              storeMap.set(row.store_id, {
                storeId: row.store_id,
                storeName: row.store_name,
                totalBOP: 0,
                items: [],
              });
            }

            const store = storeMap.get(row.store_id);
            const amount = parseFloat(row.amount) || 0;
            store.items.push({
              id: row.id,
              name: row.name,
              description: row.description,
              amount,
            });
            store.totalBOP += amount;
            summaryBOP += amount;
          });

          reportData = {
            period: 'weekly',
            week: weekNum,
            year: yearNum,
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            summary: { totalBOP: Math.floor(summaryBOP), storeCount: storeMap.size },
            byStore: Array.from(storeMap.values()),
          };

          await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);
        }

        filename = `BOP_Report_Weekly_${yearNum}_W${String(weekNum).padStart(2, '0')}.pdf`;
      } else {
        // Monthly BOP report
        const monthNum = parseInt(month as string) || new Date().getMonth() + 1;
        const yearNum = parseInt(year as string) || new Date().getFullYear();
        const cacheKey = `report:bop:monthly:${yearNum}-${String(monthNum).padStart(2, '0')}`;
        reportData = await CacheService.get<any>(cacheKey);

        if (!reportData) {
          // Fetch monthly report data
          const monthStart = new Date(Date.UTC(yearNum, monthNum - 1, 1));
          const lastDay = getLastDayOfMonth(monthNum, yearNum);
          const monthEnd = new Date(Date.UTC(yearNum, monthNum - 1, lastDay, 23, 59, 59, 999));

          const result = await db.query(
            `SELECT 
              b.id, b.name, b.description, b.amount,
              s.id as store_id, s.name as store_name
            FROM bop b
            JOIN stores s ON b.store_id = s.id
            WHERE b.effective_from <= $1
              AND (b.effective_to IS NULL OR b.effective_to >= $2)
              AND s.is_active = true
            ${storeId ? 'AND s.id = $3' : ''}
            ORDER BY s.name, b.name`,
            storeId ? [monthEnd, monthStart, storeId] : [monthEnd, monthStart]
          );

          const storeMap = new Map<string, any>();
          let summaryBOP = 0;

          result.rows.forEach((row: any) => {
            if (!storeMap.has(row.store_id)) {
              storeMap.set(row.store_id, {
                storeId: row.store_id,
                storeName: row.store_name,
                totalBOP: 0,
                items: [],
              });
            }

            const store = storeMap.get(row.store_id);
            const amount = parseFloat(row.amount) || 0;
            store.items.push({
              id: row.id,
              name: row.name,
              description: row.description,
              amount,
            });
            store.totalBOP += amount;
            summaryBOP += amount;
          });

          reportData = {
            period: 'monthly',
            month: monthNum,
            year: yearNum,
            monthStart: monthStart.toISOString().split('T')[0],
            monthEnd: monthEnd.toISOString().split('T')[0],
            summary: { totalBOP: Math.floor(summaryBOP), storeCount: storeMap.size },
            byStore: Array.from(storeMap.values()),
          };

          await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);
        }

        filename = `BOP_Report_Monthly_${yearNum}_${String(monthNum).padStart(2, '0')}.pdf`;
      }

      // For now, return JSON with export data
      // Frontend will handle PDF generation using jsPDF
      // This allows for flexible formatting and logo inclusion
      res.status(200).json({
        data: reportData,
        filename,
        format: 'pdf',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      logger.error('Error exporting BOP report to PDF:', error as Error);
      next(error);
    }
  }
);

/**
 * GET /api/v1/reports/bop/export/excel
 * Export BOP report to Excel (CSV format)
 * Task 94: Implement BOP report export (PDF/Excel)
 * Requirements: 17.5
 *
 * Query parameters (same as PDF export)
 * Response: CSV file with BOP report data
 */
reportsRouter.get(
  '/bop/export/excel',
  authorize('OWNER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { period, month, year, week, date, storeId } = req.query;

      // Validate period
      if (!period || !['daily', 'weekly', 'monthly'].includes(period as string)) {
        return res.status(400).json({ error: 'Invalid period. Must be daily, weekly, or monthly' });
      }

      // Build appropriate report data based on period (same logic as PDF export)
      let reportData: any;
      let filename: string;

      if (period === 'daily') {
        const dateStr = (date as string) || new Date().toISOString().split('T')[0];
        const cacheKey = `report:bop:daily:${dateStr}`;
        reportData = await CacheService.get<any>(cacheKey);

        if (!reportData) {
          const todayStart = new Date(dateStr + 'T00:00:00Z');
          const todayEnd = new Date(dateStr + 'T23:59:59Z');

          const result = await db.query(
            `SELECT 
              b.id, b.name, b.description, b.amount,
              s.id as store_id, s.name as store_name
            FROM bop b
            JOIN stores s ON b.store_id = s.id
            WHERE b.effective_from <= $1
              AND (b.effective_to IS NULL OR b.effective_to >= $2)
              AND s.is_active = true
            ${storeId ? 'AND s.id = $3' : ''}
            ORDER BY s.name, b.name`,
            storeId ? [todayEnd, todayStart, storeId] : [todayEnd, todayStart]
          );

          const storeMap = new Map<string, any>();
          let summaryBOP = 0;

          result.rows.forEach((row: any) => {
            if (!storeMap.has(row.store_id)) {
              storeMap.set(row.store_id, {
                storeId: row.store_id,
                storeName: row.store_name,
                totalBOP: 0,
                items: [],
              });
            }

            const store = storeMap.get(row.store_id);
            const amount = parseFloat(row.amount) || 0;
            store.items.push({
              id: row.id,
              name: row.name,
              description: row.description,
              amount,
            });
            store.totalBOP += amount;
            summaryBOP += amount;
          });

          reportData = {
            period: 'daily',
            date: dateStr,
            summary: { totalBOP: Math.floor(summaryBOP), storeCount: storeMap.size },
            byStore: Array.from(storeMap.values()),
          };

          await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);
        }

        filename = `BOP_Report_Daily_${(date as string) || new Date().toISOString().split('T')[0]}.csv`;
      } else if (period === 'weekly') {
        const weekNum = parseInt(week as string) || 1;
        const yearNum = parseInt(year as string) || new Date().getFullYear();
        const cacheKey = `report:bop:weekly:${yearNum}-W${String(weekNum).padStart(2, '0')}`;
        reportData = await CacheService.get<any>(cacheKey);

        if (!reportData) {
          const { start: weekStart, end: weekEnd } = getISOWeekDates(weekNum, yearNum);

          const result = await db.query(
            `SELECT 
              b.id, b.name, b.description, b.amount,
              s.id as store_id, s.name as store_name
            FROM bop b
            JOIN stores s ON b.store_id = s.id
            WHERE b.effective_from <= $1
              AND (b.effective_to IS NULL OR b.effective_to >= $2)
              AND s.is_active = true
            ${storeId ? 'AND s.id = $3' : ''}
            ORDER BY s.name, b.name`,
            storeId ? [weekEnd, weekStart, storeId] : [weekEnd, weekStart]
          );

          const storeMap = new Map<string, any>();
          let summaryBOP = 0;

          result.rows.forEach((row: any) => {
            if (!storeMap.has(row.store_id)) {
              storeMap.set(row.store_id, {
                storeId: row.store_id,
                storeName: row.store_name,
                totalBOP: 0,
                items: [],
              });
            }

            const store = storeMap.get(row.store_id);
            const amount = parseFloat(row.amount) || 0;
            store.items.push({
              id: row.id,
              name: row.name,
              description: row.description,
              amount,
            });
            store.totalBOP += amount;
            summaryBOP += amount;
          });

          reportData = {
            period: 'weekly',
            week: weekNum,
            year: yearNum,
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            summary: { totalBOP: Math.floor(summaryBOP), storeCount: storeMap.size },
            byStore: Array.from(storeMap.values()),
          };

          await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);
        }

        filename = `BOP_Report_Weekly_${yearNum}_W${String(weekNum).padStart(2, '0')}.csv`;
      } else {
        const monthNum = parseInt(month as string) || new Date().getMonth() + 1;
        const yearNum = parseInt(year as string) || new Date().getFullYear();
        const cacheKey = `report:bop:monthly:${yearNum}-${String(monthNum).padStart(2, '0')}`;
        reportData = await CacheService.get<any>(cacheKey);

        if (!reportData) {
          const monthStart = new Date(Date.UTC(yearNum, monthNum - 1, 1));
          const lastDay = getLastDayOfMonth(monthNum, yearNum);
          const monthEnd = new Date(Date.UTC(yearNum, monthNum - 1, lastDay, 23, 59, 59, 999));

          const result = await db.query(
            `SELECT 
              b.id, b.name, b.description, b.amount,
              s.id as store_id, s.name as store_name
            FROM bop b
            JOIN stores s ON b.store_id = s.id
            WHERE b.effective_from <= $1
              AND (b.effective_to IS NULL OR b.effective_to >= $2)
              AND s.is_active = true
            ${storeId ? 'AND s.id = $3' : ''}
            ORDER BY s.name, b.name`,
            storeId ? [monthEnd, monthStart, storeId] : [monthEnd, monthStart]
          );

          const storeMap = new Map<string, any>();
          let summaryBOP = 0;

          result.rows.forEach((row: any) => {
            if (!storeMap.has(row.store_id)) {
              storeMap.set(row.store_id, {
                storeId: row.store_id,
                storeName: row.store_name,
                totalBOP: 0,
                items: [],
              });
            }

            const store = storeMap.get(row.store_id);
            const amount = parseFloat(row.amount) || 0;
            store.items.push({
              id: row.id,
              name: row.name,
              description: row.description,
              amount,
            });
            store.totalBOP += amount;
            summaryBOP += amount;
          });

          reportData = {
            period: 'monthly',
            month: monthNum,
            year: yearNum,
            monthStart: monthStart.toISOString().split('T')[0],
            monthEnd: monthEnd.toISOString().split('T')[0],
            summary: { totalBOP: Math.floor(summaryBOP), storeCount: storeMap.size },
            byStore: Array.from(storeMap.values()),
          };

          await CacheService.set(cacheKey, reportData, cacheTTL.REPORT);
        }

        filename = `BOP_Report_Monthly_${yearNum}_${String(monthNum).padStart(2, '0')}.csv`;
      }

      // For now, return JSON with export data
      // Frontend will handle CSV generation
      res.status(200).json({
        data: reportData,
        filename,
        format: 'excel',
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (error) {
      logger.error('Error exporting BOP report to Excel:', error as Error);
      next(error);
    }
  }
);

export default reportsRouter;
