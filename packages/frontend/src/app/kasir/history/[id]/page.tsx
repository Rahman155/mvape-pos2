'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/lib/api';
import { Transaction } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ReceiptReprintModal } from '@/components/kasir/ReceiptReprintModal';

/**
 * Transaction Detail Page
 * Displays complete transaction information, items, and payment details
 * Requirements: 8.4
 */
export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const transactionId = params.id as string;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReprintModal, setShowReprintModal] = useState(false);

  // Fetch transaction details
  useEffect(() => {
    const fetchTransaction = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.transactions.get(transactionId);
        setTransaction(response.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch transaction details');
        console.error('Error fetching transaction:', err);
      } finally {
        setLoading(false);
      }
    };

    if (transactionId) {
      fetchTransaction();
    }
  }, [transactionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading transaction details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Transaction Details
            </h1>
            <Link href="/kasir/history">
              <Button variant="secondary" className="mt-4 md:mt-0">
                Back to History
              </Button>
            </Link>
          </div>

          <Alert variant="error">
            {error || 'Transaction not found'}
          </Alert>

          <div className="mt-6">
            <Link href="/kasir/history">
              <Button variant="secondary">Back to History</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: 'Cash',
      MEMBER_CREDIT: 'Member Credit',
      TEMPO: 'Tempo (Credit)',
    };
    return labels[method] || method;
  };

  const getStatusBadgeColor = (status: string) => {
    const colors: Record<string, string> = {
      COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Transaction Details
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Transaction ID: {transaction.id}
            </p>
          </div>
          <Link href="/kasir/history">
            <Button variant="secondary" className="mt-4 md:mt-0">
              Back to History
            </Button>
          </Link>
        </div>

        {/* Offline Alert */}
        {!isOnline && (
          <Alert variant="warning" className="mb-6">
            You are currently offline. Displaying cached transaction data.
          </Alert>
        )}

        {/* Transaction Header Info Card */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Transaction ID and Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction ID
                </label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {transaction.id.slice(0, 8).toUpperCase()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date & Time
                </label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatDateTime(new Date(transaction.transactionDate))}
                </p>
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Amount
                </label>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(transaction.totalAmount)}
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                    transaction.status
                  )}`}
                >
                  {transaction.status}
                </span>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    transaction.paymentMethod === 'CASH'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : transaction.paymentMethod === 'MEMBER_CREDIT'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  }`}
                >
                  {getPaymentMethodLabel(transaction.paymentMethod)}
                </span>
              </div>

              {/* Modified Status */}
              {transaction.isEdited && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Modification
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    <p className="font-medium">✏️ Edited</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs">
                      {transaction.editedAt
                        ? formatDateTime(new Date(transaction.editedAt))
                        : 'Modified'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {transaction.notes && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <p className="text-gray-900 dark:text-white">{transaction.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Transaction Items Card */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Items
            </h2>

            {transaction.items && transaction.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Product
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transaction.items.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-100 dark:border-gray-800 ${
                          index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.productId ? `Product: ${item.productId.slice(0, 8)}` : 'Unknown Product'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary Row */}
                <div className="border-t-2 border-gray-200 dark:border-gray-700 mt-4 pt-4 flex justify-end">
                  <div className="w-full md:w-64">
                    <div className="flex justify-between py-2 px-4">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency(transaction.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 px-4 font-bold text-lg border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-900 dark:text-white">Total:</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        {formatCurrency(transaction.totalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">No items in this transaction</p>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Information Card */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Payment Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Method Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </label>
                <p className="text-base text-gray-900 dark:text-white">
                  {getPaymentMethodLabel(transaction.paymentMethod)}
                </p>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount Paid
                </label>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(transaction.totalAmount)}
                </p>
              </div>

              {/* Created Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Created At
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatDateTime(new Date(transaction.createdAt))}
                </p>
              </div>

              {/* Updated Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Updated
                </label>
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatDateTime(new Date(transaction.updatedAt))}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <Card className="mb-6">
          <div className="p-6 flex flex-col md:flex-row gap-4">
            <Button
              variant="primary"
              onClick={() => setShowReprintModal(true)}
              className="flex-1"
            >
              🖨️ Print Receipt
            </Button>

            <Link href={`/kasir/history/${transaction.id}/edit`} className="flex-1">
              <Button variant="primary" className="w-full">
                ✏️ Edit Transaction
              </Button>
            </Link>

            <Link href="/kasir/history" className="flex-1">
              <Button variant="secondary" className="w-full">
                Back to History
              </Button>
            </Link>
          </div>
        </Card>

        {/* Receipt Reprint Modal */}
        {transaction && (
          <ReceiptReprintModal
            isOpen={showReprintModal}
            onClose={() => setShowReprintModal(false)}
            transaction={transaction}
          />
        )}
      </div>
    </div>
  );
}
