/**
 * Cache module
 * Provides Redis-based caching infrastructure with connection pooling,
 * cache key conventions, cache invalidation utilities, and high-level cache operations
 */
export { redis } from './connection.js';
export { cacheKeys, getCachePatternForResource, cacheTTL } from './keys.js';
export { CacheInvalidationService } from './invalidation.js';
export { CacheService } from './service.js';
export default {
    redis: require('./connection.js').redis,
    CacheService: require('./service.js').CacheService,
    CacheInvalidationService: require('./invalidation.js').CacheInvalidationService,
    cacheKeys: require('./keys.js').cacheKeys,
    cacheTTL: require('./keys.js').cacheTTL,
};
//# sourceMappingURL=index.js.map