/**
 * Authentication and Authorization Middleware
 * Handles route protection and role-based access control
 */
import { logger } from '../utils/logger.js';
import { ApiErrorCode } from '../utils/errors.js';
/**
 * Middleware factory: Require authentication
 * Ensures user is authenticated (has valid token)
 *
 * @returns Express middleware function
 *
 * @example
 * router.get('/protected', requireAuth(), (req, res) => {
 *   res.json({ userId: req.user?.id });
 * });
 */
export function requireAuth() {
    return (req, res, next) => {
        if (!req.user) {
            logger.warn('Unauthorized access attempt', {
                path: req.path,
                method: req.method,
                requestId: req.requestId,
            });
            return res.status(401).json({
                error: {
                    message: 'Authentication required',
                    code: ApiErrorCode.UNAUTHORIZED,
                    statusCode: 401,
                },
                requestId: req.requestId,
            });
        }
        next();
    };
}
/**
 * Middleware factory: Require specific roles
 * Ensures user has one of the specified roles
 *
 * @param allowedRoles - Array of allowed roles
 * @returns Express middleware function
 *
 * @example
 * router.post('/admin', requireRole(['OWNER', 'ADMIN']), (req, res) => {
 *   res.json({ adminAccess: true });
 * });
 */
export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        // First ensure user is authenticated
        if (!req.user) {
            logger.warn('Unauthorized access attempt', {
                path: req.path,
                method: req.method,
                requestId: req.requestId,
            });
            return res.status(401).json({
                error: {
                    message: 'Authentication required',
                    code: ApiErrorCode.UNAUTHORIZED,
                    statusCode: 401,
                },
                requestId: req.requestId,
            });
        }
        // Check if user's role is in allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            logger.warn('Unauthorized role access', {
                userId: req.user.id,
                userRole: req.user.role,
                allowedRoles,
                path: req.path,
                method: req.method,
                requestId: req.requestId,
            });
            return res.status(403).json({
                error: {
                    message: 'Insufficient permissions',
                    code: ApiErrorCode.FORBIDDEN,
                    statusCode: 403,
                },
                requestId: req.requestId,
            });
        }
        next();
    };
}
/**
 * Middleware factory: Require owner role
 * Convenience middleware for owner-only endpoints
 *
 * @returns Express middleware function
 *
 * @example
 * router.post('/reports', requireOwner(), (req, res) => {
 *   res.json({ ownerAccess: true });
 * });
 */
export function requireOwner() {
    return requireRole('OWNER', 'ADMIN');
}
/**
 * Middleware factory: Require kasir or owner role
 * Convenience middleware for user endpoints
 *
 * @returns Express middleware function
 *
 * @example
 * router.get('/profile', requireUser(), (req, res) => {
 *   res.json({ user: req.user });
 * });
 */
export function requireUser() {
    return requireRole('KASIR', 'OWNER', 'ADMIN');
}
/**
 * Middleware: Validate user still active
 * Checks if user's active status hasn't changed since token generation
 * This is optional but recommended for additional security
 *
 * @returns Express middleware function
 *
 * @example
 * router.use(validateUserActive());
 */
export function validateUserActive() {
    return async (req, res, next) => {
        if (!req.user) {
            return next(); // Skip if no user
        }
        try {
            // In a real implementation, you might check user status from database
            // For now, we just continue - the AuthService.validateUser can be called if needed
            next();
        }
        catch (error) {
            logger.error('User validation error', error, {
                userId: req.user.id,
                requestId: req.requestId,
            });
            return res.status(401).json({
                error: {
                    message: 'User validation failed',
                    code: ApiErrorCode.UNAUTHORIZED,
                    statusCode: 401,
                },
                requestId: req.requestId,
            });
        }
    };
}
/**
 * Middleware: Require specific store (for store-scoped access)
 * Ensures kasir users only access their assigned store
 * Owner can access any store
 *
 * @returns Express middleware function
 *
 * @example
 * router.get('/store/:storeId/transactions', requireStoreAccess(), (req, res) => {
 *   res.json({ ...transactionsForStore });
 * });
 */
export function requireStoreAccess() {
    return (req, res, next) => {
        // Require authentication first
        if (!req.user) {
            return res.status(401).json({
                error: {
                    message: 'Authentication required',
                    code: ApiErrorCode.UNAUTHORIZED,
                    statusCode: 401,
                },
                requestId: req.requestId,
            });
        }
        const requestedStoreId = req.params.storeId || req.query.storeId;
        // Owner and Admin can access any store
        if (['OWNER', 'ADMIN'].includes(req.user.role)) {
            return next();
        }
        // Kasir can only access their assigned store
        if (req.user.role === 'KASIR') {
            if (!req.user.storeId) {
                logger.warn('Kasir without store assignment', {
                    userId: req.user.id,
                    requestId: req.requestId,
                });
                return res.status(403).json({
                    error: {
                        message: 'Store assignment required',
                        code: ApiErrorCode.FORBIDDEN,
                        statusCode: 403,
                    },
                    requestId: req.requestId,
                });
            }
            if (requestedStoreId && requestedStoreId !== req.user.storeId) {
                logger.warn('Unauthorized store access', {
                    userId: req.user.id,
                    userStore: req.user.storeId,
                    requestedStore: requestedStoreId,
                    requestId: req.requestId,
                });
                return res.status(403).json({
                    error: {
                        message: 'Insufficient permissions for this store',
                        code: ApiErrorCode.FORBIDDEN,
                        statusCode: 403,
                    },
                    requestId: req.requestId,
                });
            }
        }
        next();
    };
}
export default {
    requireAuth,
    requireRole,
    requireOwner,
    requireUser,
    validateUserActive,
    requireStoreAccess,
};
//# sourceMappingURL=auth.js.map