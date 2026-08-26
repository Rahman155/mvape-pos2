/**
 * Piutang Service
 * Business logic for customer receivable (piutang) management
 *
 * Handles:
 * - Piutang list retrieval with filtering
 * - Status management and transitions
 * - Payment recording and balance updates
 * - Alert calculations (upcoming/overdue)
 */
import { db } from '../database/connection.js';
import { logger } from '../utils/logger.js';
export class PiutangService {
    /**
     * Validate payment amount
     */
    static validatePaymentAmount(amount) {
        if (amount === undefined || amount === null) {
            return { valid: false, error: 'Payment amount is required' };
        }
        if (typeof amount !== 'number') {
            return { valid: false, error: 'Payment amount must be a number' };
        }
        if (amount <= 0) {
            return { valid: false, error: 'Payment amount must be positive' };
        }
        if (!Number.isFinite(amount)) {
            return { valid: false, error: 'Payment amount must be finite' };
        }
        return { valid: true };
    }
    /**
     * Validate payment against remaining balance
     */
    static validatePaymentNotExceeding(amount, remainingBalance) {
        if (amount > remainingBalance) {
            return {
                valid: false,
                error: `Payment amount ${amount} exceeds remaining balance ${remainingBalance}`,
            };
        }
        return { valid: true };
    }
    /**
     * Calculate new status after payment
     * OPEN -> PARTIAL -> CLOSED
     */
    static calculateNewStatus(currentStatus, newRemainingBalance, originalAmount) {
        if (newRemainingBalance === 0) {
            return 'CLOSED';
        }
        if (currentStatus === 'OPEN' && newRemainingBalance > 0) {
            return 'PARTIAL';
        }
        // Keep current status if PARTIAL and balance remains
        return currentStatus;
    }
    /**
     * Calculate days until due date
     */
    static calculateDaysUntilDue(dueDate) {
        if (!dueDate)
            return null;
        const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
        const today = new Date();
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    /**
     * Calculate days overdue
     */
    static calculateDaysOverdue(dueDate) {
        if (!dueDate)
            return null;
        const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
        const today = new Date();
        const diffTime = today.getTime() - due.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : null;
    }
    /**
     * Check if piutang is upcoming (due within 7 days)
     */
    static isUpcoming(dueDate) {
        if (!dueDate)
            return false;
        const daysUntilDue = this.calculateDaysUntilDue(dueDate);
        if (daysUntilDue === null)
            return false;
        return daysUntilDue >= 0 && daysUntilDue <= 7;
    }
    /**
     * Check if piutang is overdue
     */
    static isOverdue(dueDate) {
        if (!dueDate)
            return false;
        const daysUntilDue = this.calculateDaysUntilDue(dueDate);
        if (daysUntilDue === null)
            return false;
        return daysUntilDue < 0;
    }
    /**
     * Format piutang response object
     */
    static formatPiutangResponse(row) {
        return {
            id: row.id,
            transactionId: row.transaction_id,
            memberId: row.member_id,
            customerName: row.customer_name,
            customerPhone: row.customer_phone,
            customerEmail: row.customer_email,
            customerNumber: row.customer_number,
            amount: Number(row.amount),
            remainingBalance: Number(row.remaining_balance),
            dueDate: row.due_date,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    /**
     * Build query filters for piutang list
     */
    static buildListFilterQuery(filter) {
        let query = `
      SELECT COUNT(*) FROM piutang p
      LEFT JOIN members m ON p.member_id = m.id
      WHERE p.member_id IS NOT NULL
    `;
        const params = [];
        if (filter.status) {
            query += ` AND p.status = $${params.length + 1}`;
            params.push(filter.status);
        }
        if (filter.customerName) {
            query += ` AND m.name ILIKE $${params.length + 1}`;
            params.push(`%${filter.customerName}%`);
        }
        if (filter.dueDateFrom) {
            query += ` AND p.due_date >= $${params.length + 1}`;
            params.push(filter.dueDateFrom);
        }
        if (filter.dueDateTo) {
            query += ` AND p.due_date <= $${params.length + 1}`;
            params.push(filter.dueDateTo);
        }
        if (filter.amountMin !== undefined) {
            query += ` AND p.remaining_balance >= $${params.length + 1}`;
            params.push(filter.amountMin);
        }
        if (filter.amountMax !== undefined) {
            query += ` AND p.remaining_balance <= $${params.length + 1}`;
            params.push(filter.amountMax);
        }
        return { query, params };
    }
    /**
     * Get sort order clause
     */
    static getSortOrderClause(sort) {
        switch (sort) {
            case 'remaining_balance':
                return 'p.remaining_balance DESC';
            case 'created_date':
                return 'p.created_at DESC';
            case 'due_date':
            default:
                return 'p.due_date ASC';
        }
    }
    /**
     * Record payment and update piutang status
     * Returns updated piutang or null if not found
     */
    static async recordPayment(piutangId, paymentAmount) {
        try {
            // Fetch current piutang
            const result = await db.query(`SELECT id, amount, remaining_balance, status FROM piutang WHERE id = $1`, [piutangId]);
            if (result.rows.length === 0) {
                return null;
            }
            const piutang = result.rows[0];
            const previousBalance = Number(piutang.remaining_balance);
            const newBalance = previousBalance - paymentAmount;
            const previousStatus = piutang.status;
            // Calculate new status
            const newStatus = this.calculateNewStatus(previousStatus, newBalance, Number(piutang.amount));
            // Update piutang
            const now = new Date();
            await db.query(`UPDATE piutang SET remaining_balance = $1, status = $2, updated_at = $3 WHERE id = $4`, [newBalance, newStatus, now, piutangId]);
            logger.info('Payment recorded successfully via service', {
                piutangId,
                paymentAmount,
                previousBalance,
                newBalance,
                statusChange: `${previousStatus} -> ${newStatus}`,
            });
            return {
                piutangId,
                amount: paymentAmount,
                previousBalance,
                newBalance,
                previousStatus,
                newStatus,
                timestamp: now,
            };
        }
        catch (error) {
            logger.error('Error recording payment in service', error, {
                piutangId,
                paymentAmount,
            });
            throw error;
        }
    }
    /**
     * Get piutang alerts statistics
     */
    static async getAlertsStatistics() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
            const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];
            // Upcoming count
            const upcomingResult = await db.query(`SELECT COUNT(*) FROM piutang 
         WHERE status IN ('OPEN', 'PARTIAL')
         AND member_id IS NOT NULL
         AND due_date >= $1 AND due_date <= $2`, [today, sevenDaysStr]);
            // Overdue count
            const overdueResult = await db.query(`SELECT COUNT(*) FROM piutang 
         WHERE status IN ('OPEN', 'PARTIAL')
         AND member_id IS NOT NULL
         AND due_date < $1`, [today]);
            // Total count
            const totalResult = await db.query(`SELECT COUNT(*) FROM piutang 
         WHERE status IN ('OPEN', 'PARTIAL')
         AND member_id IS NOT NULL`);
            return {
                upcoming: Number(upcomingResult.rows[0].count),
                overdue: Number(overdueResult.rows[0].count),
                total: Number(totalResult.rows[0].count),
            };
        }
        catch (error) {
            logger.error('Error getting alerts statistics', error);
            throw error;
        }
    }
}
//# sourceMappingURL=piutang.js.map