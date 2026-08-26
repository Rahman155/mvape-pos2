/**
 * Receipt Reprint Modal Component
 * Displays receipt preview with options to print, export PDF, or copy
 * Shows current receipt details (after any edits have been applied)
 * 
 * Validates: Requirements 19.6 (Receipt Editing - reprint receipt with current details)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, Store, User } from '@/types';
import { generateReceipt, Receipt } from '@/lib/receiptGenerator';
import {
  printReceipt,
  exportReceiptAsPDF,
  previewReceipt,
  copyReceiptToClipboard,
  getPrintCapabilities,
} from '@/lib/receiptPrinting';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export interface ReceiptReprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction;
  store?: Store;
  kasir?: User;
  showEditedIndicator?: boolean;
}

export const ReceiptReprintModal: React.FC<ReceiptReprintModalProps> = ({
  isOpen,
  onClose,
  transaction,
  store,
  kasir,
  showEditedIndicator = true,
}) => {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [printCapabilities, setPrintCapabilities] = useState(getPrintCapabilities());

  // Generate receipt when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setError(null);
      setCopySuccess(false);

      try {
        // Generate receipt with current transaction details (including any edits)
        const generatedReceipt = generateReceipt(transaction, store, kasir);
        setReceipt(generatedReceipt);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate receipt');
      } finally {
        setIsLoading(false);
      }
    }
  }, [isOpen, transaction, store, kasir]);

  const handlePrint = () => {
    if (!receipt) return;

    try {
      printReceipt(receipt, `Receipt-${transaction.id.substring(0, 8)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to print receipt');
    }
  };

  const handlePreview = () => {
    if (!receipt) return;

    try {
      previewReceipt(receipt, `Receipt Preview - ${transaction.id.substring(0, 8)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview receipt');
    }
  };

  const handleExportPDF = () => {
    if (!receipt) return;

    try {
      const fileName = `receipt-${transaction.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}`;
      exportReceiptAsPDF(receipt, fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    }
  };

  const handleCopyToClipboard = async () => {
    if (!receipt) return;

    try {
      await copyReceiptToClipboard(receipt);
      setCopySuccess(true);
      // Reset success message after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy receipt');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receipt Preview & Reprint">
      <div className="space-y-4">
        {/* Edit Status Indicator */}
        {showEditedIndicator && transaction.isEdited && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              ℹ️ This receipt shows the current transaction details (including edits made on{' '}
              {transaction.editedAt ? new Date(transaction.editedAt).toLocaleString() : 'N/A'})
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Copy Success Message */}
        {copySuccess && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-800">✓ Receipt copied to clipboard</p>
          </div>
        )}

        {/* Receipt Preview */}
        {isLoading ? (
          <div className="bg-gray-50 rounded-md p-4 min-h-64 flex items-center justify-center">
            <p className="text-gray-500">Generating receipt...</p>
          </div>
        ) : receipt ? (
          <div className="bg-gray-50 rounded-md p-4 font-mono text-sm overflow-auto max-h-96">
            <pre className="whitespace-pre-wrap text-xs">{receipt.text}</pre>
          </div>
        ) : null}

        {/* Transaction Details Summary */}
        {receipt && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Transaction ID</p>
              <p className="font-semibold">{transaction.id.substring(0, 12)}...</p>
            </div>
            <div>
              <p className="text-gray-600">Date</p>
              <p className="font-semibold">
                {new Date(transaction.transactionDate).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Total Amount</p>
              <p className="font-semibold text-lg">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(transaction.totalAmount)}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Payment Method</p>
              <p className="font-semibold">{transaction.paymentMethod}</p>
            </div>
            {transaction.isEdited && (
              <div className="col-span-2">
                <p className="text-gray-600">Last Edited By</p>
                <p className="font-semibold">{transaction.editedBy || 'Unknown'}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* Print Button */}
          {printCapabilities.canPrint && (
            <Button
              variant="primary"
              size="md"
              onClick={handlePrint}
              disabled={!receipt || isLoading}
              className="flex-1 min-w-32"
            >
              🖨️ Print
            </Button>
          )}

          {/* Preview Button */}
          {printCapabilities.canPreview && (
            <Button
              variant="secondary"
              size="md"
              onClick={handlePreview}
              disabled={!receipt || isLoading}
              className="flex-1 min-w-32"
            >
              👁️ Preview
            </Button>
          )}

          {/* Export PDF Button */}
          {printCapabilities.canExportPDF && (
            <Button
              variant="secondary"
              size="md"
              onClick={handleExportPDF}
              disabled={!receipt || isLoading}
              className="flex-1 min-w-32"
            >
              📄 PDF
            </Button>
          )}

          {/* Copy Button */}
          {printCapabilities.canCopy && (
            <Button
              variant="ghost"
              size="md"
              onClick={handleCopyToClipboard}
              disabled={!receipt || isLoading}
              className="flex-1 min-w-32"
            >
              📋 Copy
            </Button>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            className="flex-1 min-w-32"
          >
            Close
          </Button>
        </div>

        {/* Capabilities Notice */}
        {!printCapabilities.canPrint && !printCapabilities.canExportPDF && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Print functionality is limited in your browser. You can copy the receipt text and print manually.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ReceiptReprintModal;
