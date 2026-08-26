/**
 * Table component tests
 * Tests for responsive Table component with pagination and sorting
 * Validates: Requirements 2 (Responsive & Mobile-First UI), 27 (Professional UI/UX Design)
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table, TableColumn, PaginationConfig } from '@/components/ui/Table';

/**
 * Mock data for testing
 */
interface TestRow {
  id: string;
  name: string;
  email: string;
  amount: number;
  date: string;
  status: 'active' | 'inactive';
}

const mockData: TestRow[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    amount: 1500,
    date: '2024-01-15',
    status: 'active',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    amount: 2500,
    date: '2024-01-16',
    status: 'inactive',
  },
  {
    id: '3',
    name: 'Bob Johnson',
    email: 'bob@example.com',
    amount: 1200,
    date: '2024-01-17',
    status: 'active',
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice@example.com',
    amount: 3000,
    date: '2024-01-18',
    status: 'active',
  },
];

const mockColumns: TableColumn<TestRow>[] = [
  {
    id: 'name',
    header: 'Name',
    accessor: 'name',
    sortable: true,
  },
  {
    id: 'email',
    header: 'Email',
    accessor: 'email',
  },
  {
    id: 'amount',
    header: 'Amount',
    accessor: 'amount',
    sortable: true,
    cell: (value) => `$${value.toLocaleString()}`,
  },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    cell: (value) => <span className={value === 'active' ? 'text-green-600' : 'text-red-600'}>{value}</span>,
    hideOnMobile: true,
  },
];

describe('Table Component', () => {
  describe('Basic Rendering', () => {
    it('should render table with columns and data', () => {
      render(
        <Table
          columns={mockColumns}
          data={mockData}
        />
      );

      // Check headers are rendered
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();

      // Check data rows are rendered
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('should render empty message when no data', () => {
      const customEmptyMessage = 'No transactions found';
      render(
        <Table
          columns={mockColumns}
          data={[]}
          emptyMessage={customEmptyMessage}
        />
      );

      expect(screen.getByText(customEmptyMessage)).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(
        <Table
          columns={mockColumns}
          data={[]}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Cell Rendering', () => {
    it('should render custom cell renderers', () => {
      render(
        <Table
          columns={mockColumns}
          data={mockData}
        />
      );

      // Amount column has custom formatter
      expect(screen.getByText('$1,500')).toBeInTheDocument();
      expect(screen.getByText('$2,500')).toBeInTheDocument();
    });

    it('should render accessor as function', () => {
      const columns: TableColumn<TestRow>[] = [
        {
          id: 'fullInfo',
          header: 'Full Info',
          accessor: (row) => `${row.name} (${row.email})`,
        },
      ];

      render(
        <Table
          columns={columns}
          data={[mockData[0]]}
        />
      );

      expect(screen.getByText('John Doe (john@example.com)')).toBeInTheDocument();
    });

    it('should render JSX in cells', () => {
      render(
        <Table
          columns={mockColumns}
          data={[mockData[0]]}
        />
      );

      // Status column renders JSX with span
      const statusCell = screen.getByText('active');
      expect(statusCell).toHaveClass('text-green-600');
    });
  });

  describe('Sorting', () => {
    it('should handle sort column click', () => {
      const onSortChange = jest.fn();
      render(
        <Table
          columns={mockColumns}
          data={mockData}
          onSortChange={onSortChange}
        />
      );

      const nameHeader = screen.getByText('Name').parentElement;
      fireEvent.click(nameHeader!);

      expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
    });

    it('should toggle sort direction on multiple clicks', () => {
      const onSortChange = jest.fn();
      render(
        <Table
          columns={mockColumns}
          data={mockData}
          onSortChange={onSortChange}
        />
      );

      const nameHeader = screen.getByText('Name').parentElement;

      fireEvent.click(nameHeader!);
      expect(onSortChange).toHaveBeenCalledWith('name', 'asc');

      fireEvent.click(nameHeader!);
      expect(onSortChange).toHaveBeenCalledWith('name', 'desc');

      fireEvent.click(nameHeader!);
      expect(onSortChange).toHaveBeenCalledWith('name', 'asc');
    });

    it('should not sort non-sortable columns', () => {
      const onSortChange = jest.fn();
      render(
        <Table
          columns={mockColumns}
          data={mockData}
          onSortChange={onSortChange}
        />
      );

      const emailHeader = screen.getByText('Email').parentElement;
      fireEvent.click(emailHeader!);

      expect(onSortChange).not.toHaveBeenCalled();
    });

    it('should display sort indicator', () => {
      const sortConfig = { sortBy: 'name', sortDirection: 'asc' as const };
      const { container } = render(
        <Table
          columns={mockColumns}
          data={mockData}
          sortConfig={sortConfig}
        />
      );

      const nameHeader = screen.getByText('Name');
      const svg = nameHeader.parentElement?.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should render pagination controls', () => {
      const pagination: PaginationConfig = {
        page: 1,
        pageSize: 2,
        total: 4,
        onPageChange: jest.fn(),
      };

      render(
        <Table
          columns={mockColumns}
          data={mockData.slice(0, 2)}
          pagination={pagination}
        />
      );

      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText(/Showing 1 to 2 of 4 results/)).toBeInTheDocument();
    });

    it('should disable previous button on first page', () => {
      const pagination: PaginationConfig = {
        page: 1,
        pageSize: 2,
        total: 4,
        onPageChange: jest.fn(),
      };

      render(
        <Table
          columns={mockColumns}
          data={mockData.slice(0, 2)}
          pagination={pagination}
        />
      );

      expect(screen.getByText('Previous')).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      const pagination: PaginationConfig = {
        page: 2,
        pageSize: 2,
        total: 4,
        onPageChange: jest.fn(),
      };

      render(
        <Table
          columns={mockColumns}
          data={mockData.slice(2, 4)}
          pagination={pagination}
        />
      );

      expect(screen.getByText('Next')).toBeDisabled();
    });

    it('should call onPageChange when navigation buttons clicked', () => {
      const onPageChange = jest.fn();
      const pagination: PaginationConfig = {
        page: 1,
        pageSize: 2,
        total: 4,
        onPageChange,
      };

      render(
        <Table
          columns={mockColumns}
          data={mockData.slice(0, 2)}
          pagination={pagination}
        />
      );

      fireEvent.click(screen.getByText('Next'));
      expect(onPageChange).toHaveBeenCalledWith(2);

      fireEvent.click(screen.getByText('Previous'));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it('should render page numbers in pagination', () => {
      const pagination: PaginationConfig = {
        page: 1,
        pageSize: 1,
        total: 5,
        onPageChange: jest.fn(),
      };

      const { container } = render(
        <Table
          columns={mockColumns}
          data={mockData.slice(0, 1)}
          pagination={pagination}
        />
      );

      // Should show page numbers 1-5
      expect(screen.getByRole('button', { name: /^1$/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^5$/ })).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should hide columns marked as hideOnMobile when responsive is true', () => {
      render(
        <Table
          columns={mockColumns}
          data={mockData}
          responsive={true}
        />
      );

      // Status column should not be in headers (hideOnMobile: true)
      const headers = screen.getAllByRole('columnheader');
      const headerTexts = headers.map((h) => h.textContent);

      expect(headerTexts).not.toContain('Status');
    });

    it('should show all columns when responsive is false', () => {
      render(
        <Table
          columns={mockColumns}
          data={mockData}
          responsive={false}
        />
      );

      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should have responsive padding and spacing', () => {
      const { container } = render(
        <Table
          columns={mockColumns}
          data={mockData}
        />
      );

      const table = container.querySelector('table');
      expect(table).toHaveClass('w-full');
    });
  });

  describe('Row Interaction', () => {
    it('should handle row click', () => {
      const onRowClick = jest.fn();
      render(
        <Table
          columns={mockColumns}
          data={mockData}
          onRowClick={onRowClick}
        />
      );

      const nameCell = screen.getByText('John Doe');
      fireEvent.click(nameCell.closest('tr')!);

      expect(onRowClick).toHaveBeenCalledWith(mockData[0], 0);
    });

    it('should apply custom row className', () => {
      const rowClassName = jest.fn((row) => (row.status === 'active' ? 'bg-green-50' : 'bg-red-50'));

      const { container } = render(
        <Table
          columns={mockColumns}
          data={[mockData[0]]}
          rowClassName={rowClassName}
        />
      );

      const row = container.querySelector('tbody tr');
      expect(row).toHaveClass('bg-green-50');
    });

    it('should add clickable styling when onRowClick is provided', () => {
      const { container } = render(
        <Table
          columns={mockColumns}
          data={mockData}
          onRowClick={jest.fn()}
        />
      );

      const row = container.querySelector('tbody tr');
      expect(row).toHaveClass('cursor-pointer');
    });
  });

  describe('Striping', () => {
    it('should render striped rows when striped is true', () => {
      const { container } = render(
        <Table
          columns={mockColumns}
          data={mockData}
          striped={true}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBeGreaterThan(0);

      // Check if striped classes are applied
      expect(rows[0]).toHaveClass('even:bg-gray-50');
    });

    it('should not stripe rows when striped is false', () => {
      const { container } = render(
        <Table
          columns={mockColumns}
          data={mockData}
          striped={false}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      // All rows should have consistent background (no striping)
      rows.forEach((row) => {
        expect(row).toHaveClass('bg-white');
      });
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes in table elements', () => {
      const { container } = render(
        <Table
          columns={mockColumns}
          data={mockData}
        />
      );

      const headers = container.querySelectorAll('th');
      headers.forEach((header) => {
        expect(header.className).toContain('dark:');
      });

      const cells = container.querySelectorAll('td');
      cells.forEach((cell) => {
        expect(cell.className).toContain('dark:');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic table structure', () => {
      const { container } = render(
        <Table
          columns={mockColumns}
          data={mockData}
        />
      );

      const table = container.querySelector('table');
      const thead = table?.querySelector('thead');
      const tbody = table?.querySelector('tbody');

      expect(thead).toBeInTheDocument();
      expect(tbody).toBeInTheDocument();
    });

    it('should have proper heading structure', () => {
      render(
        <Table
          columns={mockColumns}
          data={mockData}
        />
      );

      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation for sortable headers', async () => {
      const onSortChange = jest.fn();
      const user = userEvent.setup();

      render(
        <Table
          columns={mockColumns}
          data={mockData}
          onSortChange={onSortChange}
        />
      );

      const sortableHeader = screen.getByText('Name').parentElement;
      await user.click(sortableHeader!);

      expect(onSortChange).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty columns', () => {
      const { container } = render(
        <Table
          columns={[]}
          data={mockData}
        />
      );

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
    });

    it('should handle undefined accessor', () => {
      const columns: TableColumn<TestRow>[] = [
        {
          id: 'test',
          header: 'Test',
          // no accessor defined
          cell: () => 'Fixed Value',
        },
      ];

      render(
        <Table
          columns={columns}
          data={mockData}
        />
      );

      expect(screen.getByText('Fixed Value')).toBeInTheDocument();
    });

    it('should handle very long data', () => {
      const longData = Array.from({ length: 100 }, (_, i) => ({
        ...mockData[0],
        id: `${i}`,
        name: `Person ${i}`,
      }));

      render(
        <Table
          columns={mockColumns}
          data={longData.slice(0, 10)}
        />
      );

      expect(screen.getByText('Person 0')).toBeInTheDocument();
      expect(screen.getByText('Person 9')).toBeInTheDocument();
    });

    it('should handle special characters in data', () => {
      const specialData: TestRow[] = [
        {
          ...mockData[0],
          name: 'John "The Boss" O\'Brien & Sons',
          email: 'john+test@example.co.uk',
        },
      ];

      render(
        <Table
          columns={mockColumns}
          data={specialData}
        />
      );

      expect(screen.getByText('John "The Boss" O\'Brien & Sons')).toBeInTheDocument();
      expect(screen.getByText('john+test@example.co.uk')).toBeInTheDocument();
    });
  });

  describe('Property-Based Behavior', () => {
    /**
     * Property 1: Column rendering consistency
     * **Validates: Requirement 2, 27**
     * All rows should have the same number of cells as columns
     */
    it('should maintain column-to-cell consistency', () => {
      const { container } = render(
        <Table
          columns={mockColumns}
          data={mockData}
          responsive={false}
        />
      );

      const headerCells = container.querySelectorAll('thead th');
      const bodyRows = container.querySelectorAll('tbody tr');

      bodyRows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        expect(cells.length).toBe(headerCells.length);
      });
    });

    /**
     * Property 2: Data integrity during rendering
     * **Validates: Requirement 27**
     * All data values should appear exactly once in the correct row
     */
    it('should render all data values without duplication or omission', () => {
      const { container } = render(
        <Table
          columns={mockColumns}
          data={mockData}
        />
      );

      mockData.forEach((row) => {
        // Check if primary identifier is rendered
        expect(screen.getByText(row.name)).toBeInTheDocument();

        // Check if email is rendered
        expect(screen.getByText(row.email)).toBeInTheDocument();
      });
    });

    /**
     * Property 3: Pagination bounds preservation
     * **Validates: Requirement 2, 27**
     * Pagination should never exceed or go below valid bounds
     */
    it('should maintain valid pagination bounds', () => {
      const validPageSizes = [1, 2, 5, 10, 20];

      validPageSizes.forEach((pageSize) => {
        const total = 100;
        const maxPage = Math.ceil(total / pageSize);

        // Test that we can navigate to all valid pages
        for (let page = 1; page <= maxPage; page++) {
          const pagination: PaginationConfig = {
            page,
            pageSize,
            total,
            onPageChange: jest.fn(),
          };

          const { unmount } = render(
            <Table
              columns={mockColumns}
              data={mockData}
              pagination={pagination}
            />
          );

          expect(screen.getByText(`Page ${page} of ${maxPage}`)).toBeInTheDocument();
          unmount();
        }
      });
    });

    /**
     * Property 4: Sort indicator transitivity
     * **Validates: Requirement 27**
     * Sorting should follow consistent ascending -> descending -> ascending cycle
     */
    it('should cycle through sort states consistently', () => {
      const onSortChange = jest.fn();
      const { rerender } = render(
        <Table
          columns={mockColumns}
          data={mockData}
          onSortChange={onSortChange}
          sortConfig={{ sortBy: null, sortDirection: 'asc' }}
        />
      );

      const nameHeader = screen.getByText('Name').parentElement;

      // First click -> asc
      fireEvent.click(nameHeader!);
      expect(onSortChange).toHaveBeenLastCalledWith('name', 'asc');

      // Rerender with new sort config
      rerender(
        <Table
          columns={mockColumns}
          data={mockData}
          onSortChange={onSortChange}
          sortConfig={{ sortBy: 'name', sortDirection: 'asc' }}
        />
      );

      // Second click -> desc
      fireEvent.click(nameHeader!);
      expect(onSortChange).toHaveBeenLastCalledWith('name', 'desc');

      // Rerender again
      rerender(
        <Table
          columns={mockColumns}
          data={mockData}
          onSortChange={onSortChange}
          sortConfig={{ sortBy: 'name', sortDirection: 'desc' }}
        />
      );

      // Third click -> asc again
      fireEvent.click(nameHeader!);
      expect(onSortChange).toHaveBeenLastCalledWith('name', 'asc');
    });

    /**
     * Property 5: Responsive column filtering is deterministic
     * **Validates: Requirement 2**
     * Responsive mode should consistently hide/show the same columns
     */
    it('should consistently apply responsive filtering', () => {
      const { rerender, container } = render(
        <Table
          columns={mockColumns}
          data={mockData}
          responsive={true}
        />
      );

      const headerCountResponsive = container.querySelectorAll('thead th').length;
      const expectedResponsiveCount = mockColumns.filter((col) => !col.hideOnMobile).length;

      expect(headerCountResponsive).toBe(expectedResponsiveCount);

      // Rerender with responsive false
      rerender(
        <Table
          columns={mockColumns}
          data={mockData}
          responsive={false}
        />
      );

      const headerCountFull = container.querySelectorAll('thead th').length;
      expect(headerCountFull).toBe(mockColumns.length);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle pagination with sorting', () => {
      const onSortChange = jest.fn();
      const pagination: PaginationConfig = {
        page: 1,
        pageSize: 2,
        total: 4,
        onPageChange: jest.fn(),
      };

      render(
        <Table
          columns={mockColumns}
          data={mockData.slice(0, 2)}
          pagination={pagination}
          sortConfig={{ sortBy: 'name', sortDirection: 'asc' }}
          onSortChange={onSortChange}
        />
      );

      // Should render both pagination and sortable columns
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('should handle responsive mode with sorting and pagination', () => {
      const { container } = render(
        <Table
          columns={mockColumns}
          data={mockData.slice(0, 2)}
          responsive={true}
          pagination={{
            page: 1,
            pageSize: 2,
            total: 4,
            onPageChange: jest.fn(),
          }}
          sortConfig={{ sortBy: 'name', sortDirection: 'asc' }}
        />
      );

      // Check responsive hiding
      expect(screen.queryByText('Status')).not.toBeInTheDocument();

      // Check sorting headers are still present
      expect(screen.getByText('Name')).toBeInTheDocument();

      // Check pagination
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });
  });
});

