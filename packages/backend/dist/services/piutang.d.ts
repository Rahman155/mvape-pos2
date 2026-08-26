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
export interface PiutangListFilter {
    status?: string;
    customerName?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    amountMin?: number;
    amountMax?: number;
    sort?: 'due_date' | 'remaining_balance' | 'created_date';
    page?: number;
    limit?: number;
}
export interface PiutangDetail {
    id: string;
    transactionId: string | null;
    memberId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    customerNumber: string;
    amount: number;
    remainingBalance: number;
    dueDate: string | null;
    status: 'OPEN' | 'PARTIAL' | 'CLOSED';
    createdAt: Date;
    updatedAt: Date;
    transactionHistory?: any[];
}
export interface PaymentRecord {
    piutangId: string;
    amount: number;
    previousBalance: number;
    newBalance: number;
    previousStatus: string;
    newStatus: string;
    timestamp: Date;
}
export declare class PiutangService {
    /**
     * Validate payment amount
     */
    static validatePaymentAmount(amount: unknown): {
        valid: boolean;
        error?: string;
    };
    /**
     * Validate payment against remaining balance
     */
    static validatePaymentNotExceeding(amount: number, remainingBalance: number): {
        valid: boolean;
        error?: string;
    };
    /**
     * Calculate new status after payment
     * OPEN -> PARTIAL -> CLOSED
     */
    static calculateNewStatus(currentStatus: string, newRemainingBalance: number, originalAmount: number): 'OPEN' | 'PARTIAL' | 'CLOSED';
    /**
     * Calculate days until due date
     */
    static calculateDaysUntilDue(dueDate: string | Date | null): number | null;
    /**
     * Calculate days overdue
     */
    static calculateDaysOverdue(dueDate: string | Date | null): number | null;
    /**
     * Check if piutang is upcoming (due within 7 days)
     */
    static isUpcoming(dueDate: string | Date | null): boolean;
    /**
     * Check if piutang is overdue
     */
    static isOverdue(dueDate: string | Date | null): boolean;
    /**
     * Format piutang response object
     */
    static formatPiutangResponse(row: any): Omit<PiutangDetail, 'transactionHistory'>;
    /**
     * Build query filters for piutang list
     */
    static buildListFilterQuery(filter: PiutangListFilter): {
        query: string;
        params: any[];
    };
    /**
     * Get sort order clause
     */
    static getSortOrderClause(sort?: string): string;
    /**
     * Record payment and update piutang status
     * Returns updated piutang or null if not found
     */
    static recordPayment(piutangId: string, paymentAmount: number): Promise<PaymentRecord | null>;
    /**
     * Get piutang alerts statistics
     */
    static getAlertsStatistics(): Promise<{
        upcoming: number;
        overdue: number;
        total: number;
    }>;
}
//# sourceMappingURL=piutang.d.ts.map