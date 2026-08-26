/**
 * Piutang Detail Page (Task 74)
 * Shows piutang details with transaction history and payment recording
 * 
 * Requirements: 18.4 - Display customer info, transaction history, payment terms, due date, status, remaining balance
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import PaymentModal from '@/components/piutang/PaymentModal';

interface Transaction {
  id: string;
  transactionNumber: string;
  totalAmount: number;
  paymentMethod: string;
  transactionDate: string;
  createdAt: Date;
}

interface PiutangDetail {
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
  transactionHistory: Transaction[];
}

export default function PiutangDetailPage() {
  const params = useParams();
  const piutangId = params.id as string;
  const [piutang, setPiutang] = useState<PiutangDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const fetchPiutang = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/piutang/${piutangId}`);
        if (!response.ok) throw new Error('Failed to fetch piutang');
        const data = await response.json();
        setPiutang(data);
      } catch (error) {
        console.error('Error fetching piutang:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPiutang();
  }, [piutangId]);

  const formatDate = (date: string | null | Date) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-red-100 text-red-800';
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilDue = () => {
    if (!piutang?.dueDate) return null;
    const due = new Date(piutang.dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilDue = getDaysUntilDue();
  const getPaid = () => (piutang ? piutang.amount - piutang.remainingBalance : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!piutang) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Piutang tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Detail Piutang</h1>
        <a
          href="/owner/piutang"
          className="text-blue-600 hover:text-blue-800"
        >
          ← Kembali
        </a>
      </div>

      {/* Customer Information Card */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Informasi Pelanggan</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama</label>
              <p className="mt-1 text-lg font-medium text-gray-900">{piutang.customerName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">No. Member</label>
              <p className="mt-1 text-gray-900">{piutang.customerNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Telepon</label>
              <p className="mt-1 text-gray-900">{piutang.customerPhone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-gray-900">{piutang.customerEmail || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Payment Status Card */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Status Pembayaran</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <div className="mt-2">
                <span className={`inline-block rounded-full px-4 py-2 text-sm font-medium ${getStatusColor(piutang.status)}`}>
                  {piutang.status === 'OPEN'
                    ? 'Belum Dibayar'
                    : piutang.status === 'PARTIAL'
                      ? 'Sebagian Dibayar'
                      : 'Lunas'}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Jatuh Tempo</label>
              <p className="mt-1 text-lg font-medium text-gray-900">{formatDate(piutang.dueDate)}</p>
              {daysUntilDue !== null && (
                <p
                  className={`mt-1 text-sm ${
                    daysUntilDue < 0 ? 'text-red-600 font-semibold' : daysUntilDue <= 7 ? 'text-yellow-600' : 'text-green-600'
                  }`}
                >
                  {daysUntilDue < 0
                    ? `${Math.abs(daysUntilDue)} hari terlambat`
                    : daysUntilDue === 0
                      ? 'Hari ini'
                      : `${daysUntilDue} hari lagi`}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details Card */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Detail Pembayaran</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-600">Jumlah Awal</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{formatCurrency(piutang.amount)}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-600">Sudah Dibayar</p>
            <p className="mt-2 text-xl font-bold text-blue-900">{formatCurrency(getPaid())}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-600">Sisa Piutang</p>
            <p className="mt-2 text-xl font-bold text-red-900">
              {formatCurrency(piutang.remainingBalance)}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-600">Progress</p>
            <p className="mt-2 text-xl font-bold text-green-900">
              {Math.round(((piutang.amount - piutang.remainingBalance) / piutang.amount) * 100)}%
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress Pembayaran</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(piutang.amount - piutang.remainingBalance)} dari {formatCurrency(piutang.amount)}
            </span>
          </div>
          <div className="mt-2 h-4 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${((piutang.amount - piutang.remainingBalance) / piutang.amount) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {piutang.status !== 'CLOSED' && (
        <div className="mb-6">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700"
          >
            Catat Pembayaran
          </button>
        </div>
      )}

      {/* Transaction History */}
      {piutang.transactionHistory && piutang.transactionHistory.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Riwayat Transaksi</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">No. Transaksi</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Tanggal</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Jumlah</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Metode</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {piutang.transactionHistory.map((trans) => (
                  <tr key={trans.id}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {trans.transactionNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {formatDate(trans.transactionDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(trans.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{trans.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          piutangId={piutang.id}
          remainingBalance={piutang.remainingBalance}
          customerName={piutang.customerName}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={() => {
            setShowPaymentModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
