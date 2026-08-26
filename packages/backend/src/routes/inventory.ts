/**
 * Inventory Management Routes
 * Handles warehouse and store inventory viewing and transfers
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';

const router = Router() as ReturnType<typeof Router>;

/**
 * GET /api/inventory
 * View warehouse and store inventory
 * Returns structure: { warehouseInventory: [], storeInventory: [] }
 */
router.get('/', requireAuth(), async (req: Request, res: Response) => {
  try {
    // Get warehouse inventory (store_id = 'WAREHOUSE' or special warehouse location)
    const warehouseQuery = `
      SELECT 
        i.id,
        i.product_id,
        p.name as product_name,
        p.sku,
        p.category,
        i.quantity,
        p.cost_price,
        p.selling_price,
        i.reserved,
        i.reorder_level,
        i.last_restock_at,
        i.created_at,
        i.updated_at
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.store_id = (
        SELECT id FROM stores WHERE name = 'WAREHOUSE' OR name LIKE '%Warehouse%' LIMIT 1
      )
      ORDER BY p.name ASC
    `;

    const warehouseResult = await db.query(warehouseQuery);
    const warehouseInventory = warehouseResult.rows.map((row: any) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      sku: row.sku,
      category: row.category,
      quantity: row.quantity,
      costPrice: Number(row.cost_price),
      sellingPrice: Number(row.selling_price),
      reserved: row.reserved,
      reorderLevel: row.reorder_level,
      lastRestockAt: row.last_restock_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // Get store inventory (all stores except warehouse)
    const storeQuery = `
      SELECT 
        i.id,
        i.product_id,
        i.store_id,
        s.name as store_name,
        p.name as product_name,
        p.sku,
        p.category,
        i.quantity,
        p.cost_price,
        p.selling_price,
        i.reserved,
        i.reorder_level,
        i.last_restock_at,
        i.created_at,
        i.updated_at
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN stores s ON i.store_id = s.id
      WHERE i.store_id != (
        SELECT id FROM stores WHERE name = 'WAREHOUSE' OR name LIKE '%Warehouse%' LIMIT 1
      )
      AND s.is_active = true
      ORDER BY s.name ASC, p.name ASC
    `;

    const storeResult = await db.query(storeQuery);
    const storeInventory = storeResult.rows.map((row: any) => ({
      id: row.id,
      productId: row.product_id,
      storeId: row.store_id,
      storeName: row.store_name,
      productName: row.product_name,
      sku: row.sku,
      category: row.category,
      quantity: row.quantity,
      costPrice: Number(row.cost_price),
      sellingPrice: Number(row.selling_price),
      reserved: row.reserved,
      reorderLevel: row.reorder_level,
      lastRestockAt: row.last_restock_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.json({
      warehouseInventory,
      storeInventory,
    });
  } catch (error) {
    logger.error('Error fetching inventory:', error);
    return res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

/**
 * GET /api/inventory/warehouse
 * Get warehouse inventory only
 */
router.get('/warehouse', requireAuth(), async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        i.id,
        i.product_id,
        p.name as product_name,
        p.sku,
        p.category,
        i.quantity,
        p.cost_price,
        p.selling_price,
        i.reserved,
        i.reorder_level,
        i.last_restock_at,
        i.created_at,
        i.updated_at
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.store_id = (
        SELECT id FROM stores WHERE name = 'WAREHOUSE' OR name LIKE '%Warehouse%' LIMIT 1
      )
      AND i.quantity > 0
      ORDER BY p.name ASC
    `;

    const result = await db.query(query);
    const inventory = result.rows.map((row: any) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      sku: row.sku,
      category: row.category,
      quantity: row.quantity,
      costPrice: Number(row.cost_price),
      sellingPrice: Number(row.selling_price),
      reserved: row.reserved,
      reorderLevel: row.reorder_level,
      lastRestockAt: row.last_restock_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.json({
      data: inventory,
      total: inventory.length,
    });
  } catch (error) {
    logger.error('Error fetching warehouse inventory:', error);
    return res
      .status(500)
      .json({ error: 'Failed to fetch warehouse inventory' });
  }
});

/**
 * GET /api/inventory/store/:storeId
 * Get inventory for a specific store
 */
router.get('/store/:storeId', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { storeId } = req.params;

    const query = `
      SELECT 
        i.id,
        i.product_id,
        i.store_id,
        s.name as store_name,
        p.name as product_name,
        p.sku,
        p.category,
        i.quantity,
        p.cost_price,
        p.selling_price,
        i.reserved,
        i.reorder_level,
        i.last_restock_at,
        i.created_at,
        i.updated_at
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      JOIN stores s ON i.store_id = s.id
      WHERE i.store_id = $1
      ORDER BY p.name ASC
    `;

    const result = await db.query(query, [storeId]);
    const inventory = result.rows.map((row: any) => ({
      id: row.id,
      productId: row.product_id,
      storeId: row.store_id,
      storeName: row.store_name,
      productName: row.product_name,
      sku: row.sku,
      category: row.category,
      quantity: row.quantity,
      costPrice: Number(row.cost_price),
      sellingPrice: Number(row.selling_price),
      reserved: row.reserved,
      reorderLevel: row.reorder_level,
      lastRestockAt: row.last_restock_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return res.json({
      data: inventory,
      total: inventory.length,
    });
  } catch (error) {
    logger.error('Error fetching store inventory:', error);
    return res.status(500).json({ error: 'Failed to fetch store inventory' });
  }
});

export default router;
