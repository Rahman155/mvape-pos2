/**
 * Dashboard Statistics Calculation Utilities
 * Handles calculation logic for dashboard metrics including total sales,
 * transaction count, and related statistics
 *
 * Requirement: 6 (Kasir Dashboard), 16 (Financial Reports)
 */
export interface DailyStatistics {
    totalSales: number;
    transactionCount: number;
    averageTransactionValue: number;
    date: string;
}
export interface BopData {
    id: string;
    storeId: string;
    name: string;
    description?: string;
    amount: number;
    effectiveFrom: string;
    effectiveTo?: string;
}
export interface TransactionData {
    total_sales: string;
    transaction_count: string;
}
/**
 * Calculate total sales and transaction count for a given date range and store
 *
 * @param storeId - The store ID to calculate stats for
 * @param startDate - Start of date range (inclusive)
 * @param endDate - End of date range (inclusive)
 * @param includeStatus - Filter by transaction status (default: 'COMPLETED')
 * @returns Object containing totalSales, transactionCount, and averageTransactionValue
 *
 * Requirement: 6.2, 6.3
 */
export declare function calculateDailyStatistics(storeId: string, startDate: Date, endDate: Date, includeStatus?: string): Promise<DailyStatistics>;
/**
 * Get the currently active BOP for a store
 * Returns the most recent BOP that is currently effective
 *
 * @param storeId - The store ID to fetch BOP for
 * @returns BOP data or null if none exists
 *
 * Requirement: 6.4, 9.4
 */
export declare function getActiveBop(storeId: string): Promise<BopData | null>;
/**
 * Calculate statistics for multiple stores
 * Useful for owner dashboard that needs aggregated data
 *
 * @param storeIds - Array of store IDs
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Map of storeId to DailyStatistics
 *
 * Requirement: 16.1, 23, 24, 25
 */
export declare function calculateMultiStoreStatistics(storeIds: string[], startDate: Date, endDate: Date): Promise<Map<string, DailyStatistics>>;
/**
 * Calculate statistics for all completed stores in a time range
 * Aggregates data across all stores for owner-level reporting
 *
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Aggregated statistics for all stores
 *
 * Requirement: 22 (Overall Capital Reporting), 23-25 (Sales Reports)
 */
export declare function calculateAggregatedStatistics(startDate: Date, endDate: Date): Promise<DailyStatistics>;
/**
 * Get date range for a specific day
 * Useful for ensuring consistent date boundary calculations
 *
 * @param date - Date to get range for (defaults to today)
 * @returns Object with startOfDay and endOfDay
 */
export declare function getDayBoundaries(date?: Date): {
    startOfDay: Date;
    endOfDay: Date;
};
/**
 * Format currency value for display
 * Handles IDR currency formatting
 *
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'IDR')
 * @returns Formatted currency string
 */
export declare function formatCurrency(amount: number, currency?: string): string;
/**
 * Calculate decimal precision for currency (avoiding floating point errors)
 * IDR typically uses no decimal places, but this utility is available
 *
 * @param value - Value to round
 * @param decimals - Number of decimal places (default: 0 for IDR)
 * @returns Rounded value
 */
export declare function roundToPrecision(value: number, decimals?: number): number;
//# sourceMappingURL=dashboard.d.ts.map