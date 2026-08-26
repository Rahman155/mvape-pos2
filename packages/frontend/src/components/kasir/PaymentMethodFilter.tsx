'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface PaymentMethodFilterProps {
  /**
   * Selected payment methods
   * Can be a single value for single selection or array for multiple selection
   */
  selectedMethods: string[];

  /**
   * Callback when filter selection changes
   */
  onChange: (methods: string[]) => void;

  /**
   * Callback to clear all selections
   */
  onClear?: () => void;

  /**
   * Whether component is in loading state
   */
  disabled?: boolean;

  /**
   * Whether to allow multiple selections
   */
  allowMultiple?: boolean;

  /**
   * Show compact or expanded view
   */
  variant?: 'compact' | 'expanded';
}

/**
 * Payment Method Filter Component
 * 
 * Allows filtering transactions by payment method(s).
 * Supports CASH, MEMBER_CREDIT, and TEMPO payment methods.
 * 
 * Implements Requirement 8.3: WHEN kasir memilih filter berdasarkan metode pembayaran,
 * THE POS_System SHALL menampilkan hanya transaksi dengan metode tersebut
 * 
 * @example
 * ```tsx
 * const [methods, setMethods] = useState<string[]>([]);
 * 
 * return (
 *   <PaymentMethodFilter
 *     selectedMethods={methods}
 *     onChange={setMethods}
 *     allowMultiple={true}
 *   />
 * );
 * ```
 */
export default function PaymentMethodFilter({
  selectedMethods = [],
  onChange,
  onClear,
  disabled = false,
  allowMultiple = true,
  variant = 'expanded',
}: PaymentMethodFilterProps) {
  
  const paymentMethods = useMemo(() => [
    { id: 'CASH', label: 'Cash', description: 'Direct cash payment', color: 'bg-blue' },
    { id: 'MEMBER_CREDIT', label: 'Member Credit', description: 'Payment using member balance', color: 'bg-green' },
    { id: 'TEMPO', label: 'Tempo', description: 'Deferred payment (credit terms)', color: 'bg-purple' },
  ], []);

  const handleToggleMethod = (methodId: string) => {
    if (disabled) return;

    if (allowMultiple) {
      // Multiple selection mode
      const newMethods = selectedMethods.includes(methodId)
        ? selectedMethods.filter(m => m !== methodId)
        : [...selectedMethods, methodId];
      onChange(newMethods);
    } else {
      // Single selection mode
      const newMethods = selectedMethods.includes(methodId)
        ? [] // Deselect if already selected
        : [methodId]; // Select this method
      onChange(newMethods);
    }
  };

  const isSelected = (methodId: string) => selectedMethods.includes(methodId);

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap gap-2">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            onClick={() => handleToggleMethod(method.id)}
            disabled={disabled}
            className={`px-3 py-1 text-sm rounded-full font-medium transition-all ${
              isSelected(method.id)
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={method.description}
          >
            {method.label}
          </button>
        ))}
        {selectedMethods.length > 0 && (
          <button
            onClick={onClear}
            disabled={disabled}
            className="px-3 py-1 text-sm rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 transition-all"
          >
            Clear
          </button>
        )}
      </div>
    );
  }

  // Expanded variant - Card with checkboxes
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Payment Methods {selectedMethods.length > 0 && `(${selectedMethods.length})`}
          </h3>
          {selectedMethods.length > 0 && (
            <button
              onClick={onClear}
              disabled={disabled}
              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <label
              key={method.id}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected(method.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                checked={isSelected(method.id)}
                onChange={() => handleToggleMethod(method.id)}
                disabled={disabled}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {method.label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {method.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        {allowMultiple && (
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2">
            {selectedMethods.length === 0
              ? 'Select one or more payment methods to filter'
              : `${selectedMethods.length} method${selectedMethods.length !== 1 ? 's' : ''} selected`}
          </div>
        )}
      </div>
    </Card>
  );
}
