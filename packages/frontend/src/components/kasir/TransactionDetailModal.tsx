'use client';

import React, { useState, useEffect } from 'react';
import { Transaction } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ReceiptReprintModal } from './ReceiptReprintModal';

export interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId?: string;
  transaction?: Transaction;
  onEdit?: (transactionId: string) => void;
}

/**
 * Transaction Detail Modal Component
 * Displays complete transaction information in a modal format
 * Requirements: 8.4
 */
export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onEdit,
}) => {
  const [showReprintModal, setShowReprintModal] = useState(false);

  if (!transaction) {
    return null;
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

  const footer = (
    <div className="flex justify-end gap-3">
      <Button
        variant="secondary"
        onClick={() => setShowReprintModal(true)}
        size="sm"
      >
        🖨️ Print Receipt
      </Button>
      <Button
        variant="primary"
        onClick={onClose}
        size="sm"
      >
        Close
      </Button>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Transaction Details"
        size="lg"
        footer={footer}
      >
        {/* Transaction Header Info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Transaction ID */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Transaction ID
            </label>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {transaction.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date & Time
            </label>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatDateTime(new Date(transaction.transactionDate))}
            </p>
          </div>

          {/* Total Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Total Amount
            </label>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(transaction.totalAmount)}
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <span
              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
                transaction.status
              )}`}
            >
              {transaction.status}
            </span>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <span
              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
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
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                ✏️ Edited
              </span>
            </div>
          )}
        </div>

        {/* Transaction Items */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Items
          </h3>

          {transaction.items && transaction.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                      Product
                    </th>
                    <th className="px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                      Qty
                    </th>
                    <th className="px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                      Price
                    </th>
                    <th className="px-2 py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <td className="px-2 py-2 text-gray-900 dark:text-white">
                        {item.productId.slice(0, 8)}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                        {item.quantity}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 py-4">
              No items in this transaction
            </p>
          )}
        </div>

        {/* Payment Information */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Payment Information
          </h3>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Payment Method
              </label>
              <p className="text-gray-900 dark:text-white">
                {getPaymentMethodLabel(transaction.paymentMethod)}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Amount Paid
              </label>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(transaction.totalAmount)}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Created
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {formatDateTime(new Date(transaction.createdAt))}
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Updated
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {formatDateTime(new Date(transaction.updatedAt))}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {transaction.notes && (
          <div className="border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <p className="text-sm text-gray-900 dark:text-white">{transaction.notes}</p>
          </div>
        )}
      </Modal>

      {/* Receipt Reprint Modal */}
      {showReprintModal && (
        <ReceiptReprintModal
          isOpen={showReprintModal}
          onClose={() => setShowReprintModal(false)}
          transaction={transaction}
        />
      )}
    </>
  );
};

export default TransactionDetailModal;
