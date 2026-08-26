import { redis } from './connection.js';
import { cacheKeys, getCachePatternForResource } from './keys.js';
import { logger } from '../utils/logger.js';

/**
 * Cache invalidation utilities
 * Provides methods to invalidate cache for different resource types and operations
 */
export class CacheInvalidationService {
  /**
   * Invalidate a single cache key
   */
  static async invalidateKey(key: string): Promise<void> {
    try {
      const deleted = await redis.delete(key);
      if (deleted > 0) {
        logger.debug('Cache key invalidated', { key });
      }
    } catch (error) {
      logger.error('Failed to invalidate cache key', error as Error, { key });
      // Don't throw - cache invalidation failures shouldn't break the application
    }
  }

  /**
   * Invalidate multiple cache keys
   */
  static async invalidateKeys(keys: string[]): Promise<void> {
    try {
      if (keys.length === 0) return;

      const deleted = await redis.deleteMany(keys);
      if (deleted > 0) {
        logger.debug('Cache keys invalidated', { count: deleted, keys });
      }
    } catch (error) {
      logger.error('Failed to invalidate multiple cache keys', error as Error, { keys });
      // Don't throw - cache invalidation failures shouldn't break the application
    }
  }

  /**
   * Invalidate all cache keys matching a pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await this.invalidateKeys(keys);
        logger.debug('Cache pattern invalidated', { pattern, keysDeleted: keys.length });
      }
    } catch (error) {
      logger.error('Failed to invalidate cache pattern', error as Error, { pattern });
      // Don't throw - cache invalidation failures shouldn't break the application
    }
  }

  /**
   * Invalidate all cache for a resource type
   */
  static async invalidateResourceType(resourceType: string): Promise<void> {
    const pattern = getCachePatternForResource(resourceType);
    await this.invalidatePattern(pattern);
  }

  // ============================================================
  // Store Related Invalidation
  // ============================================================

  static async invalidateStore(storeId: string): Promise<void> {
    const keys = [
      cacheKeys.store.byId(storeId),
      cacheKeys.store.list(),
      cacheKeys.store.inventory(storeId),
      cacheKeys.store.bop(storeId),
      cacheKeys.dashboard.kasirStats(storeId, '*'),
      cacheKeys.dashboard.ownerStats('*'),
      cacheKeys.dashboard.dailyRevenue(storeId, '*'),
      `${cacheKeys.store.inventory(storeId)}:*`,
      `${cacheKeys.transaction.list(storeId)}*`,
      `${cacheKeys.report.daily(storeId, '*')}*`,
    ];

    // Invalidate individual keys
    for (const key of keys) {
      if (!key.includes('*')) {
        await this.invalidateKey(key);
      }
    }

    // Invalidate pattern-based keys
    await this.invalidatePattern(`store:inventory:${storeId}:*`);
    await this.invalidatePattern(`transaction:*:store:${storeId}*`);
    await this.invalidatePattern(`report:*:store:${storeId}:*`);
  }

  // ============================================================
  // Product Related Invalidation
  // ============================================================

  static async invalidateProduct(productId: string): Promise<void> {
    const keys = [
      cacheKeys.product.byId(productId),
      cacheKeys.product.list(),
    ];

    await this.invalidateKeys(keys.filter((k) => !k.includes('*')));
    await this.invalidatePattern(`product:search:*:${productId}*`);
    await this.invalidatePattern(`inventory:product:${productId}:*`);
  }

  static async invalidateProductList(storeId?: string): Promise<void> {
    const keys = [cacheKeys.product.list(storeId)];

    await this.invalidateKeys(keys);

    if (storeId) {
      await this.invalidatePattern(`product:list:store:${storeId}:*`);
      await this.invalidatePattern(`product:search:*:store:${storeId}*`);
    } else {
      await this.invalidatePattern('product:list:*');
      await this.invalidatePattern('product:search:*');
    }
  }

  // ============================================================
  // Member Related Invalidation
  // ============================================================

  static async invalidateMember(memberId: string): Promise<void> {
    const keys = [
      cacheKeys.member.byId(memberId),
      cacheKeys.member.creditBalance(memberId),
      cacheKeys.member.list(),
    ];

    await this.invalidateKeys(keys.filter((k) => !k.includes('*')));
    await this.invalidatePattern(`piutang:member:${memberId}*`);
  }

  static async invalidateMemberList(): Promise<void> {
    const keys = [cacheKeys.member.list()];

    await this.invalidateKeys(keys);
    await this.invalidatePattern('member:list:*');
    await this.invalidatePattern('member:search:*');
  }

  // ============================================================
  // Transaction Related Invalidation
  // ============================================================

  static async invalidateTransaction(transactionId: string, storeId?: string): Promise<void> {
    const keys = [cacheKeys.transaction.byId(transactionId)];

    await this.invalidateKeys(keys);

    // Invalidate associated cache
    if (storeId) {
      await this.invalidateStore(storeId);
    }

    await this.invalidatePattern(`transaction:data:${transactionId}*`);
  }

  static async invalidateTransactionList(storeId: string): Promise<void> {
    await this.invalidatePattern(`transaction:list:store:${storeId}*`);
    await this.invalidatePattern(`transaction:date:${storeId}:*`);
    await this.invalidatePattern(`transaction:method:${storeId}:*`);
    
    // Invalidate dashboard stats that depend on transactions
    await this.invalidatePattern(`dashboard:*:date:*`);
    await this.invalidatePattern(`report:*:store:${storeId}:*`);
  }

  // ============================================================
  // Inventory Related Invalidation
  // ============================================================

  static async invalidateInventory(storeId?: string): Promise<void> {
    const keys = [cacheKeys.inventory.warehouse()];

    await this.invalidateKeys(keys);

    if (storeId) {
      await this.invalidateStore(storeId);
      await this.invalidatePattern(`inventory:location:${storeId}*`);
      await this.invalidatePattern(`inventory:product:*:location:${storeId}*`);
    } else {
      await this.invalidatePattern('inventory:*');
    }
  }

  static async invalidateStockTransfer(transferId: string): Promise<void> {
    const keys = [cacheKeys.inventory.stockTransfer(transferId)];

    await this.invalidateKeys(keys);
    
    // Invalidate all inventory caches
    await this.invalidateInventory();
  }

  static async invalidateStockOpname(opnameId: string): Promise<void> {
    const keys = [cacheKeys.inventory.stockOpname(opnameId)];

    await this.invalidateKeys(keys);

    // Invalidate all inventory caches
    await this.invalidateInventory();
  }

  // ============================================================
  // Report Related Invalidation
  // ============================================================

  static async invalidateDashboard(userId?: string): Promise<void> {
    if (userId) {
      await this.invalidatePattern(`dashboard:kasir:${userId}:*`);
    } else {
      await this.invalidatePattern('dashboard:*');
    }
  }

  static async invalidateDailyReport(storeId: string, date?: string): Promise<void> {
    if (date) {
      const keys = [cacheKeys.report.daily(storeId, date)];
      await this.invalidateKeys(keys);
    } else {
      await this.invalidatePattern(`report:daily:store:${storeId}:*`);
    }
  }

  static async invalidateWeeklyReport(storeId: string, weekStart?: string): Promise<void> {
    if (weekStart) {
      const keys = [cacheKeys.report.weekly(storeId, weekStart)];
      await this.invalidateKeys(keys);
    } else {
      await this.invalidatePattern(`report:weekly:store:${storeId}:*`);
    }
  }

  static async invalidateMonthlyReport(storeId: string, yearMonth?: string): Promise<void> {
    if (yearMonth) {
      const keys = [cacheKeys.report.monthly(storeId, yearMonth)];
      await this.invalidateKeys(keys);
    } else {
      await this.invalidatePattern(`report:monthly:store:${storeId}:*`);
    }
  }

  static async invalidateCapitalReport(storeId?: string): Promise<void> {
    if (storeId) {
      await this.invalidatePattern(`report:capital:store:${storeId}:*`);
    } else {
      await this.invalidatePattern('report:capital:*');
    }
  }

  static async invalidateBopReport(storeId?: string): Promise<void> {
    if (storeId) {
      await this.invalidatePattern(`report:bop:store:${storeId}:*`);
    } else {
      await this.invalidatePattern('report:bop:*');
    }
  }

  // ============================================================
  // Supplier and Purchase Order Related Invalidation
  // ============================================================

  static async invalidateSupplier(supplierId: string): Promise<void> {
    const keys = [
      cacheKeys.supplier.byId(supplierId),
      cacheKeys.supplier.list(),
      cacheKeys.supplier.payable(supplierId),
    ];

    await this.invalidateKeys(keys.filter((k) => !k.includes('*')));
    await this.invalidatePattern(`payable:*:supplier:${supplierId}*`);
  }

  static async invalidateSupplierList(): Promise<void> {
    const keys = [cacheKeys.supplier.list()];

    await this.invalidateKeys(keys);
    await this.invalidatePattern('supplier:list:*');
  }

  static async invalidatePurchaseOrder(poId: string): Promise<void> {
    const keys = [cacheKeys.purchaseOrder.byId(poId), cacheKeys.purchaseOrder.list()];

    await this.invalidateKeys(keys.filter((k) => !k.includes('*')));

    // Invalidate inventory and report caches
    await this.invalidateInventory();
  }

  // ============================================================
  // Piutang Related Invalidation
  // ============================================================

  static async invalidatePiutang(piutangId: string, memberId?: string): Promise<void> {
    const keys = [cacheKeys.piutang.byId(piutangId), cacheKeys.piutang.list()];

    await this.invalidateKeys(keys.filter((k) => !k.includes('*')));

    if (memberId) {
      await this.invalidateMember(memberId);
    }

    await this.invalidatePattern(`piutang:*`);
  }

  static async invalidatePiutangOverdue(storeId?: string): Promise<void> {
    const keys = [cacheKeys.piutang.overdue(storeId)];

    await this.invalidateKeys(keys);

    if (storeId) {
      await this.invalidatePattern(`piutang:overdue:store:${storeId}*`);
    }
  }

  // ============================================================
  // Payable (Supplier Debt) Related Invalidation
  // ============================================================

  static async invalidatePayable(payableId: string, supplierId?: string): Promise<void> {
    const keys = [cacheKeys.payable.byId(payableId), cacheKeys.payable.list()];

    await this.invalidateKeys(keys.filter((k) => !k.includes('*')));

    if (supplierId) {
      await this.invalidateSupplier(supplierId);
    }

    await this.invalidatePattern('payable:*');
  }

  static async invalidatePayableOverdue(supplierId?: string): Promise<void> {
    const keys = [cacheKeys.payable.overdue(supplierId)];

    await this.invalidateKeys(keys);

    if (supplierId) {
      await this.invalidatePattern(`payable:overdue:supplier:${supplierId}*`);
    }
  }

  // ============================================================
  // Attendance Related Invalidation
  // ============================================================

  static async invalidateAttendance(userId: string): Promise<void> {
    await this.invalidatePattern(`attendance:*:${userId}*`);
  }

  // ============================================================
  // Bulk Invalidation
  // ============================================================

  /**
   * Clear all cache (use sparingly - only in specific scenarios)
   */
  static async clearAllCache(): Promise<void> {
    try {
      const allKeys = await redis.keys('*');
      if (allKeys.length > 0) {
        await redis.deleteMany(allKeys);
        logger.warn('All cache cleared', { keysDeleted: allKeys.length });
      }
    } catch (error) {
      logger.error('Failed to clear all cache', error as Error);
      // Don't throw
    }
  }

  /**
   * Invalidate cache for a specific date (useful for end-of-day operations)
   */
  static async invalidateByDate(date: string, storeId?: string): Promise<void> {
    const patterns = [
      `report:daily:store:*:date:${date}`,
      `transaction:date:*:${date}`,
      `dashboard:*:date:${date}`,
      `attendance:record:*:date:${date}`,
    ];

    if (storeId) {
      patterns.push(`report:daily:store:${storeId}:date:${date}`);
      patterns.push(`transaction:date:${storeId}:${date}`);
      patterns.push(`dashboard:*:store:${storeId}:date:${date}`);
    }

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }
  }
}

export default CacheInvalidationService;
