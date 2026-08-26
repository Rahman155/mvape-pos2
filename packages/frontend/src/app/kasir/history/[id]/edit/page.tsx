'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/lib/api';
import { Transaction, TransactionItem, Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatCurrency, formatDateTime } from '@/lib/utils';

/**
 * Transaction Edit Page
 * Allows editing of transaction details with full validation and history tracking
 * Requirements: 19 (Receipt Editing), 8.5
 */
export default function TransactionEditPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const transactionId = params.id as string;

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [editedItems, setEditedItems] = useState<TransactionItem[]>([]);
  const [editedPaymentMethod, setEditedPaymentMethod] = useState<string>('');
  const [editedNotes, setEditedNotes] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch transaction details
  useEffect(() => {
    const fetchTransaction = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.transactions.get(transactionId);
        setTransaction(response.data);
        setEditedItems(response.data.items || []);
        setEditedPaymentMethod(response.data.paymentMethod);
        setEditedNotes(response.data.notes || '');
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

  // Fetch available products
  useEffect(() => {
    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        const response = await apiService.products.list();
        setAvailableProducts(response.data || []);
      } catch (err: any) {
        console.error('Error fetching products:', err);
        // Continue without products list, user can edit current items
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Track if any changes have been made
  useEffect(() => {
    if (!transaction) return;

    const itemsChanged =
      JSON.stringify(editedItems) !== JSON.stringify(transaction.items);
    const paymentMethodChanged = editedPaymentMethod !== transaction.paymentMethod;
    const notesChanged = editedNotes !== (transaction.notes || '');

    setHasChanges(itemsChanged || paymentMethodChanged || notesChanged);
  }, [editedItems, editedPaymentMethod, editedNotes, transaction]);

  // Recalculate total based on items
  const calculateTotal = (items: TransactionItem[]): number => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const currentTotal = calculateTotal(editedItems);

  // Handle item quantity change
  const handleItemQuantityChange = (index: number, newQuantity: number) => {
    if (newQuantity < 0) return;

    const updatedItems = [...editedItems];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].totalPrice = newQuantity * updatedItems[index].unitPrice;
    setEditedItems(updatedItems);
  };

  // Handle item price change
  const handleItemPriceChange = (index: number, newPrice: number) => {
    if (newPrice < 0) return;

    const updatedItems = [...editedItems];
    updatedItems[index].unitPrice = newPrice;
    updatedItems[index].totalPrice = updatedItems[index].quantity * newPrice;
    setEditedItems(updatedItems);
  };

  // Handle removing an item
  const handleRemoveItem = (index: number) => {
    const updatedItems = editedItems.filter((_, i) => i !== index);
    setEditedItems(updatedItems);
  };

  // Validate edits
  const validateEdits = (): { valid: boolean; message?: string } => {
    if (editedItems.length === 0) {
      return { valid: false, message: 'Transaction must have at least one item' };
    }

    // Check all items have valid quantities and prices
    for (const item of editedItems) {
      if (item.quantity <= 0) {
        return { valid: false, message: 'All items must have quantity > 0' };
      }
      if (item.unitPrice < 0) {
        return { valid: false, message: 'All items must have valid prices' };
      }
    }

    if (!editedPaymentMethod) {
      return { valid: false, message: 'Payment method is required' };
    }

    return { valid: true };
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    const validation = validateEdits();
    if (!validation.valid) {
      setError(validation.message || 'Validation failed');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatePayload = {
        items: editedItems,
        paymentMethod: editedPaymentMethod,
        notes: editedNotes,
      };

      const response = await apiService.transactions.update(transactionId, updatePayload);

      setSuccessMessage('Transaction updated successfully');
      setTransaction(response.data);
      setEditedItems(response.data.items || []);

      // Redirect back to detail view after 2 seconds
      setTimeout(() => {
        router.push(`/kasir/history/${transactionId}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction changes');
      console.error('Error saving transaction:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading transaction...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Edit Transaction
          </h1>
          <Alert variant="error">{error}</Alert>
          <div className="mt-6">
            <Link href="/kasir/history">
              <Button variant="secondary">Back to History</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Edit Transaction
          </h1>
          <Alert variant="error">Transaction not found</Alert>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Transaction
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              ID: {transaction.id.slice(0, 8).toUpperCase()} • Original Total:{' '}
              {formatCurrency(transaction.totalAmount)}
            </p>
          </div>
          <Link href={`/kasir/history/${transactionId}`}>
            <Button variant="secondary" className="mt-4 md:mt-0">
              Cancel
            </Button>
          </Link>
        </div>

        {/* Alerts */}
        {!isOnline && (
          <Alert variant="warning" className="mb-6">
            You are offline. Changes will be saved locally and synced when online.
          </Alert>
        )}

        {error && (
          <Alert variant="error" className="mb-6">
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" className="mb-6">
            {successMessage}
          </Alert>
        )}

        {/* Original Transaction Info */}
        <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Original Transaction Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDateTime(new Date(transaction.transactionDate))}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Created By</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {transaction.kasirId.slice(0, 8)}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Status</p>
                <p className="font-medium text-gray-900 dark:text-white">{transaction.status}</p>
              </div>
              {transaction.isEdited && (
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Previously Edited</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {transaction.editedAt
                      ? formatDateTime(new Date(transaction.editedAt))
                      : 'Yes'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Edit Form */}
        <Card className="mb-6">
          <div className="p-6">
            {/* Transaction Items Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Items
              </h2>

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
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedItems.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-100 dark:border-gray-800 ${
                          index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.productId ? `Product: ${item.productId.slice(0, 8)}` : 'Unknown'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemQuantityChange(index, parseInt(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemPriceChange(index, parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(item.totalPrice)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {editedItems.length === 0 && (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-gray-600 dark:text-gray-400">No items in this transaction</p>
                </div>
              )}

              {/* Totals Summary */}
              <div className="border-t-2 border-gray-200 dark:border-gray-700 mt-4 pt-4 flex justify-end">
                <div className="w-full md:w-72">
                  <div className="flex justify-between py-2 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-600 dark:text-gray-400">Original Total:</span>
                    <span className="font-medium text-gray-900 dark:text-white line-through">
                      {formatCurrency(transaction.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 px-4 font-bold text-lg border-t border-gray-200 dark:border-gray-700 mt-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-gray-900 dark:text-white">New Total:</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatCurrency(currentTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Section */}
            <div className="mb-8 border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Payment Method
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </label>
                <select
                  value={editedPaymentMethod}
                  onChange={(e) => setEditedPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="MEMBER_CREDIT">Member Credit</option>
                  <option value="TEMPO">Tempo (Credit)</option>
                </select>
              </div>
            </div>

            {/* Notes Section */}
            <div className="mb-8 border-t border-gray-200 dark:border-gray-700 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Notes
              </h2>

              <textarea
                value={editedNotes}
                onChange={(e) => setEditedNotes(e.target.value)}
                placeholder="Add any notes or comments..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>
        </Card>

        {/* Change Summary */}
        {hasChanges && (
          <Card className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                ⚠️ Unsaved Changes
              </h2>
              <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                {JSON.stringify(editedItems) !== JSON.stringify(transaction.items) && (
                  <p>• Transaction items have been modified</p>
                )}
                {editedPaymentMethod !== transaction.paymentMethod && (
                  <p>• Payment method has been changed</p>
                )}
                {editedNotes !== (transaction.notes || '') && (
                  <p>• Notes have been modified</p>
                )}
                {currentTotal !== transaction.totalAmount && (
                  <p>
                    • Total has changed from {formatCurrency(transaction.totalAmount)} to{' '}
                    {formatCurrency(currentTotal)}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <Card>
          <div className="p-6 flex flex-col md:flex-row gap-4">
            <button
              onClick={handleSaveChanges}
              disabled={saving || !hasChanges}
              className={`flex-1 px-6 py-3 font-medium rounded-lg transition-colors ${
                saving || !hasChanges
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {saving ? '💾 Saving...' : hasChanges ? '💾 Save Changes' : 'No Changes'}
            </button>

            <Link href={`/kasir/history/${transactionId}`} className="flex-1">
              <button className="w-full px-6 py-3 font-medium bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
            </Link>

            <Link href="/kasir/history" className="flex-1">
              <button className="w-full px-6 py-3 font-medium bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                Back to History
              </button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
