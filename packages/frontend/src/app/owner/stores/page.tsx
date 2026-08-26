'use client';

/**
 * Store Management Page (Task 51-53)
 * Displays store list with pagination, filtering, creation, and editing
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Sidebar from '@/components/common/Sidebar';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import StoreModal from '@/components/owner/StoreModal';
import { Store } from '@/types/store';
import './stores.css';

export default function StoresPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Redirect if not owner
  useEffect(() => {
    if (user && user.role !== 'OWNER') {
      router.push('/kasir/dashboard');
    }
  }, [user, router]);

  // Fetch stores
  const fetchStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/stores', {
        params: {
          page,
          limit,
          search,
          status,
        },
      });
      setStores(response.data.data);
      setTotal(response.data.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stores';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [page, limit, search, status]);

  const handleCreateClick = () => {
    setSelectedStore(null);
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditClick = (store: Store) => {
    setSelectedStore(store);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleViewHistory = (store: Store) => {
    router.push(`/owner/stores/${store.id}/history`);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedStore(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    setPage(1); // Reset to first page
    fetchStores();
  };

  const columns = [
    {
      key: 'name',
      label: 'Store Name',
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      key: 'address',
      label: 'Address',
      render: (value: string) => <span className="text-sm text-gray-600">{value}</span>,
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (value: string | null) => <span>{value || '-'}</span>,
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded text-sm font-medium ${
          value
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: Store) => (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleEditClick(row)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewHistory(row)}
          >
            History
          </Button>
        </div>
      ),
    },
  ];

  if (user?.role !== 'OWNER') {
    return null; // Redirect is in progress
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Store Management" />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
                <Button
                  variant="primary"
                  onClick={handleCreateClick}
                >
                  + New Store
                </Button>
              </div>

              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <input
                  type="text"
                  placeholder="Search by name or address..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {/* Stores Table */}
            <div className="bg-white rounded-lg shadow">
              <Table
                columns={columns}
                data={stores}
                loading={loading}
                pageable={true}
                currentPage={page}
                totalPages={Math.ceil(total / limit)}
                onPageChange={setPage}
              />
            </div>

            {/* Store Modal */}
            <StoreModal
              isOpen={showModal}
              mode={modalMode}
              store={selectedStore}
              onClose={handleModalClose}
              onSuccess={handleModalSuccess}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
