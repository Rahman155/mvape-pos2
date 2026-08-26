import { redis } from './connection.js';
import { cacheKeys, cacheTTL } from './keys.js';
import { logger } from '../utils/logger.js';

/**
 * Cache service for application-level caching operations
 * Provides high-level cache operations with automatic serialization/deserialization
 */
export class CacheService {
  /**
   * Get cached value with automatic deserialization
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to get from cache', error as Error, { key });
      return null;
    }
  }

  /**
   * Set cache value with automatic serialization
   */
  static async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await redis.set(key, serialized, ttlSeconds);
      logger.debug('Cache set', { key, ttl: ttlSeconds });
    } catch (error) {
      logger.error('Failed to set cache', error as Error, { key });
      // Don't throw - cache failures shouldn't break the application
    }
  }

  /**
   * Get or compute value (cache-aside pattern)
   */
  static async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttlSeconds: number = cacheTTL.MEDIUM
  ): Promise<T> {
    try {
      // Try to get from cache
      const cached = await this.get<T>(key);
      if (cached !== null) {
        logger.debug('Cache hit', { key });
        return cached;
      }

      // Compute value
      logger.debug('Cache miss, computing value', { key });
      const value = await computeFn();

      // Store in cache
      await this.set(key, value, ttlSeconds);

      return value;
    } catch (error) {
      logger.error('Error in getOrCompute', error as Error, { key });
      // If cache fails, still compute and return the value
      return computeFn();
    }
  }

  // ============================================================
  // Session and Authentication Caching
  // ============================================================

  static async cacheUserSession(
    userId: string,
    sessionData: Record<string, any>,
    ttlSeconds: number = cacheTTL.SESSION
  ): Promise<void> {
    const key = cacheKeys.session.user(userId);
    await this.set(key, sessionData, ttlSeconds);
  }

  static async getUserSession(userId: string): Promise<Record<string, any> | null> {
    const key = cacheKeys.session.user(userId);
    return this.get<Record<string, any>>(key);
  }

  static async revokeUserSession(userId: string): Promise<void> {
    const key = cacheKeys.session.user(userId);
    await redis.delete(key);
    logger.debug('User session revoked', { userId });
  }

  // ============================================================
  // Store Caching
  // ============================================================

  static async cacheStore(
    storeId: string,
    storeData: Record<string, any>,
    ttlSeconds: number = cacheTTL.LONG
  ): Promise<void> {
    const key = cacheKeys.store.byId(storeId);
    await this.set(key, storeData, ttlSeconds);
  }

  static async getStore(storeId: string): Promise<Record<string, any> | null> {
    const key = cacheKeys.store.byId(storeId);
    return this.get<Record<string, any>>(key);
  }

  static async cacheStoreList(
    stores: any[],
    limit?: number,
    offset?: number,
    ttlSeconds: number = cacheTTL.LONG
  ): Promise<void> {
    const key = cacheKeys.store.list(limit, offset);
    await this.set(key, stores, ttlSeconds);
  }

  static async getStoreList(
    limit?: number,
    offset?: number
  ): Promise<Record<string, any>[] | null> {
    const key = cacheKeys.store.list(limit, offset);
    return this.get<Record<string, any>[]>(key);
  }

  static async cacheStoreInventory(
    storeId: string,
    inventory: Record<string, any>[],
    ttlSeconds: number = cacheTTL.PRODUCT
  ): Promise<void> {
    const key = cacheKeys.store.inventory(storeId);
    await this.set(key, inventory, ttlSeconds);
  }

  static async getStoreInventory(storeId: string): Promise<Record<string, any>[] | null> {
    const key = cacheKeys.store.inventory(storeId);
    return this.get<Record<string, any>[]>(key);
  }

  // ============================================================
  // Product Caching
  // ============================================================

  static async cacheProduct(
    productId: string,
    productData: Record<string, any>,
    ttlSeconds: number = cacheTTL.PRODUCT
  ): Promise<void> {
    const key = cacheKeys.product.byId(productId);
    await this.set(key, productData, ttlSeconds);
  }

  static async getProduct(productId: string): Promise<Record<string, any> | null> {
    const key = cacheKeys.product.byId(productId);
    return this.get<Record<string, any>>(key);
  }

  static async cacheProductList(
    products: any[],
    storeId?: string,
    limit?: number,
    offset?: number,
    ttlSeconds: number = cacheTTL.PRODUCT
  ): Promise<void> {
    const key = cacheKeys.product.list(storeId, limit, offset);
    await this.set(key, products, ttlSeconds);
  }

  static async getProductList(
    storeId?: string,
    limit?: number,
    offset?: number
  ): Promise<Record<string, any>[] | null> {
    const key = cacheKeys.product.list(storeId, limit, offset);
    return this.get<Record<string, any>[]>(key);
  }

  static async cacheProductSearch(
    query: string,
    results: any[],
    storeId?: string,
    ttlSeconds: number = cacheTTL.MEDIUM
  ): Promise<void> {
    const key = cacheKeys.product.search(query, storeId);
    await this.set(key, results, ttlSeconds);
  }

  static async getProductSearchResults(
    query: string,
    storeId?: string
  ): Promise<Record<string, any>[] | null> {
    const key = cacheKeys.product.search(query, storeId);
    return this.get<Record<string, any>[]>(key);
  }

  // ============================================================
  // Member Caching
  // ============================================================

  static async cacheMember(
    memberId: string,
    memberData: Record<string, any>,
    ttlSeconds: number = cacheTTL.MEMBER
  ): Promise<void> {
    const key = cacheKeys.member.byId(memberId);
    await this.set(key, memberData, ttlSeconds);
  }

  static async getMember(memberId: string): Promise<Record<string, any> | null> {
    const key = cacheKeys.member.byId(memberId);
    return this.get<Record<string, any>>(key);
  }

  static async cacheMemberCreditBalance(
    memberId: string,
    balance: number,
    ttlSeconds: number = cacheTTL.MEMBER
  ): Promise<void> {
    const key = cacheKeys.member.creditBalance(memberId);
    await this.set(key, { balance }, ttlSeconds);
  }

  static async getMemberCreditBalance(memberId: string): Promise<number | null> {
    const key = cacheKeys.member.creditBalance(memberId);
    const data = await this.get<{ balance: number }>(key);
    return data?.balance ?? null;
  }

  static async cacheMemberList(
    members: any[],
    limit?: number,
    offset?: number,
    ttlSeconds: number = cacheTTL.MEMBER
  ): Promise<void> {
    const key = cacheKeys.member.list(limit, offset);
    await this.set(key, members, ttlSeconds);
  }

  static async getMemberList(
    limit?: number,
    offset?: number
  ): Promise<Record<string, any>[] | null> {
    const key = cacheKeys.member.list(limit, offset);
    return this.get<Record<string, any>[]>(key);
  }

  // ============================================================
  // Transaction Caching
  // ============================================================

  static async cacheTransaction(
    transactionId: string,
    transactionData: Record<string, any>,
    ttlSeconds: number = cacheTTL.TRANSACTION
  ): Promise<void> {
    const key = cacheKeys.transaction.byId(transactionId);
    await this.set(key, transactionData, ttlSeconds);
  }

  static async getTransaction(transactionId: string): Promise<Record<string, any> | null> {
    const key = cacheKeys.transaction.byId(transactionId);
    return this.get<Record<string, any>>(key);
  }

  static async cacheTransactionList(
    storeId: string,
    transactions: any[],
    limit?: number,
    offset?: number,
    ttlSeconds: number = cacheTTL.TRANSACTION
  ): Promise<void> {
    const key = cacheKeys.transaction.list(storeId, limit, offset);
    await this.set(key, transactions, ttlSeconds);
  }

  static async getTransactionList(
    storeId: string,
    limit?: number,
    offset?: number
  ): Promise<Record<string, any>[] | null> {
    const key = cacheKeys.transaction.list(storeId, limit, offset);
    return this.get<Record<string, any>[]>(key);
  }

  // ============================================================
  // Dashboard Caching
  // ============================================================

  static async cacheDashboardStats(
    userId: string,
    date: string,
    stats: Record<string, any>,
    ttlSeconds: number = cacheTTL.DASHBOARD
  ): Promise<void> {
    const key = cacheKeys.dashboard.kasirStats(userId, date);
    await this.set(key, stats, ttlSeconds);
  }

  static async getDashboardStats(
    userId: string,
    date: string
  ): Promise<Record<string, any> | null> {
    const key = cacheKeys.dashboard.kasirStats(userId, date);
    return this.get<Record<string, any>>(key);
  }

  static async cacheOwnerDashboardStats(
    date: string,
    stats: Record<string, any>,
    ttlSeconds: number = cacheTTL.DASHBOARD
  ): Promise<void> {
    const key = cacheKeys.dashboard.ownerStats(date);
    await this.set(key, stats, ttlSeconds);
  }

  static async getOwnerDashboardStats(date: string): Promise<Record<string, any> | null> {
    const key = cacheKeys.dashboard.ownerStats(date);
    return this.get<Record<string, any>>(key);
  }

  // ============================================================
  // Report Caching
  // ============================================================

  static async cacheDailyReport(
    storeId: string,
    date: string,
    reportData: Record<string, any>,
    ttlSeconds: number = cacheTTL.REPORT
  ): Promise<void> {
    const key = cacheKeys.report.daily(storeId, date);
    await this.set(key, reportData, ttlSeconds);
  }

  static async getDailyReport(
    storeId: string,
    date: string
  ): Promise<Record<string, any> | null> {
    const key = cacheKeys.report.daily(storeId, date);
    return this.get<Record<string, any>>(key);
  }

  static async cacheWeeklyReport(
    storeId: string,
    weekStart: string,
    reportData: Record<string, any>,
    ttlSeconds: number = cacheTTL.REPORT
  ): Promise<void> {
    const key = cacheKeys.report.weekly(storeId, weekStart);
    await this.set(key, reportData, ttlSeconds);
  }

  static async getWeeklyReport(
    storeId: string,
    weekStart: string
  ): Promise<Record<string, any> | null> {
    const key = cacheKeys.report.weekly(storeId, weekStart);
    return this.get<Record<string, any>>(key);
  }

  static async cacheMonthlyReport(
    storeId: string,
    yearMonth: string,
    reportData: Record<string, any>,
    ttlSeconds: number = cacheTTL.REPORT
  ): Promise<void> {
    const key = cacheKeys.report.monthly(storeId, yearMonth);
    await this.set(key, reportData, ttlSeconds);
  }

  static async getMonthlyReport(
    storeId: string,
    yearMonth: string
  ): Promise<Record<string, any> | null> {
    const key = cacheKeys.report.monthly(storeId, yearMonth);
    return this.get<Record<string, any>>(key);
  }

  // ============================================================
  // Inventory Caching
  // ============================================================

  static async cacheInventory(
    locationId: string,
    inventory: Record<string, any>[],
    ttlSeconds: number = cacheTTL.PRODUCT
  ): Promise<void> {
    const key = cacheKeys.inventory.byLocation(locationId);
    await this.set(key, inventory, ttlSeconds);
  }

  static async getInventory(locationId: string): Promise<Record<string, any>[] | null> {
    const key = cacheKeys.inventory.byLocation(locationId);
    return this.get<Record<string, any>[]>(key);
  }

  // ============================================================
  // Supplier Caching
  // ============================================================

  static async cacheSupplier(
    supplierId: string,
    supplierData: Record<string, any>,
    ttlSeconds: number = cacheTTL.LONG
  ): Promise<void> {
    const key = cacheKeys.supplier.byId(supplierId);
    await this.set(key, supplierData, ttlSeconds);
  }

  static async getSupplier(supplierId: string): Promise<Record<string, any> | null> {
    const key = cacheKeys.supplier.byId(supplierId);
    return this.get<Record<string, any>>(key);
  }

  static async cacheSupplierList(
    suppliers: any[],
    limit?: number,
    offset?: number,
    ttlSeconds: number = cacheTTL.LONG
  ): Promise<void> {
    const key = cacheKeys.supplier.list(limit, offset);
    await this.set(key, suppliers, ttlSeconds);
  }

  static async getSupplierList(
    limit?: number,
    offset?: number
  ): Promise<Record<string, any>[] | null> {
    const key = cacheKeys.supplier.list(limit, offset);
    return this.get<Record<string, any>[]>(key);
  }

  // ============================================================
  // Rate Limiting Helpers
  // ============================================================

  /**
   * Check and increment rate limit counter
   */
  static async checkRateLimit(
    identifier: string,
    endpoint: string,
    maxAttempts: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    const key = cacheKeys.rateLimit.api(identifier, endpoint);

    try {
      const current = await redis.get(key);
      const attempts = current ? parseInt(current, 10) : 0;

      if (attempts >= maxAttempts) {
        const ttl = await redis.ttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetIn: ttl > 0 ? ttl : windowSeconds,
        };
      }

      const newCount = attempts + 1;
      if (newCount === 1) {
        // First request, set expiration
        await redis.set(key, newCount.toString(), windowSeconds);
      } else {
        // Increment existing key
        await redis.incr(key);
      }

      return {
        allowed: true,
        remaining: maxAttempts - newCount,
        resetIn: windowSeconds,
      };
    } catch (error) {
      logger.error('Rate limit check failed', error as Error, { identifier, endpoint });
      // On error, allow the request to go through
      return {
        allowed: true,
        remaining: maxAttempts,
        resetIn: windowSeconds,
      };
    }
  }
}

export default CacheService;
