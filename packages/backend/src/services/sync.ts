/**
 * Sync Service
 * Handles batch synchronization of offline changes from clients
 * Processes multiple changes atomically and returns results per item
 * Implements conflict detection and resolution strategies
 */

import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { createTransaction } from './transaction.js';
import { validateMemberCredit } from './transaction.js';
import { v4 as uuidv4 } from 'uuid';
import { resolveConflict, type Conflict } from './conflictResolution.js';
import { getConflictNotificationManager } from './conflictNotification.js';

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
export async function processBatchSync(items: SyncRequestItem[]): Promise<BatchSyncResponse> {
  const results: SyncResponseItem[] = [];
  const startTime = Date.now();
  let conflictsDetected = 0;

  if (!items || !Array.isArray(items) || items.length === 0) {
    logger.warn('Batch sync called with empty items array');
    return {
      success: true,
      results: [],
      timestamp: Date.now(),
      version: '1.0.0',
      conflictsDetected: 0,
    };
  }

  logger.info(`Processing batch sync with ${items.length} items`);

  // Process each item individually
  for (const item of items) {
    try {
      const result = await processSyncItem(item);
      if (result.conflict?.detected) {
        conflictsDetected++;
      }
      results.push(result);
    } catch (error) {
      logger.error(`Error processing sync item ${item.id}:`, error);
      results.push({
        id: item.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        serverTimestamp: Date.now(),
      });
    }
  }

  const processingTime = Date.now() - startTime;
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  logger.info(
    `Batch sync completed: ${successCount} success, ${failureCount} failed, ${conflictsDetected} conflicts, ${processingTime}ms`
  );

  return {
    success: true, // Batch is considered successful if it processed (even if some items failed)
    results,
    timestamp: Date.now(),
    version: '1.0.0',
    conflictsDetected,
  };
}

/**
 * Detect conflict using Last-Write-Wins strategy
 * Compares client timestamp with server timestamp
 */
async function detectConflict(
  id: string,
  entityType: string,
  clientTimestamp?: number,
  changeType?: string
): Promise<ConflictDetectionResult> {
  // If no client timestamp provided, no conflict can be detected
  if (!clientTimestamp) {
    return {
      hasConflict: false,
      strategy: 'LWW',
      reason: 'No client timestamp provided',
    };
  }

  // For CREATE operations, no conflict possible (new entity)
  if (changeType === 'CREATE') {
    return {
      hasConflict: false,
      strategy: 'LWW',
      reason: 'CREATE operations cannot conflict',
    };
  }

  try {
    // Query for existing server version with full data
    let serverTimestamp: number | null = null;
    let query = '';
    let serverData: any = null;

    switch (entityType) {
      case 'transaction':
        query = 'SELECT * FROM transactions WHERE id = $1';
        break;
      case 'member':
        query = 'SELECT * FROM members WHERE id = $1';
        break;
      case 'product':
        query = 'SELECT * FROM products WHERE id = $1';
        break;
      default:
        return {
          hasConflict: false,
          strategy: 'LWW',
          reason: `Unknown entity type: ${entityType}`,
        };
    }

    const result = await db.query(query, [id]);

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      const updatedAt = row.updated_at;
      serverTimestamp = updatedAt instanceof Date ? updatedAt.getTime() : updatedAt;
      serverData = row;

      // Conflict detected if server version is newer than client version
      const hasConflict = serverTimestamp > clientTimestamp;

      if (hasConflict) {
        logger.info(
          `Conflict detected for ${entityType} ${id}: server=${serverTimestamp}, client=${clientTimestamp}`
        );
        return {
          hasConflict: true,
          strategy: 'LWW',
          serverTimestamp,
          reason: `Server version (${serverTimestamp}) is newer than client version (${clientTimestamp})`,
        };
      }
    }

    return {
      hasConflict: false,
      strategy: 'LWW',
      serverTimestamp,
      reason: 'No conflict: client version is newer or entity not found on server',
    };
  } catch (error) {
    logger.warn(`Error detecting conflict for ${entityType} ${id}:`, error);
    return {
      hasConflict: false,
      strategy: 'LWW',
      reason: 'Conflict detection failed, proceeding with update',
    };
  }
}

/**
 * Process a single sync item
 * Returns success/failure for individual item
 * Detects conflicts and applies conflict resolution strategy
 */
async function processSyncItem(item: SyncRequestItem): Promise<SyncResponseItem> {
  const { id, entityType, changeType, data, clientTimestamp } = item;

  logger.debug(`Processing ${changeType} for ${entityType} (id: ${id})`);

  try {
    // Validate item structure
    if (!id || !entityType || !changeType) {
      throw new Error('Missing required fields: id, entityType, changeType');
    }

    if (!['CREATE', 'UPDATE', 'DELETE'].includes(changeType)) {
      throw new Error(`Invalid changeType: ${changeType}`);
    }

    if (!data) {
      throw new Error('Data payload is required');
    }

    // Detect conflicts (for UPDATE and DELETE operations)
    let conflictInfo: ConflictDetectionResult | null = null;
    let conflictResolution: any = null;
    let notificationManager = getConflictNotificationManager();

    if (changeType !== 'CREATE') {
      conflictInfo = await detectConflict(id, entityType, clientTimestamp, changeType);

      // If conflict detected, resolve using appropriate strategy
      if (conflictInfo.hasConflict) {
        logger.info(
          `Conflict detected and will be resolved using ${conflictInfo.strategy} strategy for ${entityType} ${id}`
        );

        // Build conflict object for resolution
        const conflict: Conflict = {
          id,
          entityType,
          clientTimestamp: clientTimestamp || Date.now(),
          serverTimestamp: conflictInfo.serverTimestamp || Date.now(),
          clientData: data,
          serverData: {}, // Placeholder - would be fetched if needed
        };

        // Resolve conflict using resolution service
        conflictResolution = resolveConflict(conflict);

        // Notify user of conflict
        const strategy = conflictResolution.strategy as 'LWW' | 'MERGE' | 'MANUAL';
        notificationManager.notifyConflict(
          entityType,
          id,
          strategy,
          conflictResolution.reason,
          conflictResolution.requiresUserReview
        );

        // If manual review is required, don't process the item
        if (conflictResolution.requiresUserReview) {
          return {
            id,
            success: true, // Mark as successful but notify user
            data: {
              conflictDetected: true,
              requiresReview: true,
              message: 'Conflict requires manual review',
            },
            conflict: {
              detected: true,
              strategy: strategy,
              reason: conflictResolution.reason,
              serverVersion: conflictInfo.serverTimestamp,
              resolutionApplied: 'MANUAL - Requires user review',
            },
            serverTimestamp: Date.now(),
          };
        }
      }
    }

    // Route to appropriate handler
    const result = await (async () => {
      switch (entityType) {
        case 'transaction':
          return await processSyncTransaction(id, changeType, data);

        case 'member':
          return await processSyncMember(id, changeType, data);

        case 'product':
          return await processSyncProduct(id, changeType, data);

        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }
    })();

    // Attach conflict info if detected and resolved
    if (conflictInfo?.hasConflict && conflictResolution) {
      const strategy = conflictResolution.strategy as 'LWW' | 'MERGE' | 'MANUAL';
      result.conflict = {
        detected: true,
        strategy: strategy,
        reason: conflictResolution.reason,
        serverVersion: conflictInfo.serverTimestamp,
        resolutionApplied: `${strategy} - ${conflictResolution.reason}`,
      };
    }

    return result;
  } catch (error) {
    logger.error(`Error in processSyncItem for ${id}:`, error);
    return {
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      serverTimestamp: Date.now(),
    };
  }
}

/**
 * Process transaction sync item
 */
async function processSyncTransaction(
  id: string,
  changeType: string,
  data: any
): Promise<SyncResponseItem> {
  if (changeType !== 'CREATE') {
    throw new Error('Only CREATE is supported for transactions');
  }

  // Use database transaction for atomicity
  const transactionResult = await db.transaction(async (client) => {
    // Validate transaction data
    const {
      storeId,
      kasirId,
      items,
      paymentMethod,
      paymentData,
      notes,
    } = data;

    if (!storeId || !kasirId || !items || !paymentMethod) {
      throw new Error('Missing required transaction fields');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Transaction must have at least one item');
    }

    if (!['CASH', 'MEMBER_CREDIT', 'TEMPO'].includes(paymentMethod)) {
      throw new Error('Invalid payment method');
    }

    // Validate payment method specific data
    if (paymentMethod === 'CASH') {
      if (!paymentData?.cash?.amountReceived || paymentData.cash.amountReceived <= 0) {
        throw new Error('Invalid cash payment data');
      }
    } else if (paymentMethod === 'MEMBER_CREDIT') {
      if (!paymentData?.memberCredit?.memberId) {
        throw new Error('Member ID required for member credit payment');
      }
      // Validate member credit
      const creditValidation = await validateMemberCredit(
        paymentData.memberCredit.memberId,
        data.totalAmount || 0
      );
      if (!creditValidation.valid) {
        throw new Error(creditValidation.error || 'Member credit validation failed');
      }
    } else if (paymentMethod === 'TEMPO') {
      if (!paymentData?.tempo?.customerName || !paymentData.tempo.dueDate) {
        throw new Error('Invalid tempo payment data');
      }
    }

    // Calculate total
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + (item.totalPrice || 0),
      0
    );

    if (totalAmount <= 0) {
      throw new Error('Transaction total must be greater than zero');
    }

    // Create transaction using existing service
    const transactionRequest = {
      storeId,
      kasirId,
      items,
      paymentMethod,
      paymentData,
      notes,
    };

    // Use database connection from transaction
    const transactionId = uuidv4();

    // Insert transaction
    const insertTxResult = await client.query(
      `INSERT INTO transactions (
        id, store_id, kasir_id, transaction_date, total_amount,
        payment_method, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [transactionId, storeId, kasirId, new Date(), totalAmount, paymentMethod, 'COMPLETED']
    );

    if (insertTxResult.rows.length === 0) {
      throw new Error('Failed to create transaction');
    }

    const transaction = insertTxResult.rows[0];

    // Insert transaction items
    for (const item of items) {
      await client.query(
        `INSERT INTO transaction_items (
          id, transaction_id, product_id, quantity, unit_price, total_price
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          uuidv4(),
          transactionId,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
        ]
      );

      // Deduct inventory
      await client.query(
        `UPDATE inventory SET quantity = quantity - $1
        WHERE product_id = $2 AND store_id = $3`,
        [item.quantity, item.productId, storeId]
      );
    }

    // Handle payment method specific logic
    if (paymentMethod === 'MEMBER_CREDIT') {
      const memberId = paymentData.memberCredit.memberId;
      const usedCredit = paymentData.memberCredit.usedCredit || totalAmount;

      // Deduct member credit
      await client.query(
        `UPDATE members SET credit_balance = credit_balance - $1
        WHERE id = $2`,
        [usedCredit, memberId]
      );
    } else if (paymentMethod === 'TEMPO') {
      // Create piutang record
      const piutangId = uuidv4();
      await client.query(
        `INSERT INTO piutang (
          id, transaction_id, amount, remaining_balance, due_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          piutangId,
          transactionId,
          totalAmount,
          totalAmount,
          paymentData.tempo.dueDate,
          'OPEN',
        ]
      );
    }

    return {
      id: transactionId,
      storeId: transaction.store_id,
      kasirId: transaction.kasir_id,
      totalAmount: transaction.total_amount,
      paymentMethod: transaction.payment_method,
      status: transaction.status,
      serverTimestamp: Date.now(),
    };
  });

  return {
    id,
    success: true,
    data: transactionResult,
    serverTimestamp: Date.now(),
  };
}

/**
 * Process member sync item
 */
async function processSyncMember(
  id: string,
  changeType: string,
  data: any
): Promise<SyncResponseItem> {
  if (changeType !== 'CREATE') {
    throw new Error('Only CREATE is supported for members');
  }

  const { name, phone, email } = data;

  if (!name || !phone) {
    throw new Error('Member name and phone are required');
  }

  const memberId = uuidv4();
  const memberNumber = `MBR-${Date.now()}`;

  const result = await db.query(
    `INSERT INTO members (id, member_number, name, phone, email, credit_balance)
    VALUES ($1, $2, $3, $4, $5, 0)
    RETURNING *`,
    [memberId, memberNumber, name, phone, email || null]
  );

  if (result.rows.length === 0) {
    throw new Error('Failed to create member');
  }

  const member = result.rows[0];

  return {
    id,
    success: true,
    data: {
      id: member.id,
      memberNumber: member.member_number,
      name: member.name,
      phone: member.phone,
      creditBalance: member.credit_balance,
    },
    serverTimestamp: Date.now(),
  };
}

/**
 * Process product sync item
 */
async function processSyncProduct(
  id: string,
  changeType: string,
  data: any
): Promise<SyncResponseItem> {
  // Products are typically managed by admin, not synced from offline clients
  throw new Error('Product sync is not supported for offline clients');
}

/**
 * Get sync statistics
 */
export async function getSyncStats(): Promise<{
  totalQueued: number;
  totalProcessed: number;
  totalFailed: number;
  lastSyncTime: string | null;
}> {
  try {
    // These would typically come from a sync_history table
    // For now, return placeholder stats
    return {
      totalQueued: 0,
      totalProcessed: 0,
      totalFailed: 0,
      lastSyncTime: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Error getting sync stats:', error);
    throw error;
  }
}
