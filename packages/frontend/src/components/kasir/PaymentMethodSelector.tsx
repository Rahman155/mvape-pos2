/**
 * Payment Method Selector Component
 * Allows cashier to select payment method (Cash, Member Credit, Tempo)
 * Shows appropriate form fields for each method
 * Integrates with cart total and supports dark mode
 */

import React, { useState, useEffect } from 'react';
import { RadioGroup } from '@/components/ui/Radio';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';
import { Member } from '@/types';

/**
 * Payment method types supported by the system
 */
export type PaymentMethod = 'CASH' | 'MEMBER_CREDIT' | 'TEMPO';

/**
 * Validated payment data returned from selector
 */
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

export interface PaymentMethodSelectorProps {
  cartTotal: number;
  members?: Member[];
  onPaymentSelect: (paymentData: PaymentData) => void;
  onCancel?: () => void;
  isProcessing?: boolean;
  showProceedButton?: boolean;
}

/**
 * Payment method selector with method-specific forms
 */
export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  cartTotal,
  members = [],
  onPaymentSelect,
  onCancel,
  isProcessing = false,
  showProceedButton = true,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('CASH');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [durationDays, setDurationDays] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [searchMemberTerm, setSearchMemberTerm] = useState<string>('');

  // Calculate change for cash payment
  const amountNum = parseFloat(amountReceived) || 0;
  const change = Math.max(amountNum - cartTotal, 0);
  const hasInsufficientCash = amountReceived && amountNum < cartTotal;

  // Get selected member
  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const memberHasSufficientCredit =
    selectedMember && selectedMember.creditBalance >= cartTotal;

  // Filter members based on search
  const filteredMembers = members.filter(
    (member) =>
      member.name.toLowerCase().includes(searchMemberTerm.toLowerCase()) ||
      member.memberNumber.toLowerCase().includes(searchMemberTerm.toLowerCase()) ||
      member.phone?.includes(searchMemberTerm)
  );

  // Calculate due date for tempo
  const calculateDueDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  // Validate and submit payment data
  const handleProceed = () => {
    setError('');

    try {
      let paymentData: PaymentData;

      if (selectedMethod === 'CASH') {
        if (!amountReceived) {
          setError('Amount received is required for cash payment');
          return;
        }
        if (hasInsufficientCash) {
          setError('Amount received is less than cart total');
          return;
        }

        paymentData = {
          method: 'CASH',
          cash: {
            amountReceived: amountNum,
            change,
          },
        };
      } else if (selectedMethod === 'MEMBER_CREDIT') {
        if (!selectedMemberId) {
          setError('Please select a member');
          return;
        }
        if (!memberHasSufficientCredit) {
          setError(
            `Member has insufficient credit balance. Available: Rp ${selectedMember?.creditBalance.toLocaleString('id-ID')} | Required: Rp ${cartTotal.toLocaleString('id-ID')}`
          );
          return;
        }

        paymentData = {
          method: 'MEMBER_CREDIT',
          memberCredit: {
            memberId: selectedMemberId,
            memberName: selectedMember!.name,
            usedCredit: cartTotal,
          },
        };
      } else if (selectedMethod === 'TEMPO') {
        if (!customerName.trim()) {
          setError('Customer name is required for tempo payment');
          return;
        }
        if (!customerPhone.trim()) {
          setError('Customer phone is required for tempo payment');
          return;
        }
        if (!durationDays) {
          setError('Payment duration is required for tempo payment');
          return;
        }

        const days = parseInt(durationDays, 10);
        if (isNaN(days) || days <= 0) {
          setError('Payment duration must be a positive number');
          return;
        }

        paymentData = {
          method: 'TEMPO',
          tempo: {
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            durationDays: days,
            dueDate: calculateDueDate(days),
          },
        };
      } else {
        setError('Invalid payment method selected');
        return;
      }

      onPaymentSelect(paymentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const paymentMethodOptions = [
    { label: 'Tunai (Cash)', value: 'CASH' },
    { label: 'Member Credit', value: 'MEMBER_CREDIT' },
    { label: 'Tempo (Credit)', value: 'TEMPO' },
  ];

  const durationOptions = [
    { label: '3 Hari', value: '3' },
    { label: '7 Hari (1 Minggu)', value: '7' },
    { label: '14 Hari (2 Minggu)', value: '14' },
    { label: '30 Hari (1 Bulan)', value: '30' },
    { label: '60 Hari (2 Bulan)', value: '60' },
    { label: '90 Hari (3 Bulan)', value: '90' },
  ];

  const memberOptions = filteredMembers.map((member) => ({
    label: `${member.name} (${member.memberNumber}) - Saldo: Rp ${member.creditBalance.toLocaleString('id-ID')}`,
    value: member.id,
  }));

  return (
    <div className="w-full space-y-4">
      {/* Cart Total Display */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700">
        <Card.Body className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Subtotal Pembelian:
            </span>
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              Rp {cartTotal.toLocaleString('id-ID')}
            </span>
          </div>
        </Card.Body>
      </Card>

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

      {/* Payment Method Selection */}
      <Card>
        <Card.Body className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Pilih Metode Pembayaran
          </h3>

          <RadioGroup
            name="paymentMethod"
            options={paymentMethodOptions}
            value={selectedMethod}
            onChange={(value) => {
              setSelectedMethod(value as PaymentMethod);
              setError('');
            }}
            groupClassName="space-y-3"
          />
        </Card.Body>
      </Card>

      {/* Cash Payment Form */}
      {selectedMethod === 'CASH' && (
        <Card>
          <Card.Body className="p-6">
            <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Detail Pembayaran Tunai
            </h4>

            <div className="space-y-4">
              <div>
                <label htmlFor="amountReceived" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Jumlah Uang Masuk (Rp) <span className="text-red-500">*</span>
                </label>
                <Input
                  id="amountReceived"
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0"
                  value={amountReceived}
                  onChange={(e) => {
                    setAmountReceived(e.target.value);
                    setError('');
                  }}
                  error={hasInsufficientCash ? 'Amount insufficient' : undefined}
                  className={cn(hasInsufficientCash && 'border-red-500')}
                />
              </div>

              {/* Change Display */}
              {amountReceived && (
                <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Kembalian:
                    </span>
                    <span className={cn(
                      'text-xl font-bold',
                      change > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                    )}>
                      Rp {change.toLocaleString('id-ID')}
                    </span>
                  </div>
                  {change < 0 && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      Kurang: Rp {Math.abs(change).toLocaleString('id-ID')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Member Credit Payment Form */}
      {selectedMethod === 'MEMBER_CREDIT' && (
        <Card>
          <Card.Body className="p-6">
            <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Detail Pembayaran Member
            </h4>

            <div className="space-y-4">
              <div>
                <label htmlFor="memberSearch" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cari Member <span className="text-red-500">*</span>
                </label>
                <Input
                  id="memberSearch"
                  type="text"
                  placeholder="Cari nama, nomor member, atau nomor telepon..."
                  value={searchMemberTerm}
                  onChange={(e) => setSearchMemberTerm(e.target.value)}
                />
              </div>

              {memberOptions.length > 0 ? (
                <div>
                  <label htmlFor="memberSelect" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pilih Member <span className="text-red-500">*</span>
                  </label>
                  <Select
                    id="memberSelect"
                    options={memberOptions}
                    value={selectedMemberId}
                    onChange={(value) => {
                      setSelectedMemberId(value);
                      setError('');
                    }}
                    placeholder="-- Pilih Member --"
                  />
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  Tidak ada member yang cocok dengan pencarian Anda
                </div>
              )}

              {/* Selected Member Credit Info */}
              {selectedMember && (
                <div className={cn(
                  'rounded-lg p-4',
                  memberHasSufficientCredit
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                )}>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Nama Member:
                      </span>
                      <span className="text-gray-900 dark:text-white">{selectedMember.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Nomor Member:
                      </span>
                      <span className="text-gray-900 dark:text-white">{selectedMember.memberNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Saldo Tersedia:
                      </span>
                      <span className={cn(
                        'font-bold',
                        memberHasSufficientCredit
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      )}>
                        Rp {selectedMember.creditBalance.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-300 pt-2 dark:border-gray-600">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Total Pembelian:
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        Rp {cartTotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {!memberHasSufficientCredit && (
                    <div className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">
                      ❌ Saldo member tidak cukup!
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Tempo Payment Form */}
      {selectedMethod === 'TEMPO' && (
        <Card>
          <Card.Body className="p-6">
            <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Detail Pembayaran Tempo
            </h4>

            <div className="space-y-4">
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
                    setError('');
                  }}
                />
              </div>

              <div>
                <label htmlFor="customerPhone" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nomor Telepon Pelanggan <span className="text-red-500">*</span>
                </label>
                <Input
                  id="customerPhone"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    setError('');
                  }}
                />
              </div>

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
                    setError('');
                  }}
                  placeholder="-- Pilih Durasi --"
                />
              </div>

              {/* Due Date Display */}
              {durationDays && (
                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Tanggal Jatuh Tempo:
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {new Date(calculateDueDate(parseInt(durationDays, 10))).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-2 dark:border-blue-700">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Total Piutang:
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        Rp {cartTotal.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Action Buttons */}
      {showProceedButton && (
        <div className="flex gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          {onCancel && (
            <Button
              variant="secondary"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              Batal
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleProceed}
            disabled={isProcessing || !selectedMethod}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </>
            ) : (
              'Lanjutkan ke Konfirmasi'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodSelector;
