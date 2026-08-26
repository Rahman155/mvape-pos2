'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { RequireRole } from '@/components/RequireRole';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
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

interface ListResponse {
  data: Member[];
  total: number;
  page: number;
  limit: number;
  pages: number;
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
 * Kasir Member List Page
 * Displays all members with pagination and search functionality
 *
 * Requirements: 14.1 (Member Management)
 * - Displays member list with name, phone, credit balance (14.1.1)
 * - Supports pagination (14.1)
 * - Supports search by name and phone (14.1)
 * - Mobile responsive design (2.1-2.5)
 * - Loading and error states (27)
 */
const MemberListPage: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  // Fetch members list
  const fetchMembers = useCallback(async (pageNum: number, searchQuery: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.members.list({
        page: pageNum,
        limit,
        search: searchQuery,
      });

      const data: ListResponse = response.data;
      setMembers(data.data);
      setTotal(data.total);
      setPages(data.pages);
      setPage(pageNum);
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Failed to fetch members:', err);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    fetchMembers(1, search);
  }, []);

  // Handle search with debounce
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers(1, search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, fetchMembers]);



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
    });
  };

  // Table columns
  const columns = [
    {
      key: 'memberNumber',
      label: 'Member Number',
      width: '15%',
      className: 'font-medium',
    },
    {
      key: 'name',
      label: 'Name',
      width: '20%',
    },
    {
      key: 'phone',
      label: 'Phone',
      width: '18%',
      render: (value: string) => value || '-',
    },
    {
      key: 'creditBalance',
      label: 'Credit Balance',
      width: '20%',
      render: (value: number) => (
        <span className="font-medium text-green-600 dark:text-green-400">
          {formatCurrency(value)}
        </span>
      ),
    },
    {
      key: 'totalSpent',
      label: 'Total Spent',
      width: '15%',
      render: (value: number) => formatCurrency(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '12%',
      render: (_: any, row: Member) => (
        <Link href={`/kasir/members/${row.id}`}>
          <Button variant="outline" size="sm">
            View
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <RequireRole roles={['KASIR', 'OWNER']}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Members
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View and manage customer members
            </p>
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

          {/* Search and Controls */}
          <Card className="mb-6">
            <CardHeader title="Search Members" />
            <CardBody>
              <div className="flex gap-4 flex-col sm:flex-row">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Search by name, member number, or phone..."
                    value={search}
                    onChange={handleSearch}
                    disabled={isLoading}
                    className="w-full"
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Members Table */}
          <Card>
            <CardHeader
              title={`Members List (${total} total)`}
              description={
                total === 0
                  ? 'No members found'
                  : `Showing ${(page - 1) * limit + 1} to ${Math.min(
                      page * limit,
                      total
                    )} of ${total}`
              }
            />
            <CardBody>
              {/* Empty State */}
              {!isLoading && members.length === 0 ? (
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
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No members found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {search ? 'Try adjusting your search criteria' : 'No members yet'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Loading State */}
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* Table */}
                      <div className="overflow-x-auto">
                        <Table
                          columns={columns}
                          data={members}
                          pageable={true}
                          pagination={{
                            currentPage: page,
                            totalPages: pages,
                            totalItems: total,
                            itemsPerPage: limit,
                            onPageChange: (newPage) => fetchMembers(newPage, search),
                          }}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </RequireRole>
  );
};

export default MemberListPage;
