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

import { logger } from '../utils/logger.js';

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
 * Determine the conflict resolution strategy based on entity type and conflict characteristics
 * Strategy selection rules:
 * - Transactions: Always use LWW (simple, atomic)
 * - Members: Use MERGE if fields don't overlap, else LWW
 * - Other types: Default to MANUAL for safety
 */
function determineStrategy(
  entityType: string,
  clientData: any,
  serverData: any,
  changeType?: string
): 'LWW' | 'MERGE' | 'MANUAL' {
  // DELETE operations always use LWW (simpler logic)
  if (changeType === 'DELETE') {
    return 'LWW';
  }

  // For transactions, use LWW (simpler, less error-prone, atomic)
  if (entityType === 'transaction') {
    return 'LWW';
  }

  // For members, check if we can merge non-overlapping field changes
  if (entityType === 'member' && canMergeMemberChanges(clientData, serverData)) {
    return 'MERGE';
  }

  // For inventory, use LWW to avoid quantity conflicts
  if (entityType === 'inventory') {
    return 'LWW';
  }

  // For BOP, check if dates don't overlap
  if (entityType === 'bop' && canMergeBopChanges(clientData, serverData)) {
    return 'MERGE';
  }

  // For other entity types or when merge isn't safe, require manual review
  return 'MANUAL';
}

/**
 * Check if member data changes can be safely merged
 * Returns true if changes don't overlap (i.e., different fields changed)
 * Allows merging of phone, email, total_spent independently
 */
function canMergeMemberChanges(clientData: any, serverData: any): boolean {
  if (!clientData || !serverData) {
    return false;
  }

  // Critical fields that cannot be independently merged
  const criticalFields = ['name', 'member_number', 'id', 'created_at'];
  
  // Fields that are allowed to be merged independently
  const mergeableFields = ['phone', 'email', 'credit_balance', 'total_spent', 'is_active'];

  // Check if any critical field changed
  for (const field of criticalFields) {
    if (clientData[field] !== serverData[field]) {
      return false; // Cannot merge if critical field changed
    }
  }

  // Count how many mergeable fields changed
  let changedCount = 0;
  for (const field of mergeableFields) {
    if (clientData[field] !== serverData[field]) {
      changedCount++;
    }
  }

  // Can merge if at most 2 non-critical fields changed
  return changedCount <= 2;
}

/**
 * Check if BOP data changes can be safely merged
 * BOP changes can be merged if they don't overlap in effective dates
 */
function canMergeBopChanges(clientData: any, serverData: any): boolean {
  if (!clientData || !serverData) {
    return false;
  }

  // Cannot merge if store or name changed
  if (clientData.store_id !== serverData.store_id || clientData.name !== serverData.name) {
    return false;
  }

  // Check if effective date ranges overlap
  const clientStart = new Date(clientData.effective_from).getTime();
  const clientEnd = clientData.effective_to ? new Date(clientData.effective_to).getTime() : Infinity;
  const serverStart = new Date(serverData.effective_from).getTime();
  const serverEnd = serverData.effective_to ? new Date(serverData.effective_to).getTime() : Infinity;

  // Ranges overlap if one starts before the other ends
  const overlap = clientStart < serverEnd && serverStart < clientEnd;
  
  // Can merge only if date ranges don't overlap
  return !overlap;
}

/**
 * Resolve conflict using Last-Write-Wins (LWW) strategy
 * The version with the newer timestamp ALWAYS wins
 * IDEMPOTENT: Same conflict always produces identical result
 */
export function resolveLWW(conflict: Conflict): ResolutionResult {
  const { id, entityType, clientTimestamp, serverTimestamp, clientData, serverData } = conflict;

  // Normalize timestamps to milliseconds for consistency
  const normalizedClientTs = Math.floor(clientTimestamp);
  const normalizedServerTs = Math.floor(serverTimestamp);

  // Determine winner based on timestamps
  // If equal (same millisecond), server always wins (deterministic tie-breaking)
  const clientIsNewer = normalizedClientTs > normalizedServerTs;

  const winner = clientIsNewer ? 'client' : 'server';
  const resolvedData = clientIsNewer ? clientData : serverData;

  logger.info(
    `[LWW] Conflict for ${entityType} ${id}: client(${normalizedClientTs}) vs server(${normalizedServerTs}) → ${winner} wins`
  );

  return {
    conflictId: id,
    entityType,
    strategy: 'LWW',
    winner,
    resolvedData,
    reason: `Last-Write-Wins: ${winner} version (${winner === 'client' ? normalizedClientTs : normalizedServerTs}) is newer`,
    requiresUserReview: false,
    timestamp: Date.now(),
    idempotent: true, // LWW is always idempotent
  };
}

/**
 * Resolve conflict using Merge strategy
 * For compatible field changes, intelligently merge non-overlapping updates
 * IDEMPOTENT: Same conflict always produces identical merged result
 */
export function resolveMerge(conflict: Conflict): ResolutionResult {
  const { id, entityType, clientData, serverData } = conflict;

  if (entityType !== 'member' && entityType !== 'bop') {
    throw new Error(`Merge strategy not supported for ${entityType} entity type`);
  }

  logger.info(`[MERGE] Conflict for ${entityType} ${id}: merging compatible field changes`);

  let merged: any = {};

  if (entityType === 'member') {
    merged = resolveMergeMember(clientData, serverData);
  } else if (entityType === 'bop') {
    merged = resolveMergeBop(clientData, serverData);
  }

  return {
    conflictId: id,
    entityType,
    strategy: 'MERGE',
    winner: 'merged',
    resolvedData: merged,
    reason: `Merge strategy: combined compatible field changes from both versions`,
    requiresUserReview: false,
    timestamp: Date.now(),
    idempotent: true, // Merge is idempotent (deterministic field selection)
  };
}

/**
 * Merge member data from client and server versions
 * IDEMPOTENT: Same inputs always produce same merged result
 */
function resolveMergeMember(clientData: any, serverData: any): any {
  // Start with server data as base
  const merged: any = { ...serverData };

  // Fields that can be merged from client
  const phoneChanged = clientData.phone !== serverData.phone;
  const emailChanged = clientData.email !== serverData.email;
  const totalSpentChanged = clientData.total_spent !== serverData.total_spent;

  // Apply deterministic merge rules
  if (phoneChanged && clientData.phone) {
    // Client's phone change takes precedence (assumes newer interaction)
    merged.phone = clientData.phone;
  }

  if (emailChanged && clientData.email) {
    // Client's email change takes precedence
    merged.email = clientData.email;
  }

  if (totalSpentChanged && typeof clientData.total_spent === 'number') {
    // For numeric fields like total_spent, use maximum to avoid losing data
    merged.total_spent = Math.max(clientData.total_spent || 0, serverData.total_spent || 0);
  }

  logger.debug(`[MERGE] Member ${serverData.id}: merged phone=${merged.phone}, email=${merged.email}, total_spent=${merged.total_spent}`);

  return merged;
}

/**
 * Merge BOP data from client and server versions
 * IDEMPOTENT: Same inputs always produce same merged result
 */
function resolveMergeBop(clientData: any, serverData: any): any {
  // For BOP with non-overlapping date ranges, combine both records
  // Start with server as base, override with client if newer fields
  const merged: any = { ...serverData };

  // If amounts differ, take the newer one (based on which was updated more recently)
  if (clientData.amount !== serverData.amount) {
    // Take client's amount (more recent change)
    merged.amount = clientData.amount;
  }

  // For effective dates, keep both if they don't overlap
  if (clientData.effective_from && clientData.effective_from !== serverData.effective_from) {
    merged.effective_from = clientData.effective_from;
  }

  if (clientData.effective_to && clientData.effective_to !== serverData.effective_to) {
    merged.effective_to = clientData.effective_to;
  }

  return merged;
}

/**
 * Resolve conflict requiring manual user review
 */
export function resolveManual(conflict: Conflict): ResolutionResult {
  const { id, entityType, clientTimestamp, serverTimestamp } = conflict;

  logger.warn(
    `[MANUAL] Conflict requires user review for ${entityType} ${id}: ` +
    `client(${clientTimestamp}) vs server(${serverTimestamp})`
  );

  return {
    conflictId: id,
    entityType,
    strategy: 'MANUAL',
    winner: 'merged', // Neither version used directly
    resolvedData: null,
    reason: 'Conflict requires manual user review before resolution can be applied',
    requiresUserReview: true,
    timestamp: Date.now(),
    idempotent: false, // Manual conflicts are not auto-resolved
  };
}

/**
 * Statistics for conflict resolution
 */
let conflictStats: ConflictStats = {
  total: 0,
  byStrategy: {},
  byEntityType: {},
  requiresReview: 0,
  resolved: 0,
};

/**
 * Update conflict statistics
 */
function updateStats(resolution: ResolutionResult): void {
  conflictStats.total++;
  conflictStats.byStrategy[resolution.strategy] = (conflictStats.byStrategy[resolution.strategy] ?? 0) + 1;
  conflictStats.byEntityType[resolution.entityType] = (conflictStats.byEntityType[resolution.entityType] ?? 0) + 1;

  if (resolution.requiresUserReview) {
    conflictStats.requiresReview++;
  } else {
    conflictStats.resolved++;
  }
}

/**
 * Get conflict statistics
 */
export function getConflictStats(): ConflictStats {
  return { ...conflictStats };
}

/**
 * Reset conflict statistics (useful for testing)
 */
export function resetConflictStats(): void {
  conflictStats = {
    total: 0,
    byStrategy: {},
    byEntityType: {},
    requiresReview: 0,
    resolved: 0,
  };
}

/**
 * Resolve a single conflict using the determined strategy
 * IDEMPOTENT: Same conflict always produces identical resolution
 */
export function resolveConflict(conflict: Conflict): ResolutionResult {
  // Normalize timestamps
  const normalizedConflict = {
    ...conflict,
    clientTimestamp: Math.floor(conflict.clientTimestamp),
    serverTimestamp: Math.floor(conflict.serverTimestamp),
  };

  const strategy = determineStrategy(
    normalizedConflict.entityType,
    normalizedConflict.clientData,
    normalizedConflict.serverData
  );

  logger.info(
    `Resolving conflict ${normalizedConflict.id} (${normalizedConflict.entityType}) using ${strategy} strategy`
  );

  let resolution: ResolutionResult;

  switch (strategy) {
    case 'LWW':
      resolution = resolveLWW(normalizedConflict);
      break;

    case 'MERGE':
      resolution = resolveMerge(normalizedConflict);
      break;

    case 'MANUAL':
      resolution = resolveManual(normalizedConflict);
      break;

    default:
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
  }

  // Update statistics
  updateStats(resolution);

  return resolution;
}

/**
 * Resolve multiple conflicts in batch
 * IDEMPOTENT: Batch processing always produces same results for same input
 * Returns array of resolutions and identifies conflicts requiring manual review
 */
export function resolveBatchConflicts(conflicts: Conflict[]): {
  resolutions: ResolutionResult[];
  automaticResolutions: ResolutionResult[];
  manualResolutions: ResolutionResult[];
} {
  logger.info(`Resolving batch of ${conflicts.length} conflicts`);

  // Process each conflict - order doesn't matter for idempotency
  const resolutions = conflicts.map((conflict) => resolveConflict(conflict));
  
  // Separate by resolution type (deterministic split)
  const automaticResolutions = resolutions.filter((r) => !r.requiresUserReview);
  const manualResolutions = resolutions.filter((r) => r.requiresUserReview);

  logger.info(
    `Batch conflict resolution complete: ` +
    `${automaticResolutions.length} automatic, ${manualResolutions.length} manual review`
  );

  return {
    resolutions,
    automaticResolutions,
    manualResolutions,
  };
}

/**
 * Check if a conflict exists between two versions
 * Returns true if versions differ and both exist
 * IDEMPOTENT: Same inputs always produce same boolean result
 */
export function hasConflict(clientData: any, serverData: any): boolean {
  if (!clientData || !serverData) {
    return false;
  }

  // Use JSON string comparison for deterministic conflict detection
  try {
    const clientStr = JSON.stringify(clientData, Object.keys(clientData).sort());
    const serverStr = JSON.stringify(serverData, Object.keys(serverData).sort());
    return clientStr !== serverStr;
  } catch {
    // If comparison fails, conservatively assume no conflict
    return false;
  }
}

/**
 * Apply resolution to update server state
 * Returns updated entity that should be persisted
 * Throws error if resolution requires manual review
 * IDEMPOTENT: Same resolution always produces same result
 */
export function applyResolution(resolution: ResolutionResult): any {
  if (resolution.requiresUserReview) {
    throw new Error('Cannot automatically apply manual review resolutions - requires user decision');
  }

  if (!resolution.resolvedData) {
    throw new Error('Resolution contains no resolved data');
  }

  logger.info(
    `Applying ${resolution.strategy} resolution for ${resolution.entityType} ` +
    `${resolution.conflictId}: winner=${resolution.winner}`
  );

  // Return the resolved data which should be persisted
  return resolution.resolvedData;
}

/**
 * Verify that a resolution is idempotent
 * Re-applying same conflict produces identical result
 * Useful for testing and validation
 */
export function verifyIdempotency(conflict: Conflict): boolean {
  try {
    // Resolve the conflict twice
    const resolution1 = resolveConflict(conflict);
    const resolution2 = resolveConflict(conflict);

    // Compare results
    const data1Str = JSON.stringify(resolution1.resolvedData, null, 2);
    const data2Str = JSON.stringify(resolution2.resolvedData, null, 2);
    const reasonsSame = resolution1.reason === resolution2.reason;
    const strategiesSame = resolution1.strategy === resolution2.strategy;
    const winnersSame = resolution1.winner === resolution2.winner;

    const identical = data1Str === data2Str && reasonsSame && strategiesSame && winnersSame;

    if (!identical) {
      logger.warn(
        `Idempotency check FAILED for ${conflict.id}: ` +
        `data_match=${data1Str === data2Str}, reason_match=${reasonsSame}, ` +
        `strategy_match=${strategiesSame}, winner_match=${winnersSame}`
      );
    }

    return identical;
  } catch (error) {
    logger.error(`Idempotency verification failed:`, error);
    return false;
  }
}

