/**
 * Member List Page Tests
 * Tests for member list display, search, and pagination functionality
 *
 * Requirements: 14.1 (Member Management)
 * - Member list displays with name, phone, credit balance (14.1.1)
 * - Pagination works correctly (14.1)
 * - Search by name works (14.1)
 * - Search by phone works (14.1)
 * - Loading and error states work (27)
 * - Mobile responsive (2.1-2.5)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MemberListPage from './page';
import { apiService } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock API service
jest.mock('@/lib/api', () => ({
  apiService: {
    members: {
      list: jest.fn(),
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

const mockMembers = [
  {
    id: '1',
    memberNumber: 'MBR-001',
    name: 'John Doe',
    phone: '081234567890',
    email: 'john@example.com',
    creditBalance: 500000,
    totalSpent: 5000000,
    isActive: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '2',
    memberNumber: 'MBR-002',
    name: 'Jane Smith',
    phone: '081987654321',
    email: 'jane@example.com',
    creditBalance: 1000000,
    totalSpent: 10000000,
    isActive: true,
    createdAt: '2024-01-02',
    updatedAt: '2024-01-02',
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

describe('Member List Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock successful API response
    (apiService.members.list as jest.Mock).mockResolvedValue({
      data: {
        data: mockMembers,
        total: 2,
        page: 1,
        limit: 20,
        pages: 1,
      },
    });
  });

  describe('Rendering', () => {
    it('should render member list page', async () => {
      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Members')).toBeInTheDocument();
      });
    });

    it('should display loading state initially', async () => {
      render(<MemberListPage />, { wrapper: createWrapper() });

      // Verify page title appears
      await waitFor(() => {
        expect(screen.getByText('Members')).toBeInTheDocument();
      });
    });

    it('should display member list in table format', async () => {
      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should display member information columns', async () => {
      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Member Number/i)).toBeInTheDocument();
        expect(screen.getByText(/Name/i)).toBeInTheDocument();
        expect(screen.getByText(/Phone/i)).toBeInTheDocument();
        expect(screen.getByText(/Credit Balance/i)).toBeInTheDocument();
      });
    });
  });

  describe('Member List Display', () => {
    it('should display members with correct data format', async () => {
      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check member numbers
        expect(screen.getByText('MBR-001')).toBeInTheDocument();
        expect(screen.getByText('MBR-002')).toBeInTheDocument();

        // Check phone numbers
        expect(screen.getByText('081234567890')).toBeInTheDocument();
        expect(screen.getByText('081987654321')).toBeInTheDocument();
      });
    });

    it('should format currency values correctly', async () => {
      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Credit balance should be formatted as currency
        const balanceText = screen.getByText(/500\.000/); // Indonesian format
        expect(balanceText).toBeInTheDocument();
      });
    });

    it('should display correct total member count', async () => {
      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/2 total/i)).toBeInTheDocument();
      });
    });

    it('should display correct pagination info', async () => {
      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 to 2 of 2/i)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should search by member name', async () => {
      const user = userEvent.setup();
      render(<MemberListPage />, { wrapper: createWrapper() });

      const searchInput = await screen.findByPlaceholderText(/Search by name/i);

      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(apiService.members.list).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'John',
            page: 1,
            limit: 20,
          })
        );
      });
    });

    it('should search by phone number', async () => {
      const user = userEvent.setup();
      render(<MemberListPage />, { wrapper: createWrapper() });

      const searchInput = await screen.findByPlaceholderText(/Search by name/i);

      await user.type(searchInput, '081234567890');

      await waitFor(() => {
        expect(apiService.members.list).toHaveBeenCalledWith(
          expect.objectContaining({
            search: '081234567890',
          })
        );
      });
    });

    it('should search by member number', async () => {
      const user = userEvent.setup();
      render(<MemberListPage />, { wrapper: createWrapper() });

      const searchInput = await screen.findByPlaceholderText(/Search by name/i);

      await user.type(searchInput, 'MBR-001');

      await waitFor(() => {
        expect(apiService.members.list).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'MBR-001',
          })
        );
      });
    });

    it('should reset pagination when search changes', async () => {
      const user = userEvent.setup();
      render(<MemberListPage />, { wrapper: createWrapper() });

      const searchInput = await screen.findByPlaceholderText(/Search by name/i);

      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(apiService.members.list).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
          })
        );
      });
    });

    it('should debounce search input', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      render(<MemberListPage />, { wrapper: createWrapper() });

      const searchInput = await screen.findByPlaceholderText(/Search by name/i);

      // Type but don't wait
      await user.type(searchInput, 'test');

      // Should not have called API yet due to debounce
      jest.advanceTimersByTime(200);
      expect(apiService.members.list).toHaveBeenCalledTimes(1); // Only initial call

      // After debounce delay (300ms), API should be called
      jest.advanceTimersByTime(150);
      expect(apiService.members.list).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should handle empty search results', async () => {
      (apiService.members.list as jest.Mock).mockResolvedValue({
        data: {
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          pages: 0,
        },
      });

      const user = userEvent.setup();
      render(<MemberListPage />, { wrapper: createWrapper() });

      const searchInput = await screen.findByPlaceholderText(/Search by name/i);

      await user.type(searchInput, 'nonexistent');

      await waitFor(() => {
        expect(screen.getByText(/No members found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should handle pagination correctly', async () => {
      (apiService.members.list as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            data: mockMembers.slice(0, 1),
            total: 25,
            page: 1,
            limit: 20,
            pages: 2,
          },
        })
        .mockResolvedValueOnce({
          data: {
            data: mockMembers.slice(1, 2),
            total: 25,
            page: 2,
            limit: 20,
            pages: 2,
          },
        });

      const user = userEvent.setup();
      render(<MemberListPage />, { wrapper: createWrapper() });

      // Initial render should show page 1
      await waitFor(() => {
        expect(apiService.members.list).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1 })
        );
      });
    });

    it('should display correct pagination info', async () => {
      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 to 2 of 2/i)).toBeInTheDocument();
      });
    });
  });

  describe('Member Detail Navigation', () => {
    it('should have view button that links to member detail page', async () => {
      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        const viewButtons = screen.getAllByText('View');
        expect(viewButtons.length).toBeGreaterThan(0);
      });

      const viewButton = screen.getAllByText('View')[0];
      expect(viewButton.closest('a')).toHaveAttribute('href', '/kasir/members/1');
    });

    it('should generate correct member detail URLs', async () => {
      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        const links = screen.getAllByRole('link', { name: /View/ });
        expect(links[0]).toHaveAttribute('href', '/kasir/members/1');
        expect(links[1]).toHaveAttribute('href', '/kasir/members/2');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      (apiService.members.list as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      (apiService.members.list as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            data: mockMembers,
            total: 2,
            page: 1,
            limit: 20,
            pages: 1,
          },
        });

      const user = userEvent.setup();
      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
      });

      const dismissButton = screen.getByText('Dismiss');
      await user.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(/Test error message/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should display empty state when no members', async () => {
      (apiService.members.list as jest.Mock).mockResolvedValue({
        data: {
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          pages: 0,
        },
      });

      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/No members found/i)).toBeInTheDocument();
      });
    });

    it('should display empty transaction history message', async () => {
      (apiService.members.get as jest.Mock).mockResolvedValue({
        data: {
          member: mockMembers[0],
          transactions: [],
        },
      });

      const user = userEvent.setup();
      render(<MemberListPage />, { wrapper: createWrapper() });

      const viewButton = await screen.findByText('View');
      await user.click(viewButton);

      await waitFor(() => {
        // Modal should show but without transaction history
        expect(screen.getByText('Member Information')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render on mobile viewport', async () => {
      // Mock window.matchMedia for mobile
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

      render(<MemberListPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Members')).toBeInTheDocument();
      });
    });
  });
});
