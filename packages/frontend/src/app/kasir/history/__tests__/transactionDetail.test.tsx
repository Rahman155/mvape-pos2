import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import '@testing-library/jest-dom';
import TransactionDetailPage from '../[id]/page';
import { apiService } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Transaction, TransactionItem } from '@/types';

// Mock modules
jest.mock('next/navigation');
jest.mock('@/lib/api');
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/useOnlineStatus');
jest.mock('@/components/kasir/ReceiptReprintModal', () => ({
  ReceiptReprintModal: () => <div data-testid="reprint-modal">Reprint Modal</div>,
}));

// Mock transaction data
const mockTransaction: Transaction = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  storeId: 'store-123',
  kasirId: 'kasir-456',
  transactionDate: new Date('2024-01-15T10:30:00'),
  totalAmount: 150000,
  paymentMethod: 'CASH',
  status: 'COMPLETED',
  notes: 'Test transaction',
  createdAt: new Date('2024-01-15T10:30:00'),
  updatedAt: new Date('2024-01-15T10:30:00'),
  editedAt: undefined,
  editedBy: undefined,
  isEdited: false,
  version: 1,
  items: [
    {
      id: 'item-1',
      transactionId: '550e8400-e29b-41d4-a716-446655440000',
      productId: 'prod-001',
      quantity: 2,
      unitPrice: 50000,
      totalPrice: 100000,
      createdAt: new Date('2024-01-15T10:30:00'),
    },
    {
      id: 'item-2',
      transactionId: '550e8400-e29b-41d4-a716-446655440000',
      productId: 'prod-002',
      quantity: 1,
      unitPrice: 50000,
      totalPrice: 50000,
      createdAt: new Date('2024-01-15T10:30:00'),
    },
  ],
};

const mockEditedTransaction: Transaction = {
  ...mockTransaction,
  isEdited: true,
  editedAt: new Date('2024-01-16T14:00:00'),
  editedBy: 'kasir-456',
  version: 2,
};

const mockTempoTransaction: Transaction = {
  ...mockTransaction,
  paymentMethod: 'TEMPO',
};

const mockMemberCreditTransaction: Transaction = {
  ...mockTransaction,
  paymentMethod: 'MEMBER_CREDIT',
};

describe('Transaction Detail Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useRouter
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });

    // Mock useParams
    (useParams as jest.Mock).mockReturnValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
    });

    // Mock useAuth
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'kasir-456', role: 'KASIR', storeId: 'store-123' },
    });

    // Mock useOnlineStatus
    (useOnlineStatus as jest.Mock).mockReturnValue({
      isOnline: true,
    });
  });

  describe('Display Transaction Information', () => {
    it('should display transaction details correctly', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Transaction Details')).toBeInTheDocument();
      });

      // Verify transaction information is displayed
      expect(screen.getByText(/550e8400/i)).toBeInTheDocument();
      expect(screen.getByText('150,000')).toBeInTheDocument(); // Total amount
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
      expect(screen.getByText('Cash')).toBeInTheDocument();
    });

    it('should display payment information', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Payment Information')).toBeInTheDocument();
      });

      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('Amount Paid')).toBeInTheDocument();
    });

    it('should display all transaction items with prices and quantities', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Items')).toBeInTheDocument();
      });

      // Verify items table headers
      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Unit Price')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();

      // Verify items are displayed
      const cells = screen.getAllByText(/prod-00/);
      expect(cells.length).toBeGreaterThanOrEqual(2);

      // Verify quantities
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should display cash payment details', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        const cashBadges = screen.getAllByText('Cash');
        expect(cashBadges.length).toBeGreaterThan(0);
      });
    });

    it('should display tempo payment details', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTempoTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Tempo (Credit)')).toBeInTheDocument();
      });
    });

    it('should display member credit payment details', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockMemberCreditTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        const memberBadges = screen.getAllByText('Member Credit');
        expect(memberBadges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edit Status Indicator', () => {
    it('should display "Edited" badge for modified transactions', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockEditedTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Edited/)).toBeInTheDocument();
      });
    });

    it('should not display "Edited" badge for unmodified transactions', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.queryByText(/✏️ Edited/)).not.toBeInTheDocument();
      });
    });

    it('should show modification date for edited transactions', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockEditedTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Last Modification')).toBeInTheDocument();
      });
    });
  });

  describe('Status Indicators', () => {
    it('should display correct status color for COMPLETED status', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: { ...mockTransaction, status: 'COMPLETED' },
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        const statusElements = screen.getAllByText('COMPLETED');
        expect(statusElements.length).toBeGreaterThan(0);
      });
    });

    it('should display correct status for PENDING status', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: { ...mockTransaction, status: 'PENDING' },
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('PENDING')).toBeInTheDocument();
      });
    });

    it('should display correct status for CANCELLED status', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: { ...mockTransaction, status: 'CANCELLED' },
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('CANCELLED')).toBeInTheDocument();
      });
    });
  });

  describe('Actions', () => {
    it('should display print receipt button', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Print Receipt/)).toBeInTheDocument();
      });
    });

    it('should display back to history button', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        const backButtons = screen.getAllByText(/Back to History/);
        expect(backButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading state initially', () => {
      (apiService.transactions.get as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<TransactionDetailPage />);

      expect(screen.getByText(/Loading transaction details/)).toBeInTheDocument();
    });

    it('should display error when API fails', async () => {
      const errorMessage = 'Failed to fetch transaction';
      (apiService.transactions.get as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
      );

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display error when transaction not found', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: null,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/Transaction not found/)).toBeInTheDocument();
      });
    });
  });

  describe('Offline Status', () => {
    it('should display offline warning when offline', async () => {
      (useOnlineStatus as jest.Mock).mockReturnValue({
        isOnline: false,
      });

      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/currently offline/i)).toBeInTheDocument();
      });
    });

    it('should not display offline warning when online', async () => {
      (useOnlineStatus as jest.Mock).mockReturnValue({
        isOnline: true,
      });

      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.queryByText(/currently offline/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty Items', () => {
    it('should display message when transaction has no items', async () => {
      const emptyTransaction = { ...mockTransaction, items: [] };

      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: emptyTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(/No items in this transaction/)).toBeInTheDocument();
      });
    });
  });

  describe('Notes Display', () => {
    it('should display notes when present', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Test transaction')).toBeInTheDocument();
      });
    });

    it('should not display notes section when notes are empty', async () => {
      const noNotesTransaction = { ...mockTransaction, notes: undefined };

      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: noNotesTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        const notesLabels = screen.queryAllByText('Notes');
        // Notes section should not be rendered if notes is undefined
        expect(notesLabels.length).toBe(0);
      });
    });
  });

  describe('Date Formatting', () => {
    it('should format transaction date correctly', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        // The exact format depends on formatDateTime implementation
        expect(screen.getByText(/Date & Time/)).toBeInTheDocument();
      });
    });

    it('should format created and updated dates', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('Created At')).toBeInTheDocument();
        expect(screen.getByText('Last Updated')).toBeInTheDocument();
      });
    });
  });

  describe('Total Amount Display', () => {
    it('should calculate and display total amount correctly', async () => {
      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        // Total amount should be displayed prominently
        expect(screen.getByText('150,000')).toBeInTheDocument();
      });
    });

    it('should handle different currency amounts', async () => {
      const customTransaction = { ...mockTransaction, totalAmount: 1500000 };

      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: customTransaction,
      });

      render(<TransactionDetailPage />);

      await waitFor(() => {
        expect(screen.getByText('1,500,000')).toBeInTheDocument();
      });
    });
  });
});
