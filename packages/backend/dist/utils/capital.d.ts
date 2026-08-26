/**
 * Capital/Modal Calculation Utilities
 * Handles calculation of store capital based on inventory value and cash
 *
 * Capital = Inventory Value (at cost) + Cash in Register
 *
 * Requirement: 21 (Capital Reporting Per Store), 22 (Overall Capital Reporting)
 */
import { UUID } from '../types/index.js';
export interface StoreCapital {
    storeId: UUID;
    inventoryValue: number;
    cashInRegister: number;
    totalCapital: number;
    itemCount: number;
}
export interface CapitalCalculationData {
    inventoryValue: number;
    cashInRegister: number;
}
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
export declare function calculateInventoryValue(storeId: UUID): Promise<number>;
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
export declare function getCashInRegister(storeId: UUID): Promise<number>;
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
export declare function calculateStoreCapital(storeId: UUID): Promise<StoreCapital>;
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
export declare function calculateTotalCapital(): Promise<{
    totalInventoryValue: number;
    totalCashInRegister: number;
    totalCapital: number;
    storeCount: number;
}>;
/**
 * Calculate capital for multiple stores at once
 * More efficient than calling calculateStoreCapital individually
 *
 * @param storeIds - Array of store IDs
 * @returns Map of storeId to StoreCapital
 *
 * Requirement: 22.3
 */
export declare function calculateMultiStoreCapital(storeIds: UUID[]): Promise<Map<UUID, StoreCapital>>;
//# sourceMappingURL=capital.d.ts.map