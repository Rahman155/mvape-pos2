/**
 * Transaction Service
 * Handles transaction creation, validation, and payment processing
 */

import { db } from '../database/connection.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export interface TransactionRequest {
  storeId: string;
  kasirId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  paymentMethod: 'CASH' | 'MEMBER_CREDIT' | 'TEMPO';
  paymentData?: {
    cash?: {
      amountReceived: number;
      change: number;
    };
    memberCredit?: {
      memberId: string;
      memberName: string;
      usedCredit: number;
    };
    tempo?: {
      customerName: string;
      customerPhone: string;
      durationDays: number;
      dueDate: string;
    };
  };
  notes?: string;
}

export interface TransactionResponse {
  id: string;
  storeId: string;
  kasirId: string;
  transactionDate: Date;
  totalAmount: number;
  paymentMethod: 'CASH' | 'MEMBER_CREDIT' | 'TEMPO';
  status: 'COMPLETED';
  notes?: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

/**
 * Validate member has sufficient credit for payment
 */
export async function validateMemberCredit(
  memberId: string,
  requiredAmount: number
): Promise<{
  valid: boolean;
  currentBalance?: number;
  error?: string;
}> {
  try {
    const result = await db.query(
      'SELECT credit_balance FROM members WHERE id = $1 AND is_active = true',
      [memberId]
    );

    if (result.rows.length === 0) {
      return {
        valid: false,
        error: 'Member not found or inactive',
      };
    }

    const currentBalance = Number(result.rows[0].credit_balance);

    if (currentBalance < requiredAmount) {
      return {
        valid: false,
        currentBalance,
        error: `Insufficient credit balance. Available: Rp ${currentBalance.toLocaleString('id-ID')}, Required: Rp ${requiredAmount.toLocaleString('id-ID')}`,
      };
    }

    return {
      valid: true,
      currentBalance,
    };
  } catch (error) {
    logger.error('Error validating member credit:', error);
    return {
      valid: false,
      error: 'Failed to validate member credit',
    };
  }
}

/**
 * Deduct member credit for transaction
 */
export async function deductMemberCredit(
  memberId: string,
  amount: number
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  try {
    // Start transaction
    await db.query('BEGIN');

    // Get current balance
    const memberResult = await db.query(
      'SELECT credit_balance FROM members WHERE id = $1 FOR UPDATE',
      [memberId]
    );

    if (memberResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return {
        success: false,
        error: 'Member not found',
      };
    }

    const currentBalance = Number(memberResult.rows[0].credit_balance);

    if (currentBalance < amount) {
      await db.query('ROLLBACK');
      return {
        success: false,
        error: 'Insufficient credit balance',
      };
    }

    const newBalance = currentBalance - amount;
    const now = new Date();

    // Update member credit
    const updateResult = await db.query(
      'UPDATE members SET credit_balance = $1, updated_at = $2 WHERE id = $3 RETURNING credit_balance',
      [newBalance.toString(), now, memberId]
    );

    await db.query('COMMIT');

    return {
      success: true,
      newBalance: Number(updateResult.rows[0].credit_balance),
    };
  } catch (error) {
    await db.query('ROLLBACK');
    logger.error('Error deducting member credit:', error);
    return {
      success: false,
      error: 'Failed to deduct member credit',
    };
  }
}

/**
 * Create a new transaction with items
 */
export async function createTransaction(
  request: TransactionRequest
): Promise<{
  success: boolean;
  transaction?: TransactionResponse;
  error?: string;
}> {
  try {
    const transactionId = uuidv4();
    const now = new Date();

    // Validate payment method specific requirements
    if (request.paymentMethod === 'MEMBER_CREDIT') {
      if (!request.paymentData?.memberCredit) {
        return {
          success: false,
          error: 'Member credit payment data is required',
        };
      }

      // Validate member has sufficient credit
      const validation = await validateMemberCredit(
        request.paymentData.memberCredit.memberId,
        request.paymentData.memberCredit.usedCredit
      );

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }
    }

    // Calculate total
    const totalAmount = request.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    // Start transaction
    await db.query('BEGIN');

    try {
      // Create transaction record
      const txnResult = await db.query(
        `INSERT INTO transactions 
         (id, store_id, kasir_id, transaction_date, total_amount, payment_method, status, notes, created_at, updated_at, is_edited, version)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          transactionId,
          request.storeId,
          request.kasirId,
          now,
          totalAmount.toString(),
          request.paymentMethod,
          'COMPLETED',
          request.notes || null,
          now,
          now,
          false,
          1,
        ]
      );

      const transaction: any = txnResult.rows[0];

      // Create transaction items
      const itemsResult: any[] = [];
      for (const item of request.items) {
        const itemId = uuidv4();
        const itemResult = await db.query(
          `INSERT INTO transaction_items 
           (id, transaction_id, product_id, quantity, unit_price, total_price, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            itemId,
            transactionId,
            item.productId,
            item.quantity,
            item.unitPrice.toString(),
            item.totalPrice.toString(),
            now,
          ]
        );
        itemsResult.push(itemResult.rows[0]);

        // Deduct inventory
        await db.query(
          'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2 AND store_id = $3',
          [item.quantity, item.productId, request.storeId]
        );
      }

      // Handle payment-specific logic
      if (request.paymentMethod === 'MEMBER_CREDIT') {
        const creditData = request.paymentData!.memberCredit!;
        const deductResult = await deductMemberCredit(
          creditData.memberId,
          creditData.usedCredit
        );

        if (!deductResult.success) {
          await db.query('ROLLBACK');
          return {
            success: false,
            error: deductResult.error,
          };
        }
      } else if (request.paymentMethod === 'TEMPO') {
        const tempoData = request.paymentData!.tempo!;
        const piutangId = uuidv4();
        const dueDate = tempoData.dueDate;

        // Create piutang record
        await db.query(
          `INSERT INTO piutang 
           (id, transaction_id, member_id, amount, remaining_balance, due_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            piutangId,
            transactionId,
            null, // For tempo with non-member customer, member_id is null
            totalAmount.toString(),
            totalAmount.toString(),
            dueDate,
            'OPEN',
            now,
            now,
          ]
        );
      }

      await db.query('COMMIT');

      // Map response
      const response: TransactionResponse = {
        id: transaction.id,
        storeId: transaction.store_id,
        kasirId: transaction.kasir_id,
        transactionDate: transaction.transaction_date,
        totalAmount: Number(transaction.total_amount),
        paymentMethod: transaction.payment_method,
        status: 'COMPLETED',
        notes: transaction.notes,
        items: itemsResult.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          totalPrice: Number(item.total_price),
        })),
      };

      return {
        success: true,
        transaction: response,
      };
    } catch (innerError) {
      await db.query('ROLLBACK');
      throw innerError;
    }
  } catch (error) {
    logger.error('Error creating transaction:', error);
    return {
      success: false,
      error: 'Failed to create transaction',
    };
  }
}
