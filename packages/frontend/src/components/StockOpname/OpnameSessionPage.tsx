/**
 * Stock Opname Session Page
 * Main interface for conducting stock opname session
 * Tasks: 68-72
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Button } from '../Button';
import { Card } from '../Card';
import { Alert } from '../Alert';
import QuantityInputForm from './QuantityInputForm';
import Link from 'next/link';

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

interface OpnameSessionData {
  session: {
    sessionId: string;
    storeId: string;
    status: 'ONGOING' | 'VERIFIED';
    conductedBy: string;
    verifiedBy?: string;
    opnameDate: string;
    notes?: string;
  };
  summary: {
    totalItems: number;
    matchCount: number;
    shortageCount: number;
    excessCount: number;
  };
  items: OpnameItem[];
}

interface OpnameSessionPageProps {
  sessionId: string;
}

export const OpnameSessionPage: React.FC<OpnameSessionPageProps> = ({
  sessionId,
}) => {
  const [data, setData] = useState<OpnameSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionStep, setCompletionStep] = useState<
    'initial' | 'confirm' | 'completed'
  >('initial');

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/stock-opname/${sessionId}`);

      if (response.data.success) {
        setData(response.data.data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load session');
      console.error('Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOpname = async () => {
    try {
      setIsSubmitting(true);

      // Check if there are excess items
      const excessItems = data?.items.filter((i) => i.status === 'EXCESS') || [];

      if (excessItems.length > 0) {
        if (completionStep === 'initial') {
          setCompletionStep('confirm');
          return;
        }
      }

      // Submit completion
      const response = await axios.post(
        `/api/stock-opname/${sessionId}/complete`,
        {
          confirmExcess: true,
        }
      );

      if (response.data.success) {
        setCompletionStep('completed');
        // Refresh data
        await fetchSessionDetails();
      }
    } catch (err: any) {
      if (err.response?.data?.code === 'EXCESS_ITEMS_DETECTED') {
        setCompletionStep('confirm');
      } else {
        setError(err.response?.data?.error || 'Failed to complete opname');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemsUpdated = (updatedItems: OpnameItem[]) => {
    if (data) {
      const newItems = data.items.map((item) => {
        const updated = updatedItems.find((u) => u.product_id === item.product_id);
        return updated || item;
      });

      setData({
        ...data,
        items: newItems,
        summary: {
          totalItems: newItems.length,
          matchCount: newItems.filter((i) => i.status === 'MATCH').length,
          shortageCount: newItems.filter((i) => i.status === 'SHORTAGE').length,
          excessCount: newItems.filter((i) => i.status === 'EXCESS').length,
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading opname session...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          Session not found
        </div>
      </div>
    );
  }

  const excessItems = data.items.filter((i) => i.status === 'EXCESS');
  const shortageItems = data.items.filter((i) => i.status === 'SHORTAGE');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Stock Opname Session</h1>
          <p className="text-gray-600 mt-1">
            {format(new Date(data.session.opnameDate), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>

        <div className="flex gap-3">
          {data.session.status === 'VERIFIED' && (
            <Link href={`/stock-opname/${sessionId}/report`}>
              <Button variant="secondary">View Report</Button>
            </Link>
          )}
          <Link href="/stock-opname">
            <Button variant="secondary">Back to List</Button>
          </Link>
        </div>
      </div>

      {/* Session Status */}
      <Card>
        <div className="grid grid-cols-2 gap-6 p-6 md:grid-cols-4">
          <div>
            <p className="text-sm text-gray-600">Session ID</p>
            <p className="font-semibold">{data.session.sessionId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                data.session.status === 'ONGOING'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {data.session.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600">Store ID</p>
            <p className="font-semibold">{data.session.storeId}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Items</p>
            <p className="font-semibold">{data.summary.totalItems}</p>
          </div>
        </div>
      </Card>

      {/* Alerts */}
      {error && <Alert type="error" message={error} />}

      {data.session.status === 'VERIFIED' && (
        <Alert
          type="success"
          message="This opname session has been verified and inventory has been updated."
        />
      )}

      {completionStep === 'confirm' && excessItems.length > 0 && (
        <Alert
          type="warning"
          message={`⚠️ ${excessItems.length} excess item(s) detected. Please confirm you want to proceed with these excess quantities.`}
        />
      )}

      {completionStep === 'completed' && (
        <Alert
          type="success"
          message="✓ Stock opname completed successfully. Inventory has been updated."
        />
      )}

      {/* Show Quantity Input Form if Status is ONGOING */}
      {data.session.status === 'ONGOING' && (
        <>
          <QuantityInputForm
            sessionId={sessionId}
            items={data.items}
            onItemsUpdated={handleItemsUpdated}
            loading={isSubmitting}
          />

          {/* Completion Section */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Complete Opname</h3>

              <div className="bg-white p-4 rounded-lg mb-4 space-y-3">
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-semibold">{data.summary.totalItems}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Match:</span>
                  <span className="font-semibold">{data.summary.matchCount}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Shortage:</span>
                  <span className="font-semibold">
                    {data.summary.shortageCount}
                  </span>
                </div>
                <div className="flex justify-between text-yellow-600">
                  <span>Excess:</span>
                  <span className="font-semibold">{data.summary.excessCount}</span>
                </div>
              </div>

              {/* Shortage Items List */}
              {shortageItems.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-semibold text-red-700 mb-2">
                    Shortage Items ({shortageItems.length}):
                  </h4>
                  <ul className="text-sm space-y-1">
                    {shortageItems.slice(0, 5).map((item) => (
                      <li key={item.product_id} className="text-red-700">
                        • {item.product_name}: {Math.abs(item.difference)} short
                      </li>
                    ))}
                    {shortageItems.length > 5 && (
                      <li className="text-red-700">
                        • ... and {shortageItems.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Excess Items List */}
              {excessItems.length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-semibold text-yellow-700 mb-2">
                    Excess Items ({excessItems.length}) - Review Required:
                  </h4>
                  <ul className="text-sm space-y-1">
                    {excessItems.slice(0, 5).map((item) => (
                      <li key={item.product_id} className="text-yellow-700">
                        • {item.product_name}: +{item.difference} extra
                      </li>
                    ))}
                    {excessItems.length > 5 && (
                      <li className="text-yellow-700">
                        • ... and {excessItems.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Completion Button */}
              {completionStep === 'initial' && (
                <Button
                  variant="primary"
                  onClick={handleCompleteOpname}
                  loading={isSubmitting}
                  disabled={
                    isSubmitting ||
                    data.items.some(
                      (i) => i.physical_quantity === 0 && i.system_quantity > 0
                    )
                  }
                  className="w-full"
                >
                  Complete Opname
                </Button>
              )}

              {completionStep === 'confirm' && excessItems.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Proceed with completing the opname? Excess items will be
                    recorded as-is.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => setCompletionStep('initial')}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleCompleteOpname}
                      loading={isSubmitting}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Confirm & Complete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Show Report Link if Status is VERIFIED */}
      {data.session.status === 'VERIFIED' && (
        <Card>
          <div className="p-6 text-center">
            <p className="text-gray-600 mb-4">
              This opname session has been completed and verified.
            </p>
            <Link href={`/stock-opname/${sessionId}/report`}>
              <Button variant="primary">View Detailed Report</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};

export default OpnameSessionPage;
