'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { RequireRole } from '@/components/RequireRole';
import { Card, CardBody, CardHeader, CardMeta } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { apiService, getErrorMessage } from '@/lib/api';
import { BOP } from '@/types';

interface DailyStats {
  totalSales: number;
  transactionCount: number;
  bop: BOP | null;
  date: string;
}

/**
 * Kasir Dashboard Page
 * Displays daily statistics including total sales, transaction count, and BOP info
 * Provides quick access buttons to POS, History, and Member pages
 *
 * Requirements: 6 (Kasir Dashboard)
 * - Displays today's total sales prominently (6.2)
 * - Displays transaction count visible alongside sales (6.3)
 * - Displays BOP information display-only (6.4)
 * - Navigation buttons are accessible and functional (6.5)
 * - Dashboard responsive on mobile devices (2.1-2.5)
 * - Data updates in real-time when viewing (6.6)
 */
const KasirDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch dashboard statistics
  const fetchDailyStats = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.dashboard.kasir({
        date: new Date().toISOString().split('T')[0],
      });

      setStats(response.data.data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch stats on component mount
  useEffect(() => {
    fetchDailyStats();

    // Set up auto-refresh every 30 seconds for real-time updates (Req 6.6)
    const refreshInterval = setInterval(fetchDailyStats, 30000);

    return () => clearInterval(refreshInterval);
  }, [fetchDailyStats]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getFormattedTime = (date: Date | null): string => {
    if (!date) return 'Never';
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <RequireRole requiredRoles={['KASIR', 'OWNER']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Welcome, {user?.username}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last updated:
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {getFormattedTime(lastUpdated)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
          {/* Error Alert */}
          {error && (
            <div className="mb-6">
              <Alert
                variant="error"
                title="Error"
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchDailyStats}
                  >
                    Retry
                  </Button>
                }
              >
                {error}
              </Alert>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !stats ? (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg h-48 animate-pulse" />
              ))}
            </div>
          ) : stats ? (
            <>
              {/* Key Metrics Grid */}
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mb-8">
                {/* Total Sales Card - Req 6.2 */}
                <Card variant="elevated">
                  <CardHeader
                    title="Total Sales Today"
                    description="Cumulative sales amount"
                  />
                  <CardBody>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(stats.totalSales)}
                      </p>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {stats.date}
                      </p>
                    </div>
                  </CardBody>
                </Card>

                {/* Transaction Count Card - Req 6.3 */}
                <Card variant="elevated">
                  <CardHeader
                    title="Transaction Count"
                    description="Number of completed transactions"
                  />
                  <CardBody>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                        {stats.transactionCount}
                      </p>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        transactions completed
                      </p>
                    </div>
                  </CardBody>
                </Card>

                {/* Average Transaction Card */}
                <Card variant="elevated">
                  <CardHeader
                    title="Average Transaction"
                    description="Average sales per transaction"
                  />
                  <CardBody>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                        {formatCurrency(
                          stats.transactionCount > 0
                            ? stats.totalSales / stats.transactionCount
                            : 0
                        )}
                      </p>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        per transaction
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* BOP Information Card - Req 6.4 */}
              {stats.bop && (
                <div className="mb-8">
                  <Card variant="elevated">
                    <CardHeader
                      title="Store BOP (Display Only)"
                      description="Biaya Operasional Penjualan - Operating Expenses"
                    />
                    <CardBody>
                      <div className="space-y-4">
                        <CardMeta
                          label="BOP Name"
                          value={stats.bop.name}
                        />
                        <CardMeta
                          label="Amount"
                          value={formatCurrency(stats.bop.amount)}
                        />
                        {stats.bop.description && (
                          <CardMeta
                            label="Description"
                            value={stats.bop.description}
                          />
                        )}
                        <CardMeta
                          label="Effective From"
                          value={new Date(stats.bop.effectiveFrom).toLocaleDateString(
                            'id-ID'
                          )}
                        />
                        {stats.bop.effectiveTo && (
                          <CardMeta
                            label="Effective Until"
                            value={new Date(stats.bop.effectiveTo).toLocaleDateString(
                              'id-ID'
                            )}
                          />
                        )}
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            ℹ️ BOP information is display-only and cannot be edited from this page.
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </div>
              )}

              {/* Quick Access Buttons - Req 6.5 */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Access
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {/* POS Button */}
                  <Link href="/kasir/pos">
                    <Button
                      variant="primary"
                      fullWidth
                      className="h-14 hover:shadow-lg transition-shadow"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                      Point of Sale
                    </Button>
                  </Link>

                  {/* Transaction History Button */}
                  <Link href="/kasir/history">
                    <Button
                      variant="secondary"
                      fullWidth
                      className="h-14 hover:shadow-lg transition-shadow"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      History
                    </Button>
                  </Link>

                  {/* Members Button */}
                  <Link href="/kasir/members">
                    <Button
                      variant="secondary"
                      fullWidth
                      className="h-14 hover:shadow-lg transition-shadow"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      Members
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Refresh Button */}
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={fetchDailyStats}
                  isLoading={isLoading}
                >
                  {isLoading ? 'Refreshing...' : 'Refresh Data'}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No data available
              </p>
            </div>
          )}
        </div>
      </div>
    </RequireRole>
  );
};

export default KasirDashboardPage;
