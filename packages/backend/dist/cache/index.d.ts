/**
 * Cache module
 * Provides Redis-based caching infrastructure with connection pooling,
 * cache key conventions, cache invalidation utilities, and high-level cache operations
 */
export { redis } from './connection.js';
export type { CacheService } from './service.js';
export { cacheKeys, getCachePatternForResource, cacheTTL } from './keys.js';
export { CacheInvalidationService } from './invalidation.js';
export { CacheService } from './service.js';
declare const _default: {
    redis: any;
    CacheService: any;
    CacheInvalidationService: any;
    cacheKeys: any;
    cacheTTL: any;
};
export default _default;
//# sourceMappingURL=index.d.ts.map