/**
 * Stock Opname List Page
 * Display all stock opname sessions with filtering and quick actions
 * Tasks: 68, 71, 72
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Button } from '../Button';
import { Card } from '../Card';
import { Table } from '../Table';
import { Modal } from '../Modal';
import Link from 'next/link';

interface OpnameSession {
  id: string;
  store_id: string;
  status: 'ONGOING' | 'VERIFIED';
  conducted_by: string;
  verified_by?: string;
  opname_date: string;
  created_at: string;
}

export const OpnameListPage: React.FC = () => {
  const [sessions, setSessions] = useState<OpnameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    fetchSessions();
    fetchStores();
  }, [statusFilter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await axios.get('/api/stock-opname', { params });
      setSessions(response.data.data.sessions);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load opname sessions');
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await axios.get('/api/stores');
      setStores(response.data.data.stores);
    } catch (err) {
      console.error('Error fetching stores:', err);
    }
  };

  const handleInitiateOpname = async () => {
    if (!selectedStore) {
      alert('Please select a store');
      return;
    }

    try {
      const response = await axios.post('/api/stock-opname/initiate', {
        storeId: selectedStore,
      });

      if (response.data.success) {
        setShowNewModal(false);
        setSelectedStore('');
        fetchSessions();
        // Redirect to opname session
        window.location.href = `/stock-opname/${response.data.data.sessionId}`;
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initiate opname');
    }
  };

  const getStatusBadge = (status: string) => {
    const classes =
      status === 'ONGOING'
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-green-100 text-green-800';
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${classes}`}>{status}</span>;
  };

  const columns = [
    {
      header: 'Date',
      accessor: 'opname_date',
      render: (row: OpnameSession) =>
        format(new Date(row.opname_date), 'dd/MM/yyyy HH:mm'),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row: OpnameSession) => getStatusBadge(row.status),
    },
    {
      header: 'Store ID',
      accessor: 'store_id',
    },
    {
      header: 'Actions',
      render: (row: OpnameSession) => (
        <div className="flex gap-2">
          <Link href={`/stock-opname/${row.id}`}>
            <Button variant="secondary" size="sm">
              View
            </Button>
          </Link>
          {row.status === 'VERIFIED' && (
            <Link href={`/stock-opname/${row.id}/report`}>
              <Button variant="secondary" size="sm">
                Report
              </Button>
            </Link>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Stock Opname Sessions</h1>
        <Button onClick={() => setShowNewModal(true)} variant="primary">
          New Opname
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <div className="flex gap-4 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="ONGOING">Ongoing</option>
            <option value="VERIFIED">Verified</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No opname sessions found
          </div>
        ) : (
          <Table columns={columns} data={sessions} />
        )}
      </Card>

      {/* New Opname Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Start New Stock Opname"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Store</label>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">Select a store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowNewModal(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleInitiateOpname}>
              Start Opname
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OpnameListPage;
