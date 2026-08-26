/**
 * useTransaction hook
 * Provides transaction submission and management functionality
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useCart } from './useCart';
import { CartItem } from '@/stores/cart.store';

export type PaymentMethod = 'CASH' | 'MEMBER_CREDIT' | 'TEMPO';

export interface PaymentData {
  method: PaymentMethod;
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
}

export interface TransactionSubmissionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  receipt?: string;
}

export interface UseTransactionReturn {
  submitTransaction: (
    storeId: string,
    paymentData: PaymentData,
    notes?: string
  ) => Promise<TransactionSubmissionResult>;
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook to submit transactions with payment processing
 * Handles cart items, payment validation, and backend submission
 */
export function useTransaction(): UseTransactionReturn {
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitTransaction = useCallback(
    async (
      storeId: string,
      paymentData: PaymentData,
      notes?: string
    ): Promise<TransactionSubmissionResult> => {
      try {
        setIsSubmitting(true);
        setError(null);

        // Validate cart is not empty
        if (!items || items.length === 0) {
          throw new Error('Cart is empty. Add items before submitting.');
        }

        // Validate user is authenticated
        if (!user?.id) {
          throw new Error('User not authenticated');
        }

        // Map cart items to transaction items
        const transactionItems = items.map((item: CartItem) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.sellingPrice,
          totalPrice: item.subtotal,
        }));

        // Prepare transaction payload
        const payload = {
          storeId,
          items: transactionItems,
          paymentMethod: paymentData.method,
          paymentData,
          notes,
        };

        // Submit to backend
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit transaction');
        }

        const transaction = await response.json();

        // Clear cart on success
        clearCart();

        return {
          success: true,
          transactionId: transaction.id,
          receipt: transaction.receipt,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to submit transaction';
        setError(errorMsg);

        return {
          success: false,
          error: errorMsg,
        };
      } finally {
        setIsSubmitting(false);
      }
    },
    [items, user, clearCart]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submitTransaction,
    isSubmitting,
    error,
    clearError,
  };
}
