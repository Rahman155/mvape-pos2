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
    static async get(key) {
        try {
            const value = await redis.get(key);
            if (value === null) {
                return null;
            }
            return JSON.parse(value);
        }
        catch (error) {
            logger.error('Failed to get from cache', error, { key });
            return null;
        }
    }
    /**
     * Set cache value with automatic serialization
     */
    static async set(key, value, ttlSeconds) {
        try {
            const serialized = JSON.stringify(value);
            await redis.set(key, serialized, ttlSeconds);
            logger.debug('Cache set', { key, ttl: ttlSeconds });
        }
        catch (error) {
            logger.error('Failed to set cache', error, { key });
            // Don't throw - cache failures shouldn't break the application
        }
    }
    /**
     * Get or compute value (cache-aside pattern)
     */
    static async getOrCompute(key, computeFn, ttlSeconds = cacheTTL.MEDIUM) {
        try {
            // Try to get from cache
            const cached = await this.get(key);
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
        }
        catch (error) {
            logger.error('Error in getOrCompute', error, { key });
            // If cache fails, still compute and return the value
            return computeFn();
        }
    }
    // ============================================================
    // Session and Authentication Caching
    // ============================================================
    static async cacheUserSession(userId, sessionData, ttlSeconds = cacheTTL.SESSION) {
        const key = cacheKeys.session.user(userId);
        await this.set(key, sessionData, ttlSeconds);
    }
    static async getUserSession(userId) {
        const key = cacheKeys.session.user(userId);
        return this.get(key);
    }
    static async revokeUserSession(userId) {
        const key = cacheKeys.session.user(userId);
        await redis.delete(key);
        logger.debug('User session revoked', { userId });
    }
    // ============================================================
    // Store Caching
    // ============================================================
    static async cacheStore(storeId, storeData, ttlSeconds = cacheTTL.LONG) {
        const key = cacheKeys.store.byId(storeId);
        await this.set(key, storeData, ttlSeconds);
    }
    static async getStore(storeId) {
        const key = cacheKeys.store.byId(storeId);
        return this.get(key);
    }
    static async cacheStoreList(stores, limit, offset, ttlSeconds = cacheTTL.LONG) {
        const key = cacheKeys.store.list(limit, offset);
        await this.set(key, stores, ttlSeconds);
    }
    static async getStoreList(limit, offset) {
        const key = cacheKeys.store.list(limit, offset);
        return this.get(key);
    }
    static async cacheStoreInventory(storeId, inventory, ttlSeconds = cacheTTL.PRODUCT) {
        const key = cacheKeys.store.inventory(storeId);
        await this.set(key, inventory, ttlSeconds);
    }
    static async getStoreInventory(storeId) {
        const key = cacheKeys.store.inventory(storeId);
        return this.get(key);
    }
    // ============================================================
    // Product Caching
    // ============================================================
    static async cacheProduct(productId, productData, ttlSeconds = cacheTTL.PRODUCT) {
        const key = cacheKeys.product.byId(productId);
        await this.set(key, productData, ttlSeconds);
    }
    static async getProduct(productId) {
        const key = cacheKeys.product.byId(productId);
        return this.get(key);
    }
    static async cacheProductList(products, storeId, limit, offset, ttlSeconds = cacheTTL.PRODUCT) {
        const key = cacheKeys.product.list(storeId, limit, offset);
        await this.set(key, products, ttlSeconds);
    }
    static async getProductList(storeId, limit, offset) {
        const key = cacheKeys.product.list(storeId, limit, offset);
        return this.get(key);
    }
    static async cacheProductSearch(query, results, storeId, ttlSeconds = cacheTTL.MEDIUM) {
        const key = cacheKeys.product.search(query, storeId);
        await this.set(key, results, ttlSeconds);
    }
    static async getProductSearchResults(query, storeId) {
        const key = cacheKeys.product.search(query, storeId);
        return this.get(key);
    }
    // ============================================================
    // Member Caching
    // ============================================================
    static async cacheMember(memberId, memberData, ttlSeconds = cacheTTL.MEMBER) {
        const key = cacheKeys.member.byId(memberId);
        await this.set(key, memberData, ttlSeconds);
    }
    static async getMember(memberId) {
        const key = cacheKeys.member.byId(memberId);
        return this.get(key);
    }
    static async cacheMemberCreditBalance(memberId, balance, ttlSeconds = cacheTTL.MEMBER) {
        const key = cacheKeys.member.creditBalance(memberId);
        await this.set(key, { balance }, ttlSeconds);
    }
    static async getMemberCreditBalance(memberId) {
        const key = cacheKeys.member.creditBalance(memberId);
        const data = await this.get(key);
        return data?.balance ?? null;
    }
    static async cacheMemberList(members, limit, offset, ttlSeconds = cacheTTL.MEMBER) {
        const key = cacheKeys.member.list(limit, offset);
        await this.set(key, members, ttlSeconds);
    }
    static async getMemberList(limit, offset) {
        const key = cacheKeys.member.list(limit, offset);
        return this.get(key);
    }
    // ============================================================
    // Transaction Caching
    // ============================================================
    static async cacheTransaction(transactionId, transactionData, ttlSeconds = cacheTTL.TRANSACTION) {
        const key = cacheKeys.transaction.byId(transactionId);
        await this.set(key, transactionData, ttlSeconds);
    }
    static async getTransaction(transactionId) {
        const key = cacheKeys.transaction.byId(transactionId);
        return this.get(key);
    }
    static async cacheTransactionList(storeId, transactions, limit, offset, ttlSeconds = cacheTTL.TRANSACTION) {
        const key = cacheKeys.transaction.list(storeId, limit, offset);
        await this.set(key, transactions, ttlSeconds);
    }
    static async getTransactionList(storeId, limit, offset) {
        const key = cacheKeys.transaction.list(storeId, limit, offset);
        return this.get(key);
    }
    // ============================================================
    // Dashboard Caching
    // ============================================================
    static async cacheDashboardStats(userId, date, stats, ttlSeconds = cacheTTL.DASHBOARD) {
        const key = cacheKeys.dashboard.kasirStats(userId, date);
        await this.set(key, stats, ttlSeconds);
    }
    static async getDashboardStats(userId, date) {
        const key = cacheKeys.dashboard.kasirStats(userId, date);
        return this.get(key);
    }
    static async cacheOwnerDashboardStats(date, stats, ttlSeconds = cacheTTL.DASHBOARD) {
        const key = cacheKeys.dashboard.ownerStats(date);
        await this.set(key, stats, ttlSeconds);
    }
    static async getOwnerDashboardStats(date) {
        const key = cacheKeys.dashboard.ownerStats(date);
        return this.get(key);
    }
    // ============================================================
    // Report Caching
    // ============================================================
    static async cacheDailyReport(storeId, date, reportData, ttlSeconds = cacheTTL.REPORT) {
        const key = cacheKeys.report.daily(storeId, date);
        await this.set(key, reportData, ttlSeconds);
    }
    static async getDailyReport(storeId, date) {
        const key = cacheKeys.report.daily(storeId, date);
        return this.get(key);
    }
    static async cacheWeeklyReport(storeId, weekStart, reportData, ttlSeconds = cacheTTL.REPORT) {
        const key = cacheKeys.report.weekly(storeId, weekStart);
        await this.set(key, reportData, ttlSeconds);
    }
    static async getWeeklyReport(storeId, weekStart) {
        const key = cacheKeys.report.weekly(storeId, weekStart);
        return this.get(key);
    }
    static async cacheMonthlyReport(storeId, yearMonth, reportData, ttlSeconds = cacheTTL.REPORT) {
        const key = cacheKeys.report.monthly(storeId, yearMonth);
        await this.set(key, reportData, ttlSeconds);
    }
    static async getMonthlyReport(storeId, yearMonth) {
        const key = cacheKeys.report.monthly(storeId, yearMonth);
        return this.get(key);
    }
    // ============================================================
    // Inventory Caching
    // ============================================================
    static async cacheInventory(locationId, inventory, ttlSeconds = cacheTTL.PRODUCT) {
        const key = cacheKeys.inventory.byLocation(locationId);
        await this.set(key, inventory, ttlSeconds);
    }
    static async getInventory(locationId) {
        const key = cacheKeys.inventory.byLocation(locationId);
        return this.get(key);
    }
    // ============================================================
    // Supplier Caching
    // ============================================================
    static async cacheSupplier(supplierId, supplierData, ttlSeconds = cacheTTL.LONG) {
        const key = cacheKeys.supplier.byId(supplierId);
        await this.set(key, supplierData, ttlSeconds);
    }
    static async getSupplier(supplierId) {
        const key = cacheKeys.supplier.byId(supplierId);
        return this.get(key);
    }
    static async cacheSupplierList(suppliers, limit, offset, ttlSeconds = cacheTTL.LONG) {
        const key = cacheKeys.supplier.list(limit, offset);
        await this.set(key, suppliers, ttlSeconds);
    }
    static async getSupplierList(limit, offset) {
        const key = cacheKeys.supplier.list(limit, offset);
        return this.get(key);
    }
    // ============================================================
    // Rate Limiting Helpers
    // ============================================================
    /**
     * Check and increment rate limit counter
     */
    static async checkRateLimit(identifier, endpoint, maxAttempts, windowSeconds) {
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
            }
            else {
                // Increment existing key
                await redis.incr(key);
            }
            return {
                allowed: true,
                remaining: maxAttempts - newCount,
                resetIn: windowSeconds,
            };
        }
        catch (error) {
            logger.error('Rate limit check failed', error, { identifier, endpoint });
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
//# sourceMappingURL=service.js.map