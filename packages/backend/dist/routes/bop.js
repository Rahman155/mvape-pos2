/**
 * BOP (Biaya Operasional Penjualan) Management Routes
 * Handles operational cost viewing, creation, editing, and deletion
 */
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
/**
 * GET /api/bop
 * Get BOP list with pagination and store filtering
 * Returns BOP name, amount, effective dates, category
 */
router.get('/', requireAuth(), async (req, res) => {
    try {
        const { page = 1, limit = 20, storeId, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let query = `
      SELECT 
        b.id,
        b.store_id,
        b.name,
        b.description,
        b.amount,
        b.effective_from,
        b.effective_to,
        s.name as store_name,
        b.created_at,
        b.updated_at
      FROM bop b
      JOIN stores s ON b.store_id = s.id
      WHERE s.is_active = true
    `;
        const params = [];
        // Filter by store if provided
        if (storeId) {
            query += ` AND b.store_id = $${params.length + 1}`;
            params.push(storeId);
        }
        // Search by name
        if (search) {
            query += ` AND b.name ILIKE $${params.length + 1}`;
            params.push(`%${search}%`);
        }
        // Get total count
        let countQuery = `
      SELECT COUNT(*) FROM bop b
      JOIN stores s ON b.store_id = s.id
      WHERE s.is_active = true
    `;
        const countParams = [];
        if (storeId) {
            countQuery += ` AND b.store_id = $${countParams.length + 1}`;
            countParams.push(storeId);
        }
        if (search) {
            countQuery += ` AND b.name ILIKE $${countParams.length + 1}`;
            countParams.push(`%${search}%`);
        }
        const countResult = await db.query(countQuery, countParams);
        const total = Number(countResult.rows[0].count);
        // Add pagination
        query += ` ORDER BY b.effective_from DESC, b.name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(Number(limit), offset);
        const result = await db.query(query, params);
        const bopList = result.rows.map((row) => ({
            id: row.id,
            storeId: row.store_id,
            storeName: row.store_name,
            name: row.name,
            description: row.description,
            amount: Number(row.amount),
            effectiveFrom: row.effective_from,
            effectiveTo: row.effective_to,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
        const pages = Math.ceil(total / Number(limit));
        return res.json({
            data: bopList,
            total,
            page: Number(page),
            limit: Number(limit),
            pages,
        });
    }
    catch (error) {
        logger.error('Error fetching BOP list:', error);
        return res.status(500).json({ error: 'Failed to fetch BOP list' });
    }
});
/**
 * GET /api/bop/store/:storeId
 * Get BOP for a specific store
 * Returns paginated results for the store
 */
router.get('/store/:storeId', requireAuth(), async (req, res) => {
    try {
        const { storeId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        // Check if store exists
        const storeResult = await db.query('SELECT id FROM stores WHERE id = $1', [
            storeId,
        ]);
        if (storeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Store not found' });
        }
        // Get total count
        const countResult = await db.query('SELECT COUNT(*) FROM bop WHERE store_id = $1', [storeId]);
        const total = Number(countResult.rows[0].count);
        // Get paginated data
        const result = await db.query(`SELECT 
        id,
        store_id,
        name,
        description,
        amount,
        effective_from,
        effective_to,
        created_at,
        updated_at
       FROM bop
       WHERE store_id = $1
       ORDER BY effective_from DESC, name ASC
       LIMIT $2 OFFSET $3`, [storeId, Number(limit), offset]);
        const bopList = result.rows.map((row) => ({
            id: row.id,
            storeId: row.store_id,
            name: row.name,
            description: row.description,
            amount: Number(row.amount),
            effectiveFrom: row.effective_from,
            effectiveTo: row.effective_to,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
        const pages = Math.ceil(total / Number(limit));
        return res.json({
            data: bopList,
            total,
            page: Number(page),
            limit: Number(limit),
            pages,
        });
    }
    catch (error) {
        logger.error('Error fetching store BOP:', error);
        return res.status(500).json({ error: 'Failed to fetch store BOP' });
    }
});
/**
 * GET /api/bop/active
 * Get active BOP (effective today) across all stores
 */
router.get('/active', requireAuth(), async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const result = await db.query(`SELECT 
        b.id,
        b.store_id,
        b.name,
        b.description,
        b.amount,
        b.effective_from,
        b.effective_to,
        s.name as store_name,
        b.created_at,
        b.updated_at
       FROM bop b
       JOIN stores s ON b.store_id = s.id
       WHERE b.effective_from <= $1
       AND (b.effective_to IS NULL OR b.effective_to >= $1)
       AND s.is_active = true
       ORDER BY s.name ASC, b.name ASC`, [today]);
        const bopList = result.rows.map((row) => ({
            id: row.id,
            storeId: row.store_id,
            storeName: row.store_name,
            name: row.name,
            description: row.description,
            amount: Number(row.amount),
            effectiveFrom: row.effective_from,
            effectiveTo: row.effective_to,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
        return res.json({
            data: bopList,
            total: bopList.length,
        });
    }
    catch (error) {
        logger.error('Error fetching active BOP:', error);
        return res.status(500).json({ error: 'Failed to fetch active BOP' });
    }
});
/**
 * GET /api/bop/:id
 * Get specific BOP record
 */
router.get('/:id', requireAuth(), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`SELECT 
        b.id,
        b.store_id,
        b.name,
        b.description,
        b.amount,
        b.effective_from,
        b.effective_to,
        s.name as store_name,
        b.created_at,
        b.updated_at
       FROM bop b
       JOIN stores s ON b.store_id = s.id
       WHERE b.id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'BOP record not found' });
        }
        const row = result.rows[0];
        const bop = {
            id: row.id,
            storeId: row.store_id,
            storeName: row.store_name,
            name: row.name,
            description: row.description,
            amount: Number(row.amount),
            effectiveFrom: row.effective_from,
            effectiveTo: row.effective_to,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
        return res.json(bop);
    }
    catch (error) {
        logger.error('Error fetching BOP record:', error);
        return res.status(500).json({ error: 'Failed to fetch BOP record' });
    }
});
/**
 * POST /api/bop
 * Create a new BOP record (owner-only)
 * Required fields: storeId, name, amount, effectiveFrom
 * Optional fields: description, effectiveTo
 */
router.post('/', authorize('OWNER'), async (req, res) => {
    try {
        const { storeId, name, description, amount, effectiveFrom, effectiveTo } = req.body;
        // Validation
        if (!storeId || !name || amount === undefined || !effectiveFrom) {
            logger.warn('BOP creation failed: Missing required fields', {
                requestId: req.requestId,
                userId: req.user?.id,
                providedFields: { storeId: !!storeId, name: !!name, amount, effectiveFrom: !!effectiveFrom },
            });
            return res.status(400).json({
                error: 'Missing required fields',
                details: 'storeId, name, amount, and effectiveFrom are required',
            });
        }
        // Validate amount
        const amountNum = Number(amount);
        if (isNaN(amountNum) || amountNum < 0) {
            return res.status(400).json({ error: 'Invalid amount: must be a non-negative number' });
        }
        // Validate dates
        const effectiveFromDate = new Date(effectiveFrom);
        if (isNaN(effectiveFromDate.getTime())) {
            return res.status(400).json({ error: 'Invalid effectiveFrom date format' });
        }
        if (effectiveTo) {
            const effectiveToDate = new Date(effectiveTo);
            if (isNaN(effectiveToDate.getTime())) {
                return res.status(400).json({ error: 'Invalid effectiveTo date format' });
            }
            if (effectiveToDate < effectiveFromDate) {
                return res.status(400).json({ error: 'effectiveTo must be after effectiveFrom' });
            }
        }
        // Verify store exists
        const storeResult = await db.query('SELECT id FROM stores WHERE id = $1', [storeId]);
        if (storeResult.rows.length === 0) {
            logger.warn('BOP creation failed: Store not found', {
                requestId: req.requestId,
                userId: req.user?.id,
                storeId,
            });
            return res.status(404).json({ error: 'Store not found' });
        }
        // Create BOP record
        const bopId = uuidv4();
        const now = new Date();
        await db.query(`INSERT INTO bop (id, store_id, name, description, amount, effective_from, effective_to, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            bopId,
            storeId,
            name.trim(),
            description?.trim() || null,
            amountNum,
            effectiveFrom,
            effectiveTo || null,
            now,
            now,
        ]);
        logger.info('BOP created successfully', {
            requestId: req.requestId,
            userId: req.user?.id,
            bopId,
            storeId,
            name,
        });
        // Fetch and return created BOP
        const newBopResult = await db.query(`SELECT 
        b.id,
        b.store_id,
        b.name,
        b.description,
        b.amount,
        b.effective_from,
        b.effective_to,
        s.name as store_name,
        b.created_at,
        b.updated_at
       FROM bop b
       JOIN stores s ON b.store_id = s.id
       WHERE b.id = $1`, [bopId]);
        const row = newBopResult.rows[0];
        const bop = {
            id: row.id,
            storeId: row.store_id,
            storeName: row.store_name,
            name: row.name,
            description: row.description,
            amount: Number(row.amount),
            effectiveFrom: row.effective_from,
            effectiveTo: row.effective_to,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
        return res.status(201).json(bop);
    }
    catch (error) {
        logger.error('Error creating BOP:', error, {
            requestId: req.requestId,
            userId: req.user?.id,
        });
        return res.status(500).json({ error: 'Failed to create BOP record' });
    }
});
/**
 * PUT /api/bop/:id
 * Edit BOP record (owner-only)
 * Can update: name, description, amount, effectiveFrom, effectiveTo
 */
router.put('/:id', authorize('OWNER'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, amount, effectiveFrom, effectiveTo } = req.body;
        // Verify BOP exists
        const bopResult = await db.query('SELECT id, store_id FROM bop WHERE id = $1', [id]);
        if (bopResult.rows.length === 0) {
            logger.warn('BOP update failed: BOP not found', {
                requestId: req.requestId,
                userId: req.user?.id,
                bopId: id,
            });
            return res.status(404).json({ error: 'BOP record not found' });
        }
        // Build update query dynamically
        const updates = [];
        const params = [];
        let paramIndex = 1;
        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            params.push(name.trim());
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            params.push(description ? description.trim() : null);
        }
        if (amount !== undefined) {
            const amountNum = Number(amount);
            if (isNaN(amountNum) || amountNum < 0) {
                return res.status(400).json({ error: 'Invalid amount: must be a non-negative number' });
            }
            updates.push(`amount = $${paramIndex++}`);
            params.push(amountNum);
        }
        if (effectiveFrom !== undefined) {
            const effectiveFromDate = new Date(effectiveFrom);
            if (isNaN(effectiveFromDate.getTime())) {
                return res.status(400).json({ error: 'Invalid effectiveFrom date format' });
            }
            updates.push(`effective_from = $${paramIndex++}`);
            params.push(effectiveFrom);
        }
        if (effectiveTo !== undefined) {
            if (effectiveTo === null) {
                updates.push(`effective_to = $${paramIndex++}`);
                params.push(null);
            }
            else {
                const effectiveToDate = new Date(effectiveTo);
                if (isNaN(effectiveToDate.getTime())) {
                    return res.status(400).json({ error: 'Invalid effectiveTo date format' });
                }
                updates.push(`effective_to = $${paramIndex++}`);
                params.push(effectiveTo);
            }
        }
        // Validate date range if both dates are provided
        const currentBop = bopResult.rows[0];
        const fromDate = effectiveFrom ? new Date(effectiveFrom) : new Date(await db.query('SELECT effective_from FROM bop WHERE id = $1', [id]).then(r => r.rows[0].effective_from));
        const toDate = effectiveTo !== undefined ? (effectiveTo ? new Date(effectiveTo) : null) : (await db.query('SELECT effective_to FROM bop WHERE id = $1', [id]).then(r => r.rows[0].effective_to ? new Date(r.rows[0].effective_to) : null));
        if (toDate && fromDate && toDate < fromDate) {
            return res.status(400).json({ error: 'effectiveTo must be after effectiveFrom' });
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        updates.push(`updated_at = $${paramIndex++}`);
        params.push(new Date());
        params.push(id);
        const updateQuery = `
      UPDATE bop 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;
        await db.query(updateQuery, params);
        logger.info('BOP updated successfully', {
            requestId: req.requestId,
            userId: req.user?.id,
            bopId: id,
        });
        // Fetch and return updated BOP
        const updatedBopResult = await db.query(`SELECT 
        b.id,
        b.store_id,
        b.name,
        b.description,
        b.amount,
        b.effective_from,
        b.effective_to,
        s.name as store_name,
        b.created_at,
        b.updated_at
       FROM bop b
       JOIN stores s ON b.store_id = s.id
       WHERE b.id = $1`, [id]);
        const row = updatedBopResult.rows[0];
        const bop = {
            id: row.id,
            storeId: row.store_id,
            storeName: row.store_name,
            name: row.name,
            description: row.description,
            amount: Number(row.amount),
            effectiveFrom: row.effective_from,
            effectiveTo: row.effective_to,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
        return res.json(bop);
    }
    catch (error) {
        logger.error('Error updating BOP:', error, {
            requestId: req.requestId,
            userId: req.user?.id,
            bopId: req.params.id,
        });
        return res.status(500).json({ error: 'Failed to update BOP record' });
    }
});
/**
 * DELETE /api/bop/:id
 * Delete BOP record (owner-only)
 * Prevents deletion if BOP is in use or conflicts exist
 */
router.delete('/:id', authorize('OWNER'), async (req, res) => {
    try {
        const { id } = req.params;
        // Verify BOP exists
        const bopResult = await db.query('SELECT id, effective_from, effective_to FROM bop WHERE id = $1', [id]);
        if (bopResult.rows.length === 0) {
            logger.warn('BOP deletion failed: BOP not found', {
                requestId: req.requestId,
                userId: req.user?.id,
                bopId: id,
            });
            return res.status(404).json({ error: 'BOP record not found' });
        }
        const bopRecord = bopResult.rows[0];
        const today = new Date().toISOString().split('T')[0];
        // Check if BOP is currently active (effective_from <= today)
        if (bopRecord.effective_from <= today) {
            const isStillActive = !bopRecord.effective_to || bopRecord.effective_to >= today;
            if (isStillActive) {
                logger.warn('BOP deletion prevented: Active BOP cannot be deleted', {
                    requestId: req.requestId,
                    userId: req.user?.id,
                    bopId: id,
                });
                return res.status(409).json({
                    error: 'Cannot delete active BOP',
                    details: 'BOP records that are currently effective cannot be deleted. Please set an effectiveTo date first.',
                });
            }
        }
        // Delete BOP record
        await db.query('DELETE FROM bop WHERE id = $1', [id]);
        logger.info('BOP deleted successfully', {
            requestId: req.requestId,
            userId: req.user?.id,
            bopId: id,
        });
        return res.status(204).send();
    }
    catch (error) {
        logger.error('Error deleting BOP:', error, {
            requestId: req.requestId,
            userId: req.user?.id,
            bopId: req.params.id,
        });
        return res.status(500).json({ error: 'Failed to delete BOP record' });
    }
});
export default router;
//# sourceMappingURL=bop.js.map