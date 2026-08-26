/**
 * Piutang Management Page (Task 73)
 * Lists customer receivables with filtering, sorting, and pagination
 * 
 * Requirements: 18.3 - Display customers with open/partial piutang, remaining balance, due date
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface PiutangItem {
  id: string;
  transactionId: string | null;
  memberId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  amount: number;
  remainingBalance: number;
  dueDate: string | null;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}

export default function PiutangListPage() {
  const searchParams = useSearchParams();
  const [piutang, setPiutang] = useState<PiutangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    customerName: searchParams.get('customerName') || '',
    dueDateFrom: searchParams.get('dueDateFrom') || '',
    dueDateTo: searchParams.get('dueDateTo') || '',
    sort: searchParams.get('sort') || 'due_date',
  });

  // Fetch piutang list
  useEffect(() => {
    const fetchPiutang = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(filters.status && { status: filters.status }),
          ...(filters.customerName && { customerName: filters.customerName }),
          ...(filters.dueDateFrom && { dueDateFrom: filters.dueDateFrom }),
          ...(filters.dueDateTo && { dueDateTo: filters.dueDateTo }),
          sort: filters.sort,
        });

        const response = await fetch(`/api/piutang?${params}`);
        if (!response.ok) throw new Error('Failed to fetch piutang');

        const data = await response.json();
        setPiutang(data.data);
        setTotal(data.total);
      } catch (error) {
        console.error('Error fetching piutang:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPiutang();
  }, [page, limit, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const formatDate = (date: string | null | Date) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-red-100 text-red-800';
      case 'PARTIAL':
        return 'bg-yellow-100 text-yellow-800';
      case 'CLOSED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDaysStatus = (daysUntilDue: number | null) => {
    if (daysUntilDue === null) return '';
    if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} hari terlambat`;
    if (daysUntilDue === 0) return 'Hari ini';
    return `${daysUntilDue} hari lagi`;
  };

  const pages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-6 text-3xl font-bold">Manajemen Piutang</h1>

      {/* Filters */}
      <div className="mb-6 grid gap-4 rounded-lg bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">Semua Status</option>
            <option value="OPEN">Belum Dibayar</option>
            <option value="PARTIAL">Sebagian Dibayar</option>
            <option value="CLOSED">Lunas</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Nama Pelanggan</label>
          <input
            type="text"
            value={filters.customerName}
            onChange={(e) => handleFilterChange('customerName', e.target.value)}
            placeholder="Cari nama..."
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Dari Tanggal</label>
          <input
            type="date"
            value={filters.dueDateFrom}
            onChange={(e) => handleFilterChange('dueDateFrom', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Sampai Tanggal</label>
          <input
            type="date"
            value={filters.dueDateTo}
            onChange={(e) => handleFilterChange('dueDateTo', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Urutkan Berdasarkan</label>
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange('sort', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="due_date">Tanggal Jatuh Tempo</option>
            <option value="remaining_balance">Sisa Piutang</option>
            <option value="created_date">Tanggal Dibuat</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      {piutang.length === 0 ? (
        <div className="rounded-lg bg-white p-12 text-center shadow-sm">
          <p className="text-gray-500">Tidak ada data piutang yang sesuai dengan filter</p>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Nama Pelanggan</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Jumlah</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Sisa Piutang</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Jatuh Tempo</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {piutang.map((item) => {
                  const daysUntilDue = getDaysUntilDue(item.dueDate);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.customerName}</p>
                          <p className="text-xs text-gray-500">{item.customerPhone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">{formatCurrency(item.amount)}</td>
                      <td className="px-6 py-4 text-right font-medium">
                        {formatCurrency(item.remainingBalance)}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-gray-900">{formatDate(item.dueDate)}</p>
                          <p className={`text-xs ${daysUntilDue && daysUntilDue < 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                            {getDaysStatus(daysUntilDue)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status === 'OPEN' ? 'Belum Dibayar' : item.status === 'PARTIAL' ? 'Sebagian' : 'Lunas'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={`/owner/piutang/${item.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Lihat Detail
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Menampilkan {(page - 1) * limit + 1}-{Math.min(page * limit, total)} dari {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (pages > 5 && page > 3) {
                      pageNum = page - 2 + i;
                    }
                    if (pageNum > pages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-2 py-1 text-sm ${
                          page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(Math.min(pages, page + 1))}
                  disabled={page === pages}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
