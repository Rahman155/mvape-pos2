/**
 * Store Management Routes
 * Handles store CRUD operations, pagination, filtering, and change history tracking
 * Only accessible to OWNER role
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { db } from '../database/connection.js';
import { Store } from '../database/types.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { CacheInvalidationService } from '../cache/invalidation.js';

const router = Router() as ReturnType<typeof Router>;

/**
 * GET /api/stores
 * List all stores with pagination, filtering, and status support
 * Only accessible to OWNER role
 */
router.get(
  '/',
  requireAuth(),
  requireRole('OWNER'),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        status = 'all', // 'all', 'active', 'inactive'
      } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = 'SELECT * FROM stores WHERE 1=1';
      const params: any[] = [];

      // Filter by search (name or address)
      if (search) {
        query +=
          ' AND (name ILIKE $' +
          (params.length + 1) +
          ' OR address ILIKE $' +
          (params.length + 2) +
          ')';
        params.push(`%${search}%`, `%${search}%`);
      }

      // Filter by status
      if (status !== 'all') {
        const isActive = status === 'active' ? true : false;
        query +=
          ' AND is_active = $' + (params.length + 1);
        params.push(isActive);
      }

      query += ' ORDER BY created_at DESC';

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM stores WHERE 1=1';
      const countParams: any[] = [];

      if (search) {
        countQuery +=
          ' AND (name ILIKE $' +
          (countParams.length + 1) +
          ' OR address ILIKE $' +
          (countParams.length + 2) +
          ')';
        countParams.push(`%${search}%`, `%${search}%`);
      }

      if (status !== 'all') {
        const isActive = status === 'active' ? true : false;
        countQuery +=
          ' AND is_active = $' + (countParams.length + 1);
        countParams.push(isActive);
      }

      const countResult = await db.query(countQuery, countParams);
      const total = Number(countResult.rows[0].count);

      // Get paginated data
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(Number(limit), offset);

      const result = await db.query(query, params);
      const stores = result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        address: row.address,
        phone: row.phone,
        logoUrl: row.logo_url,
        operatingHours: row.operating_hours,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata: row.metadata,
      }));

      const pages = Math.ceil(total / Number(limit));

      return res.json({
        data: stores,
        total,
        page: Number(page),
        limit: Number(limit),
        pages,
      });
    } catch (error) {
      logger.error('Error fetching stores:', error);
      return res.status(500).json({ error: 'Failed to fetch stores' });
    }
  }
);

/**
 * GET /api/stores/:id
 * Get a single store by ID
 */
router.get(
  '/:id',
  requireAuth(),
  requireRole('OWNER'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await db.query('SELECT * FROM stores WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Store not found' });
      }

      const row: any = result.rows[0];
      const store = {
        id: row.id,
        name: row.name,
        address: row.address,
        phone: row.phone,
        logoUrl: row.logo_url,
        operatingHours: row.operating_hours,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata: row.metadata,
      };

      return res.json(store);
    } catch (error) {
      logger.error('Error fetching store:', error);
      return res.status(500).json({ error: 'Failed to fetch store' });
    }
  }
);

/**
 * POST /api/stores
 * Create a new store
 * Only accessible to OWNER role
 */
router.post(
  '/',
  requireAuth(),
  requireRole('OWNER'),
  async (req: Request, res: Response) => {
    try {
      const { name, address, phone, operatingHours } = req.body;

      // Validate required fields
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Store name is required' });
      }

      if (!address || !address.trim()) {
        return res.status(400).json({ error: 'Store address is required' });
      }

      const id = uuidv4();
      const now = new Date();

      const result = await db.query(
        `INSERT INTO stores 
         (id, name, address, phone, operating_hours, is_active, created_at, updated_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          id,
          name.trim(),
          address.trim(),
          phone || null,
          operatingHours || null,
          true, // is_active
          now,
          now,
          '{}', // metadata
        ]
      );

      // Record change history
      await db.query(
        `INSERT INTO change_history 
         (entity_type, entity_id, changed_by, change_type, old_values, new_values, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'STORE',
          id,
          (req.user as any).id,
          'CREATE',
          null,
          JSON.stringify({
            name: name.trim(),
            address: address.trim(),
            phone: phone || null,
            operatingHours: operatingHours || null,
          }),
          now,
        ]
      );

      // Invalidate cache
      await CacheInvalidationService.invalidatePattern('stores:*');

      const row: any = result.rows[0];
      const store = {
        id: row.id,
        name: row.name,
        address: row.address,
        phone: row.phone,
        logoUrl: row.logo_url,
        operatingHours: row.operating_hours,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata: row.metadata,
      };

      return res.status(201).json(store);
    } catch (error) {
      logger.error('Error creating store:', error);
      return res.status(500).json({ error: 'Failed to create store' });
    }
  }
);

/**
 * PUT /api/stores/:id
 * Update an existing store and track change history
 * Only accessible to OWNER role
 */
router.put(
  '/:id',
  requireAuth(),
  requireRole('OWNER'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, address, phone, operatingHours, isActive } = req.body;

      // Get existing store
      const existingResult = await db.query('SELECT * FROM stores WHERE id = $1', [id]);

      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Store not found' });
      }

      const existing: any = existingResult.rows[0];

      // Validate required fields if provided
      if (name !== undefined && (!name || !name.trim())) {
        return res.status(400).json({ error: 'Store name cannot be empty' });
      }

      if (address !== undefined && (!address || !address.trim())) {
        return res.status(400).json({ error: 'Store address cannot be empty' });
      }

      // Prepare update values, keeping existing if not provided
      const updateName = name !== undefined ? name.trim() : existing.name;
      const updateAddress = address !== undefined ? address.trim() : existing.address;
      const updatePhone = phone !== undefined ? phone : existing.phone;
      const updateOperatingHours =
        operatingHours !== undefined ? operatingHours : existing.operating_hours;
      const updateIsActive = isActive !== undefined ? isActive : existing.is_active;
      const now = new Date();

      const updateResult = await db.query(
        `UPDATE stores 
         SET name = $1, address = $2, phone = $3, operating_hours = $4, is_active = $5, updated_at = $6
         WHERE id = $7
         RETURNING *`,
        [updateName, updateAddress, updatePhone, updateOperatingHours, updateIsActive, now, id]
      );

      // Record change history with old and new values
      const oldValues = {
        name: existing.name,
        address: existing.address,
        phone: existing.phone,
        operatingHours: existing.operating_hours,
        isActive: existing.is_active,
      };

      const newValues = {
        name: updateName,
        address: updateAddress,
        phone: updatePhone,
        operatingHours: updateOperatingHours,
        isActive: updateIsActive,
      };

      await db.query(
        `INSERT INTO change_history 
         (entity_type, entity_id, changed_by, change_type, old_values, new_values, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'STORE',
          id,
          (req.user as any).id,
          'UPDATE',
          JSON.stringify(oldValues),
          JSON.stringify(newValues),
          now,
        ]
      );

      // Invalidate cache
      await CacheInvalidationService.invalidatePattern('stores:*');

      const row: any = updateResult.rows[0];
      const store = {
        id: row.id,
        name: row.name,
        address: row.address,
        phone: row.phone,
        logoUrl: row.logo_url,
        operatingHours: row.operating_hours,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata: row.metadata,
      };

      return res.json(store);
    } catch (error) {
      logger.error('Error updating store:', error);
      return res.status(500).json({ error: 'Failed to update store' });
    }
  }
);

/**
 * GET /api/stores/:id/change-history
 * Get change history for a specific store
 */
router.get(
  '/:id/change-history',
  requireAuth(),
  requireRole('OWNER'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 50 } = req.query;

      // Verify store exists
      const storeResult = await db.query('SELECT id FROM stores WHERE id = $1', [id]);
      if (storeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Store not found' });
      }

      // Get change history
      const historyResult = await db.query(
        `SELECT ch.id, ch.entity_type, ch.entity_id, ch.changed_by, ch.change_type, 
                ch.old_values, ch.new_values, ch.timestamp, u.username
         FROM change_history ch
         LEFT JOIN users u ON ch.changed_by = u.id
         WHERE ch.entity_type = 'STORE' AND ch.entity_id = $1
         ORDER BY ch.timestamp DESC
         LIMIT $2`,
        [id, Number(limit)]
      );

      const history = historyResult.rows.map((row: any) => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        changedBy: row.username || 'Unknown',
        changeType: row.change_type,
        oldValues: row.old_values,
        newValues: row.new_values,
        timestamp: row.timestamp,
      }));

      return res.json(history);
    } catch (error) {
      logger.error('Error fetching store change history:', error);
      return res.status(500).json({ error: 'Failed to fetch change history' });
    }
  }
);

/**
 * POST /api/stores/:id/check-deletion
 * Check if store can be deleted (business logic validation)
 * Prevent deletion if store has transactions or other critical data
 */
router.post(
  '/:id/check-deletion',
  requireAuth(),
  requireRole('OWNER'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Verify store exists
      const storeResult = await db.query('SELECT id FROM stores WHERE id = $1', [id]);
      if (storeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Store not found' });
      }

      // Check for transactions
      const txnResult = await db.query(
        'SELECT COUNT(*) as count FROM transactions WHERE store_id = $1',
        [id]
      );
      const transactionCount = Number(txnResult.rows[0].count);

      // Check for inventory
      const invResult = await db.query(
        'SELECT COUNT(*) as count FROM inventory WHERE store_id = $1 AND quantity > 0',
        [id]
      );
      const inventoryCount = Number(invResult.rows[0].count);

      // Check for users assigned to store
      const usersResult = await db.query(
        'SELECT COUNT(*) as count FROM users WHERE store_id = $1 AND is_active = true',
        [id]
      );
      const userCount = Number(usersResult.rows[0].count);

      const canDelete = transactionCount === 0 && inventoryCount === 0 && userCount === 0;
      const blockers = [];

      if (transactionCount > 0) {
        blockers.push(`Store has ${transactionCount} transaction(s)`);
      }
      if (inventoryCount > 0) {
        blockers.push(`Store has ${inventoryCount} item(s) in inventory`);
      }
      if (userCount > 0) {
        blockers.push(`Store has ${userCount} active user(s) assigned`);
      }

      return res.json({
        canDelete,
        blockers,
        summary: {
          transactionCount,
          inventoryCount,
          userCount,
        },
      });
    } catch (error) {
      logger.error('Error checking store deletion eligibility:', error);
      return res.status(500).json({ error: 'Failed to check deletion eligibility' });
    }
  }
);

export default router;
