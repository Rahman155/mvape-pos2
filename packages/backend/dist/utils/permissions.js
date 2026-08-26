/**
 * Permission constants and helpers for role-based access control
 */
/**
 * Centralized permission registry for all API endpoints
 * Defines which roles can access which endpoints and actions
 */
export const PERMISSIONS = {
    AUTH: {
        LOGIN: 'public',
        LOGOUT: ['OWNER', 'KASIR'],
        LOGOUT_ALL: ['OWNER', 'KASIR'],
        VIEW_PROFILE: ['OWNER', 'KASIR'],
        VIEW_SESSIONS: ['OWNER', 'KASIR'],
        VIEW_LOGIN_HISTORY: ['OWNER', 'KASIR'],
    },
    STORES: {
        LIST: {
            OWNER: 'all',
            KASIR: 'own_store',
        },
        CREATE: 'OWNER',
        UPDATE: 'OWNER',
        DELETE: 'OWNER',
        VIEW: {
            OWNER: 'all',
            KASIR: 'own_store',
        },
        UPLOAD_LOGO: 'OWNER',
    },
    PRODUCTS: {
        LIST: ['OWNER', 'KASIR'],
        CREATE: 'OWNER',
        UPDATE: 'OWNER',
        DELETE: 'OWNER',
        VIEW: ['OWNER', 'KASIR'],
    },
    INVENTORY: {
        LIST: ['OWNER', 'KASIR'],
        VIEW: {
            OWNER: 'all',
            KASIR: 'own_store',
        },
        TRANSFER: 'OWNER',
    },
    TRANSACTIONS: {
        CREATE: {
            OWNER: 'all',
            KASIR: 'own_store',
        },
        LIST: {
            OWNER: 'all',
            KASIR: 'own_store',
        },
        VIEW: {
            OWNER: 'all',
            KASIR: 'own_store',
        },
        UPDATE: {
            OWNER: 'all',
            KASIR: 'own_store',
        },
        DELETE: {
            OWNER: 'all',
            KASIR: 'own_store',
        },
        VIEW_HISTORY: {
            OWNER: 'all',
            KASIR: 'own_store',
        },
    },
    REPORTS: {
        DAILY: 'OWNER',
        WEEKLY: 'OWNER',
        MONTHLY: 'OWNER',
        CAPITAL: 'OWNER',
        PIUTANG: 'OWNER',
        BOP: {
            OWNER: 'all',
            KASIR: 'own_store_only',
        },
        ATTENDANCE: 'OWNER',
    },
    MEMBERS: {
        LIST: ['OWNER', 'KASIR'],
        CREATE: ['OWNER', 'KASIR'],
        VIEW: ['OWNER', 'KASIR'],
        UPDATE: ['OWNER', 'KASIR'],
        DELETE: 'OWNER',
        TOPUP_CREDIT: 'OWNER',
    },
    ATTENDANCE: {
        LIST: 'OWNER',
        VIEW_OWN: ['OWNER', 'KASIR'],
        VIEW_ALL: 'OWNER',
    },
    SUPPLIERS: {
        LIST: 'OWNER',
        CREATE: 'OWNER',
        UPDATE: 'OWNER',
        DELETE: 'OWNER',
    },
    PURCHASE_ORDERS: {
        LIST: 'OWNER',
        CREATE: 'OWNER',
        VIEW: 'OWNER',
        UPDATE: 'OWNER',
        RECORD_PAYMENT: 'OWNER',
    },
    PAYABLES: {
        LIST: 'OWNER',
        VIEW: 'OWNER',
        RECORD_PAYMENT: 'OWNER',
    },
    BOP: {
        LIST: {
            OWNER: 'all',
            KASIR: 'own_store',
        },
        CREATE: {
            OWNER: 'all',
            KASIR: 'own_store',
        },
        UPDATE: {
            OWNER: 'all',
            KASIR: 'own_store_with_ownership',
        },
        DELETE: 'OWNER',
    },
    PIUTANG: {
        LIST: 'OWNER',
        VIEW: 'OWNER',
        RECORD_PAYMENT: 'OWNER',
    },
    STOCK_OPNAME: {
        LIST: 'OWNER',
        CREATE: 'OWNER',
        UPDATE: 'OWNER',
        VIEW: 'OWNER',
    },
};
/**
 * Helper function to check if a role has permission
 * @param userRole - The user's role
 * @param requiredRoles - Single role or array of allowed roles
 * @returns true if user has permission
 */
export function hasRole(userRole, requiredRoles) {
    if (!requiredRoles || requiredRoles === 'public') {
        return true;
    }
    const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return allowedRoles.includes(userRole);
}
/**
 * Helper function to check if a user can access a store
 * @param userRole - The user's role
 * @param userStoreId - The user's assigned store ID (for KASIR)
 * @param targetStoreId - The store being accessed
 * @returns true if user can access the store
 */
export function canAccessStore(userRole, userStoreId, targetStoreId) {
    // Owners can access all stores
    if (userRole === 'OWNER' || userRole === 'ADMIN') {
        return true;
    }
    // Kasir can only access their assigned store
    if (userRole === 'KASIR' && userStoreId) {
        return userStoreId === targetStoreId;
    }
    return false;
}
/**
 * Helper function to get permission for a feature/action
 * @param feature - The feature name
 * @param action - The action name
 * @returns The permission requirements
 */
export function getFeaturePermission(feature, action) {
    const featurePerms = PERMISSIONS[feature];
    if (!featurePerms)
        return null;
    const actionKey = action.toUpperCase();
    return featurePerms[actionKey] || null;
}
/**
 * Helper to normalize permission to array format
 * @param permission - Permission to normalize
 * @returns Array of allowed roles
 */
export function normalizePermission(permission) {
    if (permission === 'public') {
        return ['public'];
    }
    if (typeof permission === 'string') {
        return [permission];
    }
    if (Array.isArray(permission)) {
        return permission;
    }
    return [];
}
/**
 * Error messages for authorization failures
 */
export const AUTHORIZATION_ERRORS = {
    NO_TOKEN: 'No authentication token provided',
    INVALID_TOKEN: 'Invalid or expired authentication token',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions for this action',
    RESOURCE_NOT_FOUND: 'Resource not found',
    ACCESS_DENIED_RESOURCE_OWNERSHIP: 'Access denied: You do not have permission to access this resource',
    KASIR_STORE_RESTRICTION: 'Kasir can only access data from their assigned store',
    NOT_AUTHENTICATED: 'Authentication required',
};
//# sourceMappingURL=permissions.js.map