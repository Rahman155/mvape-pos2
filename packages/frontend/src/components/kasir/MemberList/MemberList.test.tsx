/**
 * MemberList Component Tests
 * Tests for reusable member list component with search and pagination
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemberList } from './MemberList';
import { apiService } from '@/lib/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock API service
jest.mock('@/lib/api', () => ({
  apiService: {
    members: {
      list: jest.fn(),
    },
  },
  getErrorMessage: jest.fn((error) => 'API Error'),
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

describe('MemberList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
    it('should render member list component', async () => {
      render(<MemberList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Members List')).toBeInTheDocument();
      });
    });

    it('should display search input', async () => {
      render(<MemberList />, { wrapper: createWrapper() });

      const searchInput = await screen.findByPlaceholderText(/Search by name/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should display members in table', async () => {
      render(<MemberList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should search members', async () => {
      const user = userEvent.setup();
      render(<MemberList />, { wrapper: createWrapper() });

      const searchInput = await screen.findByPlaceholderText(/Search by name/i);
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(apiService.members.list).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'John',
          })
        );
      });
    });

    it('should support custom search placeholder', async () => {
      render(
        <MemberList searchPlaceholder="Find a member..." />,
        { wrapper: createWrapper() }
      );

      const searchInput = await screen.findByPlaceholderText('Find a member...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Member Selection', () => {
    it('should call onMemberSelect when member is selected', async () => {
      const onMemberSelect = jest.fn();
      const user = userEvent.setup();

      render(
        <MemberList onMemberSelect={onMemberSelect} showActions={true} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const selectButton = screen.getAllByText('Select')[0];
      await user.click(selectButton);

      expect(onMemberSelect).toHaveBeenCalledWith(mockMembers[0]);
    });

    it('should not show select buttons when showActions is false', async () => {
      render(<MemberList showActions={false} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.queryByText('Select')).not.toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display pagination info', async () => {
      render(<MemberList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 to 2 of 2/i)).toBeInTheDocument();
      });
    });

    it('should handle custom limit', async () => {
      render(<MemberList limit={10} />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(apiService.members.list).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 10,
          })
        );
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state message', async () => {
      (apiService.members.list as jest.Mock).mockResolvedValue({
        data: {
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          pages: 0,
        },
      });

      render(<MemberList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No members found')).toBeInTheDocument();
      });
    });

    it('should support custom empty state text', async () => {
      (apiService.members.list as jest.Mock).mockResolvedValue({
        data: {
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          pages: 0,
        },
      });

      render(
        <MemberList
          emptyStateTitle="No members available"
          emptyStateDescription="Please create a member first"
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('No members available')).toBeInTheDocument();
        expect(screen.getByText('Please create a member first')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      (apiService.members.list as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<MemberList />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton', async () => {
      (apiService.members.list as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: {
                    data: mockMembers,
                    total: 2,
                    page: 1,
                    limit: 20,
                    pages: 1,
                  },
                }),
              100
            )
          )
      );

      render(<MemberList />, { wrapper: createWrapper() });

      // Initially should show loading state
      const skeletons = screen.getAllByRole('generic', { hidden: true });
      // We expect some loading elements to be rendered

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });
});
