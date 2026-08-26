/**
 * Table Component - Usage Examples
 * Demonstrates how to use the Table component with various configurations
 */

import React, { useState } from 'react';
import { Table, TableColumn, PaginationConfig, SortConfig } from './Table';

/**
 * Example Transaction Data
 */
interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  method: 'CASH' | 'MEMBER' | 'TEMPO';
  status: 'COMPLETED' | 'PENDING';
}

const transactionData: Transaction[] = [
  {
    id: 'TXN001',
    date: '2024-01-15',
    description: 'Liquid Vape Premium',
    amount: 150000,
    method: 'CASH',
    status: 'COMPLETED',
  },
  {
    id: 'TXN002',
    date: '2024-01-15',
    description: 'Pod Kit + Coil',
    amount: 350000,
    method: 'MEMBER',
    status: 'COMPLETED',
  },
  {
    id: 'TXN003',
    date: '2024-01-14',
    description: 'Battery + Charger',
    amount: 250000,
    method: 'TEMPO',
    status: 'PENDING',
  },
  {
    id: 'TXN004',
    date: '2024-01-14',
    description: 'Atomizer Replacement',
    amount: 85000,
    method: 'CASH',
    status: 'COMPLETED',
  },
];

/**
 * Example 1: Basic Table with pagination
 */
export function BasicTableExample() {
  const [page, setPage] = useState(1);
  const pageSize = 2;

  const columns: TableColumn<Transaction>[] = [
    {
      id: 'id',
      header: 'ID Transaksi',
      accessor: 'id',
      sortable: true,
      width: 'w-24',
    },
    {
      id: 'date',
      header: 'Tanggal',
      accessor: 'date',
      sortable: true,
    },
    {
      id: 'description',
      header: 'Deskripsi',
      accessor: 'description',
    },
    {
      id: 'amount',
      header: 'Jumlah',
      accessor: 'amount',
      sortable: true,
      cell: (value) => `Rp${(value as number).toLocaleString('id-ID')}`,
    },
    {
      id: 'method',
      header: 'Metode',
      accessor: 'method',
    },
  ];

  const pagination: PaginationConfig = {
    page,
    pageSize,
    total: transactionData.length,
    onPageChange: setPage,
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Basic Table Example</h2>
      <Table
        columns={columns}
        data={transactionData.slice((page - 1) * pageSize, page * pageSize)}
        pagination={pagination}
        responsive={true}
      />
    </div>
  );
}

/**
 * Example 2: Table with sorting and filtering
 */
export function SortableTableExample() {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    sortBy: null,
    sortDirection: 'asc',
  });
  const [page, setPage] = useState(1);
  const pageSize = 2;

  const columns: TableColumn<Transaction>[] = [
    {
      id: 'id',
      header: 'ID Transaksi',
      accessor: 'id',
      sortable: true,
      width: 'w-24',
    },
    {
      id: 'date',
      header: 'Tanggal',
      accessor: 'date',
      sortable: true,
    },
    {
      id: 'amount',
      header: 'Jumlah',
      accessor: 'amount',
      sortable: true,
      cell: (value) => `Rp${(value as number).toLocaleString('id-ID')}`,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      cell: (value) => (
        <span
          className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
            value === 'COMPLETED'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {value}
        </span>
      ),
    },
  ];

  const handleSort = (columnId: string, direction: 'asc' | 'desc') => {
    setSortConfig({ sortBy: columnId, sortDirection: direction });
  };

  // Apply sorting
  let sortedData = [...transactionData];
  if (sortConfig.sortBy) {
    sortedData.sort((a, b) => {
      const aVal = a[sortConfig.sortBy as keyof Transaction];
      const bVal = b[sortConfig.sortBy as keyof Transaction];

      if (aVal < bVal) return sortConfig.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const pagination: PaginationConfig = {
    page,
    pageSize,
    total: sortedData.length,
    onPageChange: setPage,
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Sortable Table Example</h2>
      <Table
        columns={columns}
        data={sortedData.slice((page - 1) * pageSize, page * pageSize)}
        pagination={pagination}
        sortConfig={sortConfig}
        onSortChange={handleSort}
        responsive={true}
      />
    </div>
  );
}

/**
 * Example 3: Responsive Table for Mobile
 */
export function ResponsiveTableExample() {
  const columns: TableColumn<Transaction>[] = [
    {
      id: 'id',
      header: 'ID',
      accessor: 'id',
      sortable: true,
      width: 'w-20',
    },
    {
      id: 'description',
      header: 'Deskripsi',
      accessor: 'description',
    },
    {
      id: 'amount',
      header: 'Jumlah',
      accessor: 'amount',
      sortable: true,
      cell: (value) => `Rp${(value as number).toLocaleString('id-ID')}`,
    },
    {
      id: 'method',
      header: 'Metode',
      accessor: 'method',
      hideOnMobile: true, // Hide on mobile
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      hideOnMobile: true, // Hide on mobile
      cell: (value) => (
        <span
          className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
            value === 'COMPLETED'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {value}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Responsive Table (Mobile-First)</h2>
      <Table
        columns={columns}
        data={transactionData}
        responsive={true}
        striped={true}
      />
    </div>
  );
}

/**
 * Example 4: Table with Row Click Handler
 */
export function InteractiveTableExample() {
  const [selectedRow, setSelectedRow] = useState<Transaction | null>(null);

  const columns: TableColumn<Transaction>[] = [
    {
      id: 'id',
      header: 'ID Transaksi',
      accessor: 'id',
      sortable: true,
      width: 'w-24',
    },
    {
      id: 'date',
      header: 'Tanggal',
      accessor: 'date',
      sortable: true,
    },
    {
      id: 'description',
      header: 'Deskripsi',
      accessor: 'description',
    },
    {
      id: 'amount',
      header: 'Jumlah',
      accessor: 'amount',
      cell: (value) => `Rp${(value as number).toLocaleString('id-ID')}`,
    },
  ];

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Interactive Table</h2>
      <Table
        columns={columns}
        data={transactionData}
        onRowClick={(row) => setSelectedRow(row)}
        responsive={true}
      />
      {selectedRow && (
        <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900">
          <h3 className="mb-2 font-bold">Selected Row Details:</h3>
          <pre className="overflow-auto rounded bg-gray-100 p-2 text-sm dark:bg-gray-800">
            {JSON.stringify(selectedRow, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Example 5: Table with Custom Styling
 */
export function StyledTableExample() {
  const columns: TableColumn<Transaction>[] = [
    {
      id: 'id',
      header: 'ID Transaksi',
      accessor: 'id',
      sortable: true,
      width: 'w-24',
    },
    {
      id: 'date',
      header: 'Tanggal',
      accessor: 'date',
      sortable: true,
    },
    {
      id: 'amount',
      header: 'Jumlah',
      accessor: 'amount',
      sortable: true,
      cell: (value) => (
        <span className="font-semibold text-green-600">
          Rp{(value as number).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      cell: (value) => (
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
            value === 'COMPLETED'
              ? 'bg-green-200 text-green-800'
              : 'bg-yellow-200 text-yellow-800'
          }`}
        >
          {value}
        </span>
      ),
    },
  ];

  const rowClassName = (row: Transaction) => {
    if (row.status === 'PENDING') {
      return 'bg-red-50 dark:bg-red-900/20';
    }
    return '';
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Styled Table Example</h2>
      <Table
        columns={columns}
        data={transactionData}
        striped={true}
        rowClassName={rowClassName}
        responsive={true}
      />
    </div>
  );
}

/**
 * Example 6: Table with Loading State
 */
export function LoadingTableExample() {
  const [isLoading, setIsLoading] = useState(false);

  const columns: TableColumn<Transaction>[] = [
    {
      id: 'id',
      header: 'ID Transaksi',
      accessor: 'id',
    },
    {
      id: 'description',
      header: 'Deskripsi',
      accessor: 'description',
    },
    {
      id: 'amount',
      header: 'Jumlah',
      accessor: 'amount',
      cell: (value) => `Rp${(value as number).toLocaleString('id-ID')}`,
    },
  ];

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="p-6">
      <h2 className="mb-4 text-2xl font-bold">Table with Loading State</h2>
      <button
        onClick={handleRefresh}
        className="mb-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Refresh Data
      </button>
      <Table
        columns={columns}
        data={isLoading ? [] : transactionData}
        isLoading={isLoading}
        emptyMessage="No transactions found"
        responsive={true}
      />
    </div>
  );
}
