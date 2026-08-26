/**
 * Inventory Service
 * Handles inventory operations including stock transfers, opname, and inventory management
 */
import { UUID } from '../types/index.js';
import { Inventory, StockTransferWithItems } from '../database/types.js';
/**
 * Stock Transfer Request
 */
export interface StockTransferRequest {
    fromLocationId: UUID;
    toStoreId: UUID;
    items: Array<{
        productId: UUID;
        quantity: number;
    }>;
    createdBy: UUID;
}
/**
 * Inventory Service
 */
export declare class InventoryService {
    /**
     * Get total inventory quantity for a product across all locations
     * This includes warehouse and all stores
     *
     * @param productId - Product ID to get total inventory for
     * @returns Total quantity across all locations
     */
    static getTotalInventoryQuantity(productId: UUID): Promise<number>;
    /**
     * Get inventory for a specific location and product
     *
     * @param productId - Product ID
     * @param storeId - Store/location ID
     * @returns Inventory record or null if not found
     */
    static getInventory(productId: UUID, storeId: UUID): Promise<Inventory | null>;
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
    static createStockTransfer(request: StockTransferRequest): Promise<StockTransferWithItems>;
    /**
     * Private helper: Get inventory for update with row locking
     */
    private static getInventoryForUpdate;
    /**
     * Private helper: Create transfer record
     */
    private static createTransferRecord;
    /**
     * Private helper: Create transfer items
     */
    private static createTransferItems;
    /**
     * Get all inventory for a store
     *
     * @param storeId - Store ID
     * @returns Array of inventory records
     */
    static getStoreInventory(storeId: UUID): Promise<Inventory[]>;
}
//# sourceMappingURL=inventory.d.ts.map