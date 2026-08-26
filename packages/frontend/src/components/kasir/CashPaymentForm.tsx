/**
 * Cash Payment Form Component
 * Accepts cash amount input and calculates change
 * Provides real-time validation and error handling
 * Supports dark mode and responsive design
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';

/**
 * Validated cash payment data
 */
export interface CashPaymentData {
  amountReceived: number;
  change: number;
  totalAmount: number;
}

export interface CashPaymentFormProps {
  /** Total amount to be paid (cart total) */
  totalAmount: number;
  
  /** Callback when payment is confirmed with valid data */
  onPaymentConfirm: (paymentData: CashPaymentData) => void;
  
  /** Callback to cancel payment */
  onCancel?: () => void;
  
  /** Show loading state */
  isProcessing?: boolean;
  
  /** Custom CSS class name */
  className?: string;
}

/**
 * Cash payment form component
 * Handles amount received input and calculates change in real-time
 * Validates that amount is sufficient and displays error messages
 */
export const CashPaymentForm: React.FC<CashPaymentFormProps> = ({
  totalAmount,
  onPaymentConfirm,
  onCancel,
  isProcessing = false,
  className,
}) => {
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [touched, setTouched] = useState<boolean>(false);

  // Calculate change in real-time
  const amountNum = parseFloat(amountReceived) || 0;
  const change = Math.max(amountNum - totalAmount, 0);
  const hasInsufficientCash = touched && amountReceived && amountNum < totalAmount;
  const isValid = amountNum > 0 && amountNum >= totalAmount;

  // Clear error on input change
  const handleAmountChange = (value: string) => {
    setAmountReceived(value);
    setError('');
  };

  // Mark as touched on blur
  const handleBlur = () => {
    setTouched(true);
  };

  // Handle form submission
  const handleConfirm = () => {
    setError('');

    // Validation
    if (!amountReceived.trim()) {
      setError('Jumlah uang masuk diperlukan');
      setTouched(true);
      return;
    }

    if (isNaN(amountNum)) {
      setError('Jumlah uang harus berupa angka yang valid');
      setTouched(true);
      return;
    }

    if (amountNum <= 0) {
      setError('Jumlah uang harus lebih dari 0');
      setTouched(true);
      return;
    }

    if (amountNum < totalAmount) {
      setError(`Uang tidak cukup. Kurang: ${formatCurrency(totalAmount - amountNum)}`);
      setTouched(true);
      return;
    }

    // Validation passed, submit payment
    onPaymentConfirm({
      amountReceived: amountNum,
      change,
      totalAmount,
    });
  };

  // Allow keyboard shortcut to submit (Enter key)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !isProcessing) {
      handleConfirm();
    }
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      {/* Total Amount Display Card */}
      <Card className="border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 shadow-sm">
        <Card.Body className="p-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Pembelian
            </p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </Card.Body>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert
          type="error"
          title="Kesalahan Validasi"
          message={error}
          dismissible
          onDismiss={() => {
            setError('');
            setTouched(false);
          }}
          icon={
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          }
        />
      )}

      {/* Amount Input Form */}
      <Card className="border-gray-200 dark:border-gray-700">
        <Card.Body className="p-6">
          <div className="space-y-4">
            {/* Input Field */}
            <div>
              <label
                htmlFor="amountReceived"
                className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                Jumlah Uang Masuk (Rp)
                <span className="ml-1 text-red-500">*</span>
              </label>
              <Input
                id="amountReceived"
                type="number"
                inputMode="decimal"
                min="0"
                step="100"
                placeholder="Masukkan jumlah uang yang diterima"
                value={amountReceived}
                onChange={(e) => handleAmountChange(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
                error={hasInsufficientCash ? 'Uang tidak cukup' : undefined}
                className={cn(
                  'text-lg',
                  hasInsufficientCash && 'border-red-500 focus:border-red-500'
                )}
                aria-label="Jumlah uang masuk"
              />
              {touched && !amountReceived && (
                <p className="mt-1 text-sm text-red-500">
                  Wajib diisi
                </p>
              )}
            </div>

            {/* Change Display */}
            {amountReceived && amountNum > 0 && (
              <div
                className={cn(
                  'rounded-lg border-2 p-4 transition-colors',
                  hasInsufficientCash
                    ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                    : 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                )}
              >
                <div className="space-y-3">
                  {/* Uang Masuk */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Uang Masuk:
                    </span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(amountNum)}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-current opacity-20" />

                  {/* Change or Shortage */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {change > 0 || amountNum >= totalAmount ? 'Kembalian:' : 'Kurang:'}
                    </span>
                    <span
                      className={cn(
                        'text-2xl font-bold',
                        change > 0 || amountNum >= totalAmount
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {formatCurrency(
                        change > 0 ? change : Math.abs(totalAmount - amountNum)
                      )}
                    </span>
                  </div>

                  {/* Validation Status */}
                  {hasInsufficientCash && (
                    <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Uang tidak cukup
                    </div>
                  )}

                  {/* Success Status */}
                  {isValid && !hasInsufficientCash && (
                    <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Uang cukup
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Input Helper Text */}
            {!amountReceived && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Masukkan jumlah uang yang diterima dari pelanggan
              </p>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
            aria-label="Batal pembayaran"
          >
            Batal
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={isProcessing || !isValid}
          className="flex-1"
          aria-label="Konfirmasi pembayaran tunai"
        >
          {isProcessing ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Memproses...
            </span>
          ) : (
            'Konfirmasi Pembayaran'
          )}
        </Button>
      </div>

      {/* Responsive Helper for Mobile */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400 md:hidden">
        💡 Tekan Enter untuk konfirmasi cepat
      </p>
    </div>
  );
};

export default CashPaymentForm;
