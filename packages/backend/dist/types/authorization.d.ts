/**
 * Authorization and permission types
 */
export type Role = 'KASIR' | 'OWNER' | 'ADMIN';
export type Permission = Role | Role[];
export interface PermissionCheckOptions {
    /**
     * Whether to check resource ownership
     */
    requireOwnership?: boolean;
    /**
     * Custom ownership check function
     */
    ownershipCheck?: (req: Express.Request) => Promise<boolean>;
}
export interface AuthorizationError {
    statusCode: 401 | 403;
    message: string;
    code: 'UNAUTHORIZED' | 'FORBIDDEN';
}
export interface RolePermissions {
    [role: string]: string[];
}
export interface FeaturePermissions {
    [feature: string]: {
        [action: string]: Permission | {
            [role: string]: 'all' | 'own_store' | 'own_store_only';
        };
    };
}
//# sourceMappingURL=authorization.d.ts.map