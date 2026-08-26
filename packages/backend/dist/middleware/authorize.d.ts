/**
 * Role-based authorization middleware
 * Handles permission checking and resource ownership validation
 */
import { Request, Response, NextFunction } from 'express';
import type { Permission } from '../types/authorization.js';
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
export declare function authorize(allowedRoles: Permission): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
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
export declare function authorizeStore(storeIdParam?: string): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
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
export declare function authorizeResourceOwnership(ownershipCheckFn: OwnershipCheckFunction, options?: {
    allowOwnerBypass?: boolean;
}): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
/**
 * Middleware that requires authentication
 * Returns 401 if no authenticated user
 *
 * @returns Express middleware function
 *
 * @example
 * router.get('/me', requireAuth(), getCurrentUserHandler);
 */
export declare function requireAuth(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Middleware that allows public access (no authentication required)
 * Does not perform any checks - anyone can access
 *
 * @returns Express middleware function
 *
 * @example
 * router.post('/auth/login', allowPublic(), loginHandler);
 */
export declare function allowPublic(): (_req: Request, _res: Response, next: NextFunction) => void;
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
export declare function optionalAuth(): (_req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=authorize.d.ts.map