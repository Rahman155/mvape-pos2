/**
 * Stock Opname Quantity Input Form
 * Table-based interface for entering physical quantities
 * Tasks: 69, 70
 */

import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Button } from '../Button';
import { Card } from '../Card';
import { Alert } from '../Alert';

interface OpnameItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  cost_price: number;
  system_quantity: number;
  physical_quantity: number;
  difference: number;
  status: 'MATCH' | 'SHORTAGE' | 'EXCESS';
}

interface QuantityInputFormProps {
  sessionId: string;
  items: OpnameItem[];
  onItemsUpdated: (items: OpnameItem[]) => void;
  loading?: boolean;
}

export const QuantityInputForm: React.FC<QuantityInputFormProps> = ({
  sessionId,
  items: initialItems,
  onItemsUpdated,
  loading = false,
}) => {
  const [items, setItems] = useState<OpnameItem[]>(initialItems);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showExcessWarning, setShowExcessWarning] = useState(false);

  // Handle quantity input change
  const handleQuantityChange = (productId: string, value: string) => {
    const quantity = value === '' ? 0 : parseInt(value, 10);

    // Validate input
    if (isNaN(quantity)) {
      return;
    }

    if (quantity < 0) {
      setError(`Physical quantity cannot be negative`);
      return;
    }

    setError(null);

    const updatedItems = items.map((item) => {
      if (item.product_id === productId) {
        const difference = quantity - item.system_quantity;
        let status: 'MATCH' | 'SHORTAGE' | 'EXCESS' = 'MATCH';

        if (difference < 0) {
          status = 'SHORTAGE';
        } else if (difference > 0) {
          status = 'EXCESS';
          setShowExcessWarning(true);
        }

        return {
          ...item,
          physical_quantity: quantity,
          difference,
          status,
        };
      }
      return item;
    });

    setItems(updatedItems);
  };

  // Submit all items to backend
  const handleSubmitItems = async () => {
    try {
      setUpdatingProductId('all');
      setError(null);

      const itemsToSubmit = items.map((item) => ({
        productId: item.product_id,
        physicalQuantity: item.physical_quantity,
      }));

      const response = await axios.post(
        `/api/stock-opname/${sessionId}/items`,
        { items: itemsToSubmit }
      );

      if (response.data.success) {
        onItemsUpdated(response.data.data.items);
        setError(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update quantities');
      console.error('Error updating quantities:', err);
    } finally {
      setUpdatingProductId(null);
    }
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
    switch (status) {
      case 'MATCH':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'SHORTAGE':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'EXCESS':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return baseClasses;
    }
  };

  // Calculate summary
  const summary = {
    total: items.length,
    match: items.filter((i) => i.status === 'MATCH').length,
    shortage: items.filter((i) => i.status === 'SHORTAGE').length,
    excess: items.filter((i) => i.status === 'EXCESS').length,
  };

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} />}

      {showExcessWarning && (
        <Alert
          type="warning"
          message="Excess quantities detected. You will need to confirm these before completion."
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-center py-4">
            <div className="text-3xl font-bold text-gray-700">{summary.total}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </div>
        </Card>
        <Card>
          <div className="text-center py-4">
            <div className="text-3xl font-bold text-green-700">{summary.match}</div>
            <div className="text-sm text-gray-600">Match</div>
          </div>
        </Card>
        <Card>
          <div className="text-center py-4">
            <div className="text-3xl font-bold text-red-700">{summary.shortage}</div>
            <div className="text-sm text-gray-600">Shortage</div>
          </div>
        </Card>
        <Card>
          <div className="text-center py-4">
            <div className="text-3xl font-bold text-yellow-700">{summary.excess}</div>
            <div className="text-sm text-gray-600">Excess</div>
          </div>
        </Card>
      </div>

      {/* Quantity Input Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">SKU</th>
                <th className="px-6 py-3 text-right text-sm font-semibold">
                  System Qty
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold">
                  Physical Qty
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold">
                  Difference
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.product_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{item.product_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{item.sku}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    {item.system_quantity}
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      min="0"
                      value={item.physical_quantity || ''}
                      onChange={(e) =>
                        handleQuantityChange(item.product_id, e.target.value)
                      }
                      className="w-20 px-3 py-2 border rounded-lg text-right text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                      disabled={loading || updatingProductId !== null}
                    />
                  </td>
                  <td
                    className={`px-6 py-4 text-right text-sm font-semibold ${
                      item.difference < 0
                        ? 'text-red-600'
                        : item.difference > 0
                        ? 'text-yellow-600'
                        : 'text-green-600'
                    }`}
                  >
                    {item.difference > 0 ? '+' : ''}
                    {item.difference}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={getStatusBadge(item.status)}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No items in this opname session
          </div>
        )}
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          onClick={() => window.location.back()}
          disabled={loading || updatingProductId !== null}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmitItems}
          loading={updatingProductId !== null}
          disabled={
            loading ||
            updatingProductId !== null ||
            items.some((i) => i.physical_quantity === 0 && i.system_quantity > 0)
          }
        >
          Save Quantities
        </Button>
      </div>

      {/* Info Text */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800">
        <p>
          <strong>Instructions:</strong> Enter the physical quantity you counted for
          each product. The system will automatically calculate the difference and mark
          items as SHORTAGE, EXCESS, or MATCH.
        </p>
      </div>
    </div>
  );
};

export default QuantityInputForm;
