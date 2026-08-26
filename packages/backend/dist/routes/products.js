/**
 * Products routes
 * Handles product listing, search, and filtering functionality
 */
import express from 'express';
import { logger } from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { ApiError, ApiErrorCode } from '../utils/errors.js';
import { db } from '../database/index.js';
import { redis } from '../cache/index.js';
export const productsRouter = express.Router();
// Apply authentication middleware to all product routes
productsRouter.use(authenticateToken);
// ============================================================
// Helper Functions
// ============================================================
/**
 * Validate pagination parameters
 */
function validatePaginationParams(limit, offset) {
    const parsedLimit = Math.min(parseInt(limit || '20', 10), 100); // Max 100 per page
    const parsedOffset = Math.max(parseInt(offset || '0', 10), 0);
    return {
        limit: parsedLimit > 0 ? parsedLimit : 20,
        offset: parsedOffset >= 0 ? parsedOffset : 0,
    };
}
/**
 * Get store ID from user or query parameter
 * For KASIR: uses their assigned store
 * For OWNER: can query other stores
 */
function getStoreId(user, queryStoreId) {
    if (user.role === 'KASIR') {
        if (!user.storeId) {
            throw new ApiError('Kasir user has no assigned store', ApiErrorCode.INVALID_INPUT, 400);
        }
        return user.storeId;
    }
    if (user.role === 'OWNER' && queryStoreId) {
        return queryStoreId;
    }
    throw new ApiError('Owner must specify storeId parameter', ApiErrorCode.INVALID_INPUT, 400);
}
/**
 * Build search query with optional filters
 */
function buildSearchQuery(searchTerm, categoryFilter) {
    const filters = [];
    const values = [];
    let paramIndex = 1;
    // Product search filter (name or SKU)
    if (searchTerm && searchTerm.trim()) {
        const trimmedTerm = `%${searchTerm.trim()}%`;
        filters.push(`(p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`);
        values.push(trimmedTerm);
        paramIndex++;
    }
    // Category filter
    if (categoryFilter && categoryFilter.trim()) {
        filters.push(`p.category = $${paramIndex}`);
        values.push(categoryFilter);
        paramIndex++;
    }
    // Always filter active products
    filters.push('p.is_active = true');
    const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';
    return { whereClause, values };
}
/**
 * Generate cache key for search query
 */
function generateCacheKey(storeId, searchTerm, categoryFilter, limit, offset) {
    return `products:search:${storeId}:${searchTerm || 'all'}:${categoryFilter || 'all'}:${limit}:${offset}`;
}
// ============================================================
// Routes
// ============================================================
/**
 * GET /api/v1/products/search
 * Search and list products with pagination and filtering
 * Protected endpoint - requires authentication
 *
 * Query parameters:
 * - q (optional): Search term (searches product name and SKU)
 * - storeId (optional for OWNER, required context for KASIR): Store ID to filter products
 * - category (optional): Product category filter
 * - limit (optional, default 20, max 100): Number of results per page
 * - offset (optional, default 0): Pagination offset
 *
 * Response (200):
 * {
 *   "data": [
 *     {
 *       "id": "product-1",
 *       "name": "Vape Juice 30ml",
 *       "sku": "VJ-30ML-001",
 *       "category": "Juice",
 *       "cost_price": "15000",
 *       "selling_price": "25000",
 *       "description": "Premium vape juice",
 *       "image_url": "https://...",
 *       "is_active": true,
 *       "quantity": 50,
 *       "reserved": 0,
 *       "isAvailable": true,
 *       "created_at": "2024-01-15T10:30:00Z",
 *       "updated_at": "2024-01-15T10:30:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "total": 150,
 *     "page": 1,
 *     "limit": 20,
 *     "pages": 8
 *   },
 *   "meta": {
 *     "timestamp": "2024-01-15T10:30:00Z",
 *     "requestId": "req-123",
 *     "searchTerm": "juice",
 *     "storeId": "store-1"
 *   }
 * }
 *
 * Response (400):
 * {
 *   "error": {
 *     "message": "Invalid pagination parameters",
 *     "code": "INVALID_INPUT",
 *     "statusCode": 400
 *   },
 *   "requestId": "req-123"
 * }
 *
 * Response (401):
 * {
 *   "error": {
 *     "message": "Authentication required",
 *     "code": "UNAUTHORIZED",
 *     "statusCode": 401
 *   },
 *   "requestId": "req-123"
 * }
 */
productsRouter.get('/search', async (req, res, next) => {
    try {
        // Verify authentication
        if (!req.user) {
            throw new ApiError('Authentication required', ApiErrorCode.UNAUTHORIZED, 401);
        }
        // Extract and validate query parameters
        const searchTerm = req.query.q;
        const categoryFilter = req.query.category;
        const { limit, offset } = validatePaginationParams(req.query.limit, req.query.offset);
        // Get store ID (KASIR must use their store, OWNER can specify)
        const storeId = getStoreId(req.user, req.query.storeId);
        // Build search filters
        const { whereClause, values } = buildSearchQuery(searchTerm, categoryFilter);
        // Check cache
        const cacheKey = generateCacheKey(storeId, searchTerm, categoryFilter, limit, offset);
        const cachedResult = await redis.get(cacheKey);
        if (cachedResult) {
            logger.info('Product search - cache hit', {
                userId: req.user.id,
                storeId,
                searchTerm,
                requestId: req.requestId,
            });
            return res.status(200).json(JSON.parse(cachedResult));
        }
        // Query total count
        const countQuery = `
        SELECT COUNT(*) as total
        FROM products p
        ${whereClause}
      `;
        const countResult = await db.query(countQuery, values);
        const total = parseInt(countResult.rows[0].total, 10);
        const pages = Math.ceil(total / limit);
        // Query products with inventory
        const searchQuery = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.category,
          p.cost_price,
          p.selling_price,
          p.description,
          p.image_url,
          p.is_active,
          p.created_at,
          p.updated_at,
          COALESCE(i.quantity, 0) as quantity,
          COALESCE(i.reserved, 0) as reserved
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = $1
        ${whereClause}
        ORDER BY p.name ASC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `;
        const queryValues = [storeId, ...values, limit, offset];
        const productsResult = await db.query(searchQuery, queryValues);
        // Add stock availability flag
        const productsWithAvailability = productsResult.rows.map((product) => ({
            ...product,
            isAvailable: product.quantity > product.reserved,
        }));
        const response = {
            data: productsWithAvailability,
            pagination: {
                total,
                page: Math.floor(offset / limit) + 1,
                limit,
                pages,
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
                searchTerm: searchTerm || 'all',
                categoryFilter: categoryFilter || 'all',
                storeId,
            },
        };
        // Cache result for 5 minutes
        await redis.set(cacheKey, JSON.stringify(response), 300);
        logger.info('Product search completed', {
            userId: req.user.id,
            storeId,
            searchTerm,
            resultsCount: productsWithAvailability.length,
            totalCount: total,
            requestId: req.requestId,
        });
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/products/:id
 * Get product detail with inventory information for store
 * Protected endpoint - requires authentication
 *
 * Path parameters:
 * - id (required): Product ID
 *
 * Query parameters:
 * - storeId (optional for OWNER, required context for KASIR): Store ID
 *
 * Response (200):
 * {
 *   "data": {
 *     "id": "product-1",
 *     "name": "Vape Juice 30ml",
 *     "sku": "VJ-30ML-001",
 *     "category": "Juice",
 *     "cost_price": "15000",
 *     "selling_price": "25000",
 *     "description": "Premium vape juice",
 *     "image_url": "https://...",
 *     "is_active": true,
 *     "quantity": 50,
 *     "reserved": 0,
 *     "isAvailable": true,
 *     "created_at": "2024-01-15T10:30:00Z",
 *     "updated_at": "2024-01-15T10:30:00Z"
 *   },
 *   "meta": {
 *     "timestamp": "2024-01-15T10:30:00Z",
 *     "requestId": "req-123",
 *     "storeId": "store-1"
 *   }
 * }
 *
 * Response (404):
 * {
 *   "error": {
 *     "message": "Product not found",
 *     "code": "NOT_FOUND",
 *     "statusCode": 404
 *   },
 *   "requestId": "req-123"
 * }
 */
productsRouter.get('/:id', async (req, res, next) => {
    try {
        // Verify authentication
        if (!req.user) {
            throw new ApiError('Authentication required', ApiErrorCode.UNAUTHORIZED, 401);
        }
        const productId = req.params.id;
        const storeId = getStoreId(req.user, req.query.storeId);
        // Query product with inventory
        const query = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.category,
          p.cost_price,
          p.selling_price,
          p.description,
          p.image_url,
          p.is_active,
          p.created_at,
          p.updated_at,
          COALESCE(i.quantity, 0) as quantity,
          COALESCE(i.reserved, 0) as reserved
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = $1
        WHERE p.id = $2 AND p.is_active = true
      `;
        const result = await db.query(query, [storeId, productId]);
        if (result.rows.length === 0) {
            throw new ApiError('Product not found', ApiErrorCode.NOT_FOUND, 404);
        }
        const product = result.rows[0];
        const productWithAvailability = {
            ...product,
            isAvailable: product.quantity > product.reserved,
        };
        logger.info('Product detail retrieved', {
            userId: req.user.id,
            productId,
            storeId,
            requestId: req.requestId,
        });
        res.status(200).json({
            data: productWithAvailability,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
                storeId,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/v1/products
 * List all active products (legacy endpoint - redirects to /search)
 * Protected endpoint - requires authentication
 *
 * Query parameters:
 * - storeId (optional): Store ID to filter inventory
 * - limit (optional, default 20, max 100): Number of results
 * - offset (optional, default 0): Pagination offset
 */
productsRouter.get('/', async (req, res, next) => {
    try {
        // Verify authentication
        if (!req.user) {
            throw new ApiError('Authentication required', ApiErrorCode.UNAUTHORIZED, 401);
        }
        // Extract and validate query parameters
        const { limit, offset } = validatePaginationParams(req.query.limit, req.query.offset);
        const storeId = getStoreId(req.user, req.query.storeId);
        // Query total count
        const countResult = await db.query(`
        SELECT COUNT(*) as total
        FROM products
        WHERE is_active = true
      `);
        const total = parseInt(countResult.rows[0].total, 10);
        const pages = Math.ceil(total / limit);
        // Query products with inventory
        const query = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.category,
          p.cost_price,
          p.selling_price,
          p.description,
          p.image_url,
          p.is_active,
          p.created_at,
          p.updated_at,
          COALESCE(i.quantity, 0) as quantity,
          COALESCE(i.reserved, 0) as reserved
        FROM products p
        LEFT JOIN inventory i ON p.id = i.product_id AND i.store_id = $1
        WHERE p.is_active = true
        ORDER BY p.name ASC
        LIMIT $2 OFFSET $3
      `;
        const result = await db.query(query, [
            storeId,
            limit,
            offset,
        ]);
        const productsWithAvailability = result.rows.map((product) => ({
            ...product,
            isAvailable: product.quantity > product.reserved,
        }));
        logger.info('Product list retrieved', {
            userId: req.user.id,
            storeId,
            count: productsWithAvailability.length,
            requestId: req.requestId,
        });
        res.status(200).json({
            data: productsWithAvailability,
            pagination: {
                total,
                page: Math.floor(offset / limit) + 1,
                limit,
                pages,
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: req.requestId,
                storeId,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
export default productsRouter;
//# sourceMappingURL=products.js.map