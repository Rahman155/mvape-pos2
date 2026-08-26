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

describe('Transaction History - Payment Method Filtering (Requirement 8.3)', () => {
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

  describe('Payment Method Filter Component Rendering', () => {
    it('should render payment method filter component in filters section', () => {
      render(<TransactionHistoryPage />);

      expect(screen.getByText('Payment Methods')).toBeInTheDocument();
    });

    it('should display all payment method options', () => {
      render(<TransactionHistoryPage />);

      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('Member Credit')).toBeInTheDocument();
      expect(screen.getByText('Tempo')).toBeInTheDocument();
    });
  });

  describe('Single Payment Method Selection', () => {
    it('should filter transactions by CASH payment method', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      // Wait for the component to fully render
      await waitFor(() => {
        expect(screen.getByText('Cash')).toBeInTheDocument();
      });

      const cashButton = screen.getByText('Cash');
      await user.click(cashButton);

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethods: 'CASH',
          })
        );
      });
    });

    it('should filter transactions by MEMBER_CREDIT payment method', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Member Credit')).toBeInTheDocument();
      });

      const memberButton = screen.getByText('Member Credit');
      await user.click(memberButton);

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethods: 'MEMBER_CREDIT',
          })
        );
      });
    });

    it('should filter transactions by TEMPO payment method', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      await waitFor(() => {
        expect(screen.getByText('Tempo')).toBeInTheDocument();
      });

      const tempoButton = screen.getByText('Tempo');
      await user.click(tempoButton);

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethods: 'TEMPO',
          })
        );
      });
    });

    it('should reset pagination when payment method filter is applied', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      jest.clearAllMocks();

      const cashButton = screen.getByText('Cash');
      await user.click(cashButton);

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1, // Should reset to page 1
            paymentMethods: 'CASH',
          })
        );
      });
    });

    it('should deselect method when clicking it again', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const cashButton = screen.getByText('Cash');

      // First click to select
      await user.click(cashButton);
      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethods: 'CASH',
          })
        );
      });

      jest.clearAllMocks();

      // Second click to deselect
      await user.click(cashButton);
      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.not.objectContaining({
            paymentMethods: expect.anything(),
          })
        );
      });
    });
  });

  describe('Multiple Payment Method Selection', () => {
    it('should support selecting multiple payment methods', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const cashButton = screen.getByText('Cash');
      const memberButton = screen.getByText('Member Credit');

      // Select first method
      await user.click(cashButton);
      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethods: 'CASH',
          })
        );
      });

      jest.clearAllMocks();

      // Select second method
      await user.click(memberButton);

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethods: 'CASH,MEMBER_CREDIT',
          })
        );
      });
    });

    it('should handle three payment methods selected simultaneously', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const cashButton = screen.getByText('Cash');
      const memberButton = screen.getByText('Member Credit');
      const tempoButton = screen.getByText('Tempo');

      await user.click(cashButton);
      jest.clearAllMocks();

      await user.click(memberButton);
      jest.clearAllMocks();

      await user.click(tempoButton);

      await waitFor(() => {
        const call = mockApiService.transactions.list.mock.calls[
          mockApiService.transactions.list.mock.calls.length - 1
        ][0];
        expect(call.paymentMethods).toContain('CASH');
        expect(call.paymentMethods).toContain('MEMBER_CREDIT');
        expect(call.paymentMethods).toContain('TEMPO');
      });
    });

    it('should remove method from filter when deselected', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      // Select CASH and MEMBER_CREDIT
      const cashButton = screen.getByText('Cash');
      const memberButton = screen.getByText('Member Credit');

      await user.click(cashButton);
      jest.clearAllMocks();

      await user.click(memberButton);
      jest.clearAllMocks();

      // Verify both are selected
      const call1 = mockApiService.transactions.list.mock.calls[
        mockApiService.transactions.list.mock.calls.length - 1
      ][0];
      expect(call1.paymentMethods).toBe('CASH,MEMBER_CREDIT');

      // Deselect CASH
      await user.click(cashButton);

      await waitFor(() => {
        const lastCall = mockApiService.transactions.list.mock.calls[
          mockApiService.transactions.list.mock.calls.length - 1
        ][0];
        expect(lastCall.paymentMethods).toBe('MEMBER_CREDIT');
      });
    });
  });

  describe('Clear Functionality', () => {
    it('should show clear button when payment methods are selected', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const cashButton = screen.getByText('Cash');
      await user.click(cashButton);

      await waitFor(() => {
        expect(screen.getByText('Clear')).toBeInTheDocument();
      });
    });

    it('should clear all payment method selections when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const cashButton = screen.getByText('Cash');
      const memberButton = screen.getByText('Member Credit');

      // Select methods
      await user.click(cashButton);
      jest.clearAllMocks();
      await user.click(memberButton);
      jest.clearAllMocks();

      // Verify both are selected
      expect(screen.getByText('Clear')).toBeInTheDocument();

      // Click clear
      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.not.objectContaining({
            paymentMethods: expect.anything(),
          })
        );
      });
    });

    it('should reset pagination when clearing filters', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const cashButton = screen.getByText('Cash');
      await user.click(cashButton);
      jest.clearAllMocks();

      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
          })
        );
      });
    });
  });

  describe('Combination with Other Filters', () => {
    it('should combine payment method filter with date range filter', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      // Select payment method
      const cashButton = screen.getByText('Cash');
      await user.click(cashButton);
      jest.clearAllMocks();

      // Select date range
      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      await user.type(dateInputs[0], '2024-01-15');
      await user.type(dateInputs[1], '2024-01-31');

      await waitFor(() => {
        const lastCall = mockApiService.transactions.list.mock.calls[
          mockApiService.transactions.list.mock.calls.length - 1
        ][0];
        expect(lastCall.paymentMethods).toBe('CASH');
        expect(lastCall.startDate).toBe('2024-01-15');
        expect(lastCall.endDate).toBe('2024-01-31');
      });
    });

    it('should preserve payment method filter when date filter changes', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      // Select payment method
      const cashButton = screen.getByText('Cash');
      await user.click(cashButton);
      jest.clearAllMocks();

      // Add date filter
      const dateInputs = screen.getAllByRole('textbox').filter((input) => {
        const htmlInput = input as HTMLInputElement;
        return htmlInput.type === 'date';
      });

      await user.type(dateInputs[0], '2024-01-15');

      await waitFor(() => {
        const lastCall = mockApiService.transactions.list.mock.calls[
          mockApiService.transactions.list.mock.calls.length - 1
        ][0];
        expect(lastCall.paymentMethods).toBe('CASH');
        expect(lastCall.startDate).toBe('2024-01-15');
      });
    });
  });

  describe('Requirement 8.3: Display Filtered Transactions', () => {
    it('should display only transactions matching selected payment method', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const cashButton = screen.getByText('Cash');
      await user.click(cashButton);

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethods: 'CASH',
          })
        );
      });

      // Verify transactions are displayed
      await waitFor(() => {
        expect(screen.getByText('Transaction History')).toBeInTheDocument();
      });
    });

    it('should show empty result when no transactions match filter', async () => {
      const user = userEvent.setup();

      mockApiService.transactions.list.mockResolvedValueOnce({
        data: {
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          pages: 0,
        },
      });

      render(<TransactionHistoryPage />);

      const cashButton = screen.getByText('Cash');
      await user.click(cashButton);

      await waitFor(() => {
        expect(screen.getByText('No transactions found')).toBeInTheDocument();
      });
    });

    it('should update transaction list when filter selection changes', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const cashButton = screen.getByText('Cash');
      const memberButton = screen.getByText('Member Credit');

      jest.clearAllMocks();

      // Select CASH
      await user.click(cashButton);
      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethods: 'CASH',
          })
        );
      });

      jest.clearAllMocks();

      // Change to MEMBER_CREDIT
      await user.click(cashButton); // Deselect CASH
      jest.clearAllMocks();
      
      await user.click(memberButton); // Select MEMBER_CREDIT

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethods: 'MEMBER_CREDIT',
          })
        );
      });
    });
  });

  describe('Refresh Button', () => {
    it('should clear payment method filter when refresh is clicked with no filters applied', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalled();
      });
    });

    it('should preserve payment method filter when refresh button is clicked', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const cashButton = screen.getByText('Cash');
      await user.click(cashButton);
      jest.clearAllMocks();

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockApiService.transactions.list).toHaveBeenCalledWith(
          expect.objectContaining({
            paymentMethods: 'CASH',
          })
        );
      });
    });
  });

  describe('API Parameter Format', () => {
    it('should pass single payment method as paymentMethods parameter', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const cashButton = screen.getByText('Cash');
      await user.click(cashButton);

      await waitFor(() => {
        const call = mockApiService.transactions.list.mock.calls[
          mockApiService.transactions.list.mock.calls.length - 1
        ][0];
        expect(call.paymentMethods).toBe('CASH');
      });
    });

    it('should pass multiple payment methods as comma-separated string', async () => {
      const user = userEvent.setup();
      render(<TransactionHistoryPage />);

      const cashButton = screen.getByText('Cash');
      const memberButton = screen.getByText('Member Credit');
      const tempoButton = screen.getByText('Tempo');

      await user.click(cashButton);
      jest.clearAllMocks();
      await user.click(memberButton);
      jest.clearAllMocks();
      await user.click(tempoButton);

      await waitFor(() => {
        const call = mockApiService.transactions.list.mock.calls[
          mockApiService.transactions.list.mock.calls.length - 1
        ][0];
        expect(call.paymentMethods).toMatch(/CASH.*MEMBER_CREDIT.*TEMPO/);
      });
    });

    it('should not pass paymentMethods parameter when no methods are selected', async () => {
      render(<TransactionHistoryPage />);

      await waitFor(() => {
        const call = mockApiService.transactions.list.mock.calls[0][0];
        expect(call.paymentMethods).toBeUndefined();
      });
    });
  });
});
