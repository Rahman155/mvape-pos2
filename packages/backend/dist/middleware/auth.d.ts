/**
 * Authentication and Authorization Middleware
 * Handles route protection and role-based access control
 */
import { Request, Response, NextFunction } from 'express';
export type UserRole = 'KASIR' | 'OWNER' | 'ADMIN';
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
export declare function requireAuth(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
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
export declare function requireRole(...allowedRoles: UserRole[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
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
export declare function requireOwner(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
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
export declare function requireUser(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
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
export declare function validateUserActive(): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
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
export declare function requireStoreAccess(): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
declare const _default: {
    requireAuth: typeof requireAuth;
    requireRole: typeof requireRole;
    requireOwner: typeof requireOwner;
    requireUser: typeof requireUser;
    validateUserActive: typeof validateUserActive;
    requireStoreAccess: typeof requireStoreAccess;
};
export default _default;
//# sourceMappingURL=auth.d.ts.map