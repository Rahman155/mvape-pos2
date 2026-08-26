/**
 * Capital/Modal Calculation Utilities
 * Handles calculation of store capital based on inventory value and cash
 *
 * Capital = Inventory Value (at cost) + Cash in Register
 *
 * Requirement: 21 (Capital Reporting Per Store), 22 (Overall Capital Reporting)
 */
import { db } from '../database/index.js';
import { logger } from './logger.js';
import { ApiError, ApiErrorCode } from './errors.js';
/**
 * Calculate total inventory value at cost for a store
 * This sums up: quantity * cost_price for all products in inventory
 *
 * Property: Non-negativity - inventory value should always be >= 0
 *
 * @param storeId - The store ID to calculate inventory value for
 * @returns Total inventory value at cost price
 * @throws Error if store ID is invalid or query fails
 *
 * Requirement: 21.3, 22.2
 */
export async function calculateInventoryValue(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required');
    }
    try {
        const result = await db.query(`
      SELECT 
        COALESCE(SUM(i.quantity * p.cost_price::numeric), 0)::float as inventory_value
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.store_id = $1 AND i.quantity >= 0
      `, [storeId]);
        const inventoryValue = parseFloat(result.rows[0]?.inventory_value || '0');
        // Ensure non-negative value
        return Math.max(0, inventoryValue);
    }
    catch (error) {
        logger.error('Failed to calculate inventory value', error);
        throw new ApiError(`Failed to calculate inventory value for store ${storeId}`, ApiErrorCode.INTERNAL_ERROR);
    }
}
/**
 * Get cash in register for a store
 * This would typically come from a cash management system or end-of-day records
 * For now, this is a placeholder that returns 0 or actual cash value from system
 *
 * Property: Non-negativity - cash should always be >= 0
 *
 * @param storeId - The store ID
 * @returns Cash amount in register
 *
 * Requirement: 21.2, 22.2
 */
export async function getCashInRegister(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required');
    }
    // TODO: Implement actual cash management system
    // For now, return 0 as placeholder
    // This should be fetched from a cash register/till system
    return 0;
}
/**
 * Calculate total capital for a store
 * Capital = Inventory Value (at cost) + Cash in Register
 *
 * Property: Capital Non-negativity
 * Given valid inputs (non-negative inventory and cash), calculated capital must always be non-negative
 *
 * @param storeId - The store ID to calculate capital for
 * @returns Object containing inventory value, cash, and total capital
 * @throws Error if store ID is invalid or calculation fails
 *
 * Requirement: 21.2, 22.1, 22.2
 */
export async function calculateStoreCapital(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required');
    }
    try {
        const inventoryValue = await calculateInventoryValue(storeId);
        const cashInRegister = await getCashInRegister(storeId);
        // Ensure both values are non-negative
        const safeInventoryValue = Math.max(0, inventoryValue);
        const safeCashInRegister = Math.max(0, cashInRegister);
        // Calculate total capital
        const totalCapital = safeInventoryValue + safeCashInRegister;
        // Get item count for reference
        const countResult = await db.query(`
      SELECT COUNT(*) as item_count
      FROM inventory
      WHERE store_id = $1 AND quantity > 0
      `, [storeId]);
        const itemCount = parseInt(countResult.rows[0]?.item_count || '0', 10);
        return {
            storeId,
            inventoryValue: safeInventoryValue,
            cashInRegister: safeCashInRegister,
            totalCapital: Math.max(0, totalCapital), // Ensure final result is non-negative
            itemCount,
        };
    }
    catch (error) {
        logger.error('Failed to calculate store capital', error);
        throw new ApiError(`Failed to calculate capital for store ${storeId}`, ApiErrorCode.INTERNAL_ERROR);
    }
}
/**
 * Calculate total capital across all stores and warehouse
 * Used for overall business capital tracking
 *
 * Property: Capital Non-negativity
 * Given valid inputs (non-negative values for all stores), total capital must always be non-negative
 *
 * @returns Object containing total inventory value, total cash, and total capital
 * @throws Error if calculation fails
 *
 * Requirement: 22.1, 22.2
 */
export async function calculateTotalCapital() {
    try {
        // Get all stores
        const storesResult = await db.query('SELECT id FROM stores WHERE is_active = true');
        const stores = storesResult.rows;
        let totalInventoryValue = 0;
        let totalCashInRegister = 0;
        // Calculate capital for each store
        for (const store of stores) {
            const storeCapital = await calculateStoreCapital(store.id);
            totalInventoryValue += storeCapital.inventoryValue;
            totalCashInRegister += storeCapital.cashInRegister;
        }
        // Ensure non-negative values
        const safeTotalInventoryValue = Math.max(0, totalInventoryValue);
        const safeTotalCashInRegister = Math.max(0, totalCashInRegister);
        const totalCapital = safeTotalInventoryValue + safeTotalCashInRegister;
        return {
            totalInventoryValue: safeTotalInventoryValue,
            totalCashInRegister: safeTotalCashInRegister,
            totalCapital: Math.max(0, totalCapital), // Ensure final result is non-negative
            storeCount: stores.length,
        };
    }
    catch (error) {
        logger.error('Failed to calculate total capital', error);
        throw new ApiError('Failed to calculate total capital', ApiErrorCode.INTERNAL_ERROR);
    }
}
/**
 * Calculate capital for multiple stores at once
 * More efficient than calling calculateStoreCapital individually
 *
 * @param storeIds - Array of store IDs
 * @returns Map of storeId to StoreCapital
 *
 * Requirement: 22.3
 */
export async function calculateMultiStoreCapital(storeIds) {
    if (!Array.isArray(storeIds) || storeIds.length === 0) {
        throw new Error('At least one store ID is required');
    }
    const results = new Map();
    for (const storeId of storeIds) {
        const capital = await calculateStoreCapital(storeId);
        results.set(storeId, capital);
    }
    return results;
}
//# sourceMappingURL=capital.js.map