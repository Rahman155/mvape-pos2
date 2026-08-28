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

import { redis } from './connection.js';
import { CacheService } from './service.js';
import { CacheInvalidationService } from './invalidation.js';
import { cacheKeys, cacheTTL } from './keys.js';

export default {
  redis,
  CacheService,
  CacheInvalidationService,
  cacheKeys,
  cacheTTL,
};
