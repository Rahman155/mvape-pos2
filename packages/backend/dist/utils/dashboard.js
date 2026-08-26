/**
 * Dashboard Statistics Calculation Utilities
 * Handles calculation logic for dashboard metrics including total sales,
 * transaction count, and related statistics
 *
 * Requirement: 6 (Kasir Dashboard), 16 (Financial Reports)
 */
import { db } from '../database/index.js';
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
export async function calculateDailyStatistics(storeId, startDate, endDate, includeStatus = 'COMPLETED') {
    if (!storeId) {
        throw new Error('Store ID is required');
    }
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
        throw new Error('Invalid start date');
    }
    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
        throw new Error('Invalid end date');
    }
    if (startDate > endDate) {
        throw new Error('Start date must be before or equal to end date');
    }
    try {
        const result = await db.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE store_id = $1 
        AND transaction_date >= $2 
        AND transaction_date <= $3
        AND status = $4
      `, [storeId, startDate, endDate, includeStatus]);
        const row = result.rows[0];
        const totalSales = parseFloat(row.total_sales) || 0;
        const transactionCount = parseInt(row.transaction_count) || 0;
        const averageTransactionValue = transactionCount > 0 ? totalSales / transactionCount : 0;
        return {
            totalSales,
            transactionCount,
            averageTransactionValue,
            date: startDate.toISOString().split('T')[0],
        };
    }
    catch (error) {
        throw new Error(`Failed to calculate daily statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Get the currently active BOP for a store
 * Returns the most recent BOP that is currently effective
 *
 * @param storeId - The store ID to fetch BOP for
 * @returns BOP data or null if none exists
 *
 * Requirement: 6.4, 9.4
 */
export async function getActiveBop(storeId) {
    if (!storeId) {
        throw new Error('Store ID is required');
    }
    try {
        const result = await db.query(`
      SELECT 
        id,
        store_id as "storeId",
        name,
        description,
        amount,
        effective_from as "effectiveFrom",
        effective_to as "effectiveTo"
      FROM bop
      WHERE store_id = $1 
        AND effective_from <= CURRENT_DATE
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      ORDER BY effective_from DESC
      LIMIT 1
      `, [storeId]);
        return result.rows[0] || null;
    }
    catch (error) {
        throw new Error(`Failed to fetch active BOP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
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
export async function calculateMultiStoreStatistics(storeIds, startDate, endDate) {
    if (!Array.isArray(storeIds) || storeIds.length === 0) {
        throw new Error('At least one store ID is required');
    }
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
        throw new Error('Invalid start date');
    }
    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
        throw new Error('Invalid end date');
    }
    const results = new Map();
    for (const storeId of storeIds) {
        const stats = await calculateDailyStatistics(storeId, startDate, endDate, 'COMPLETED');
        results.set(storeId, stats);
    }
    return results;
}
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
export async function calculateAggregatedStatistics(startDate, endDate) {
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
        throw new Error('Invalid start date');
    }
    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
        throw new Error('Invalid end date');
    }
    if (startDate > endDate) {
        throw new Error('Start date must be before or equal to end date');
    }
    try {
        const result = await db.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_sales,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE transaction_date >= $1 
        AND transaction_date <= $2
        AND status = 'COMPLETED'
      `, [startDate, endDate]);
        const row = result.rows[0];
        const totalSales = parseFloat(row.total_sales) || 0;
        const transactionCount = parseInt(row.transaction_count) || 0;
        const averageTransactionValue = transactionCount > 0 ? totalSales / transactionCount : 0;
        return {
            totalSales,
            transactionCount,
            averageTransactionValue,
            date: startDate.toISOString().split('T')[0],
        };
    }
    catch (error) {
        throw new Error(`Failed to calculate aggregated statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Get date range for a specific day
 * Useful for ensuring consistent date boundary calculations
 *
 * @param date - Date to get range for (defaults to today)
 * @returns Object with startOfDay and endOfDay
 */
export function getDayBoundaries(date = new Date()) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error('Invalid date');
    }
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return { startOfDay, endOfDay };
}
/**
 * Format currency value for display
 * Handles IDR currency formatting
 *
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'IDR')
 * @returns Formatted currency string
 */
export function formatCurrency(amount, currency = 'IDR') {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '0';
    }
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
/**
 * Calculate decimal precision for currency (avoiding floating point errors)
 * IDR typically uses no decimal places, but this utility is available
 *
 * @param value - Value to round
 * @param decimals - Number of decimal places (default: 0 for IDR)
 * @returns Rounded value
 */
export function roundToPrecision(value, decimals = 0) {
    if (typeof value !== 'number' || isNaN(value)) {
        return 0;
    }
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}
//# sourceMappingURL=dashboard.js.map