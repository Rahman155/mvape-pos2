'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RequireRole } from '@/components/RequireRole';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Table } from '@/components/ui/Table';
import { apiService, getErrorMessage } from '@/lib/api';

interface Member {
  id: string;
  memberNumber: string;
  name: string;
  phone: string;
  email?: string;
  creditBalance: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MemberTransaction {
  id: string;
  totalAmount: number;
  paymentMethod: string;
  transactionDate: string;
  status: string;
}

interface MemberDetail {
  member: Member;
  transactions: MemberTransaction[];
}

/**
 * Member Detail Page
 * Displays complete member information and transaction history
 *
 * Requirements: 14.7 (Member Management)
 * - Display member information (name, phone, email, credit balance) (14.7)
 * - Display transaction history (14.7)
 * - Display total amount spent (14.7)
 * - Mobile responsive design (2.1-2.5)
 * - Back navigation (UX best practice)
 */
const MemberDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const memberId = params.memberId as string;

  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionLimit] = useState(10);

  // Fetch member details on mount
  useEffect(() => {
    const fetchMemberDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiService.members.get(memberId);
        const data: MemberDetail = response.data;
        setMemberDetail(data);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        console.error('Failed to fetch member details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (memberId) {
      fetchMemberDetail();
    }
  }, [memberId]);

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Paginate transactions
  const paginatedTransactions = memberDetail
    ? memberDetail.transactions.slice(
        (transactionPage - 1) * transactionLimit,
        transactionPage * transactionLimit
      )
    : [];

  const totalTransactionPages = memberDetail
    ? Math.ceil(memberDetail.transactions.length / transactionLimit)
    : 0;

  // Transaction table columns
  const transactionColumns = [
    {
      key: 'transactionDate',
      label: 'Date',
      width: '25%',
      render: (value: string) => formatDate(value),
    },
    {
      key: 'id',
      label: 'Transaction ID',
      width: '25%',
      render: (value: string) => <span className="font-mono text-sm">{value.slice(0, 8)}...</span>,
    },
    {
      key: 'paymentMethod',
      label: 'Payment Method',
      width: '20%',
      render: (value: string) => (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
          {value}
        </span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Amount',
      width: '20%',
      render: (value: number) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '10%',
      render: (value: string) => (
        <span
          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
            value === 'COMPLETED'
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
        >
          {value}
        </span>
      ),
    },
  ];

  return (
    <RequireRole requiredRoles={['KASIR', 'OWNER']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? 'Loading...' : memberDetail?.member.name || 'Member Details'}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  View member information and transaction history
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back
              </Button>
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
                    onClick={() => setError(null)}
                  >
                    Dismiss
                  </Button>
                }
              >
                {error}
              </Alert>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : memberDetail ? (
            <div className="space-y-6">
              {/* Member Information Section */}
              <Card>
                <CardHeader title="Member Information" />
                <CardBody>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <div className="flex flex-col">
                      <label className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Member Number
                      </label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {memberDetail.member.memberNumber}
                      </p>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Phone Number
                      </label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {memberDetail.member.phone || '-'}
                      </p>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Email
                      </label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {memberDetail.member.email || '-'}
                      </p>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Member Since
                      </label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatDate(memberDetail.member.createdAt).split(',')[0]}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Account Balance Statistics */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          Credit Balance
                        </p>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(memberDetail.member.creditBalance)}
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <svg
                          className="w-8 h-8 text-green-600 dark:text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          Total Spent
                        </p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(memberDetail.member.totalSpent)}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <svg
                          className="w-8 h-8 text-blue-600 dark:text-blue-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042L5.851 9H19a1 1 0 000-2H6.151L6.031 2.969A.998.998 0 006 2H3z" />
                          <path d="M3 14a1 1 0 100 2h1.205l1.374 5.498a1.5 1.5 0 001.451 1.002h9.54a1.5 1.5 0 001.451-1.002l1.374-5.498H19a1 1 0 100-2H3zM16 16a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 16a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        </svg>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Transaction History Section */}
              <Card>
                <CardHeader
                  title="Transaction History"
                  description={`Total: ${memberDetail.transactions.length} transactions`}
                />
                <CardBody>
                  {memberDetail.transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                        No transactions
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        This member has not made any transactions yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Table */}
                      <div className="overflow-x-auto">
                        <Table
                          columns={transactionColumns}
                          data={paginatedTransactions}
                          pageable={true}
                          pagination={{
                            currentPage: transactionPage,
                            totalPages: totalTransactionPages,
                            totalItems: memberDetail.transactions.length,
                            itemsPerPage: transactionLimit,
                            onPageChange: setTransactionPage,
                          }}
                        />
                      </div>

                      {/* Summary Line */}
                      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Subtotal ({memberDetail.transactions.length} transactions):
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(
                            memberDetail.transactions.reduce(
                              (sum, txn) => sum + txn.totalAmount,
                              0
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                Member not found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                The requested member could not be found
              </p>
            </div>
          )}
        </div>
      </div>
    </RequireRole>
  );
};

export default MemberDetailPage;
