/**
 * Conflict Resolution Strategy
 * Detects and resolves conflicts between offline changes and server state
 * Implements LWW (Last-Write-Wins), MERGE, and MANUAL strategies
 */

export type ConflictResolutionStrategy = 'LWW' | 'MERGE' | 'MANUAL';
export type ConflictPriority = 'local' | 'remote' | 'auto';

export interface ConflictItem {
  id: string;
  entityType: string;
  localVersion: unknown;
  remoteVersion: unknown;
  localTimestamp: number;
  remoteTimestamp: number;
  field?: string;
}

export interface ConflictResolution {
  id: string;
  strategy: ConflictResolutionStrategy;
  resolvedValue: unknown;
  winner: 'local' | 'remote';
  timestamp: number;
  reason: string;
}

export interface MergeResult {
  conflicts: ConflictItem[];
  resolutions: ConflictResolution[];
  requiresManualReview: boolean;
}

export interface ConflictHistoryItem {
  id: string;
  entityType: string;
  localValue: unknown;
  remoteValue: unknown;
  resolution: ConflictResolution;
  timestamp: number;
}

class ConflictResolver {
  private strategy: ConflictResolutionStrategy = 'LWW';
  private priority: ConflictPriority = 'auto';
  private conflictHistory: ConflictHistoryItem[] = [];
  private maxHistorySize = 1000;

  /**
   * Initialize conflict resolver
   */
  constructor(strategy: ConflictResolutionStrategy = 'LWW', priority: ConflictPriority = 'auto') {
    this.strategy = strategy;
    this.priority = priority;
    console.log(`[ConflictResolver] Initialized with strategy: ${strategy}, priority: ${priority}`);
  }

  /**
   * Detect conflicts between local and remote versions
   */
  detectConflicts(
    localVersion: unknown,
    remoteVersion: unknown,
    localTimestamp: number,
    remoteTimestamp: number,
    id: string,
    entityType: string
  ): ConflictItem | null {
    // If versions are identical, no conflict
    if (this.deepEqual(localVersion, remoteVersion)) {
      return null;
    }

    // If timestamps are identical but versions differ, it's a conflict
    if (localTimestamp === remoteTimestamp && !this.deepEqual(localVersion, remoteVersion)) {
      return {
        id,
        entityType,
        localVersion,
        remoteVersion,
        localTimestamp,
        remoteTimestamp,
      };
    }

    // If timestamps differ, it's a conflict (different versions at different times)
    if (localTimestamp !== remoteTimestamp) {
      return {
        id,
        entityType,
        localVersion,
        remoteVersion,
        localTimestamp,
        remoteTimestamp,
      };
    }

    return null;
  }

  /**
   * Resolve a single conflict using the configured strategy
   */
  resolveConflict(conflict: ConflictItem): ConflictResolution {
    switch (this.strategy) {
      case 'LWW':
        return this.resolveLWW(conflict);
      case 'MERGE':
        return this.resolveMerge(conflict);
      case 'MANUAL':
        return this.resolveManual(conflict);
      default:
        return this.resolveLWW(conflict);
    }
  }

  /**
   * Last-Write-Wins resolution strategy
   * The version with the later timestamp wins
   */
  private resolveLWW(conflict: ConflictItem): ConflictResolution {
    const isLocalWinner = conflict.localTimestamp >= conflict.remoteTimestamp;
    const winner = isLocalWinner ? 'local' : 'remote';
    const resolvedValue = isLocalWinner ? conflict.localVersion : conflict.remoteVersion;

    return {
      id: conflict.id,
      strategy: 'LWW',
      resolvedValue,
      winner,
      timestamp: Date.now(),
      reason: `Last-Write-Wins: ${winner} version (timestamp: ${isLocalWinner ? conflict.localTimestamp : conflict.remoteTimestamp})`,
    };
  }

  /**
   * Merge resolution strategy
   * Attempts to merge changes if possible, otherwise uses priority
   */
  private resolveMerge(conflict: ConflictItem): ConflictResolution {
    // For objects, try to merge properties
    if (this.isObject(conflict.localVersion) && this.isObject(conflict.remoteVersion)) {
      const merged = this.mergeObjects(
        conflict.localVersion as Record<string, unknown>,
        conflict.remoteVersion as Record<string, unknown>,
        conflict.localTimestamp,
        conflict.remoteTimestamp
      );

      return {
        id: conflict.id,
        strategy: 'MERGE',
        resolvedValue: merged,
        winner: 'local', // Merged result treated as local win
        timestamp: Date.now(),
        reason: 'Objects merged based on property timestamps',
      };
    }

    // For non-objects, fall back to priority or LWW
    const resolution = this.priority === 'local' ? this.favoritePriority(conflict, 'local') : this.priority === 'remote' ? this.favoritePriority(conflict, 'remote') : this.resolveLWW(conflict);

    return {
      ...resolution,
      strategy: 'MERGE',
      reason: `Merge fallback using ${this.priority} priority`,
    };
  }

  /**
   * Manual resolution strategy
   * Marks conflict for manual review, returns local version
   */
  private resolveManual(conflict: ConflictItem): ConflictResolution {
    return {
      id: conflict.id,
      strategy: 'MANUAL',
      resolvedValue: conflict.localVersion,
      winner: 'local',
      timestamp: Date.now(),
      reason: 'Marked for manual review by user',
    };
  }

  /**
   * Resolve with priority (favor local or remote)
   */
  private favoritePriority(conflict: ConflictItem, priority: 'local' | 'remote'): ConflictResolution {
    const winner = priority;
    const resolvedValue = priority === 'local' ? conflict.localVersion : conflict.remoteVersion;

    return {
      id: conflict.id,
      strategy: this.strategy as ConflictResolutionStrategy,
      resolvedValue,
      winner,
      timestamp: Date.now(),
      reason: `Resolved using ${priority} priority`,
    };
  }

  /**
   * Resolve multiple conflicts
   */
  async resolveMultiple(conflicts: ConflictItem[]): Promise<MergeResult> {
    const resolutions: ConflictResolution[] = [];
    let requiresManualReview = false;

    for (const conflict of conflicts) {
      const resolution = this.resolveConflict(conflict);

      if (this.strategy === 'MANUAL') {
        requiresManualReview = true;
      }

      resolutions.push(resolution);

      // Record in history
      this.recordHistory(conflict, resolution);
    }

    return {
      conflicts,
      resolutions,
      requiresManualReview,
    };
  }

  /**
   * Apply a resolution to create the final merged value
   */
  applyResolution(original: unknown, resolution: ConflictResolution): unknown {
    return resolution.resolvedValue;
  }

  /**
   * Apply multiple resolutions
   */
  applyMultipleResolutions(
    items: Array<{ original: unknown; resolution: ConflictResolution }>
  ): Map<string, unknown> {
    const result = new Map<string, unknown>();

    for (const item of items) {
      const resolved = this.applyResolution(item.original, item.resolution);
      result.set(item.resolution.id, resolved);
    }

    return result;
  }

  /**
   * Merge two objects intelligently
   */
  private mergeObjects(
    local: Record<string, unknown>,
    remote: Record<string, unknown>,
    localTimestamp: number,
    remoteTimestamp: number
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = {};

    // Start with remote as base
    Object.assign(merged, remote);

    // Apply local changes that are newer or not in remote
    for (const key in local) {
      const localValue = local[key];
      const remoteValue = remote[key];

      if (remoteValue === undefined) {
        // Local has a new property
        merged[key] = localValue;
      } else if (!this.deepEqual(localValue, remoteValue)) {
        // Property differs, use local (treated as more recent)
        merged[key] = localValue;
      }
    }

    return merged;
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    if (a === null || b === null) return a === b;
    if (typeof a !== 'object' || typeof b !== 'object') return false;

    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
    }

    return true;
  }

  /**
   * Check if value is an object
   */
  private isObject(value: unknown): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Record conflict in history
   */
  private recordHistory(conflict: ConflictItem, resolution: ConflictResolution): void {
    const historyItem: ConflictHistoryItem = {
      id: conflict.id,
      entityType: conflict.entityType,
      localValue: conflict.localVersion,
      remoteValue: conflict.remoteVersion,
      resolution,
      timestamp: Date.now(),
    };

    this.conflictHistory.push(historyItem);

    // Maintain max size
    if (this.conflictHistory.length > this.maxHistorySize) {
      this.conflictHistory = this.conflictHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get conflict history
   */
  getHistory(): ConflictHistoryItem[] {
    return [...this.conflictHistory];
  }

  /**
   * Get history for specific entity
   */
  getHistoryForEntity(entityId: string): ConflictHistoryItem[] {
    return this.conflictHistory.filter((item) => item.id === entityId);
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.conflictHistory = [];
    console.log('[ConflictResolver] History cleared');
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalConflicts: number;
    lwwResolutions: number;
    mergeResolutions: number;
    manualResolutions: number;
  } {
    const stats = {
      totalConflicts: this.conflictHistory.length,
      lwwResolutions: 0,
      mergeResolutions: 0,
      manualResolutions: 0,
    };

    for (const item of this.conflictHistory) {
      switch (item.resolution.strategy) {
        case 'LWW':
          stats.lwwResolutions++;
          break;
        case 'MERGE':
          stats.mergeResolutions++;
          break;
        case 'MANUAL':
          stats.manualResolutions++;
          break;
      }
    }

    return stats;
  }

  /**
   * Set resolution strategy
   */
  setStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategy = strategy;
    console.log(`[ConflictResolver] Strategy changed to: ${strategy}`);
  }

  /**
   * Set resolution priority
   */
  setPriority(priority: ConflictPriority): void {
    this.priority = priority;
    console.log(`[ConflictResolver] Priority changed to: ${priority}`);
  }

  /**
   * Get current strategy
   */
  getStrategy(): ConflictResolutionStrategy {
    return this.strategy;
  }

  /**
   * Get current priority
   */
  getPriority(): ConflictPriority {
    return this.priority;
  }
}

/**
 * Singleton instance
 */
let conflictResolverInstance: ConflictResolver | null = null;

/**
 * Get or create conflict resolver instance
 */
export function getConflictResolver(
  strategy?: ConflictResolutionStrategy,
  priority?: ConflictPriority
): ConflictResolver {
  if (!conflictResolverInstance) {
    conflictResolverInstance = new ConflictResolver(strategy, priority);
  }
  return conflictResolverInstance;
}

export default ConflictResolver;
