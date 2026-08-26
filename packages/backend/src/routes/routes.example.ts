/**
 * EXAMPLE: Protected routes with role-based and store-based access control
 * 
 * This file demonstrates various patterns for implementing authorization
 * in actual route handlers.
 */

import express, { Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { authorize, authorizeStore, authorizeResourceOwnership } from '../middleware/authorize.js';
import { db } from '../database/index.js';

const router = express.Router() as ReturnType<typeof express.Router>;

/**
 * ============================================================
 * STORES ROUTES
 * ============================================================
 */

/**
 * GET /api/v1/stores
 * Allowed roles: OWNER (all), KASIR (own store)
 * 
 * OWNER gets all stores
 * KASIR gets only their assigned store
 * 
 * Response (200):
 * {
 *   "stores": [
 *     {
 *       "id": "store-1",
 *       "name": "Vapestore Downtown",
 *       "address": "123 Main St",
 *       "phone": "555-0123"
 *     }
 *   ]
 * }
 */
router.get('/stores', authorize(['OWNER', 'KASIR']), async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    let query = 'SELECT * FROM stores WHERE is_active = true';
    const params: any[] = [];

    // KASIR can only see their assigned store
    if (user.role === 'KASIR' && user.storeId) {
      query += ' AND id = $1';
      params.push(user.storeId);
    }

    const result = await db.query(query, params);

    res.json({
      stores: result.rows,
    });
  } catch (error) {
    logger.error('Get stores error', error as Error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/v1/stores/:storeId
 * Allowed roles: OWNER (any store), KASIR (own store)
 * 
 * Uses authorizeStore middleware to check KASIR store access
 */
router.get(
  '/stores/:storeId',
  authorize(['OWNER', 'KASIR']),
  authorizeStore('storeId'),
  async (req: Request, res: Response) => {
    try {
      const { storeId } = req.params;

      const result = await db.query('SELECT * FROM stores WHERE id = $1', [storeId]);

      if (!result.rows[0]) {
        return res.status(404).json({
          error: 'Not Found',
          code: 'STORE_NOT_FOUND',
          message: 'Store not found',
        });
      }

      res.json({
        store: result.rows[0],
      });
    } catch (error) {
      logger.error('Get store error', error as Error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * POST /api/v1/stores
 * Allowed roles: OWNER only
 * 
 * Request body:
 * {
 *   "name": "New Store",
 *   "address": "456 Oak Ave",
 *   "phone": "555-4567",
 *   "operatingHours": { "monday": "09:00-21:00" }
 * }
 */
router.post('/stores', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const { name, address, phone, operatingHours } = req.body;

    if (!name) {
      return res.status(400).json({
        error: 'Bad Request',
        code: 'MISSING_STORE_NAME',
        message: 'Store name is required',
      });
    }

    // TODO: Insert store into database
    const storeId = 'new-store-id';

    res.status(201).json({
      store: {
        id: storeId,
        name,
        address,
        phone,
        operatingHours,
      },
    });
  } catch (error) {
    logger.error('Create store error', error as Error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * PUT /api/v1/stores/:storeId
 * Allowed roles: OWNER only
 */
router.put('/stores/:storeId', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;
    const { name, address, phone, operatingHours } = req.body;

    // TODO: Update store in database

    res.json({
      store: {
        id: storeId,
        name,
        address,
        phone,
        operatingHours,
      },
    });
  } catch (error) {
    logger.error('Update store error', error as Error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * ============================================================
 * TRANSACTIONS ROUTES
 * ============================================================
 */

/**
 * POST /api/v1/transactions
 * Allowed roles: OWNER (any store), KASIR (own store)
 * 
 * KASIR can only create transactions for their assigned store
 * OWNER can create transactions for any store
 */
router.post(
  '/transactions',
  authorize(['OWNER', 'KASIR']),
  authorizeStore('storeId'),
  async (req: Request, res: Response) => {
    try {
      const { storeId, items, paymentMethod } = req.body;
      const userId = req.user!.id;

      if (!storeId || !items || !paymentMethod) {
        return res.status(400).json({
          error: 'Bad Request',
          code: 'MISSING_FIELDS',
          message: 'storeId, items, and paymentMethod are required',
        });
      }

      // TODO: Create transaction in database
      const transactionId = 'new-transaction-id';

      res.status(201).json({
        transaction: {
          id: transactionId,
          storeId,
          kasirId: userId,
          items,
          paymentMethod,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error('Create transaction error', error as Error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * GET /api/v1/transactions
 * Allowed roles: OWNER (all stores), KASIR (own store)
 * 
 * Query params:
 * - storeId: filter by store (KASIR must use their own store)
 * - page: pagination
 * - limit: items per page
 */
router.get(
  '/transactions',
  authorize(['OWNER', 'KASIR']),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      let storeId = req.query.storeId as string;

      // KASIR can only query their own store
      if (user.role === 'KASIR' && user.storeId) {
        if (storeId && storeId !== user.storeId) {
          return res.status(403).json({
            error: 'Forbidden',
            code: 'FORBIDDEN',
            message: 'Kasir can only access their own store data',
          });
        }
        storeId = user.storeId;
      }

      // TODO: Query transactions
      const transactions = [];

      res.json({
        transactions,
        total: 0,
      });
    } catch (error) {
      logger.error('Get transactions error', error as Error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * PUT /api/v1/transactions/:transactionId
 * Allowed roles: OWNER, KASIR (if they created it)
 * 
 * Uses authorizeResourceOwnership to verify the kasir owns the transaction
 */

const checkTransactionOwnership = async (req: Request): Promise<boolean> => {
  const { transactionId } = req.params;
  const userId = req.user!.id;

  const result = await db.query('SELECT kasir_id FROM transactions WHERE id = $1', [transactionId]);

  if (!result.rows[0]) {
    throw new Error('Transaction not found');
  }

  // Transaction belongs to this user
  return result.rows[0].kasir_id === userId;
};

router.put(
  '/transactions/:transactionId',
  authorize(['OWNER', 'KASIR']),
  authorizeResourceOwnership(checkTransactionOwnership),
  async (req: Request, res: Response) => {
    try {
      const { transactionId } = req.params;
      const updates = req.body;

      // TODO: Update transaction in database

      res.json({
        transaction: {
          id: transactionId,
          ...updates,
        },
      });
    } catch (error) {
      logger.error('Update transaction error', error as Error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * ============================================================
 * REPORTS ROUTES
 * ============================================================
 */

/**
 * GET /api/v1/reports/daily
 * Allowed roles: OWNER only
 * 
 * Query params:
 * - date: YYYY-MM-DD format
 * - storeId: optional, filter to specific store
 */
router.get('/reports/daily', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const { date, storeId } = req.query;

    // TODO: Generate daily report

    res.json({
      date,
      storeId: storeId || 'all',
      totalSales: 0,
      transactionCount: 0,
    });
  } catch (error) {
    logger.error('Get daily report error', error as Error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/v1/reports/bop
 * Allowed roles: OWNER (all stores), KASIR (own store only)
 */
router.get('/reports/bop', authorize(['OWNER', 'KASIR']), async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    let storeId = req.query.storeId as string;

    // KASIR can only see their own store BOP
    if (user.role === 'KASIR' && user.storeId) {
      if (storeId && storeId !== user.storeId) {
        return res.status(403).json({
          error: 'Forbidden',
          code: 'FORBIDDEN',
          message: 'Kasir can only access their own store BOP',
        });
      }
      storeId = user.storeId;
    }

    // TODO: Generate BOP report

    res.json({
      storeId: storeId || 'all',
      bopItems: [],
      totalBop: 0,
    });
  } catch (error) {
    logger.error('Get BOP report error', error as Error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
