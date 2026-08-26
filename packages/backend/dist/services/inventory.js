/**
 * Inventory Service
 * Handles inventory operations including stock transfers, opname, and inventory management
 */
import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { ApiError, ApiErrorCode } from '../utils/errors.js';
/**
 * Inventory Service
 */
export class InventoryService {
    /**
     * Get total inventory quantity for a product across all locations
     * This includes warehouse and all stores
     *
     * @param productId - Product ID to get total inventory for
     * @returns Total quantity across all locations
     */
    static async getTotalInventoryQuantity(productId) {
        try {
            const result = await db.query('SELECT COALESCE(SUM(quantity), 0) as total FROM inventory WHERE product_id = $1', [productId]);
            return parseInt(result.rows[0].total, 10);
        }
        catch (error) {
            logger.error('Failed to get total inventory quantity', error);
            throw new ApiError('Failed to get total inventory quantity', ApiErrorCode.INTERNAL_ERROR);
        }
    }
    /**
     * Get inventory for a specific location and product
     *
     * @param productId - Product ID
     * @param storeId - Store/location ID
     * @returns Inventory record or null if not found
     */
    static async getInventory(productId, storeId) {
        try {
            const result = await db.query('SELECT * FROM inventory WHERE product_id = $1 AND store_id = $2', [productId, storeId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        catch (error) {
            logger.error('Failed to get inventory', error);
            throw new ApiError('Failed to get inventory', ApiErrorCode.INTERNAL_ERROR);
        }
    }
    /**
     * Perform a stock transfer from one location to another
     * This ensures inventory conservation: total quantity before = total quantity after
     *
     * Property: Inventory Conservation
     * For any stock transfer operation, the sum of inventory quantities before transfer
     * must equal the sum of quantities after transfer (net zero change in system)
     *
     * @param request - Stock transfer request
     * @returns Created stock transfer record with items
     * @throws Error if:
     *   - Source location doesn't have sufficient inventory
     *   - Destination location doesn't exist
     *   - Transfer creation fails
     */
    static async createStockTransfer(request) {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            // Validate all items have sufficient stock in source location
            for (const item of request.items) {
                const sourceInventory = await this.getInventoryForUpdate(item.productId, request.fromLocationId, client);
                if (!sourceInventory) {
                    throw new ApiError(`No inventory found for product ${item.productId} at source location`, ApiErrorCode.NOT_FOUND);
                }
                const availableQuantity = sourceInventory.quantity - sourceInventory.reserved;
                if (availableQuantity < item.quantity) {
                    throw new ApiError(`Insufficient inventory for product ${item.productId}. Available: ${availableQuantity}, Requested: ${item.quantity}`, ApiErrorCode.VALIDATION_ERROR);
                }
            }
            // Create the stock transfer record
            const transferId = await this.createTransferRecord(request, client);
            // Create stock transfer items (logged but doesn't change inventory yet)
            const items = await this.createTransferItems(transferId, request.items, client);
            // Apply inventory changes:
            // 1. Decrease inventory at source location
            // 2. Increase inventory at destination location
            // This maintains inventory conservation: sum before = sum after
            for (const item of request.items) {
                // Decrease at source
                await client.query('UPDATE inventory SET quantity = quantity - $1, updated_at = NOW() WHERE product_id = $2 AND store_id = $3', [item.quantity, item.productId, request.fromLocationId]);
                // Increase at destination
                const destInventory = await this.getInventoryForUpdate(item.productId, request.toStoreId, client);
                if (!destInventory) {
                    // Create inventory record if doesn't exist
                    await client.query(`INSERT INTO inventory (id, product_id, store_id, quantity, reserved, reorder_level, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 0, 10, NOW(), NOW())`, [item.productId, request.toStoreId, item.quantity]);
                }
                else {
                    await client.query('UPDATE inventory SET quantity = quantity + $1, updated_at = NOW() WHERE product_id = $2 AND store_id = $3', [item.quantity, item.productId, request.toStoreId]);
                }
            }
            // Update transfer status to COMPLETED
            await client.query('UPDATE stock_transfers SET status = $1, updated_at = NOW() WHERE id = $2', ['COMPLETED', transferId]);
            await client.query('COMMIT');
            return {
                id: transferId,
                from_location_id: request.fromLocationId,
                to_store_id: request.toStoreId,
                transfer_date: new Date(),
                status: 'COMPLETED',
                created_by: request.createdBy,
                created_at: new Date(),
                updated_at: new Date(),
                items: items.map(item => ({
                    id: item.id,
                    stock_transfer_id: item.stock_transfer_id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    received_quantity: 0,
                    created_at: item.created_at
                }))
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger.error('Stock transfer creation failed', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Private helper: Get inventory for update with row locking
     */
    static async getInventoryForUpdate(productId, storeId, client) {
        const result = await client.query('SELECT * FROM inventory WHERE product_id = $1 AND store_id = $2 FOR UPDATE', [productId, storeId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }
    /**
     * Private helper: Create transfer record
     */
    static async createTransferRecord(request, client) {
        const result = await client.query(`INSERT INTO stock_transfers (id, from_location_id, to_store_id, transfer_date, status, created_by, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, NOW(), $3, $4, NOW(), NOW())
       RETURNING id`, [request.fromLocationId, request.toStoreId, 'PENDING', request.createdBy]);
        return result.rows[0].id;
    }
    /**
     * Private helper: Create transfer items
     */
    static async createTransferItems(transferId, items, client) {
        const createdItems = [];
        for (const item of items) {
            const result = await client.query(`INSERT INTO stock_transfer_items (id, stock_transfer_id, product_id, quantity, received_quantity, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 0, NOW())
         RETURNING *`, [transferId, item.productId, item.quantity]);
            createdItems.push(result.rows[0]);
        }
        return createdItems;
    }
    /**
     * Get all inventory for a store
     *
     * @param storeId - Store ID
     * @returns Array of inventory records
     */
    static async getStoreInventory(storeId) {
        try {
            const result = await db.query('SELECT * FROM inventory WHERE store_id = $1 ORDER BY created_at DESC', [storeId]);
            return result.rows;
        }
        catch (error) {
            logger.error('Failed to get store inventory', error);
            throw new ApiError('Failed to get store inventory', ApiErrorCode.INTERNAL_ERROR);
        }
    }
}
//# sourceMappingURL=inventory.js.map