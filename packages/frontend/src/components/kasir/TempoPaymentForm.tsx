/**
 * Tempo Payment Form Component
 * Handles tempo (credit) payment processing with customer information validation
 * Calculates due date based on duration and records payable entry
 * 
 * Validates:
 * - Customer name and phone
 * - Payment duration
 * - Due date calculation
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

export interface TempoPaymentFormProps {
  cartTotal: number;
  onSubmit: (tempoData: TempoPaymentData) => void | Promise<void>;
  onCancel?: () => void;
  isProcessing?: boolean;
}

export interface TempoPaymentData {
  customerName: string;
  customerPhone: string;
  durationDays: number;
  dueDate: string;
  totalAmount: number;
}

/**
 * Tempo Payment Form Component
 * Collects customer information and payment duration for credit purchases
 */
export const TempoPaymentForm: React.FC<TempoPaymentFormProps> = ({
  cartTotal,
  onSubmit,
  onCancel,
  isProcessing = false,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Duration options for tempo payment
  const durationOptions = [
    { label: '3 Hari', value: '3' },
    { label: '7 Hari (1 Minggu)', value: '7' },
    { label: '14 Hari (2 Minggu)', value: '14' },
    { label: '30 Hari (1 Bulan)', value: '30' },
    { label: '60 Hari (2 Bulan)', value: '60' },
    { label: '90 Hari (3 Bulan)', value: '90' },
  ];

  /**
   * Calculate due date based on duration days
   */
  const calculateDueDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  /**
   * Update due date when duration changes
   */
  useEffect(() => {
    if (durationDays) {
      const days = parseInt(durationDays, 10);
      if (!isNaN(days) && days > 0) {
        setDueDate(calculateDueDate(days));
      }
    }
  }, [durationDays]);

  /**
   * Validate customer name
   */
  const validateCustomerName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'Customer name is required';
    }
    if (name.trim().length < 3) {
      return 'Customer name must be at least 3 characters';
    }
    if (name.trim().length > 100) {
      return 'Customer name must not exceed 100 characters';
    }
    return undefined;
  };

  /**
   * Validate customer phone
   */
  const validateCustomerPhone = (phone: string): string | undefined => {
    if (!phone.trim()) {
      return 'Customer phone is required';
    }
    // Basic Indonesian phone validation (08xx or +62x)
    const phoneRegex = /^(\+62|0)[0-9]{9,12}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      return 'Customer phone must be a valid phone number (e.g., 08xxxxxxxxxx or +62xxxxxxxxxx)';
    }
    return undefined;
  };

  /**
   * Validate duration
   */
  const validateDuration = (duration: string): string | undefined => {
    if (!duration) {
      return 'Payment duration is required';
    }
    const days = parseInt(duration, 10);
    if (isNaN(days) || days <= 0) {
      return 'Payment duration must be a positive number';
    }
    return undefined;
  };

  /**
   * Validate all fields and submit
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});

    const errors: Record<string, string> = {};

    // Validate all fields
    const nameError = validateCustomerName(customerName);
    if (nameError) errors.customerName = nameError;

    const phoneError = validateCustomerPhone(customerPhone);
    if (phoneError) errors.customerPhone = phoneError;

    const durationError = validateDuration(durationDays);
    if (durationError) errors.durationDays = durationError;

    // Show validation errors if any
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Please fix the validation errors below');
      return;
    }

    try {
      const tempoData: TempoPaymentData = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        durationDays: parseInt(durationDays, 10),
        dueDate,
        totalAmount: cartTotal,
      };

      await onSubmit(tempoData);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process tempo payment';
      setError(errorMsg);
    }
  };

  /**
   * Format date for display
   */
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {/* Error Alert */}
      {error && (
        <Alert
          type="error"
          title="Kesalahan"
          message={error}
          dismissible
          onDismiss={() => setError('')}
        />
      )}

      {/* Cart Total Display */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700">
        <Card.Body className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Total Pembelian Tempo:
            </span>
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              Rp {cartTotal.toLocaleString('id-ID')}
            </span>
          </div>
        </Card.Body>
      </Card>

      {/* Customer Name Input */}
      <div>
        <label htmlFor="customerName" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Nama Pelanggan <span className="text-red-500">*</span>
        </label>
        <Input
          id="customerName"
          type="text"
          placeholder="Masukkan nama pelanggan"
          value={customerName}
          onChange={(e) => {
            setCustomerName(e.target.value);
            setValidationErrors((prev) => ({ ...prev, customerName: '' }));
          }}
          error={validationErrors.customerName}
          className={cn(
            validationErrors.customerName && 'border-red-500 focus:ring-red-500'
          )}
          disabled={isProcessing}
        />
        {validationErrors.customerName && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.customerName}</p>
        )}
      </div>

      {/* Customer Phone Input */}
      <div>
        <label htmlFor="customerPhone" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Nomor Telepon Pelanggan <span className="text-red-500">*</span>
        </label>
        <Input
          id="customerPhone"
          type="tel"
          placeholder="08xxxxxxxxxx atau +62xxxxxxxxxx"
          value={customerPhone}
          onChange={(e) => {
            setCustomerPhone(e.target.value);
            setValidationErrors((prev) => ({ ...prev, customerPhone: '' }));
          }}
          error={validationErrors.customerPhone}
          className={cn(
            validationErrors.customerPhone && 'border-red-500 focus:ring-red-500'
          )}
          disabled={isProcessing}
        />
        {validationErrors.customerPhone && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.customerPhone}</p>
        )}
      </div>

      {/* Duration Select */}
      <div>
        <label htmlFor="durationSelect" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Durasi Pembayaran <span className="text-red-500">*</span>
        </label>
        <Select
          id="durationSelect"
          options={durationOptions}
          value={durationDays}
          onChange={(value) => {
            setDurationDays(value);
            setValidationErrors((prev) => ({ ...prev, durationDays: '' }));
          }}
          placeholder="-- Pilih Durasi --"
          disabled={isProcessing}
        />
        {validationErrors.durationDays && (
          <p className="mt-1 text-sm text-red-500">{validationErrors.durationDays}</p>
        )}
      </div>

      {/* Due Date Display */}
      {dueDate && (
        <Card className="border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <Card.Body className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tanggal Jatuh Tempo:
                </span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  {formatDisplayDate(dueDate)}
                </span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-2 dark:border-green-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total Piutang:
                </span>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  Rp {cartTotal.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Information Box */}
      <Card className="border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
        <Card.Body className="p-4">
          <h4 className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
            ℹ️ Informasi Pembayaran Tempo
          </h4>
          <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-300">
            <li>• Pelanggan harus membayar sesuai tanggal jatuh tempo</li>
            <li>• Data piutang akan dicatat dalam sistem</li>
            <li>• Reminder akan dikirim sebelum jatuh tempo</li>
            <li>• Verifikasi informasi pelanggan sebelum melanjutkan</li>
          </ul>
        </Card.Body>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Batal
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Memproses Pembayaran...
            </>
          ) : (
            'Proses Pembayaran Tempo'
          )}
        </Button>
      </div>
    </form>
  );
};

export default TempoPaymentForm;
