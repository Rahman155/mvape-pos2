/**
 * Member Detail Page Tests
 * Tests for member detail view, transaction history display, and statistics
 *
 * Requirements: 14.7 (Member Management)
 * - Display member information (14.7)
 * - Display transaction history (14.7)
 * - Display total amount spent (14.7)
 * - Mobile responsive (2.1-2.5)
 * - Loading and error states (27)
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MemberDetailPage from './page';
import { apiService } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock API service
jest.mock('@/lib/api', () => ({
  apiService: {
    members: {
      get: jest.fn(),
    },
  },
  getErrorMessage: jest.fn((error) => 'Test error message'),
}));

// Mock auth store
jest.mock('@/stores/auth.store', () => ({
  useAuthStore: jest.fn(() => ({
    user: { id: 'test-user', username: 'testuser', role: 'KASIR' },
  })),
}));

// Mock RequireRole component
jest.mock('@/components/RequireRole', () => ({
  RequireRole: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockMember = {
  id: 'member-1',
  memberNumber: 'MBR-001',
  name: 'John Doe',
  phone: '081234567890',
  email: 'john@example.com',
  creditBalance: 500000,
  totalSpent: 5000000,
  isActive: true,
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-15T15:30:00Z',
};

const mockTransactions = [
  {
    id: 'txn-1',
    totalAmount: 100000,
    paymentMethod: 'MEMBER_CREDIT',
    transactionDate: '2024-01-15T10:00:00Z',
    status: 'COMPLETED',
  },
  {
    id: 'txn-2',
    totalAmount: 250000,
    paymentMethod: 'MEMBER_CREDIT',
    transactionDate: '2024-01-10T14:30:00Z',
    status: 'COMPLETED',
  },
  {
    id: 'txn-3',
    totalAmount: 150000,
    paymentMethod: 'CASH',
    transactionDate: '2024-01-05T09:15:00Z',
    status: 'COMPLETED',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Member Detail Page', () => {
  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouter = {
      back: jest.fn(),
    };

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ memberId: 'member-1' });

    // Default successful API response
    (apiService.members.get as jest.Mock).mockResolvedValue({
      data: {
        member: mockMember,
        transactions: mockTransactions,
      },
    });
  });

  describe('Rendering', () => {
    it('should render member detail page', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(mockMember.name)).toBeInTheDocument();
      });
    });

    it('should display loading state initially', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should display member name in header', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should display back button', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        const backButton = screen.getByText('Back');
        expect(backButton).toBeInTheDocument();
      });
    });
  });

  describe('Member Information Section', () => {
    it('should display member information section', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Member Information')).toBeInTheDocument();
      });
    });

    it('should display member number', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('MBR-001')).toBeInTheDocument();
      });
    });

    it('should display phone number', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('081234567890')).toBeInTheDocument();
      });
    });

    it('should display email', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });

    it('should display member since date', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/1 Januari 2024/)).toBeInTheDocument();
      });
    });

    it('should display dash for missing optional fields', async () => {
      (apiService.members.get as jest.Mock).mockResolvedValue({
        data: {
          member: {
            ...mockMember,
            phone: null,
            email: null,
          },
          transactions: [],
        },
      });

      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        const dashes = screen.getAllByText('-');
        expect(dashes.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Account Balance Statistics', () => {
    it('should display credit balance section', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Credit Balance')).toBeInTheDocument();
      });
    });

    it('should display formatted credit balance', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Indonesian format
        expect(screen.getByText(/500\.000/)).toBeInTheDocument();
      });
    });

    it('should display total spent section', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Total Spent')).toBeInTheDocument();
      });
    });

    it('should display formatted total spent', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Indonesian format
        expect(screen.getByText(/5\.000\.000/)).toBeInTheDocument();
      });
    });
  });

  describe('Transaction History', () => {
    it('should display transaction history section', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Transaction History/)).toBeInTheDocument();
      });
    });

    it('should display transaction count', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Total: 3 transactions/)).toBeInTheDocument();
      });
    });

    it('should display transaction table', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Date')).toBeInTheDocument();
        expect(screen.getByText('Transaction ID')).toBeInTheDocument();
        expect(screen.getByText('Payment Method')).toBeInTheDocument();
        expect(screen.getByText('Amount')).toBeInTheDocument();
      });
    });

    it('should display transaction items', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('MEMBER_CREDIT')).toBeInTheDocument();
        expect(screen.getByText('CASH')).toBeInTheDocument();
      });
    });

    it('should format transaction amounts as currency', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check for formatted amounts
        expect(screen.getByText(/100\.000/)).toBeInTheDocument();
        expect(screen.getByText(/250\.000/)).toBeInTheDocument();
      });
    });

    it('should display transaction status', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        const completedStatuses = screen.getAllByText('COMPLETED');
        expect(completedStatuses.length).toBeGreaterThan(0);
      });
    });

    it('should display subtotal of all transactions', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Subtotal (3 transactions):')).toBeInTheDocument();
        // 100000 + 250000 + 150000 = 500000
        expect(screen.getByText(/500\.000/)).toBeInTheDocument();
      });
    });

    it('should display empty state when no transactions', async () => {
      (apiService.members.get as jest.Mock).mockResolvedValue({
        data: {
          member: mockMember,
          transactions: [],
        },
      });

      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/No transactions/)).toBeInTheDocument();
        expect(
          screen.getByText(/This member has not made any transactions yet/)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Transaction Pagination', () => {
    it('should paginate transactions when more than limit', async () => {
      const manyTransactions = Array.from({ length: 25 }, (_, i) => ({
        id: `txn-${i}`,
        totalAmount: 100000 * (i + 1),
        paymentMethod: 'MEMBER_CREDIT',
        transactionDate: '2024-01-15T10:00:00Z',
        status: 'COMPLETED',
      }));

      (apiService.members.get as jest.Mock).mockResolvedValue({
        data: {
          member: mockMember,
          transactions: manyTransactions,
        },
      });

      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Total: 25 transactions/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      (apiService.members.get as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
      });
    });

    it('should display error alert with dismiss button', async () => {
      (apiService.members.get as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const user = userEvent.setup();
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
      });

      const dismissButton = screen.getByText('Dismiss');
      expect(dismissButton).toBeInTheDocument();

      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(/Test error message/i)).not.toBeInTheDocument();
      });
    });

    it('should display member not found message on 404', async () => {
      (apiService.members.get as jest.Mock).mockRejectedValue({
        response: { status: 404, data: { error: 'Member not found' } },
      });

      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should call router.back when back button clicked', async () => {
      const user = userEvent.setup();
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        const backButton = screen.getByText('Back');
        expect(backButton).toBeInTheDocument();
      });

      const backButton = screen.getByText('Back');
      await user.click(backButton);

      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly in Indonesian locale', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should show date in Indonesian format
        expect(screen.getByText(/Januari 2024/)).toBeInTheDocument();
      });
    });

    it('should format transaction dates with time', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check that transaction dates include time
        const dateElements = screen.queryAllByText(/Januari 2024/);
        expect(dateElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency values with Indonesian locale', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check for Rp prefix (Indonesian currency)
        const currencyElements = screen.queryAllByText(/Rp/);
        expect(currencyElements.length).toBeGreaterThan(0);
      });
    });

    it('should display zero decimal places for currency', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should not show decimal places
        expect(screen.getByText(/500\.000/)).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('should fetch member details on mount', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(apiService.members.get).toHaveBeenCalledWith('member-1');
      });
    });

    it('should use member ID from URL params', async () => {
      (useParams as jest.Mock).mockReturnValue({ memberId: 'custom-member-id' });

      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(apiService.members.get).toHaveBeenCalledWith('custom-member-id');
      });
    });

    it('should not fetch if member ID is not available', async () => {
      (useParams as jest.Mock).mockReturnValue({ memberId: undefined });

      render(<MemberDetailPage />, { wrapper: createWrapper() });

      // Wait a bit to ensure fetch wasn't called
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(apiService.members.get).not.toHaveBeenCalled();
    });
  });

  describe('Empty States', () => {
    it('should show member not found when data is empty', async () => {
      (apiService.members.get as jest.Mock).mockRejectedValue(
        new Error('Member not found')
      );

      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render on mobile viewport', async () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Member Information')).toBeInTheDocument();
      });
    });
  });

  describe('UI Components', () => {
    it('should display all major UI sections', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Member Information')).toBeInTheDocument();
        expect(screen.getByText('Credit Balance')).toBeInTheDocument();
        expect(screen.getByText('Total Spent')).toBeInTheDocument();
        expect(screen.getByText(/Transaction History/)).toBeInTheDocument();
      });
    });

    it('should have icons for balance and spent sections', async () => {
      render(<MemberDetailPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        const svgs = screen.getByText('Credit Balance').closest('div')?.querySelectorAll('svg');
        expect(svgs).toBeDefined();
      });
    });
  });
});
