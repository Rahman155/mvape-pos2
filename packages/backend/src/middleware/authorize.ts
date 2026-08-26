/**
 * Role-based authorization middleware
 * Handles permission checking and resource ownership validation
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import type { Permission } from '../types/authorization.js';
import { hasRole, canAccessStore, AUTHORIZATION_ERRORS } from '../utils/permissions.js';

/**
 * Type for function that checks resource ownership
 */
export type OwnershipCheckFunction = (req: Request) => Promise<boolean>;

/**
 * Middleware to check if user has required roles
 * Returns 401 if no authenticated user, 403 if insufficient permissions
 *
 * @param allowedRoles - Single role or array of allowed roles
 * @returns Express middleware function
 *
 * @example
 * router.get('/admin/users', authorize('OWNER'), getUsersHandler);
 * router.get('/dashboard', authorize(['OWNER', 'KASIR']), dashboardHandler);
 */
export function authorize(allowedRoles: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('Authorization failed: No authenticated user', {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
      });
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        message: AUTHORIZATION_ERRORS.NOT_AUTHENTICATED,
      });
    }

    const userRole = req.user.role;

    // Check if user has required role
    if (!hasRole(userRole, allowedRoles)) {
      logger.warn('Authorization failed: Insufficient permissions', {
        requestId: req.requestId,
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path,
        method: req.method,
      });
      return res.status(403).json({
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message: AUTHORIZATION_ERRORS.INSUFFICIENT_PERMISSIONS,
      });
    }

    next();
  };
}

/**
 * Middleware to check store access for KASIR users
 * Kasir can only access their assigned store
 * Owners can access all stores
 *
 * @param storeIdParam - The name of the request parameter containing store ID (default: 'storeId')
 * @returns Express middleware function
 *
 * @example
 * router.get('/stores/:storeId', authorizeStore('storeId'), getStoreHandler);
 */
export function authorizeStore(storeIdParam: string = 'storeId') {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      logger.warn('Store authorization failed: No authenticated user', {
        requestId: req.requestId,
        path: req.path,
      });
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        message: AUTHORIZATION_ERRORS.NOT_AUTHENTICATED,
      });
    }

    const targetStoreId = req.params[storeIdParam] || req.body?.storeId || req.query?.storeId;

    if (!targetStoreId) {
      logger.warn('Store authorization failed: No target store ID provided', {
        requestId: req.requestId,
        userId: req.user.id,
        path: req.path,
      });
      return res.status(400).json({
        error: 'Bad Request',
        code: 'MISSING_STORE_ID',
        message: 'Store ID is required',
      });
    }

    // Check if user can access this store
    if (!canAccessStore(req.user.role, req.user.storeId, targetStoreId)) {
      logger.warn('Store authorization failed: Access denied to store', {
        requestId: req.requestId,
        userId: req.user.id,
        userRole: req.user.role,
        userStoreId: req.user.storeId,
        targetStoreId,
        path: req.path,
      });
      return res.status(403).json({
        error: 'Forbidden',
        code: 'FORBIDDEN',
        message:
          req.user.role === 'KASIR'
            ? AUTHORIZATION_ERRORS.KASIR_STORE_RESTRICTION
            : AUTHORIZATION_ERRORS.INSUFFICIENT_PERMISSIONS,
      });
    }

    // Attach store ID to request for use in handlers
    req.params[storeIdParam] = targetStoreId;

    next();
  };
}

/**
 * Middleware to check resource ownership
 * Used for operations where users can only modify their own data
 *
 * @param ownershipCheckFn - Function that checks if current user owns the resource
 * @param options - Optional configuration
 * @returns Express middleware function
 *
 * @example
 * // Check if kasir owns the transaction
 * const checkTransactionOwnership = async (req) => {
 *   const transactionId = req.params.transactionId;
 *   const transaction = await db.query('SELECT kasir_id FROM transactions WHERE id = ?', [transactionId]);
 *   return transaction.kasir_id === req.user.id;
 * };
 *
 * router.put('/transactions/:id', authorizeResourceOwnership(checkTransactionOwnership), updateTransactionHandler);
 */
export function authorizeResourceOwnership(
  ownershipCheckFn: OwnershipCheckFunction,
  options?: { allowOwnerBypass?: boolean }
) {
  const allowOwnerBypass = options?.allowOwnerBypass !== false; // Default to true

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        logger.warn('Resource ownership check failed: No authenticated user', {
          requestId: req.requestId,
          path: req.path,
        });
        return res.status(401).json({
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
          message: AUTHORIZATION_ERRORS.NOT_AUTHENTICATED,
        });
      }

      // Owner/Admin has access to everything by default
      if (allowOwnerBypass && (req.user.role === 'OWNER' || req.user.role === 'ADMIN')) {
        return next();
      }

      // Check resource ownership
      const isOwner = await ownershipCheckFn(req);

      if (!isOwner) {
        logger.warn('Resource ownership check failed: User does not own resource', {
          requestId: req.requestId,
          userId: req.user.id,
          userRole: req.user.role,
          path: req.path,
        });
        return res.status(403).json({
          error: 'Forbidden',
          code: 'FORBIDDEN',
          message: AUTHORIZATION_ERRORS.ACCESS_DENIED_RESOURCE_OWNERSHIP,
        });
      }

      next();
    } catch (error) {
      logger.error('Resource ownership check error', error as Error, {
        requestId: req.requestId,
        userId: req.user?.id,
        path: req.path,
      });
      return res.status(500).json({
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while checking permissions',
      });
    }
  };
}

/**
 * Middleware that requires authentication
 * Returns 401 if no authenticated user
 *
 * @returns Express middleware function
 *
 * @example
 * router.get('/me', requireAuth(), getCurrentUserHandler);
 */
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.warn('Authentication required but no user found', {
        requestId: req.requestId,
        path: req.path,
      });
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
        message: AUTHORIZATION_ERRORS.NOT_AUTHENTICATED,
      });
    }

    next();
  };
}

/**
 * Middleware that allows public access (no authentication required)
 * Does not perform any checks - anyone can access
 *
 * @returns Express middleware function
 *
 * @example
 * router.post('/auth/login', allowPublic(), loginHandler);
 */
export function allowPublic() {
  return (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };
}

/**
 * Middleware for optional authentication
 * If user is authenticated, adds to request; otherwise continues
 * Useful for endpoints that have different behavior for authenticated vs unauthenticated users
 *
 * @returns Express middleware function
 *
 * @example
 * router.get('/products', optionalAuth(), getProductsHandler);
 */
export function optionalAuth() {
  return (_req: Request, _res: Response, next: NextFunction) => {
    // Authentication is optional, so we just pass through
    // The authenticate middleware should have already processed the token if present
    next();
  };
}
