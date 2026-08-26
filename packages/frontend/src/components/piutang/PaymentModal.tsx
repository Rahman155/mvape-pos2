/**
 * Payment Modal Component (Task 75)
 * Form to record payment for piutang (customer receivable)
 * 
 * Requirements: 18.5, 18.6
 * - Accept partial or full payment
 * - Validate: 0 < amount <= remaining_balance
 * - Record payment with timestamp
 */

'use client';

import { useState } from 'react';

interface PaymentModalProps {
  piutangId: string;
  remainingBalance: number;
  customerName: string;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export default function PaymentModal({
  piutangId,
  remainingBalance,
  customerName,
  onClose,
  onPaymentSuccess,
}: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(value);
  };

  const handlePaymentTypeClick = (type: 'full' | 'half') => {
    if (type === 'full') {
      setAmount(remainingBalance.toString());
    } else if (type === 'half') {
      setAmount((remainingBalance / 2).toString());
    }
  };

  const validatePayment = (): boolean => {
    if (!amount) {
      setError('Jumlah pembayaran harus diisi');
      return false;
    }

    const paymentAmount = parseFloat(amount);

    if (isNaN(paymentAmount)) {
      setError('Jumlah pembayaran harus berupa angka');
      return false;
    }

    if (paymentAmount <= 0) {
      setError('Jumlah pembayaran harus lebih dari 0');
      return false;
    }

    if (paymentAmount > remainingBalance) {
      setError(
        `Jumlah pembayaran tidak boleh melebihi sisa piutang (${formatCurrency(remainingBalance)})`
      );
      return false;
    }

    setError('');
    return true;
  };

  const handlePayment = async () => {
    if (!validatePayment()) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/piutang/${piutangId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Gagal mencatat pembayaran');
      }

      // Success toast could be added here
      onPaymentSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-semibold">Catat Pembayaran</h2>

        <div className="mb-6 rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Pelanggan</p>
          <p className="mt-1 font-medium text-gray-900">{customerName}</p>
          <p className="mt-2 text-sm text-gray-600">Sisa Piutang</p>
          <p className="mt-1 text-lg font-bold text-red-600">
            {formatCurrency(remainingBalance)}
          </p>
        </div>

        {/* Quick Payment Options */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => handlePaymentTypeClick('half')}
            className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100"
          >
            Setengah
          </button>
          <button
            onClick={() => handlePaymentTypeClick('full')}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Lunas
          </button>
        </div>

        {/* Payment Amount Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Jumlah Pembayaran</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setError('');
            }}
            placeholder="Masukkan jumlah pembayaran"
            min="0"
            step="1000"
            className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
          {amount && (
            <p className="mt-2 text-sm text-gray-600">
              = {formatCurrency(parseFloat(amount) || 0)}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handlePayment}
            disabled={loading || !amount}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Catat Pembayaran'}
          </button>
        </div>
      </div>
    </div>
  );
}
