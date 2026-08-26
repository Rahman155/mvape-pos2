'use client';

import React, { useMemo } from 'react';
import { Transaction } from '@/types';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export interface TransactionHistoryListProps {
  transactions: Transaction[];
  loading: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewDetails?: (transactionId: string) => void;
}

/**
 * Transaction History List Component
 * Displays transactions in a table with pagination controls
 * 
 * Features:
 * - Sortable columns (date, amount, payment method)
 * - Pagination with prev/next navigation
 * - Transaction details modal/navigation
 * - Edit indicator for modified transactions
 * - Responsive design for mobile
 */
export default function TransactionHistoryList({
  transactions,
  loading,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onViewDetails,
}: TransactionHistoryListProps) {
  
  // Define table columns
  const columns: TableColumn<Transaction>[] = useMemo(
    () => [
      {
        id: 'id',
        header: 'Transaction ID',
        accessor: (row) => row.id.slice(0, 8).toUpperCase(),
        width: 'w-24',
        hideOnMobile: true,
      },
      {
        id: 'date',
        header: 'Date',
        accessor: (row) => formatDateTime(new Date(row.transactionDate)),
        width: 'w-32',
      },
      {
        id: 'amount',
        header: 'Amount',
        accessor: (row) => formatCurrency(row.totalAmount),
        cell: (value) => (
          <span className="font-semibold text-gray-900 dark:text-white">
            {value}
          </span>
        ),
        width: 'w-28',
      },
      {
        id: 'paymentMethod',
        header: 'Payment Method',
        accessor: (row) => row.paymentMethod,
        cell: (value) => (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              value === 'CASH'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : value === 'MEMBER_CREDIT'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
            }`}
          >
            {value === 'CASH'
              ? 'Cash'
              : value === 'MEMBER_CREDIT'
              ? 'Member'
              : 'Tempo'}
          </span>
        ),
        width: 'w-24',
      },
      {
        id: 'status',
        header: 'Status',
        accessor: (row) => row.status,
        cell: (value) => (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              value === 'COMPLETED'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : value === 'PENDING'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {value}
          </span>
        ),
        width: 'w-24',
        hideOnMobile: true,
      },
      {
        id: 'edited',
        header: 'Modified',
        accessor: (row) => row.isEdited,
        cell: (value) => (
          <span className="text-xs">
            {value ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                ✏️ Edited
              </span>
            ) : (
              <span className="text-gray-500">-</span>
            )}
          </span>
        ),
        width: 'w-24',
        hideOnMobile: true,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (_, row) => (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onViewDetails?.(row.id)}
          >
            View
          </Button>
        ),
        width: 'w-20',
      },
    ],
    [onViewDetails]
  );

  const startIndex = (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total);

  return (
    <div>
      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {startIndex} to {endIndex} of {total} transactions
      </div>

      {/* Table Card */}
      <Card className="mb-6">
        <div className="overflow-x-auto">
          <Table
            columns={columns}
            data={transactions}
            isLoading={loading}
            emptyMessage="No transactions found"
            responsive
            striped
          />
        </div>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || loading}
            >
              ← Previous
            </Button>

            {/* Page number display */}
            <div className="hidden md:flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  // Show first page, last page, current page, and adjacent pages
                  const distance = Math.abs(p - page);
                  return p === 1 || p === totalPages || distance <= 1;
                })
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-2 py-2 text-gray-500">...</span>
                    )}
                    <Button
                      variant={p === page ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => onPageChange(p)}
                      disabled={loading}
                    >
                      {p}
                    </Button>
                  </React.Fragment>
                ))}
            </div>

            <Button
              variant="secondary"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || loading}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
