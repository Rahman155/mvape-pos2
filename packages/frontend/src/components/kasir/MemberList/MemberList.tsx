/**
 * Member List Component
 * Reusable component for displaying member list with search and pagination
 *
 * Requirements: 14.1 (Member Management)
 * - Displays member list with name, phone, credit balance
 * - Supports search by name, phone, member number
 * - Supports pagination
 * - Mobile responsive
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Table } from '@/components/ui/Table';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { apiService, getErrorMessage } from '@/lib/api';

export interface Member {
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

export interface MemberListResponse {
  data: Member[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MemberListProps {
  onMemberSelect?: (member: Member) => void;
  showActions?: boolean;
  limit?: number;
  searchPlaceholder?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

/**
 * MemberList Component
 * Displays paginated list of members with search functionality
 */
export const MemberList: React.FC<MemberListProps> = ({
  onMemberSelect,
  showActions = true,
  limit = 20,
  searchPlaceholder = 'Search by name, member number, or phone...',
  emptyStateTitle = 'No members found',
  emptyStateDescription = 'Try adjusting your search criteria',
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  // Fetch members
  const fetchMembers = useCallback(async (pageNum: number, searchQuery: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.members.list({
        page: pageNum,
        limit,
        search: searchQuery,
      });

      const data: MemberListResponse = response.data;
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

  // Handle search
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
  }, []);

  // Debounce search
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
      width: '25%',
    },
    {
      key: 'phone',
      label: 'Phone',
      width: '20%',
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
    ...(showActions
      ? [
          {
            key: 'actions',
            label: 'Actions',
            width: '20%',
            render: (_: any, row: Member) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMemberSelect?.(row)}
              >
                Select
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Search Card */}
      <Card>
        <CardHeader title="Search Members" />
        <CardBody>
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={handleSearch}
            disabled={isLoading}
            className="w-full"
          />
        </CardBody>
      </Card>

      {/* Members Table Card */}
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
          {/* Error Alert */}
          {error && (
            <div className="mb-4">
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
                {emptyStateTitle}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {emptyStateDescription}
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
  );
};

export default MemberList;
