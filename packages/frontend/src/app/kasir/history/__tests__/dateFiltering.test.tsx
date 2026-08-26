import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { apiService } from '@/lib/api';
import TransactionHistoryPage from '../page';

// Mock dependencies
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useOnlineStatus');
jest.mock('@/lib/api');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseOnlineStatus = useOnlineStatus as jest.MockedFunction<
  typeof useOnlineStatus
>;
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('Transaction History - Date Filtering (Requirement 8.2)', () => {
  const mockTransactions = [
    {
      id: '1',
      storeId: 'store1',
      kasirId: 'kasir1',
      transactionDate: new Date('2024-01-15'),
      totalAmount: 100000,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      isEdited: false,
      version: 1,
      items: [],
    },
    {
      id: '2',
      storeId: 'store1',
      kasirId: 'kasir1',
      transactionDate: new Date('2024-01-20'),
      totalAmount: 200000,
      paymentMethod: 'MEMBER_CREDIT',
      status: 'COMPLETED',
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20'),
      isEdited: false,
      version: 1,
      items: [],
    },
    {
      id: '3',
      storeId: 'store1',
      kasirId: 'kasir1',
      transactionDate: new Date('2024-02-05'),
      totalAmount: 150000,
      paymentMethod: 'TEMPO',
      status: 'COMPLETED',
      createdAt: new Date('2024-02-05'),
      updatedAt: new Date('2024-02-05'),
      isEdited: false,
      version: 1,
      items: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'kasir1',
        username: 'kasir',
        role: 'KASIR',
        storeId: 'store1',
      } as any,
      loading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
    });

    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
    });

    mockApiService.transactions = {
      list: jest.fn().mockResolvedValue({
        data: {
          data: mockTransactions,
          total: 3,
          page: 1,
          limit: 20,
          pages: 1,
        },
      }),
    } as any;
  });

  describe('Date Range Picker Rendering', () => {
    it('should render date range picker in filters section', () => {
      render(<TransactionHistoryPage />);

      expect(screen.getByText('Transaction Date Range')).toBeInTheDocument();
    });

    it('should render start and end date input fields', () => {
      render(<TransactionHistoryPage />);

      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    });

    it('should not show clear button initially', () => {
      render(<TransactionHistoryPage />);

      expect(screen.queryByText('Clear Dates')).not.toBeInTheDocument();
    });
  });

  describe('Date Filtering Functionality', () => {
    it('should filter transactions by start date', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      const startDateInput = dateInputs[0];
      await user.type(startDateInput, '2024-01-20');

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2024-01-20',
          })
        );
      });
    });

    it('should filter transactions by end date', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      const endDateInput = dateInputs[1];
      await user.type(endDateInput, '2024-01-31');

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            endDate: '2024-01-31',
          })
        );
      });
    });

    it('should filter transactions by date range (both start and end)', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      await user.type(dateInputs[0], '2024-01-15');
      await user.type(dateInputs[1], '2024-01-31');

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2024-01-15',
            endDate: '2024-01-31',
          })
        );
      });
    });

    it('should reset pagination when date filter is applied', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      // First, get initial call
      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1 })
        );
      });

      jest.clearAllMocks();

      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      await user.type(dateInputs[0], '2024-01-20');

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1, // Should reset to page 1
            startDate: '2024-01-20',
          })
        );
      });
    });

    it('should combine date filter with payment method filter', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      const paymentSelect = screen.getByDisplayValue('All Payment Methods');

      await user.type(dateInputs[0], '2024-01-15');
      await user.selectOptions(paymentSelect, 'CASH');

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2024-01-15',
            paymentMethod: 'CASH',
          })
        );
      });
    });
  });

  describe('Clear Dates Functionality', () => {
    it('should show clear button when dates are selected', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      await user.type(dateInputs[0], '2024-01-15');

      await waitFor(() => {
        expect(screen.getByText('Clear Dates')).toBeInTheDocument();
      });
    });

    it('should clear date filters when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      await user.type(dateInputs[0], '2024-01-15');
      await user.type(dateInputs[1], '2024-01-31');

      await waitFor(() => {
        expect(screen.getByText('Clear Dates')).toBeInTheDocument();
      });

      jest.clearAllMocks();

      const clearButton = screen.getByText('Clear Dates');
      await user.click(clearButton);

      // Should fetch without date filters
      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.not.objectContaining({
            startDate: expect.any(String),
            endDate: expect.any(String),
          })
        );
      });
    });

    it('should clear date fields when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      await user.type(dateInputs[0], '2024-01-15');

      await waitFor(() => {
        expect(screen.getByText('Clear Dates')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Clear Dates');
      await user.click(clearButton);

      // Date inputs should be cleared
      await waitFor(() => {
        expect((dateInputs[0] as HTMLInputElement).value).toBe('');
        expect((dateInputs[1] as HTMLInputElement).value).toBe('');
      });
    });
  });

  describe('Date Range Validation', () => {
    it('should show error when end date is before start date', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      await user.type(dateInputs[0], '2024-01-31');
      await user.type(dateInputs[1], '2024-01-15');

      await waitFor(() => {
        expect(
          screen.getByText('End date must be after or equal to start date')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 8.2: Date Range Filtering Specification', () => {
    it('should display transactions within selected date range', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      await user.type(dateInputs[0], '2024-01-15');
      await user.type(dateInputs[1], '2024-01-31');

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2024-01-15',
            endDate: '2024-01-31',
          })
        );
      });

      // Verify transactions are displayed
      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument();
      });
    });

    it('should update transaction list when filter changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<TransactionHistoryPage />);

      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      jest.clearAllMocks();

      await user.type(dateInputs[0], '2024-01-20');

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalled();
      });

      const lastCall =
        mockApiService.transactions.list.mock.calls[
          mockApiService.transactions.list.mock.calls.length - 1
        ][0];
      expect(lastCall.startDate).toBe('2024-01-20');
    });

    it('should handle empty date filters (show all transactions)', async () => {
      render(<TransactionHistoryPage />);

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.not.objectContaining({
            startDate: expect.any(String),
            endDate: expect.any(String),
          })
        );
      });
    });
  });
});
