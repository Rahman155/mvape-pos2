/**
 * Suppliers Management Routes
 * Handles supplier CRUD operations (owner-only)
 */

import { Router, Request, Response } from 'express';
import { authorize } from '../middleware/authorize.js';
import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router() as ReturnType<typeof Router>;

/**
 * GET /api/suppliers
 * Get suppliers list with pagination
 * Owner can see all suppliers, kasir cannot access
 */
router.get('/', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, isActive } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = `
      SELECT 
        id,
        name,
        phone,
        email,
        address,
        payment_terms,
        is_active,
        created_at,
        updated_at
      FROM suppliers
      WHERE 1=1
    `;

    const params: any[] = [];

    // Filter by active status
    if (isActive !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(isActive === 'true' || isActive === true);
    }

    // Search by name, phone, or email
    if (search) {
      query += ` AND (name ILIKE $${params.length + 1} OR phone ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM suppliers WHERE 1=1`;
    const countParams: any[] = [];

    if (isActive !== undefined) {
      countQuery += ` AND is_active = $${countParams.length + 1}`;
      countParams.push(isActive === 'true' || isActive === true);
    }

    if (search) {
      countQuery += ` AND (name ILIKE $${countParams.length + 1} OR phone ILIKE $${countParams.length + 1} OR email ILIKE $${countParams.length + 1})`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = Number(countResult.rows[0].count);

    // Add pagination and ordering
    query += ` ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), offset);

    const result = await db.query(query, params);

    const suppliers = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      paymentTerms: row.payment_terms,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    const pages = Math.ceil(total / Number(limit));

    return res.json({
      data: suppliers,
      total,
      page: Number(page),
      limit: Number(limit),
      pages,
    });
  } catch (error) {
    logger.error('Error fetching suppliers list:', error as Error, {
      requestId: req.requestId,
      userId: req.user?.id,
    });
    return res.status(500).json({ error: 'Failed to fetch suppliers list' });
  }
});

/**
 * POST /api/suppliers
 * Create a new supplier (owner-only)
 * Required fields: name
 * Optional fields: phone, email, address, paymentTerms
 */
router.post('/', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address, paymentTerms } = req.body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      logger.warn('Supplier creation failed: Name is required', {
        requestId: req.requestId,
        userId: req.user?.id,
      });
      return res.status(400).json({
        error: 'Invalid request',
        details: 'Supplier name is required and must be a non-empty string',
      });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if supplier with same name already exists
    const existingSupplier = await db.query(
      'SELECT id FROM suppliers WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );

    if (existingSupplier.rows.length > 0) {
      logger.warn('Supplier creation failed: Supplier already exists', {
        requestId: req.requestId,
        userId: req.user?.id,
        name,
      });
      return res.status(409).json({
        error: 'Supplier already exists',
        details: `A supplier with the name "${name}" already exists`,
      });
    }

    // Create supplier record
    const supplierId = uuidv4();
    const now = new Date();

    await db.query(
      `INSERT INTO suppliers (id, name, phone, email, address, payment_terms, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        supplierId,
        name.trim(),
        phone?.trim() || null,
        email?.trim() || null,
        address?.trim() || null,
        paymentTerms?.trim() || null,
        true, // New suppliers are active by default
        now,
        now,
      ]
    );

    logger.info('Supplier created successfully', {
      requestId: req.requestId,
      userId: req.user?.id,
      supplierId,
      name,
    });

    // Fetch and return created supplier
    const supplierResult = await db.query(
      `SELECT 
        id, name, phone, email, address, payment_terms, is_active, created_at, updated_at
       FROM suppliers WHERE id = $1`,
      [supplierId]
    );

    const row = supplierResult.rows[0];
    const supplier = {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      paymentTerms: row.payment_terms,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return res.status(201).json(supplier);
  } catch (error) {
    logger.error('Error creating supplier:', error as Error, {
      requestId: req.requestId,
      userId: req.user?.id,
    });
    return res.status(500).json({ error: 'Failed to create supplier' });
  }
});

/**
 * GET /api/suppliers/:id
 * Get a specific supplier by ID
 */
router.get('/:id', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT 
        id, name, phone, email, address, payment_terms, is_active, created_at, updated_at
       FROM suppliers WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      logger.warn('Supplier fetch failed: Supplier not found', {
        requestId: req.requestId,
        userId: req.user?.id,
        supplierId: id,
      });
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const row = result.rows[0];
    const supplier = {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      paymentTerms: row.payment_terms,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return res.json(supplier);
  } catch (error) {
    logger.error('Error fetching supplier:', error as Error, {
      requestId: req.requestId,
      userId: req.user?.id,
      supplierId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

/**
 * PUT /api/suppliers/:id
 * Edit supplier details (owner-only)
 * Can update: name, phone, email, address, paymentTerms, isActive
 */
router.put('/:id', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, paymentTerms, isActive } = req.body;

    // Verify supplier exists
    const supplierResult = await db.query(
      'SELECT id FROM suppliers WHERE id = $1',
      [id]
    );

    if (supplierResult.rows.length === 0) {
      logger.warn('Supplier update failed: Supplier not found', {
        requestId: req.requestId,
        userId: req.user?.id,
        supplierId: id,
      });
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Supplier name must be a non-empty string' });
      }

      // Check if new name already exists (for other suppliers)
      const nameExists = await db.query(
        'SELECT id FROM suppliers WHERE LOWER(name) = LOWER($1) AND id != $2',
        [name.trim(), id]
      );

      if (nameExists.rows.length > 0) {
        return res.status(409).json({
          error: 'Supplier name already exists',
          details: `A supplier with the name "${name}" already exists`,
        });
      }

      updates.push(`name = $${paramIndex++}`);
      params.push(name.trim());
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      params.push(phone ? phone.trim() : null);
    }

    if (email !== undefined) {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      updates.push(`email = $${paramIndex++}`);
      params.push(email ? email.trim() : null);
    }

    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      params.push(address ? address.trim() : null);
    }

    if (paymentTerms !== undefined) {
      updates.push(`payment_terms = $${paramIndex++}`);
      params.push(paymentTerms ? paymentTerms.trim() : null);
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      params.push(typeof isActive === 'boolean' ? isActive : isActive === 'true');
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(new Date());
    params.push(id);

    const updateQuery = `
      UPDATE suppliers 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await db.query(updateQuery, params);

    logger.info('Supplier updated successfully', {
      requestId: req.requestId,
      userId: req.user?.id,
      supplierId: id,
    });

    // Fetch and return updated supplier
    const updatedResult = await db.query(
      `SELECT 
        id, name, phone, email, address, payment_terms, is_active, created_at, updated_at
       FROM suppliers WHERE id = $1`,
      [id]
    );

    const row = updatedResult.rows[0];
    const supplier = {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address,
      paymentTerms: row.payment_terms,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return res.json(supplier);
  } catch (error) {
    logger.error('Error updating supplier:', error as Error, {
      requestId: req.requestId,
      userId: req.user?.id,
      supplierId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to update supplier' });
  }
});

/**
 * DELETE /api/suppliers/:id
 * Delete supplier (owner-only)
 * Prevents deletion if supplier has pending purchase orders
 */
router.delete('/:id', authorize('OWNER'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify supplier exists
    const supplierResult = await db.query(
      'SELECT id, name FROM suppliers WHERE id = $1',
      [id]
    );

    if (supplierResult.rows.length === 0) {
      logger.warn('Supplier deletion failed: Supplier not found', {
        requestId: req.requestId,
        userId: req.user?.id,
        supplierId: id,
      });
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Check if supplier has active/pending purchase orders
    const poResult = await db.query(
      `SELECT COUNT(*) as count FROM purchase_orders 
       WHERE supplier_id = $1 AND status IN ('PENDING', 'RECEIVED')`,
      [id]
    );

    const pendingPOCount = Number(poResult.rows[0].count);

    if (pendingPOCount > 0) {
      logger.warn('Supplier deletion prevented: Active purchase orders exist', {
        requestId: req.requestId,
        userId: req.user?.id,
        supplierId: id,
        pendingPOCount,
      });
      return res.status(409).json({
        error: 'Cannot delete supplier',
        details: `Supplier has ${pendingPOCount} active or pending purchase order(s). Please cancel or complete them first.`,
      });
    }

    // Delete supplier
    await db.query('DELETE FROM suppliers WHERE id = $1', [id]);

    logger.info('Supplier deleted successfully', {
      requestId: req.requestId,
      userId: req.user?.id,
      supplierId: id,
      supplierName: supplierResult.rows[0].name,
    });

    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting supplier:', error as Error, {
      requestId: req.requestId,
      userId: req.user?.id,
      supplierId: req.params.id,
    });
    return res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

export default router;
