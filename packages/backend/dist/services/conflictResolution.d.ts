/**
 * Conflict Resolution Service
 *
 * Implements comprehensive conflict resolution strategies:
 * - Last-Write-Wins (LWW): Timestamp-based for transactions
 * - Merge: Field-level merge for compatible changes
 * - Manual: Flags complex conflicts for user review
 *
 * Ensures idempotency: applying resolution multiple times produces identical results
 *
 * **Validates: Requirements 4.5, 26.5**
 */
/**
 * Conflict information
 */
export interface Conflict {
    id: string;
    entityType: string;
    clientTimestamp: number;
    serverTimestamp: number;
    clientData: any;
    serverData: any;
    strategy?: 'LWW' | 'MERGE' | 'MANUAL';
}
/**
 * Resolution result
 */
export interface ResolutionResult {
    conflictId: string;
    entityType: string;
    strategy: 'LWW' | 'MERGE' | 'MANUAL';
    winner: 'client' | 'server' | 'merged';
    resolvedData: any;
    reason: string;
    requiresUserReview: boolean;
    timestamp: number;
    idempotent: boolean;
}
/**
 * Conflict statistics tracking
 */
export interface ConflictStats {
    total: number;
    byStrategy: Record<string, number>;
    byEntityType: Record<string, number>;
    requiresReview: number;
    resolved: number;
}
/**
 * Resolve conflict using Last-Write-Wins (LWW) strategy
 * The version with the newer timestamp ALWAYS wins
 * IDEMPOTENT: Same conflict always produces identical result
 */
export declare function resolveLWW(conflict: Conflict): ResolutionResult;
/**
 * Resolve conflict using Merge strategy
 * For compatible field changes, intelligently merge non-overlapping updates
 * IDEMPOTENT: Same conflict always produces identical merged result
 */
export declare function resolveMerge(conflict: Conflict): ResolutionResult;
/**
 * Resolve conflict requiring manual user review
 */
export declare function resolveManual(conflict: Conflict): ResolutionResult;
/**
 * Get conflict statistics
 */
export declare function getConflictStats(): ConflictStats;
/**
 * Reset conflict statistics (useful for testing)
 */
export declare function resetConflictStats(): void;
/**
 * Resolve a single conflict using the determined strategy
 * IDEMPOTENT: Same conflict always produces identical resolution
 */
export declare function resolveConflict(conflict: Conflict): ResolutionResult;
/**
 * Resolve multiple conflicts in batch
 * IDEMPOTENT: Batch processing always produces same results for same input
 * Returns array of resolutions and identifies conflicts requiring manual review
 */
export declare function resolveBatchConflicts(conflicts: Conflict[]): {
    resolutions: ResolutionResult[];
    automaticResolutions: ResolutionResult[];
    manualResolutions: ResolutionResult[];
};
/**
 * Check if a conflict exists between two versions
 * Returns true if versions differ and both exist
 * IDEMPOTENT: Same inputs always produce same boolean result
 */
export declare function hasConflict(clientData: any, serverData: any): boolean;
/**
 * Apply resolution to update server state
 * Returns updated entity that should be persisted
 * Throws error if resolution requires manual review
 * IDEMPOTENT: Same resolution always produces same result
 */
export declare function applyResolution(resolution: ResolutionResult): any;
/**
 * Verify that a resolution is idempotent
 * Re-applying same conflict produces identical result
 * Useful for testing and validation
 */
export declare function verifyIdempotency(conflict: Conflict): boolean;
//# sourceMappingURL=conflictResolution.d.ts.map