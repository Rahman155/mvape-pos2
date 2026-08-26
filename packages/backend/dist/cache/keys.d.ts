/**
 * Cache key naming conventions
 * Provides a structured approach to cache key generation for consistency and easy invalidation
 *
 * Key Pattern Format: prefix:resource:identifier:subresource
 * Examples:
 *   - session:user:123
 *   - store:inventory:store_id:456
 *   - dashboard:stats:store_id:789:date:2024-01-15
 *   - transaction:list:store_id:123:page:1
 */
/**
 * Session and authentication related cache keys
 */
export declare const cacheKeys: {
    session: {
        user: (userId: string) => string;
        token: (token: string) => string;
        revoked: (userId: string) => string;
    };
    store: {
        byId: (storeId: string) => string;
        list: (limit?: number, offset?: number) => string;
        inventory: (storeId: string) => string;
        inventoryProduct: (storeId: string, productId: string) => string;
        bop: (storeId: string) => string;
    };
    product: {
        byId: (productId: string) => string;
        list: (storeId?: string, limit?: number, offset?: number) => string;
        search: (query: string, storeId?: string) => string;
    };
    member: {
        byId: (memberId: string) => string;
        list: (limit?: number, offset?: number) => string;
        search: (query: string) => string;
        creditBalance: (memberId: string) => string;
    };
    transaction: {
        byId: (transactionId: string) => string;
        list: (storeId: string, limit?: number, offset?: number) => string;
        byDate: (storeId: string, date: string) => string;
        byPaymentMethod: (storeId: string, method: string, date?: string) => string;
    };
    dashboard: {
        kasirStats: (userId: string, date: string) => string;
        ownerStats: (date: string) => string;
        dailyRevenue: (storeId: string, date: string) => string;
    };
    report: {
        daily: (storeId: string, date: string) => string;
        weekly: (storeId: string, weekStart: string) => string;
        monthly: (storeId: string, yearMonth: string) => string;
        capital: (storeId: string, date: string) => string;
        bop: (storeId: string, date: string) => string;
    };
    inventory: {
        warehouse: () => string;
        byLocation: (locationId: string) => string;
        productByLocation: (productId: string, locationId: string) => string;
        stockTransfer: (transferId: string) => string;
        stockOpname: (opnameId: string) => string;
    };
    supplier: {
        byId: (supplierId: string) => string;
        list: (limit?: number, offset?: number) => string;
        payable: (supplierId: string) => string;
    };
    purchaseOrder: {
        byId: (poId: string) => string;
        list: (supplierId?: string, limit?: number, offset?: number) => string;
    };
    piutang: {
        byId: (piutangId: string) => string;
        list: (storeId?: string, limit?: number, offset?: number) => string;
        byMember: (memberId: string) => string;
        overdue: (storeId?: string) => string;
    };
    payable: {
        byId: (payableId: string) => string;
        list: (supplierId?: string, limit?: number, offset?: number) => string;
        overdue: (supplierId?: string) => string;
    };
    attendance: {
        record: (userId: string, date: string) => string;
        monthly: (userId: string, yearMonth: string) => string;
    };
    rateLimit: {
        login: (identifier: string) => string;
        api: (identifier: string, endpoint: string) => string;
    };
    lock: {
        transaction: (transactionId: string) => string;
        stockOpname: (opnameId: string) => string;
        inventoryTransfer: (transferId: string) => string;
    };
};
/**
 * Get all cache key patterns for a resource type
 * Useful for bulk invalidation
 */
export declare function getCachePatternForResource(resourceType: string): string;
/**
 * Default TTL values (in seconds) for different cache types
 */
export declare const cacheTTL: {
    SHORT: number;
    MEDIUM: number;
    LONG: number;
    VERY_LONG: number;
    SESSION: number;
    TOKEN: number;
    REPORT: number;
    DASHBOARD: number;
    PRODUCT: number;
    MEMBER: number;
    TRANSACTION: number;
};
//# sourceMappingURL=keys.d.ts.map