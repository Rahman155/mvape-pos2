/**
 * Permission constants and helpers for role-based access control
 */
import type { Role, Permission, FeaturePermissions } from '../types/authorization.js';
/**
 * Centralized permission registry for all API endpoints
 * Defines which roles can access which endpoints and actions
 */
export declare const PERMISSIONS: FeaturePermissions;
/**
 * Helper function to check if a role has permission
 * @param userRole - The user's role
 * @param requiredRoles - Single role or array of allowed roles
 * @returns true if user has permission
 */
export declare function hasRole(userRole: Role, requiredRoles: Permission): boolean;
/**
 * Helper function to check if a user can access a store
 * @param userRole - The user's role
 * @param userStoreId - The user's assigned store ID (for KASIR)
 * @param targetStoreId - The store being accessed
 * @returns true if user can access the store
 */
export declare function canAccessStore(userRole: Role, userStoreId: string | undefined, targetStoreId: string): boolean;
/**
 * Helper function to get permission for a feature/action
 * @param feature - The feature name
 * @param action - The action name
 * @returns The permission requirements
 */
export declare function getFeaturePermission(feature: keyof typeof PERMISSIONS, action: string): Permission | null;
/**
 * Helper to normalize permission to array format
 * @param permission - Permission to normalize
 * @returns Array of allowed roles
 */
export declare function normalizePermission(permission: Permission): string[];
/**
 * Error messages for authorization failures
 */
export declare const AUTHORIZATION_ERRORS: {
    NO_TOKEN: string;
    INVALID_TOKEN: string;
    INSUFFICIENT_PERMISSIONS: string;
    RESOURCE_NOT_FOUND: string;
    ACCESS_DENIED_RESOURCE_OWNERSHIP: string;
    KASIR_STORE_RESTRICTION: string;
    NOT_AUTHENTICATED: string;
};
//# sourceMappingURL=permissions.d.ts.map