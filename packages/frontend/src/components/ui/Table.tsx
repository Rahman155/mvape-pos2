import React, { useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Button } from './Button';

/**
 * Column definition for Table component
 * Supports custom rendering, sorting, and responsive behavior
 */
export interface TableColumn<T = any> {
  /** Unique identifier for the column */
  id: string;
  /** Display header label */
  header: string;
  /** Accessor for data value - can be a key or function */
  accessor?: keyof T | ((row: T) => any);
  /** Custom cell render function */
  cell?: (value: any, row: T, rowIndex: number) => React.ReactNode;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Width class for the column (e.g., 'w-1/4', 'w-48') */
  width?: string;
  /** Hide on mobile devices */
  hideOnMobile?: boolean;
  /** Custom className for cell */
  className?: string;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  total: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  /** Column ID being sorted */
  sortBy: string | null;
  /** Sort direction */
  sortDirection: 'asc' | 'desc';
}

export interface TableProps<T = any>
  extends React.TableHTMLAttributes<HTMLTableElement>,
    VariantProps<typeof tableVariants> {
  /** Columns definition */
  columns: TableColumn<T>[];
  /** Data rows */
  data: T[];
  /** Pagination config (optional) */
  pagination?: PaginationConfig;
  /** Sort config (optional) */
  sortConfig?: SortConfig;
  /** Callback on sort change */
  onSortChange?: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Enable responsive mobile view */
  responsive?: boolean;
  /** Row click handler */
  onRowClick?: (row: T, rowIndex: number) => void;
  /** Row className function for custom styling */
  rowClassName?: (row: T, rowIndex: number) => string;
  /** Stripe alternating rows */
  striped?: boolean;
}

const tableVariants = cva(
  'w-full border-collapse',
  {
    variants: {
      variant: {
        default: 'border border-gray-200 dark:border-gray-700',
        striped: 'border border-gray-200 dark:border-gray-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const headerCellVariants = cva(
  'text-left text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3',
  {
    variants: {
      sortable: {
        true: 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none',
        false: '',
      },
    },
  }
);

const bodyCellVariants = cva(
  'text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 px-4 py-3',
  {
    variants: {
      striped: {
        true: '',
        false: '',
      },
    },
  }
);

const rowVariants = cva(
  'hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors',
  {
    variants: {
      striped: {
        true: 'even:bg-gray-50 even:dark:bg-gray-900',
        false: 'bg-white dark:bg-gray-900',
      },
      clickable: {
        true: 'cursor-pointer',
        false: '',
      },
    },
  }
);

/**
 * SortIcon component for displaying sort direction
 */
const SortIcon: React.FC<{ direction?: 'asc' | 'desc' | null }> = ({ direction }) => {
  if (direction === 'asc') {
    return (
      <svg className="inline ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 10a1 1 0 011-1h12a1 1 0 011 1v.5a1 1 0 01-1 1H4a1 1 0 01-1-1V10zm0-3a1 1 0 011-1h12a1 1 0 011 1v.5a1 1 0 01-1 1H4a1 1 0 01-1-1V7z" />
      </svg>
    );
  }
  if (direction === 'desc') {
    return (
      <svg className="inline ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 10a1 1 0 011-1h12a1 1 0 011 1v.5a1 1 0 01-1 1H4a1 1 0 01-1-1V10zm0 3a1 1 0 011-1h12a1 1 0 011 1v.5a1 1 0 01-1 1H4a1 1 0 01-1-1V13z" />
      </svg>
    );
  }
  return (
    <svg className="inline ml-1 h-4 w-4 opacity-40" fill="currentColor" viewBox="0 0 20 20">
      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
};

/**
 * Pagination component
 */
const Pagination: React.FC<{
  config: PaginationConfig;
}> = ({ config }) => {
  const totalPages = Math.ceil(config.total / config.pageSize);
  const hasPrevious = config.page > 1;
  const hasNext = config.page < totalPages;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 sm:px-6">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Showing <span className="font-medium">{(config.page - 1) * config.pageSize + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(config.page * config.pageSize, config.total)}
            </span>{' '}
            of <span className="font-medium">{config.total}</span> results
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => config.onPageChange(config.page - 1)}
            disabled={!hasPrevious}
          >
            Previous
          </Button>
          <div className="hidden items-center gap-1 sm:flex">
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => config.onPageChange(pageNum)}
                  className={cn(
                    'inline-flex items-center justify-center rounded px-3 py-2 text-sm font-medium',
                    pageNum === config.page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => config.onPageChange(config.page + 1)}
            disabled={!hasNext}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Mobile pagination controls */}
      <div className="flex flex-1 items-center justify-between sm:hidden">
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Page {config.page} of {totalPages}
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => config.onPageChange(config.page - 1)}
            disabled={!hasPrevious}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => config.onPageChange(config.page + 1)}
            disabled={!hasNext}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Table component
 * A responsive, sortable table with pagination support
 *
 * Features:
 * - Column definitions with custom rendering
 * - Pagination with customizable page size
 * - Sorting by column
 * - Responsive mobile view (hides columns with hideOnMobile)
 * - Dark mode support
 * - Striped rows option
 * - Custom row styling
 * - Loading state
 */
const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    {
      className,
      variant,
      columns,
      data,
      pagination,
      sortConfig,
      onSortChange,
      isLoading = false,
      emptyMessage = 'No data available',
      responsive = true,
      onRowClick,
      rowClassName,
      striped = false,
      ...props
    },
    ref
  ) => {
    const [internalSort, setInternalSort] = useState<SortConfig>(
      sortConfig || { sortBy: null, sortDirection: 'asc' }
    );

    const handleSort = (columnId: string) => {
      const newDirection =
        internalSort.sortBy === columnId && internalSort.sortDirection === 'asc'
          ? 'desc'
          : 'asc';

      const newSort = { sortBy: columnId, sortDirection: newDirection };
      setInternalSort(newSort);

      onSortChange?.(columnId, newDirection);
    };

    // Render cell value
    const renderCell = (column: TableColumn, row: any, rowIndex: number) => {
      if (column.cell) {
        return column.cell(getCellValue(column, row), row, rowIndex);
      }
      return getCellValue(column, row);
    };

    // Get cell value from accessor
    const getCellValue = (column: TableColumn, row: any) => {
      if (!column.accessor) return null;
      if (typeof column.accessor === 'function') {
        return column.accessor(row);
      }
      return row[column.accessor];
    };

    // Determine which sort direction is active
    const isCurrentlySorted = (columnId: string) => {
      return sortConfig ? sortConfig.sortBy === columnId : internalSort.sortBy === columnId;
    };

    const getCurrentSortDirection = (columnId: string) => {
      if (!isCurrentlySorted(columnId)) return null;
      return sortConfig ? sortConfig.sortDirection : internalSort.sortDirection;
    };

    if (isLoading) {
      return (
        <div className="flex items-center justify-center rounded border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center rounded border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-gray-600 dark:text-gray-400">{emptyMessage}</p>
        </div>
      );
    }

    // Desktop table view
    return (
      <div className="overflow-x-auto rounded border border-gray-200 dark:border-gray-700">
        <table
          ref={ref}
          className={cn(tableVariants({ variant, className }))}
          {...props}
        >
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              {columns
                .filter((col) => !responsive || !col.hideOnMobile)
                .map((column) => (
                  <th
                    key={column.id}
                    className={cn(headerCellVariants({ sortable: column.sortable }), column.width)}
                    onClick={() => column.sortable && handleSort(column.id)}
                  >
                    <div className="flex items-center">
                      {column.header}
                      {column.sortable && (
                        <SortIcon direction={getCurrentSortDirection(column.id)} />
                      )}
                    </div>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  rowVariants({
                    striped,
                    clickable: !!onRowClick,
                  }),
                  rowClassName?.(row, rowIndex)
                )}
                onClick={() => onRowClick?.(row, rowIndex)}
              >
                {columns
                  .filter((col) => !responsive || !col.hideOnMobile)
                  .map((column) => (
                    <td
                      key={`${rowIndex}-${column.id}`}
                      className={cn(bodyCellVariants({ striped }), column.className)}
                    >
                      {renderCell(column, row, rowIndex)}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>

        {pagination && <Pagination config={pagination} />}
      </div>
    );
  }
);

Table.displayName = 'Table';

export { Table, Pagination };
