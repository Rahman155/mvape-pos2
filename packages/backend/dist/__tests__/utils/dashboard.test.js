/**
 * Dashboard Statistics Calculation Unit Tests
 *
 * Test Coverage:
 * - Total sales calculation with various transaction data
 * - Transaction count calculation accuracy
 * - Edge cases (no transactions, only discounts, mixed payment methods)
 * - Decimal precision for currency values
 * - Date boundary conditions (midnight crossover)
 * - Null/undefined handling
 * - Invalid date formats
 *
 * Requirement: 6 (Kasir Dashboard), 16 (Financial Reports), 23-25 (Sales Reports)
 */
import { calculateDailyStatistics, getActiveBop, calculateMultiStoreStatistics, calculateAggregatedStatistics, getDayBoundaries, formatCurrency, roundToPrecision, } from '../../utils/dashboard.js';
import { db } from '../../database/index.js';
// Mock database module
jest.mock('../../database/index.js', () => ({
    db: {
        query: jest.fn(),
    },
}));
const mockDb = db;
describe('Dashboard Statistics Calculation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // ============================================================================
    // TEST GROUP 1: Total Sales Calculation with Various Transaction Data
    // ============================================================================
    describe('calculateDailyStatistics - Sales Calculation', () => {
        it('should calculate total sales from single transaction', async () => {
            const storeId = 'store-1';
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-15');
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '450000',
                        transaction_count: '1',
                    },
                ],
            });
            const result = await calculateDailyStatistics(storeId, startDate, endDate);
            expect(result.totalSales).toBe(450000);
            expect(result.transactionCount).toBe(1);
            expect(result.averageTransactionValue).toBe(450000);
        });
        it('should calculate total sales from multiple transactions', async () => {
            const storeId = 'store-1';
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-15');
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '1350000',
                        transaction_count: '3',
                    },
                ],
            });
            const result = await calculateDailyStatistics(storeId, startDate, endDate);
            expect(result.totalSales).toBe(1350000);
            expect(result.transactionCount).toBe(3);
            expect(result.averageTransactionValue).toBe(450000);
        });
        it('should handle large sales amounts without precision loss', async () => {
            const storeId = 'store-1';
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-15');
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '50000000',
                        transaction_count: '10',
                    },
                ],
            });
            const result = await calculateDailyStatistics(storeId, startDate, endDate);
            expect(result.totalSales).toBe(50000000);
            expect(result.transactionCount).toBe(10);
            expect(result.averageTransactionValue).toBe(5000000);
        });
        it('should handle fractional cents correctly', async () => {
            const storeId = 'store-1';
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-15');
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '1500000.50',
                        transaction_count: '5',
                    },
                ],
            });
            const result = await calculateDailyStatistics(storeId, startDate, endDate);
            expect(result.totalSales).toBeCloseTo(1500000.50, 2);
            expect(result.transactionCount).toBe(5);
        });
        it('should handle mixed payment methods totals', async () => {
            const storeId = 'store-1';
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-15');
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '2250000', // Cash + Member + Tempo
                        transaction_count: '6',
                    },
                ],
            });
            const result = await calculateDailyStatistics(storeId, startDate, endDate);
            expect(result.totalSales).toBe(2250000);
            expect(result.transactionCount).toBe(6);
        });
    });
    // ============================================================================
    // TEST GROUP 2: Transaction Count Accuracy
    // ============================================================================
    describe('calculateDailyStatistics - Transaction Count', () => {
        it('should count zero transactions correctly', async () => {
            const storeId = 'store-1';
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-15');
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '0',
                        transaction_count: '0',
                    },
                ],
            });
            const result = await calculateDailyStatistics(storeId, startDate, endDate);
            expect(result.transactionCount).toBe(0);
            expect(result.totalSales).toBe(0);
        });
        it('should count multiple transactions accurately', async () => {
            const storeId = 'store-1';
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-15');
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '2700000',
                        transaction_count: '12',
                    },
                ],
            });
            const result = await calculateDailyStatistics(storeId, startDate, endDate);
            expect(result.transactionCount).toBe(12);
        });
        it('should only count COMPLETED transactions', async () => {
            const storeId = 'store-1';
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-15');
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '900000',
                        transaction_count: '3',
                    },
                ],
            });
            await calculateDailyStatistics(storeId, startDate, endDate);
            expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining("status = $4"), expect.arrayContaining([storeId, startDate, endDate, 'COMPLETED']));
        });
    });
    // ============================================================================
    // TEST GROUP 3: Average Transaction Value Calculation
    // ============================================================================
    describe('calculateDailyStatistics - Average Transaction Value', () => {
        it('should calculate average transaction value correctly', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '3000000',
                        transaction_count: '5',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.averageTransactionValue).toBe(600000);
        });
        it('should return 0 average when no transactions', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '0',
                        transaction_count: '0',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.averageTransactionValue).toBe(0);
        });
        it('should handle fractional average values', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '1000000',
                        transaction_count: '3',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.averageTransactionValue).toBeCloseTo(333333.33, 2);
        });
    });
    // ============================================================================
    // TEST GROUP 4: Edge Cases - No Transactions
    // ============================================================================
    describe('calculateDailyStatistics - Edge Cases: No Transactions', () => {
        it('should show 0 sales when no transactions exist', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '0',
                        transaction_count: '0',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.totalSales).toBe(0);
            expect(result.transactionCount).toBe(0);
        });
        it('should show 0 sales when database returns null', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: null,
                        transaction_count: null,
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.totalSales).toBe(0);
            expect(result.transactionCount).toBe(0);
        });
    });
    // ============================================================================
    // TEST GROUP 5: Edge Cases - Only Discounts (Negative Adjustments)
    // ============================================================================
    describe('calculateDailyStatistics - Edge Cases: Only Discounts', () => {
        it('should handle zero total when all transactions are discounts', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '0',
                        transaction_count: '2',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.totalSales).toBe(0);
            expect(result.transactionCount).toBe(2);
        });
        it('should handle reduced sales when discounts are applied', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '450000', // Discounted from 600000
                        transaction_count: '2',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.totalSales).toBe(450000);
            expect(result.transactionCount).toBe(2);
        });
    });
    // ============================================================================
    // TEST GROUP 6: Mixed Payment Methods
    // ============================================================================
    describe('calculateDailyStatistics - Mixed Payment Methods', () => {
        it('should aggregate sales from all payment methods', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '2700000', // Cash + Member Credit + Tempo
                        transaction_count: '6',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.totalSales).toBe(2700000);
            expect(result.transactionCount).toBe(6);
        });
        it('should handle member credit refunds as negative amounts', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '1800000', // Some refunds reduce total
                        transaction_count: '5',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.totalSales).toBe(1800000);
        });
    });
    // ============================================================================
    // TEST GROUP 7: Decimal Precision for Currency Values
    // ============================================================================
    describe('calculateDailyStatistics - Decimal Precision', () => {
        it('should handle currency with 2 decimal places', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '1234567.89',
                        transaction_count: '5',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.totalSales).toBeCloseTo(1234567.89, 2);
        });
        it('should round currency to appropriate precision', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '1500000.999',
                        transaction_count: '3',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.totalSales).toBeCloseTo(1500001, 0);
        });
        it('should handle very small decimal amounts', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '100.50',
                        transaction_count: '1',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.totalSales).toBeCloseTo(100.50, 2);
        });
    });
    // ============================================================================
    // TEST GROUP 8: Date Boundary Conditions
    // ============================================================================
    describe('calculateDailyStatistics - Date Boundary Conditions', () => {
        it('should calculate midnight crossover correctly', async () => {
            const startDate = new Date('2024-01-15T00:00:00.000Z');
            const endDate = new Date('2024-01-15T23:59:59.999Z');
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '1500000',
                        transaction_count: '5',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', startDate, endDate);
            expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([
                'store-1',
                expect.objectContaining({
                    getTime: expect.any(Function),
                }),
                expect.objectContaining({
                    getTime: expect.any(Function),
                }),
                'COMPLETED',
            ]));
            expect(result.totalSales).toBe(1500000);
        });
        it('should handle date range spanning multiple days', async () => {
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-21');
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '10500000',
                        transaction_count: '35',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', startDate, endDate);
            expect(result.totalSales).toBe(10500000);
            expect(result.transactionCount).toBe(35);
        });
        it('should handle same date as both start and end', async () => {
            const date = new Date('2024-01-15');
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '1500000',
                        transaction_count: '5',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', date, date);
            expect(result.totalSales).toBe(1500000);
        });
    });
    // ============================================================================
    // TEST GROUP 9: Null/Undefined Handling
    // ============================================================================
    describe('calculateDailyStatistics - Null/Undefined Handling', () => {
        it('should throw error when storeId is empty string', async () => {
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-15');
            await expect(calculateDailyStatistics('', startDate, endDate)).rejects.toThrow('Store ID is required');
        });
        it('should throw error when startDate is invalid', async () => {
            const invalidDate = new Date('invalid');
            const validDate = new Date('2024-01-15');
            await expect(calculateDailyStatistics('store-1', invalidDate, validDate)).rejects.toThrow('Invalid start date');
        });
        it('should throw error when endDate is invalid', async () => {
            const validDate = new Date('2024-01-15');
            const invalidDate = new Date('invalid');
            await expect(calculateDailyStatistics('store-1', validDate, invalidDate)).rejects.toThrow('Invalid end date');
        });
        it('should throw error when startDate is after endDate', async () => {
            const startDate = new Date('2024-01-20');
            const endDate = new Date('2024-01-15');
            await expect(calculateDailyStatistics('store-1', startDate, endDate)).rejects.toThrow('Start date must be before or equal to end date');
        });
    });
    // ============================================================================
    // TEST GROUP 10: Invalid Date Formats
    // ============================================================================
    describe('calculateDailyStatistics - Invalid Date Formats', () => {
        it('should throw error on non-Date object', async () => {
            const startDate = '2024-01-15';
            await expect(calculateDailyStatistics('store-1', startDate, new Date())).rejects.toThrow();
        });
        it('should handle NaN dates', async () => {
            const invalidDate = new Date('not-a-date');
            await expect(calculateDailyStatistics('store-1', invalidDate, new Date())).rejects.toThrow('Invalid start date');
        });
    });
    // ============================================================================
    // TEST GROUP 11: BOP Management
    // ============================================================================
    describe('getActiveBop', () => {
        it('should retrieve most recent active BOP', async () => {
            const storeId = 'store-1';
            const bopData = {
                id: 'bop-1',
                storeId: 'store-1',
                name: 'Daily Operating Cost',
                amount: 50000,
                effectiveFrom: '2024-01-01',
            };
            mockDb.query.mockResolvedValueOnce({
                rows: [bopData],
            });
            const result = await getActiveBop(storeId);
            expect(result).toEqual(bopData);
            expect(result?.amount).toBe(50000);
        });
        it('should return null when no BOP exists', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [],
            });
            const result = await getActiveBop('store-1');
            expect(result).toBeNull();
        });
        it('should throw error when storeId is empty', async () => {
            await expect(getActiveBop('')).rejects.toThrow('Store ID is required');
        });
        it('should filter by current date only', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [],
            });
            await getActiveBop('store-1');
            expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('CURRENT_DATE'), expect.any(Array));
        });
    });
    // ============================================================================
    // TEST GROUP 12: Multi-Store Statistics
    // ============================================================================
    describe('calculateMultiStoreStatistics', () => {
        it('should calculate statistics for multiple stores', async () => {
            const storeIds = ['store-1', 'store-2', 'store-3'];
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-15');
            // Mock each store's response
            mockDb.query
                .mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '1500000',
                        transaction_count: '5',
                    },
                ],
            })
                .mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '2000000',
                        transaction_count: '6',
                    },
                ],
            })
                .mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '1200000',
                        transaction_count: '4',
                    },
                ],
            });
            const result = await calculateMultiStoreStatistics(storeIds, startDate, endDate);
            expect(result.size).toBe(3);
            expect(result.get('store-1')?.totalSales).toBe(1500000);
            expect(result.get('store-2')?.totalSales).toBe(2000000);
            expect(result.get('store-3')?.totalSales).toBe(1200000);
        });
        it('should throw error with empty storeIds array', async () => {
            await expect(calculateMultiStoreStatistics([], new Date(), new Date())).rejects.toThrow('At least one store ID is required');
        });
        it('should throw error with invalid dates', async () => {
            await expect(calculateMultiStoreStatistics(['store-1'], new Date('invalid'), new Date())).rejects.toThrow('Invalid start date');
        });
    });
    // ============================================================================
    // TEST GROUP 13: Aggregated Statistics (All Stores)
    // ============================================================================
    describe('calculateAggregatedStatistics', () => {
        it('should aggregate statistics across all stores', async () => {
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-15');
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '5000000',
                        transaction_count: '25',
                    },
                ],
            });
            const result = await calculateAggregatedStatistics(startDate, endDate);
            expect(result.totalSales).toBe(5000000);
            expect(result.transactionCount).toBe(25);
            expect(result.averageTransactionValue).toBe(200000);
        });
        it('should return 0 when no transactions across any store', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '0',
                        transaction_count: '0',
                    },
                ],
            });
            const result = await calculateAggregatedStatistics(new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.totalSales).toBe(0);
            expect(result.transactionCount).toBe(0);
        });
        it('should handle multi-day aggregation', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '35000000',
                        transaction_count: '175',
                    },
                ],
            });
            const result = await calculateAggregatedStatistics(new Date('2024-01-15'), new Date('2024-01-21'));
            expect(result.totalSales).toBe(35000000);
            expect(result.transactionCount).toBe(175);
            expect(result.averageTransactionValue).toBeCloseTo(200000, 2);
        });
    });
    // ============================================================================
    // TEST GROUP 14: Date Boundary Utilities
    // ============================================================================
    describe('getDayBoundaries', () => {
        it('should return start of day as 00:00:00.000', () => {
            const date = new Date('2024-01-15T14:30:45.123Z');
            const { startOfDay } = getDayBoundaries(date);
            expect(startOfDay.getHours()).toBe(0);
            expect(startOfDay.getMinutes()).toBe(0);
            expect(startOfDay.getSeconds()).toBe(0);
            expect(startOfDay.getMilliseconds()).toBe(0);
        });
        it('should return end of day as 23:59:59.999', () => {
            const date = new Date('2024-01-15T14:30:45.123Z');
            const { endOfDay } = getDayBoundaries(date);
            expect(endOfDay.getHours()).toBe(23);
            expect(endOfDay.getMinutes()).toBe(59);
            expect(endOfDay.getSeconds()).toBe(59);
            expect(endOfDay.getMilliseconds()).toBe(999);
        });
        it('should use today when no date provided', () => {
            const boundaries = getDayBoundaries();
            const today = new Date();
            expect(boundaries.startOfDay.getDate()).toBe(today.getDate());
            expect(boundaries.endOfDay.getDate()).toBe(today.getDate());
        });
        it('should throw error on invalid date', () => {
            const invalidDate = new Date('invalid');
            expect(() => getDayBoundaries(invalidDate)).toThrow('Invalid date');
        });
    });
    // ============================================================================
    // TEST GROUP 15: Currency Formatting
    // ============================================================================
    describe('formatCurrency', () => {
        it('should format as IDR currency', () => {
            const formatted = formatCurrency(1500000);
            expect(formatted).toContain('1.500.000');
        });
        it('should handle small amounts', () => {
            const formatted = formatCurrency(100);
            expect(formatted).toBeDefined();
            expect(formatted).toContain('100');
        });
        it('should handle zero', () => {
            const formatted = formatCurrency(0);
            expect(formatted).toContain('0');
        });
        it('should return 0 for invalid input', () => {
            const formatted = formatCurrency(NaN);
            expect(formatted).toBe('0');
        });
        it('should handle negative amounts', () => {
            const formatted = formatCurrency(-1500000);
            expect(formatted).toBeDefined();
        });
    });
    // ============================================================================
    // TEST GROUP 16: Decimal Precision Utility
    // ============================================================================
    describe('roundToPrecision', () => {
        it('should round to specified decimal places', () => {
            const result = roundToPrecision(1234.5678, 2);
            expect(result).toBe(1234.57);
        });
        it('should round to 0 decimal places by default (IDR)', () => {
            const result = roundToPrecision(1234.5678);
            expect(result).toBe(1235);
        });
        it('should handle rounding down', () => {
            const result = roundToPrecision(1234.4, 0);
            expect(result).toBe(1234);
        });
        it('should return 0 for NaN input', () => {
            const result = roundToPrecision(NaN);
            expect(result).toBe(0);
        });
        it('should handle negative numbers', () => {
            const result = roundToPrecision(-1234.5678, 2);
            expect(result).toBe(-1234.57);
        });
        it('should handle zero', () => {
            const result = roundToPrecision(0, 2);
            expect(result).toBe(0);
        });
    });
    // ============================================================================
    // TEST GROUP 17: Integration Tests
    // ============================================================================
    describe('Dashboard Statistics - Integration Scenarios', () => {
        it('should handle typical daily business scenario', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '4500000',
                        transaction_count: '15',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.totalSales).toBe(4500000);
            expect(result.transactionCount).toBe(15);
            expect(result.averageTransactionValue).toBe(300000);
        });
        it('should handle busy day with many transactions', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '50000000',
                        transaction_count: '200',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.transactionCount).toBe(200);
            expect(result.averageTransactionValue).toBe(250000);
        });
        it('should handle slow day with few transactions', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '500000',
                        transaction_count: '2',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.transactionCount).toBe(2);
            expect(result.totalSales).toBe(500000);
            expect(result.averageTransactionValue).toBe(250000);
        });
    });
    // ============================================================================
    // TEST GROUP 18: Response Format Consistency
    // ============================================================================
    describe('Response Format Consistency', () => {
        it('should always include date field in ISO format', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '0',
                        transaction_count: '0',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result.date).toBe('2024-01-15');
            expect(/^\d{4}-\d{2}-\d{2}$/.test(result.date)).toBe(true);
        });
        it('should return all required fields', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '1500000',
                        transaction_count: '5',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(result).toHaveProperty('totalSales');
            expect(result).toHaveProperty('transactionCount');
            expect(result).toHaveProperty('averageTransactionValue');
            expect(result).toHaveProperty('date');
        });
        it('should have correct data types', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        total_sales: '1500000',
                        transaction_count: '5',
                    },
                ],
            });
            const result = await calculateDailyStatistics('store-1', new Date('2024-01-15'), new Date('2024-01-15'));
            expect(typeof result.totalSales).toBe('number');
            expect(typeof result.transactionCount).toBe('number');
            expect(typeof result.averageTransactionValue).toBe('number');
            expect(typeof result.date).toBe('string');
        });
    });
});
//# sourceMappingURL=dashboard.test.js.map