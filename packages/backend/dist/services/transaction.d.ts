/**
 * Transaction Service
 * Handles transaction creation, validation, and payment processing
 */
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
export declare function validateMemberCredit(memberId: string, requiredAmount: number): Promise<{
    valid: boolean;
    currentBalance?: number;
    error?: string;
}>;
/**
 * Deduct member credit for transaction
 */
export declare function deductMemberCredit(memberId: string, amount: number): Promise<{
    success: boolean;
    error?: string;
    newBalance?: number;
}>;
/**
 * Create a new transaction with items
 */
export declare function createTransaction(request: TransactionRequest): Promise<{
    success: boolean;
    transaction?: TransactionResponse;
    error?: string;
}>;
//# sourceMappingURL=transaction.d.ts.map