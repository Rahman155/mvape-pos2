/**
 * Shopping Cart Component
 * Displays cart items, allows quantity adjustment and item removal
 * Shows cart total and empty state message
 */

'use client';

import React, { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export interface CartProps {
  /**
   * Called when user wishes to proceed with checkout
   */
  onCheckout?: () => void;

  /**
   * CSS class for styling
   */
  className?: string;

  /**
   * Whether to show the checkout button
   */
  showCheckoutButton?: boolean;
}

/**
 * Cart component displays shopping cart items and summary
 * Supports quantity adjustment, item removal, and checkout
 */
export default function Cart({
  onCheckout,
  className = '',
  showCheckoutButton = true,
}: CartProps) {
  const { items, total, itemCount, removeItem, updateItem, clearCart, isEmpty } = useCart();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string>('');

  /**
   * Handle quantity input change
   */
  const handleQuantityChange = (quantity: string) => {
    setEditingQuantity(quantity);
  };

  /**
   * Save updated quantity
   */
  const handleSaveQuantity = (productId: string) => {
    const quantity = parseInt(editingQuantity, 10);
    if (isNaN(quantity) || quantity < 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (quantity === 0) {
      removeItem(productId);
    } else {
      updateItem(productId, quantity);
    }

    setEditingItemId(null);
    setEditingQuantity('');
  };

  /**
   * Start editing quantity for an item
   */
  const handleEditQuantity = (productId: string, currentQuantity: number) => {
    setEditingItemId(productId);
    setEditingQuantity(currentQuantity.toString());
  };

  /**
   * Cancel editing
   */
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingQuantity('');
  };

  /**
   * Format currency
   */
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <Card.Header
        title={`Cart (${itemCount})`}
        action={
          !isEmpty && (
            <button
              onClick={clearCart}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
              aria-label="Clear cart"
            >
              Clear
            </button>
          )
        }
      />

      {/* Content */}
      <Card.Body className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="text-4xl mb-3">🛒</div>
            <p className="text-gray-500 font-medium">Cart is empty</p>
            <p className="text-sm text-gray-400 mt-1">Add products to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.productId}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {/* Item Header */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {item.productName}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.sku}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-red-600 hover:text-red-700 font-bold text-lg ml-2"
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </div>

                {/* Item Details */}
                <div className="space-y-2">
                  {/* Price */}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Price:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.sellingPrice)}
                    </span>
                  </div>

                  {/* Quantity */}
                  {editingItemId === item.productId ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={editingQuantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        min="1"
                        className="w-16 py-1 px-2 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveQuantity(item.productId)}
                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-xs bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Qty:</span>
                      <button
                        onClick={() => handleEditQuantity(item.productId, item.quantity)}
                        className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {item.quantity}
                      </button>
                    </div>
                  )}

                  {/* Subtotal */}
                  <div className="flex justify-between text-xs font-semibold bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-300">Subtotal:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card.Body>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 space-y-3">
        {/* Total */}
        {!isEmpty && (
          <div className="flex justify-between items-center text-lg font-bold bg-blue-50 dark:bg-blue-900 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <span className="text-gray-900 dark:text-white">Total:</span>
            <span className="text-blue-600 dark:text-blue-400">{formatCurrency(total)}</span>
          </div>
        )}

        {/* Actions */}
        {showCheckoutButton && !isEmpty && (
          <Button
            onClick={onCheckout}
            variant="primary"
            className="w-full"
            disabled={isEmpty}
          >
            Proceed to Checkout
          </Button>
        )}

        {isEmpty && showCheckoutButton && (
          <Button variant="secondary" disabled className="w-full">
            Cart Empty
          </Button>
        )}
      </div>
    </Card>
  );
}
