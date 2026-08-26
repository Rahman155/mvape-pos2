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
export const cacheKeys = {
    // Session keys
    session: {
        user: (userId) => `session:user:${userId}`,
        token: (token) => `session:token:${token}`,
        revoked: (userId) => `session:revoked:${userId}`,
    },
    // Store related keys
    store: {
        byId: (storeId) => `store:data:${storeId}`,
        list: (limit, offset) => {
            let key = 'store:list';
            if (limit !== undefined && offset !== undefined) {
                key += `:limit:${limit}:offset:${offset}`;
            }
            return key;
        },
        inventory: (storeId) => `store:inventory:${storeId}`,
        inventoryProduct: (storeId, productId) => `store:inventory:${storeId}:product:${productId}`,
        bop: (storeId) => `store:bop:${storeId}`,
    },
    // Product related keys
    product: {
        byId: (productId) => `product:data:${productId}`,
        list: (storeId, limit, offset) => {
            let key = 'product:list';
            if (storeId)
                key += `:store:${storeId}`;
            if (limit !== undefined && offset !== undefined) {
                key += `:limit:${limit}:offset:${offset}`;
            }
            return key;
        },
        search: (query, storeId) => {
            let key = `product:search:${query}`;
            if (storeId)
                key += `:store:${storeId}`;
            return key;
        },
    },
    // Member related keys
    member: {
        byId: (memberId) => `member:data:${memberId}`,
        list: (limit, offset) => {
            let key = 'member:list';
            if (limit !== undefined && offset !== undefined) {
                key += `:limit:${limit}:offset:${offset}`;
            }
            return key;
        },
        search: (query) => `member:search:${query}`,
        creditBalance: (memberId) => `member:credit:${memberId}`,
    },
    // Transaction related keys
    transaction: {
        byId: (transactionId) => `transaction:data:${transactionId}`,
        list: (storeId, limit, offset) => {
            let key = `transaction:list:store:${storeId}`;
            if (limit !== undefined && offset !== undefined) {
                key += `:limit:${limit}:offset:${offset}`;
            }
            return key;
        },
        byDate: (storeId, date) => `transaction:date:${storeId}:${date}`,
        byPaymentMethod: (storeId, method, date) => {
            let key = `transaction:method:${storeId}:${method}`;
            if (date)
                key += `:date:${date}`;
            return key;
        },
    },
    // Dashboard related keys
    dashboard: {
        kasirStats: (userId, date) => `dashboard:kasir:${userId}:date:${date}`,
        ownerStats: (date) => `dashboard:owner:date:${date}`,
        dailyRevenue: (storeId, date) => `dashboard:revenue:store:${storeId}:date:${date}`,
    },
    // Report related keys
    report: {
        daily: (storeId, date) => `report:daily:store:${storeId}:date:${date}`,
        weekly: (storeId, weekStart) => `report:weekly:store:${storeId}:week:${weekStart}`,
        monthly: (storeId, yearMonth) => `report:monthly:store:${storeId}:month:${yearMonth}`,
        capital: (storeId, date) => `report:capital:store:${storeId}:date:${date}`,
        bop: (storeId, date) => `report:bop:store:${storeId}:date:${date}`,
    },
    // Inventory and stock related keys
    inventory: {
        warehouse: () => 'inventory:warehouse:all',
        byLocation: (locationId) => `inventory:location:${locationId}`,
        productByLocation: (productId, locationId) => `inventory:product:${productId}:location:${locationId}`,
        stockTransfer: (transferId) => `inventory:transfer:${transferId}`,
        stockOpname: (opnameId) => `inventory:opname:${opnameId}`,
    },
    // Supplier and purchase order related keys
    supplier: {
        byId: (supplierId) => `supplier:data:${supplierId}`,
        list: (limit, offset) => {
            let key = 'supplier:list';
            if (limit !== undefined && offset !== undefined) {
                key += `:limit:${limit}:offset:${offset}`;
            }
            return key;
        },
        payable: (supplierId) => `supplier:payable:${supplierId}`,
    },
    purchaseOrder: {
        byId: (poId) => `po:data:${poId}`,
        list: (supplierId, limit, offset) => {
            let key = 'po:list';
            if (supplierId)
                key += `:supplier:${supplierId}`;
            if (limit !== undefined && offset !== undefined) {
                key += `:limit:${limit}:offset:${offset}`;
            }
            return key;
        },
    },
    // Piutang (customer credit) related keys
    piutang: {
        byId: (piutangId) => `piutang:data:${piutangId}`,
        list: (storeId, limit, offset) => {
            let key = 'piutang:list';
            if (storeId)
                key += `:store:${storeId}`;
            if (limit !== undefined && offset !== undefined) {
                key += `:limit:${limit}:offset:${offset}`;
            }
            return key;
        },
        byMember: (memberId) => `piutang:member:${memberId}`,
        overdue: (storeId) => {
            let key = 'piutang:overdue';
            if (storeId)
                key += `:store:${storeId}`;
            return key;
        },
    },
    // Payable (supplier debt) related keys
    payable: {
        byId: (payableId) => `payable:data:${payableId}`,
        list: (supplierId, limit, offset) => {
            let key = 'payable:list';
            if (supplierId)
                key += `:supplier:${supplierId}`;
            if (limit !== undefined && offset !== undefined) {
                key += `:limit:${limit}:offset:${offset}`;
            }
            return key;
        },
        overdue: (supplierId) => {
            let key = 'payable:overdue';
            if (supplierId)
                key += `:supplier:${supplierId}`;
            return key;
        },
    },
    // Attendance related keys
    attendance: {
        record: (userId, date) => `attendance:record:${userId}:date:${date}`,
        monthly: (userId, yearMonth) => `attendance:monthly:${userId}:month:${yearMonth}`,
    },
    // Rate limiting keys
    rateLimit: {
        login: (identifier) => `ratelimit:login:${identifier}`,
        api: (identifier, endpoint) => `ratelimit:api:${identifier}:${endpoint}`,
    },
    // Locks and semaphores for preventing race conditions
    lock: {
        transaction: (transactionId) => `lock:transaction:${transactionId}`,
        stockOpname: (opnameId) => `lock:opname:${opnameId}`,
        inventoryTransfer: (transferId) => `lock:transfer:${transferId}`,
    },
};
/**
 * Get all cache key patterns for a resource type
 * Useful for bulk invalidation
 */
export function getCachePatternForResource(resourceType) {
    const patterns = {
        store: 'store:*',
        product: 'product:*',
        member: 'member:*',
        transaction: 'transaction:*',
        dashboard: 'dashboard:*',
        report: 'report:*',
        inventory: 'inventory:*',
        supplier: 'supplier:*',
        purchaseOrder: 'po:*',
        piutang: 'piutang:*',
        payable: 'payable:*',
        attendance: 'attendance:*',
    };
    return patterns[resourceType] || `${resourceType}:*`;
}
/**
 * Default TTL values (in seconds) for different cache types
 */
export const cacheTTL = {
    // Short-lived cache (1 minute)
    SHORT: 60,
    // Medium-lived cache (5 minutes)
    MEDIUM: 5 * 60,
    // Long-lived cache (1 hour)
    LONG: 60 * 60,
    // Very long-lived cache (24 hours)
    VERY_LONG: 24 * 60 * 60,
    // Session cache (12 hours)
    SESSION: 12 * 60 * 60,
    // Token cache (7 days)
    TOKEN: 7 * 24 * 60 * 60,
    // Report cache (1 hour, reports are usually stable within the hour)
    REPORT: 60 * 60,
    // Dashboard cache (5 minutes)
    DASHBOARD: 5 * 60,
    // Product/Inventory cache (30 minutes)
    PRODUCT: 30 * 60,
    // Member cache (1 hour)
    MEMBER: 60 * 60,
    // Transaction cache (30 minutes, less stable)
    TRANSACTION: 30 * 60,
};
//# sourceMappingURL=keys.js.map