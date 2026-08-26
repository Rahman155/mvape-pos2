/**
 * Sync Service
 * Handles batch synchronization of offline changes from clients
 * Processes multiple changes atomically and returns results per item
 * Implements conflict detection and resolution strategies
 */
/**
 * Request item for batch sync
 */
export interface SyncRequestItem {
    id: string;
    entityType: 'transaction' | 'member' | 'product' | string;
    changeType: 'CREATE' | 'UPDATE' | 'DELETE';
    data: any;
    clientTimestamp?: number;
}
/**
 * Response item for batch sync
 */
export interface SyncResponseItem {
    id: string;
    success: boolean;
    data?: any;
    error?: string;
    serverTimestamp?: number;
    conflict?: {
        detected: boolean;
        strategy: 'LWW' | 'MERGE' | 'MANUAL';
        reason: string;
        serverVersion?: any;
        resolutionApplied?: string;
    };
}
/**
 * Batch sync response
 */
export interface BatchSyncResponse {
    success: boolean;
    results: SyncResponseItem[];
    timestamp: number;
    version: string;
    conflictsDetected?: number;
}
/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
    hasConflict: boolean;
    strategy: 'LWW' | 'MERGE' | 'MANUAL';
    serverTimestamp?: number;
    reason: string;
}
/**
 * Process a batch of sync items
 * Each item is processed individually and returns per-item success/failure
 * Ensures atomicity per item but doesn't fail entire batch if some items fail
 * Detects and resolves conflicts using Last-Write-Wins strategy
 */
export declare function processBatchSync(items: SyncRequestItem[]): Promise<BatchSyncResponse>;
/**
 * Get sync statistics
 */
export declare function getSyncStats(): Promise<{
    totalQueued: number;
    totalProcessed: number;
    totalFailed: number;
    lastSyncTime: string | null;
}>;
//# sourceMappingURL=sync.d.ts.map