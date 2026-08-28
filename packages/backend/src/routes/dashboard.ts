/**
 * Dashboard routes
 * Handles dashboard data for kasir and owner roles
 */

import express, { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError, ApiErrorCode } from '../utils/errors.js';
import { db } from '../database/index.js';

export const dashboardRouter = express.Router() as ReturnType<typeof express.Router>;

// Apply authentication middleware to all dashboard routes
dashboardRouter.use(requireAuth());

/**
 * GET /api/v1/dashboard/kasir/daily-stats
 * Protected endpoint - returns daily statistics for kasir dashboard
 * Requires KASIR or OWNER role
 *
 * Query parameters:
 * - date (optional): YYYY-MM-DD format, defaults to today
 *
 * Response (200):
 * {
 *   "data": {
 *     "totalSales": 1500000,
 *     "transactionCount": 12,
 *     "bop": {
 *       "id": "bop-id",
 *       "storeId": "store-id",
 *       "name": "Daily BOP",
 *       "amount": 50000,
 *       "effectiveFrom": "2024-01-15"
 *     },
 *     "date": "2024-01-15"
 *   },
 *   "meta": {
 *     "timestamp": "2024-01-15T10:30:00.000Z",
 *     "requestId": "req-123"
 *   }
 * }
 *
 * Response (401):
 * {
 *   "error": {
 *     "message": "Authentication required",
 *     "code": "UNAUTHORIZED",
 *     "statusCode": 401
 *   },
 *   "requestId": "req-123"
 * }
 */
dashboardRouter.get(
  '/kasir/daily-stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify user is authenticated and has appropriate role
      if (!req.user || (req.user.role !== 'KASIR' && req.user.role !== 'OWNER')) {
        throw new ApiError(
          'Kasir or Owner role required',
          ApiErrorCode.FORBIDDEN,
          403
        );
      }

      // Get date from query or use today
      const dateParam = req.query.date as string;
      const targetDate = dateParam ? new Date(dateParam) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // For KASIR, use their store. For OWNER, accept storeId query param
      let storeId = req.user.storeId;
      if (req.user.role === 'OWNER' && req.query.storeId) {
        storeId = req.query.storeId as string;
      }

      // Query transactions for the day
      const transactionsResult = await db.query(
        `
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_sales,
          COUNT(*) as transaction_count
        FROM transactions
        WHERE store_id = $1 
          AND transaction_date >= $2 
          AND transaction_date <= $3
          AND status = 'COMPLETED'
        `,
        [storeId, startOfDay, endOfDay]
      );

      const transactions = transactionsResult.rows[0];

      // Query BOP for the store (most recent effective one)
      const bopResult = await db.query(
        `
        SELECT 
          id,
          store_id as "storeId",
          name,
          description,
          amount,
          effective_from as "effectiveFrom",
          effective_to as "effectiveTo"
        FROM bop
        WHERE store_id = $1 
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        ORDER BY effective_from DESC
        LIMIT 1
        `,
        [storeId]
      );

      const bop = bopResult.rows[0] || null;

      logger.info('Kasir daily stats fetched', {
        userId: req.user.id,
        storeId,
        date: targetDate.toISOString().split('T')[0],
        requestId: req.requestId,
      });

      res.status(200).json({
        data: {
          totalSales: parseFloat(transactions.total_sales) || 0,
          transactionCount: parseInt(transactions.transaction_count) || 0,
          bop,
          date: targetDate.toISOString().split('T')[0],
        },
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
 * GET /api/v1/dashboard/owner/summary
 * Protected endpoint - returns overall dashboard summary for owner
 * Requires OWNER role
 *
 * Response (200):
 * {
 *   "data": {
 *     "totalRevenue": 5000000,
 *     "totalProfit": 2500000,
 *     "totalCapital": 10000000,
 *     "storeCount": 3,
 *     "todayRevenue": 1500000,
 *     "todayTransactionCount": 25
 *   },
 *   "meta": {
 *     "timestamp": "2024-01-15T10:30:00.000Z",
 *     "requestId": "req-123"
 *   }
 * }
 */
dashboardRouter.get(
  '/owner/summary',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Verify user is authenticated and is owner
      if (!req.user || req.user.role !== 'OWNER') {
        throw new ApiError(
          'Owner role required',
          ApiErrorCode.FORBIDDEN,
          403
        );
      }

      // Get today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      // Query today's revenue and transaction count across all stores
      const todayResult = await db.query(
        `
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COUNT(*) as transaction_count
        FROM transactions
        WHERE transaction_date >= $1 
          AND transaction_date <= $2
          AND status = 'COMPLETED'
        `,
        [today, endOfDay]
      );

      const todayData = todayResult.rows[0];

      // Query store count
      const storeCountResult = await db.query(
        `SELECT COUNT(*) as count FROM stores WHERE is_active = true`
      );

      const storeCount = parseInt(storeCountResult.rows[0].count);

      logger.info('Owner dashboard summary fetched', {
        userId: req.user.id,
        requestId: req.requestId,
      });

      res.status(200).json({
        data: {
          totalRevenue: parseFloat(todayData.total_revenue) || 0,
          totalProfit: Math.floor((parseFloat(todayData.total_revenue) || 0) * 0.5), // Placeholder
          totalCapital: 10000000, // Placeholder - should be calculated from inventory
          storeCount,
          todayRevenue: parseFloat(todayData.total_revenue) || 0,
          todayTransactionCount: parseInt(todayData.transaction_count) || 0,
        },
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

export default dashboardRouter;
