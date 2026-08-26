/**
 * Cache invalidation utilities
 * Provides methods to invalidate cache for different resource types and operations
 */
export declare class CacheInvalidationService {
    /**
     * Invalidate a single cache key
     */
    static invalidateKey(key: string): Promise<void>;
    /**
     * Invalidate multiple cache keys
     */
    static invalidateKeys(keys: string[]): Promise<void>;
    /**
     * Invalidate all cache keys matching a pattern
     */
    static invalidatePattern(pattern: string): Promise<void>;
    /**
     * Invalidate all cache for a resource type
     */
    static invalidateResourceType(resourceType: string): Promise<void>;
    static invalidateStore(storeId: string): Promise<void>;
    static invalidateProduct(productId: string): Promise<void>;
    static invalidateProductList(storeId?: string): Promise<void>;
    static invalidateMember(memberId: string): Promise<void>;
    static invalidateMemberList(): Promise<void>;
    static invalidateTransaction(transactionId: string, storeId?: string): Promise<void>;
    static invalidateTransactionList(storeId: string): Promise<void>;
    static invalidateInventory(storeId?: string): Promise<void>;
    static invalidateStockTransfer(transferId: string): Promise<void>;
    static invalidateStockOpname(opnameId: string): Promise<void>;
    static invalidateDashboard(userId?: string): Promise<void>;
    static invalidateDailyReport(storeId: string, date?: string): Promise<void>;
    static invalidateWeeklyReport(storeId: string, weekStart?: string): Promise<void>;
    static invalidateMonthlyReport(storeId: string, yearMonth?: string): Promise<void>;
    static invalidateCapitalReport(storeId?: string): Promise<void>;
    static invalidateBopReport(storeId?: string): Promise<void>;
    static invalidateSupplier(supplierId: string): Promise<void>;
    static invalidateSupplierList(): Promise<void>;
    static invalidatePurchaseOrder(poId: string): Promise<void>;
    static invalidatePiutang(piutangId: string, memberId?: string): Promise<void>;
    static invalidatePiutangOverdue(storeId?: string): Promise<void>;
    static invalidatePayable(payableId: string, supplierId?: string): Promise<void>;
    static invalidatePayableOverdue(supplierId?: string): Promise<void>;
    static invalidateAttendance(userId: string): Promise<void>;
    /**
     * Clear all cache (use sparingly - only in specific scenarios)
     */
    static clearAllCache(): Promise<void>;
    /**
     * Invalidate cache for a specific date (useful for end-of-day operations)
     */
    static invalidateByDate(date: string, storeId?: string): Promise<void>;
}
export default CacheInvalidationService;
//# sourceMappingURL=invalidation.d.ts.map