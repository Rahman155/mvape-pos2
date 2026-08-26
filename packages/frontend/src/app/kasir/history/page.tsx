'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiService } from '@/lib/api';
import { Transaction } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { formatCurrency } from '@/lib/utils';
import TransactionHistoryList from '@/components/kasir/TransactionHistoryList';
import PaymentMethodFilter from '@/components/kasir/PaymentMethodFilter';

/**
 * Transaction History Page for Kasir
 * Displays list of all transactions with pagination, filtering, and search
 */
export default function TransactionHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { isOnline } = useOnlineStatus();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch transactions
  const fetchTransactions = useCallback(
    async (currentPage: number, pageSize: number) => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, any> = {
          page: currentPage,
          limit: pageSize,
        };

        if (user?.storeId) {
          params.storeId = user.storeId;
        }

        // Pass payment methods as comma-separated string or single value
        if (paymentMethods.length > 0) {
          params.paymentMethods = paymentMethods.join(',');
        }

        if (startDate) {
          params.startDate = startDate;
        }

        if (endDate) {
          params.endDate = endDate;
        }

        const response = await apiService.transactions.list(params);
        const data = response.data;

        setTransactions(data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.pages || 0);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch transactions');
      } finally {
        setLoading(false);
      }
    },
    [user?.storeId, paymentMethods, startDate, endDate]
  );

  // Initial fetch and refetch on filter/page change
  useEffect(() => {
    fetchTransactions(page, limit);
  }, [fetchTransactions, page, limit]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handlePaymentMethodsChange = (methods: string[]) => {
    setPaymentMethods(methods);
    setPage(1); // Reset to first page when filter changes
  };

  const handleClearPaymentMethods = () => {
    setPaymentMethods([]);
    setPage(1); // Reset to first page when filter changes
  };

  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    setPage(1); // Reset to first page when filter changes
  };

  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    setPage(1); // Reset to first page when filter changes
  };

  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
    setPage(1); // Reset to first page when filter changes
  };

  const handleRefresh = () => {
    setPage(1);
    fetchTransactions(1, limit);
  };

  const handleViewDetails = (transactionId: string) => {
    router.push(`/kasir/history/${transactionId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Transaction History
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage your transactions
            </p>
          </div>
          <Link href="/kasir/dashboard">
            <Button variant="secondary" className="mt-4 md:mt-0">
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {!isOnline && (
          <Alert variant="warning" className="mb-4">
            You are currently offline. Displaying cached transactions.
          </Alert>
        )}

        {/* Filters Card */}
        <Card className="mb-6">
          <div className="p-4 md:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Filters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Range Picker */}
              <div className="md:col-span-2">
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={handleStartDateChange}
                  onEndDateChange={handleEndDateChange}
                  onClear={handleClearDates}
                  label="Transaction Date Range"
                  disabled={loading}
                />
              </div>

              {/* Payment Method Filter */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payment Methods
                </label>
                <PaymentMethodFilter
                  selectedMethods={paymentMethods}
                  onChange={handlePaymentMethodsChange}
                  onClear={handleClearPaymentMethods}
                  disabled={loading}
                  allowMultiple={true}
                  variant="compact"
                />
              </div>

              {/* Refresh Button */}
              <div className="md:col-span-2 flex">
                <Button
                  onClick={handleRefresh}
                  variant="secondary"
                  className="w-full md:w-auto"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Transaction List Component */}
        <TransactionHistoryList
          transactions={transactions}
          loading={loading}
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onViewDetails={handleViewDetails}
        />
      </div>
    </div>
  );
}
