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
    user: (userId: string) => `session:user:${userId}`,
    token: (token: string) => `session:token:${token}`,
    revoked: (userId: string) => `session:revoked:${userId}`,
  },

  // Store related keys
  store: {
    byId: (storeId: string) => `store:data:${storeId}`,
    list: (limit?: number, offset?: number) => {
      let key = 'store:list';
      if (limit !== undefined && offset !== undefined) {
        key += `:limit:${limit}:offset:${offset}`;
      }
      return key;
    },
    inventory: (storeId: string) => `store:inventory:${storeId}`,
    inventoryProduct: (storeId: string, productId: string) =>
      `store:inventory:${storeId}:product:${productId}`,
    bop: (storeId: string) => `store:bop:${storeId}`,
  },

  // Product related keys
  product: {
    byId: (productId: string) => `product:data:${productId}`,
    list: (storeId?: string, limit?: number, offset?: number) => {
      let key = 'product:list';
      if (storeId) key += `:store:${storeId}`;
      if (limit !== undefined && offset !== undefined) {
        key += `:limit:${limit}:offset:${offset}`;
      }
      return key;
    },
    search: (query: string, storeId?: string) => {
      let key = `product:search:${query}`;
      if (storeId) key += `:store:${storeId}`;
      return key;
    },
  },

  // Member related keys
  member: {
    byId: (memberId: string) => `member:data:${memberId}`,
    list: (limit?: number, offset?: number) => {
      let key = 'member:list';
      if (limit !== undefined && offset !== undefined) {
        key += `:limit:${limit}:offset:${offset}`;
      }
      return key;
    },
    search: (query: string) => `member:search:${query}`,
    creditBalance: (memberId: string) => `member:credit:${memberId}`,
  },

  // Transaction related keys
  transaction: {
    byId: (transactionId: string) => `transaction:data:${transactionId}`,
    list: (storeId: string, limit?: number, offset?: number) => {
      let key = `transaction:list:store:${storeId}`;
      if (limit !== undefined && offset !== undefined) {
        key += `:limit:${limit}:offset:${offset}`;
      }
      return key;
    },
    byDate: (storeId: string, date: string) =>
      `transaction:date:${storeId}:${date}`,
    byPaymentMethod: (storeId: string, method: string, date?: string) => {
      let key = `transaction:method:${storeId}:${method}`;
      if (date) key += `:date:${date}`;
      return key;
    },
  },

  // Dashboard related keys
  dashboard: {
    kasirStats: (userId: string, date: string) =>
      `dashboard:kasir:${userId}:date:${date}`,
    ownerStats: (date: string) => `dashboard:owner:date:${date}`,
    dailyRevenue: (storeId: string, date: string) =>
      `dashboard:revenue:store:${storeId}:date:${date}`,
  },

  // Report related keys
  report: {
    daily: (storeId: string, date: string) =>
      `report:daily:store:${storeId}:date:${date}`,
    weekly: (storeId: string, weekStart: string) =>
      `report:weekly:store:${storeId}:week:${weekStart}`,
    monthly: (storeId: string, yearMonth: string) =>
      `report:monthly:store:${storeId}:month:${yearMonth}`,
    capital: (storeId: string, date: string) =>
      `report:capital:store:${storeId}:date:${date}`,
    bop: (storeId: string, date: string) =>
      `report:bop:store:${storeId}:date:${date}`,
  },

  // Inventory and stock related keys
  inventory: {
    warehouse: () => 'inventory:warehouse:all',
    byLocation: (locationId: string) =>
      `inventory:location:${locationId}`,
    productByLocation: (productId: string, locationId: string) =>
      `inventory:product:${productId}:location:${locationId}`,
    stockTransfer: (transferId: string) =>
      `inventory:transfer:${transferId}`,
    stockOpname: (opnameId: string) =>
      `inventory:opname:${opnameId}`,
  },

  // Supplier and purchase order related keys
  supplier: {
    byId: (supplierId: string) => `supplier:data:${supplierId}`,
    list: (limit?: number, offset?: number) => {
      let key = 'supplier:list';
      if (limit !== undefined && offset !== undefined) {
        key += `:limit:${limit}:offset:${offset}`;
      }
      return key;
    },
    payable: (supplierId: string) => `supplier:payable:${supplierId}`,
  },

  purchaseOrder: {
    byId: (poId: string) => `po:data:${poId}`,
    list: (supplierId?: string, limit?: number, offset?: number) => {
      let key = 'po:list';
      if (supplierId) key += `:supplier:${supplierId}`;
      if (limit !== undefined && offset !== undefined) {
        key += `:limit:${limit}:offset:${offset}`;
      }
      return key;
    },
  },

  // Piutang (customer credit) related keys
  piutang: {
    byId: (piutangId: string) => `piutang:data:${piutangId}`,
    list: (storeId?: string, limit?: number, offset?: number) => {
      let key = 'piutang:list';
      if (storeId) key += `:store:${storeId}`;
      if (limit !== undefined && offset !== undefined) {
        key += `:limit:${limit}:offset:${offset}`;
      }
      return key;
    },
    byMember: (memberId: string) => `piutang:member:${memberId}`,
    overdue: (storeId?: string) => {
      let key = 'piutang:overdue';
      if (storeId) key += `:store:${storeId}`;
      return key;
    },
  },

  // Payable (supplier debt) related keys
  payable: {
    byId: (payableId: string) => `payable:data:${payableId}`,
    list: (supplierId?: string, limit?: number, offset?: number) => {
      let key = 'payable:list';
      if (supplierId) key += `:supplier:${supplierId}`;
      if (limit !== undefined && offset !== undefined) {
        key += `:limit:${limit}:offset:${offset}`;
      }
      return key;
    },
    overdue: (supplierId?: string) => {
      let key = 'payable:overdue';
      if (supplierId) key += `:supplier:${supplierId}`;
      return key;
    },
  },

  // Attendance related keys
  attendance: {
    record: (userId: string, date: string) =>
      `attendance:record:${userId}:date:${date}`,
    monthly: (userId: string, yearMonth: string) =>
      `attendance:monthly:${userId}:month:${yearMonth}`,
  },

  // Rate limiting keys
  rateLimit: {
    login: (identifier: string) => `ratelimit:login:${identifier}`,
    api: (identifier: string, endpoint: string) =>
      `ratelimit:api:${identifier}:${endpoint}`,
  },

  // Locks and semaphores for preventing race conditions
  lock: {
    transaction: (transactionId: string) => `lock:transaction:${transactionId}`,
    stockOpname: (opnameId: string) => `lock:opname:${opnameId}`,
    inventoryTransfer: (transferId: string) =>
      `lock:transfer:${transferId}`,
  },
};

/**
 * Get all cache key patterns for a resource type
 * Useful for bulk invalidation
 */
export function getCachePatternForResource(resourceType: string): string {
  const patterns: Record<string, string> = {
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
