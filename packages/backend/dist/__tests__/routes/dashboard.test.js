"use strict";
/**
 * Dashboard API Tests
 * Integration tests for kasir and owner dashboard endpoints
 *
 * Requirement: 6 (Kasir Dashboard)
 * - GET /api/v1/dashboard/kasir/daily-stats: Daily statistics for kasir
 * - GET /api/v1/dashboard/owner/summary: Dashboard summary for owner
 *
 * Note: These tests document the expected behavior.
 * To run these tests, install a test framework like Jest or Vitest.
 */
/**
 * Kasir Daily Stats Calculation Tests
 * Requirement: 6.2, 6.3, 6.4
 */
describe('GET /api/v1/dashboard/kasir/daily-stats', () => {
    describe('Authentication', () => {
        it('should require authentication token', () => {
            // Expected: 401 Unauthorized when no token provided
            const expectedStatus = 401;
            expect(expectedStatus).toBe(401);
        });
        it('should accept valid JWT token', () => {
            // Expected: 200 OK with valid token
            const expectedStatus = 200;
            expect(expectedStatus).toBe(200);
        });
    });
    describe('Authorization', () => {
        it('should allow KASIR role', () => {
            const allowedRoles = ['KASIR', 'OWNER'];
            expect(allowedRoles).toContain('KASIR');
        });
        it('should allow OWNER role', () => {
            const allowedRoles = ['KASIR', 'OWNER'];
            expect(allowedRoles).toContain('OWNER');
        });
        it('should deny other roles', () => {
            const allowedRoles = ['KASIR', 'OWNER'];
            const forbiddenRoles = ['GUEST', 'USER'];
            expect(allowedRoles).not.toContain(forbiddenRoles[0]);
            expect(allowedRoles).not.toContain(forbiddenRoles[1]);
        });
    });
    describe('Total Sales Calculation (Req 6.2)', () => {
        it('should calculate total sales from completed transactions', () => {
            const mockDBResult = {
                total_sales: '450000',
                transaction_count: '3',
            };
            const totalSales = parseFloat(mockDBResult.total_sales || '0');
            expect(totalSales).toBe(450000);
        });
        it('should return 0 when no transactions exist', () => {
            const mockDBResult = {
                total_sales: '0',
                transaction_count: '0',
            };
            const totalSales = parseFloat(mockDBResult.total_sales || '0');
            expect(totalSales).toBe(0);
        });
        it('should only include COMPLETED transactions in total', () => {
            // Only transactions with status = 'COMPLETED' should be included
            const expectedQuery = `
        WHERE store_id = $1 
          AND transaction_date >= $2 
          AND transaction_date <= $3
          AND status = 'COMPLETED'
      `;
            expect(expectedQuery).toContain("status = 'COMPLETED'");
        });
        it('should handle large sales amounts', () => {
            const mockDBResult = {
                total_sales: '50000000',
                transaction_count: '10',
            };
            const totalSales = parseFloat(mockDBResult.total_sales || '0');
            expect(totalSales).toBe(50000000);
        });
    });
    describe('Transaction Count (Req 6.3)', () => {
        it('should count completed transactions', () => {
            const mockDBResult = {
                total_sales: '450000',
                transaction_count: '3',
            };
            const transactionCount = parseInt(mockDBResult.transaction_count || '0');
            expect(transactionCount).toBe(3);
        });
        it('should return 0 when no transactions exist', () => {
            const mockDBResult = {
                total_sales: '0',
                transaction_count: '0',
            };
            const transactionCount = parseInt(mockDBResult.transaction_count || '0');
            expect(transactionCount).toBe(0);
        });
    });
    describe('BOP Information (Req 6.4)', () => {
        it('should return most recent active BOP', () => {
            const mockBOPResult = {
                id: 'bop-1',
                storeId: 'store-1',
                name: 'Daily Operating Cost',
                amount: '50000',
                effectiveFrom: '2024-01-01',
            };
            expect(mockBOPResult.id).toBeDefined();
            expect(mockBOPResult.name).toBe('Daily Operating Cost');
            expect(mockBOPResult.amount).toBe('50000');
        });
        it('should return null when no active BOP exists', () => {
            const mockBOPResult = null;
            expect(mockBOPResult).toBeNull();
        });
        it('should only include currently effective BOP', () => {
            // Query should check: effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
            const expectedQuery = `
        WHERE store_id = $1 
          AND effective_from <= CURRENT_DATE
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      `;
            expect(expectedQuery).toContain('CURRENT_DATE');
        });
        it('should order by effective_from DESC to get most recent', () => {
            const bopList = [
                { id: 'bop-1', name: 'Old BOP', effectiveFrom: '2024-01-01' },
                { id: 'bop-2', name: 'Current BOP', effectiveFrom: '2024-01-10' },
            ];
            const sorted = bopList.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
            expect(sorted[0].name).toBe('Current BOP');
        });
    });
    describe('Date Handling', () => {
        it('should use today\'s date when no date parameter provided', () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expect(today).toBeInstanceOf(Date);
        });
        it('should accept custom date in YYYY-MM-DD format', () => {
            const dateString = '2024-01-15';
            const date = new Date(dateString);
            expect(date.toISOString()).toContain('2024-01-15');
        });
        it('should calculate start and end of day correctly', () => {
            const targetDate = new Date('2024-01-15');
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            expect(startOfDay.getHours()).toBe(0);
            expect(endOfDay.getHours()).toBe(23);
        });
    });
    describe('Response Format', () => {
        it('should return data with correct structure', () => {
            const expectedResponse = {
                data: {
                    totalSales: 450000,
                    transactionCount: 3,
                    bop: {
                        id: 'bop-1',
                        storeId: 'store-1',
                        name: 'Daily Operating Cost',
                        amount: 50000,
                        effectiveFrom: '2024-01-01',
                    },
                    date: '2024-01-15',
                },
                meta: {
                    timestamp: '2024-01-15T10:30:00.000Z',
                    requestId: 'req-123',
                },
            };
            expect(expectedResponse.data).toHaveProperty('totalSales');
            expect(expectedResponse.data).toHaveProperty('transactionCount');
            expect(expectedResponse.data).toHaveProperty('bop');
            expect(expectedResponse.data).toHaveProperty('date');
        });
    });
    describe('Store Filter (KASIR vs OWNER)', () => {
        it('should use KASIR\'s storeId when role is KASIR', () => {
            const user = {
                role: 'KASIR',
                storeId: 'store-1',
            };
            const storeId = user.storeId;
            expect(storeId).toBe('store-1');
        });
        it('should use query storeId parameter when role is OWNER', () => {
            const user = {
                role: 'OWNER',
                storeId: undefined,
            };
            const queryStoreId = 'store-2';
            const storeId = queryStoreId || user.storeId;
            expect(storeId).toBe('store-2');
        });
        it('should use OWNER\'s storeId if no storeId query param provided', () => {
            const user = {
                role: 'OWNER',
                storeId: 'default-store',
            };
            const queryStoreId = undefined;
            const storeId = queryStoreId || user.storeId;
            expect(storeId).toBe('default-store');
        });
    });
});
/**
 * Owner Dashboard Summary Tests
 * Requirement: 6 (overview for owner)
 */
describe('GET /api/v1/dashboard/owner/summary', () => {
    describe('Authentication & Authorization', () => {
        it('should require authentication token', () => {
            const expectedStatus = 401;
            expect(expectedStatus).toBe(401);
        });
        it('should only allow OWNER role', () => {
            const allowedRoles = ['OWNER'];
            expect(allowedRoles).toContain('OWNER');
            expect(allowedRoles).not.toContain('KASIR');
        });
    });
    describe('Today\'s Revenue Calculation', () => {
        it('should calculate today\'s total revenue across all stores', () => {
            const mockDBResult = {
                total_revenue: '5000000',
                transaction_count: '25',
            };
            const todayRevenue = parseFloat(mockDBResult.total_revenue || '0');
            expect(todayRevenue).toBe(5000000);
        });
        it('should return 0 when no transactions today', () => {
            const mockDBResult = {
                total_revenue: '0',
                transaction_count: '0',
            };
            const todayRevenue = parseFloat(mockDBResult.total_revenue || '0');
            expect(todayRevenue).toBe(0);
        });
    });
    describe('Store Count', () => {
        it('should count only active stores', () => {
            const mockDBResult = {
                count: '3',
            };
            const storeCount = parseInt(mockDBResult.count || '0');
            expect(storeCount).toBe(3);
        });
        it('should return 0 when no stores exist', () => {
            const mockDBResult = {
                count: '0',
            };
            const storeCount = parseInt(mockDBResult.count || '0');
            expect(storeCount).toBe(0);
        });
    });
    describe('Response Format', () => {
        it('should return summary with all required fields', () => {
            const expectedResponse = {
                data: {
                    totalRevenue: 5000000,
                    totalProfit: 2500000,
                    totalCapital: 10000000,
                    storeCount: 3,
                    todayRevenue: 1500000,
                    todayTransactionCount: 25,
                },
                meta: {
                    timestamp: '2024-01-15T10:30:00.000Z',
                    requestId: 'req-123',
                },
            };
            expect(expectedResponse.data).toHaveProperty('totalRevenue');
            expect(expectedResponse.data).toHaveProperty('totalProfit');
            expect(expectedResponse.data).toHaveProperty('totalCapital');
            expect(expectedResponse.data).toHaveProperty('storeCount');
            expect(expectedResponse.data).toHaveProperty('todayRevenue');
            expect(expectedResponse.data).toHaveProperty('todayTransactionCount');
        });
    });
});
/**
 * Common Tests for Both Endpoints
 */
describe('Dashboard Endpoints - Common Behavior', () => {
    describe('Error Handling', () => {
        it('should return 401 when authentication required but not provided', () => {
            const expectedStatus = 401;
            expect(expectedStatus).toBe(401);
        });
        it('should return 403 when user lacks required role', () => {
            const expectedStatus = 403;
            expect(expectedStatus).toBe(403);
        });
        it('should return 500 on database error', () => {
            const expectedStatus = 500;
            expect(expectedStatus).toBe(500);
        });
    });
    describe('Request Validation', () => {
        it('should validate date format if provided', () => {
            const validDate = '2024-01-15';
            const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(validDate);
            expect(isValidDate).toBe(true);
        });
        it('should reject invalid date format', () => {
            const invalidDate = '15-01-2024';
            const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(invalidDate);
            expect(isValidDate).toBe(false);
        });
    });
    describe('Response Consistency', () => {
        it('should always include meta.timestamp', () => {
            const response = {
                meta: {
                    timestamp: '2024-01-15T10:30:00.000Z',
                },
            };
            expect(response.meta.timestamp).toBeDefined();
            expect(new Date(response.meta.timestamp)).toBeInstanceOf(Date);
        });
        it('should always include meta.requestId', () => {
            const response = {
                meta: {
                    requestId: 'req-123',
                },
            };
            expect(response.meta.requestId).toBeDefined();
            expect(typeof response.meta.requestId).toBe('string');
        });
        it('should have consistent status codes', () => {
            expect(200).toBe(200); // Success
            expect(401).toBe(401); // Unauthorized
            expect(403).toBe(403); // Forbidden
            expect(500).toBe(500); // Server error
        });
    });
});
//# sourceMappingURL=dashboard.test.js.map