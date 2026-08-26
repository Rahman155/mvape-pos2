/**
 * Stock Opname Routes
 * Handles physical inventory counting (stock opname) operations
 * Requirements: 13.1 - 13.7
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { redis } from '../cache/index.js';

const router = Router() as ReturnType<typeof Router>;

/**
 * POST /api/stock-opname/initiate
 * Start a new stock opname session
 * Requirements: 13.1, 13.2
 */
router.post('/initiate', requireAuth(), async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const { storeId } = req.body;
    const userId = req.user?.id;

    // Validate store exists and user has access (owner only)
    if (!storeId) {
      return res.status(400).json({
        error: 'Store ID is required',
        code: 'INVALID_REQUEST',
      });
    }

    // Check user role (owner-only operation)
    const userCheck = await client.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'OWNER') {
      return res.status(403).json({
        error: 'Only owners can initiate stock opname',
        code: 'FORBIDDEN',
      });
    }

    // Verify store exists
    const storeCheck = await client.query('SELECT id FROM stores WHERE id = $1', [
      storeId,
    ]);

    if (storeCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Store not found',
        code: 'NOT_FOUND',
      });
    }

    // Create opname session
    const opnameResult = await client.query(
      `INSERT INTO stock_opnames (store_id, conducted_by, status, opname_date)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, store_id, opname_date, status, conducted_by`,
      [storeId, userId, 'ONGOING']
    );

    const opnameSession = opnameResult.rows[0];
    const sessionId = opnameSession.id;

    // Fetch all products for this store with system quantities
    const productsResult = await client.query(
      `SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.category,
        p.cost_price,
        p.selling_price,
        COALESCE(i.quantity, 0) as system_quantity
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = $1
       WHERE p.is_active = true
       ORDER BY p.name ASC`,
      [storeId]
    );

    const products = productsResult.rows;

    // Create opname detail records for each product (all with physical_quantity = 0 initially)
    const insertValues = products
      .map(
        (_, idx) =>
          `($${idx * 6 + 1}, $${idx * 6 + 2}, $${idx * 6 + 3}, $${idx * 6 + 4}, $${idx * 6 + 5}, $${idx * 6 + 6})`
      )
      .join(',');

    const flatParams = products.flatMap((p) => [
      sessionId,
      p.product_id,
      p.system_quantity,
      0, // physical_quantity (initially 0)
      'MATCH', // status (will update when physical qty is entered)
      null, // notes
    ]);

    if (products.length > 0) {
      await client.query(
        `INSERT INTO opname_details (opname_id, product_id, system_quantity, physical_quantity, status, notes)
         VALUES ${insertValues}`,
        flatParams
      );
    }

    logger.info('Stock opname session created', {
      sessionId,
      storeId,
      productCount: products.length,
      userId,
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId,
        storeId,
        status: opnameSession.status,
        opnameDate: opnameSession.opname_date,
        conductedBy: opnameSession.conducted_by,
        products: products.map((p) => ({
          productId: p.product_id,
          productName: p.product_name,
          sku: p.sku,
          category: p.category,
          costPrice: p.cost_price,
          sellingPrice: p.selling_price,
          systemQuantity: p.system_quantity,
          physicalQuantity: 0,
          difference: 0,
          status: 'MATCH',
        })),
      },
    });
  } catch (error) {
    logger.error('Error initiating stock opname', { error });
    res.status(500).json({
      error: 'Failed to initiate stock opname',
      code: 'INTERNAL_ERROR',
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/stock-opname/:sessionId/items
 * Update physical quantities for opname items
 * Requirements: 13.3, 13.4, 13.5
 */
router.post(
  '/:sessionId/items',
  requireAuth(),
  async (req: Request, res: Response) => {
    const client = await db.getClient();
    try {
      const { sessionId } = req.params;
      const { items } = req.body; // Array of {productId, physicalQuantity}
      const userId = req.user?.id;

      // Validate input
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          error: 'Items array is required and must not be empty',
          code: 'INVALID_REQUEST',
        });
      }

      // Verify user role
      const userCheck = await client.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'OWNER') {
        return res.status(403).json({
          error: 'Only owners can update opname items',
          code: 'FORBIDDEN',
        });
      }

      // Verify opname session exists and is ongoing
      const opnameCheck = await client.query(
        'SELECT id, status FROM stock_opnames WHERE id = $1',
        [sessionId]
      );

      if (opnameCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Opname session not found',
          code: 'NOT_FOUND',
        });
      }

      if (opnameCheck.rows[0].status !== 'ONGOING') {
        return res.status(400).json({
          error: 'Opname session is not in ONGOING status',
          code: 'INVALID_STATE',
        });
      }

      // Update each item with validation
      const updatedItems = [];

      for (const item of items) {
        const { productId, physicalQuantity } = item;

        // Validate physical quantity is numeric and >= 0
        if (
          typeof physicalQuantity !== 'number' ||
          physicalQuantity < 0 ||
          !Number.isInteger(physicalQuantity)
        ) {
          return res.status(400).json({
            error: `Invalid physical quantity for product ${productId}. Must be non-negative integer.`,
            code: 'INVALID_INPUT',
          });
        }

        // Get current system quantity
        const detailResult = await client.query(
          `SELECT id, system_quantity, physical_quantity 
           FROM opname_details 
           WHERE opname_id = $1 AND product_id = $2`,
          [sessionId, productId]
        );

        if (detailResult.rows.length === 0) {
          return res.status(404).json({
            error: `Product ${productId} not found in opname session`,
            code: 'NOT_FOUND',
          });
        }

        const detail = detailResult.rows[0];
        const systemQuantity = detail.system_quantity;
        const difference = physicalQuantity - systemQuantity;

        let status = 'MATCH';
        if (difference < 0) {
          status = 'SHORTAGE';
        } else if (difference > 0) {
          status = 'EXCESS';
        }

        // Update opname detail
        const updateResult = await client.query(
          `UPDATE opname_details
           SET physical_quantity = $1, difference = $2, status = $3
           WHERE opname_id = $4 AND product_id = $5
           RETURNING id, system_quantity, physical_quantity, difference, status`,
          [physicalQuantity, difference, status, sessionId, productId]
        );

        updatedItems.push(updateResult.rows[0]);
      }

      logger.info('Stock opname items updated', {
        sessionId,
        itemCount: items.length,
        userId,
      });

      res.status(200).json({
        success: true,
        data: {
          sessionId,
          updatedItemCount: updatedItems.length,
          items: updatedItems,
        },
      });
    } catch (error) {
      logger.error('Error updating opname items', { error });
      res.status(500).json({
        error: 'Failed to update opname items',
        code: 'INTERNAL_ERROR',
      });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/stock-opname/:sessionId
 * Get opname session details with all items
 * Requirements: 13.3, 13.6
 */
router.get('/:sessionId', requireAuth(), async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    // Verify user role
    const userCheck = await client.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'OWNER') {
      return res.status(403).json({
        error: 'Only owners can view opname details',
        code: 'FORBIDDEN',
      });
    }

    // Fetch opname session
    const opnameResult = await client.query(
      `SELECT 
        id, store_id, status, conducted_by, verified_by, opname_date, notes
       FROM stock_opnames 
       WHERE id = $1`,
      [sessionId]
    );

    if (opnameResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Opname session not found',
        code: 'NOT_FOUND',
      });
    }

    const opnameSession = opnameResult.rows[0];

    // Fetch opname items
    const itemsResult = await client.query(
      `SELECT 
        od.id,
        od.product_id,
        p.name as product_name,
        p.sku,
        p.cost_price,
        od.system_quantity,
        od.physical_quantity,
        od.difference,
        od.status
       FROM opname_details od
       JOIN products p ON od.product_id = p.id
       WHERE od.opname_id = $1
       ORDER BY p.name ASC`,
      [sessionId]
    );

    const items = itemsResult.rows;

    // Calculate summary statistics
    const matchCount = items.filter((i) => i.status === 'MATCH').length;
    const shortageCount = items.filter((i) => i.status === 'SHORTAGE').length;
    const excessCount = items.filter((i) => i.status === 'EXCESS').length;

    res.status(200).json({
      success: true,
      data: {
        session: {
          sessionId: opnameSession.id,
          storeId: opnameSession.store_id,
          status: opnameSession.status,
          conductedBy: opnameSession.conducted_by,
          verifiedBy: opnameSession.verified_by,
          opnameDate: opnameSession.opname_date,
          notes: opnameSession.notes,
        },
        summary: {
          totalItems: items.length,
          matchCount,
          shortageCount,
          excessCount,
        },
        items,
      },
    });
  } catch (error) {
    logger.error('Error fetching opname session', { error });
    res.status(500).json({
      error: 'Failed to fetch opname session',
      code: 'INTERNAL_ERROR',
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/stock-opname/:sessionId/complete
 * Complete the opname session and update inventory
 * Requirements: 13.5, 13.6, 13.7
 */
router.post(
  '/:sessionId/complete',
  requireAuth(),
  async (req: Request, res: Response) => {
    const client = await db.getClient();
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      // Verify user role
      const userCheck = await client.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'OWNER') {
        return res.status(403).json({
          error: 'Only owners can complete opname',
          code: 'FORBIDDEN',
        });
      }

      // Fetch opname session
      const opnameResult = await client.query(
        'SELECT id, store_id, status FROM stock_opnames WHERE id = $1',
        [sessionId]
      );

      if (opnameResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Opname session not found',
          code: 'NOT_FOUND',
        });
      }

      const opnameSession = opnameResult.rows[0];

      if (opnameSession.status !== 'ONGOING') {
        return res.status(400).json({
          error: 'Opname session is not in ONGOING status',
          code: 'INVALID_STATE',
        });
      }

      // Fetch all opname details
      const itemsResult = await client.query(
        `SELECT 
          id, product_id, system_quantity, physical_quantity, difference, status
         FROM opname_details 
         WHERE opname_id = $1`,
        [sessionId]
      );

      const items = itemsResult.rows;

      // Check for excess items - require confirmation
      const excessItems = items.filter((i) => i.status === 'EXCESS');
      if (excessItems.length > 0) {
        const { confirmExcess } = req.body;
        if (!confirmExcess) {
          return res.status(400).json({
            error: 'Excess items require confirmation',
            code: 'EXCESS_ITEMS_DETECTED',
            excessItems: excessItems.map((i) => ({
              productId: i.product_id,
              difference: i.difference,
            })),
          });
        }
      }

      // Begin transaction
      await client.query('BEGIN');

      try {
        // Update inventory for all items
        for (const item of items) {
          await client.query(
            `UPDATE inventory 
             SET quantity = $1, updated_at = NOW()
             WHERE product_id = $2 AND store_id = $3`,
            [item.physical_quantity, item.product_id, opnameSession.store_id]
          );
        }

        // Update opname session status
        const updatedOpname = await client.query(
          `UPDATE stock_opnames 
           SET status = $1, verified_by = $2, updated_at = NOW()
           WHERE id = $3
           RETURNING id, store_id, status`,
          ['VERIFIED', userId, sessionId]
        );

        await client.query('COMMIT');

        logger.info('Stock opname completed', {
          sessionId,
          storeId: opnameSession.store_id,
          itemCount: items.length,
          userId,
        });

        // Invalidate inventory cache
        await redis.del(`inventory:store:${opnameSession.store_id}`);

        res.status(200).json({
          success: true,
          data: {
            sessionId: updatedOpname.rows[0].id,
            status: updatedOpname.rows[0].status,
            itemsUpdated: items.length,
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('Error completing opname', { error });
      res.status(500).json({
        error: 'Failed to complete opname',
        code: 'INTERNAL_ERROR',
      });
    } finally {
      client.release();
    }
  }
);

/**
 * GET /api/stock-opname
 * List all opname sessions
 * Requirements: 13.6
 */
router.get('/', requireAuth(), async (req: Request, res: Response) => {
  const client = await db.getClient();
  try {
    const { storeId, status } = req.query;
    const userId = req.user?.id;

    // Verify user role
    const userCheck = await client.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'OWNER') {
      return res.status(403).json({
        error: 'Only owners can list opname sessions',
        code: 'FORBIDDEN',
      });
    }

    let query =
      `SELECT 
        id, store_id, status, conducted_by, verified_by, opname_date, created_at
       FROM stock_opnames
       WHERE 1=1`;
    const params: any[] = [];

    if (storeId) {
      query += ` AND store_id = $${params.length + 1}`;
      params.push(storeId);
    }

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ' ORDER BY opname_date DESC LIMIT 100';

    const result = await client.query(query, params);

    res.status(200).json({
      success: true,
      data: {
        sessions: result.rows,
      },
    });
  } catch (error) {
    logger.error('Error listing opname sessions', { error });
    res.status(500).json({
      error: 'Failed to list opname sessions',
      code: 'INTERNAL_ERROR',
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/stock-opname/:sessionId/report
 * Generate opname report with financial impact
 * Requirements: 13.7
 */
router.get(
  '/:sessionId/report',
  requireAuth(),
  async (req: Request, res: Response) => {
    const client = await db.getClient();
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;

      // Verify user role
      const userCheck = await client.query(
        'SELECT role FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'OWNER') {
        return res.status(403).json({
          error: 'Only owners can view opname reports',
          code: 'FORBIDDEN',
        });
      }

      // Fetch opname session
      const opnameResult = await client.query(
        `SELECT 
          id, store_id, status, conducted_by, verified_by, opname_date
         FROM stock_opnames 
         WHERE id = $1`,
        [sessionId]
      );

      if (opnameResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Opname session not found',
          code: 'NOT_FOUND',
        });
      }

      const opnameSession = opnameResult.rows[0];

      // Fetch opname details with financial data
      const itemsResult = await client.query(
        `SELECT 
          od.id,
          od.product_id,
          p.name as product_name,
          p.sku,
          p.cost_price,
          od.system_quantity,
          od.physical_quantity,
          od.difference,
          od.status,
          (od.difference * p.cost_price) as financial_impact
         FROM opname_details od
         JOIN products p ON od.product_id = p.id
         WHERE od.opname_id = $1
         ORDER BY p.name ASC`,
        [sessionId]
      );

      const items = itemsResult.rows;

      // Calculate totals
      const totals = {
        totalItems: items.length,
        matchCount: items.filter((i) => i.status === 'MATCH').length,
        shortageCount: items.filter((i) => i.status === 'SHORTAGE').length,
        excessCount: items.filter((i) => i.status === 'EXCESS').length,
        totalShortageValue: items
          .filter((i) => i.status === 'SHORTAGE')
          .reduce((sum, i) => sum + (i.financial_impact || 0), 0),
        totalExcessValue: items
          .filter((i) => i.status === 'EXCESS')
          .reduce((sum, i) => sum + (i.financial_impact || 0), 0),
        netFinancialImpact: items.reduce(
          (sum, i) => sum + (i.financial_impact || 0),
          0
        ),
      };

      res.status(200).json({
        success: true,
        data: {
          report: {
            sessionId: opnameSession.id,
            storeId: opnameSession.store_id,
            status: opnameSession.status,
            opnameDate: opnameSession.opname_date,
            conductedBy: opnameSession.conducted_by,
            verifiedBy: opnameSession.verified_by,
            totals,
            items: items.map((i) => ({
              productId: i.product_id,
              productName: i.product_name,
              sku: i.sku,
              costPrice: i.cost_price,
              systemQuantity: i.system_quantity,
              physicalQuantity: i.physical_quantity,
              difference: i.difference,
              status: i.status,
              financialImpact: i.financial_impact,
            })),
          },
        },
      });
    } catch (error) {
      logger.error('Error generating opname report', { error });
      res.status(500).json({
        error: 'Failed to generate opname report',
        code: 'INTERNAL_ERROR',
      });
    } finally {
      client.release();
    }
  }
);

export default router;
