'use client';

/**
 * Store Change History Page (Task 53)
 * Displays the change history for a specific store with timestamps and user information
 */

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/common/Header';
import Sidebar from '@/components/common/Sidebar';
import Button from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import { StoreChangeHistory } from '@/types/store';

export default function StoreHistoryPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const storeId = params.id as string;

  const [history, setHistory] = useState<StoreChangeHistory[]>([]);
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not owner
  useEffect(() => {
    if (user && user.role !== 'OWNER') {
      router.push('/kasir/dashboard');
    }
  }, [user, router]);

  // Fetch store and history
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch store details
        const storeResponse = await apiClient.get(`/api/stores/${storeId}`);
        setStoreName(storeResponse.data.name);

        // Fetch change history
        const historyResponse = await apiClient.get(`/api/stores/${storeId}/change-history`);
        setHistory(historyResponse.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch history';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (storeId) {
      fetchData();
    }
  }, [storeId]);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getChangeType = (type: string) => {
    switch (type) {
      case 'CREATE':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">Created</span>;
      case 'UPDATE':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">Updated</span>;
      case 'DELETE':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">Deleted</span>;
      default:
        return <span>{type}</span>;
    }
  };

  if (user?.role !== 'OWNER') {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={`Store History - ${storeName}`} />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Button
                variant="secondary"
                onClick={() => router.back()}
              >
                ← Back
              </Button>
              <h1 className="text-2xl font-bold text-gray-900 mt-4">Change History</h1>
              <p className="text-gray-600 mt-2">Store: <strong>{storeName}</strong></p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-600">Loading history...</p>
              </div>
            )}

            {/* History Timeline */}
            {!loading && history.length > 0 && (
              <div className="space-y-4">
                {history.map((change, index) => (
                  <div key={change.id} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                    {/* Timeline dot */}
                    {index < history.length - 1 && (
                      <div className="absolute left-[23px] top-[calc(100%+8px)] w-0.5 h-8 bg-gray-300"></div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {getChangeType(change.changeType)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {change.changeType === 'CREATE' && 'Store Created'}
                            {change.changeType === 'UPDATE' && 'Store Updated'}
                            {change.changeType === 'DELETE' && 'Store Deleted'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            by <strong>{change.changedBy}</strong>
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(change.timestamp).toLocaleString()}
                      </div>
                    </div>

                    {/* Changes Details */}
                    {change.changeType !== 'CREATE' && change.oldValues && change.newValues && (
                      <div className="mt-4 bg-gray-50 rounded p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Changes:</h4>
                        <div className="space-y-3">
                          {Object.entries(change.newValues as Record<string, any>).map(([key, newValue]) => {
                            const oldValue = (change.oldValues as Record<string, any>)?.[key];
                            if (oldValue === newValue) return null;
                            return (
                              <div key={key} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-gray-700 capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <div className="flex items-center gap-2">
                                  {oldValue !== undefined && (
                                    <>
                                      <span className="text-red-600 line-through">
                                        {formatValue(oldValue)}
                                      </span>
                                      <span className="text-gray-400">→</span>
                                    </>
                                  )}
                                  <span className="text-green-600">
                                    {formatValue(newValue)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Creation Details */}
                    {change.changeType === 'CREATE' && change.newValues && (
                      <div className="mt-4 bg-gray-50 rounded p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Initial Values:</h4>
                        <div className="space-y-2">
                          {Object.entries(change.newValues as Record<string, any>).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="font-medium text-gray-700 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              <span className="text-gray-900">
                                {formatValue(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && history.length === 0 && (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600">No change history found for this store.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
