/**
 * Cache service for application-level caching operations
 * Provides high-level cache operations with automatic serialization/deserialization
 */
export declare class CacheService {
    /**
     * Get cached value with automatic deserialization
     */
    static get<T>(key: string): Promise<T | null>;
    /**
     * Set cache value with automatic serialization
     */
    static set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
    /**
     * Get or compute value (cache-aside pattern)
     */
    static getOrCompute<T>(key: string, computeFn: () => Promise<T>, ttlSeconds?: number): Promise<T>;
    static cacheUserSession(userId: string, sessionData: Record<string, any>, ttlSeconds?: number): Promise<void>;
    static getUserSession(userId: string): Promise<Record<string, any> | null>;
    static revokeUserSession(userId: string): Promise<void>;
    static cacheStore(storeId: string, storeData: Record<string, any>, ttlSeconds?: number): Promise<void>;
    static getStore(storeId: string): Promise<Record<string, any> | null>;
    static cacheStoreList(stores: any[], limit?: number, offset?: number, ttlSeconds?: number): Promise<void>;
    static getStoreList(limit?: number, offset?: number): Promise<Record<string, any>[] | null>;
    static cacheStoreInventory(storeId: string, inventory: Record<string, any>[], ttlSeconds?: number): Promise<void>;
    static getStoreInventory(storeId: string): Promise<Record<string, any>[] | null>;
    static cacheProduct(productId: string, productData: Record<string, any>, ttlSeconds?: number): Promise<void>;
    static getProduct(productId: string): Promise<Record<string, any> | null>;
    static cacheProductList(products: any[], storeId?: string, limit?: number, offset?: number, ttlSeconds?: number): Promise<void>;
    static getProductList(storeId?: string, limit?: number, offset?: number): Promise<Record<string, any>[] | null>;
    static cacheProductSearch(query: string, results: any[], storeId?: string, ttlSeconds?: number): Promise<void>;
    static getProductSearchResults(query: string, storeId?: string): Promise<Record<string, any>[] | null>;
    static cacheMember(memberId: string, memberData: Record<string, any>, ttlSeconds?: number): Promise<void>;
    static getMember(memberId: string): Promise<Record<string, any> | null>;
    static cacheMemberCreditBalance(memberId: string, balance: number, ttlSeconds?: number): Promise<void>;
    static getMemberCreditBalance(memberId: string): Promise<number | null>;
    static cacheMemberList(members: any[], limit?: number, offset?: number, ttlSeconds?: number): Promise<void>;
    static getMemberList(limit?: number, offset?: number): Promise<Record<string, any>[] | null>;
    static cacheTransaction(transactionId: string, transactionData: Record<string, any>, ttlSeconds?: number): Promise<void>;
    static getTransaction(transactionId: string): Promise<Record<string, any> | null>;
    static cacheTransactionList(storeId: string, transactions: any[], limit?: number, offset?: number, ttlSeconds?: number): Promise<void>;
    static getTransactionList(storeId: string, limit?: number, offset?: number): Promise<Record<string, any>[] | null>;
    static cacheDashboardStats(userId: string, date: string, stats: Record<string, any>, ttlSeconds?: number): Promise<void>;
    static getDashboardStats(userId: string, date: string): Promise<Record<string, any> | null>;
    static cacheOwnerDashboardStats(date: string, stats: Record<string, any>, ttlSeconds?: number): Promise<void>;
    static getOwnerDashboardStats(date: string): Promise<Record<string, any> | null>;
    static cacheDailyReport(storeId: string, date: string, reportData: Record<string, any>, ttlSeconds?: number): Promise<void>;
    static getDailyReport(storeId: string, date: string): Promise<Record<string, any> | null>;
    static cacheWeeklyReport(storeId: string, weekStart: string, reportData: Record<string, any>, ttlSeconds?: number): Promise<void>;
    static getWeeklyReport(storeId: string, weekStart: string): Promise<Record<string, any> | null>;
    static cacheMonthlyReport(storeId: string, yearMonth: string, reportData: Record<string, any>, ttlSeconds?: number): Promise<void>;
    static getMonthlyReport(storeId: string, yearMonth: string): Promise<Record<string, any> | null>;
    static cacheInventory(locationId: string, inventory: Record<string, any>[], ttlSeconds?: number): Promise<void>;
    static getInventory(locationId: string): Promise<Record<string, any>[] | null>;
    static cacheSupplier(supplierId: string, supplierData: Record<string, any>, ttlSeconds?: number): Promise<void>;
    static getSupplier(supplierId: string): Promise<Record<string, any> | null>;
    static cacheSupplierList(suppliers: any[], limit?: number, offset?: number, ttlSeconds?: number): Promise<void>;
    static getSupplierList(limit?: number, offset?: number): Promise<Record<string, any>[] | null>;
    /**
     * Check and increment rate limit counter
     */
    static checkRateLimit(identifier: string, endpoint: string, maxAttempts: number, windowSeconds: number): Promise<{
        allowed: boolean;
        remaining: number;
        resetIn: number;
    }>;
}
export default CacheService;
//# sourceMappingURL=service.d.ts.map