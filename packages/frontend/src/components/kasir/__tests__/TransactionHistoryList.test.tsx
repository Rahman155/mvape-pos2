/**
 * Unit tests for TransactionHistoryList component
 * Tests pagination, filtering, and transaction display
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionHistoryList from '../TransactionHistoryList';
import { Transaction } from '@/types';

// Mock data
const mockTransactions: Transaction[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    storeId: 'store-1',
    kasirId: 'kasir-1',
    transactionDate: new Date('2024-01-15T10:30:00'),
    totalAmount: 250000,
    paymentMethod: 'CASH',
    status: 'COMPLETED',
    isEdited: false,
    version: 1,
    createdAt: new Date('2024-01-15T10:30:00'),
    updatedAt: new Date('2024-01-15T10:30:00'),
    items: [
      {
        id: 'item-1',
        transactionId: '550e8400-e29b-41d4-a716-446655440001',
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 125000,
        totalPrice: 250000,
        createdAt: new Date(),
      },
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    storeId: 'store-1',
    kasirId: 'kasir-1',
    transactionDate: new Date('2024-01-14T14:20:00'),
    totalAmount: 150000,
    paymentMethod: 'MEMBER_CREDIT',
    status: 'COMPLETED',
    isEdited: true,
    editedAt: new Date('2024-01-14T15:00:00'),
    editedBy: 'kasir-1',
    version: 2,
    createdAt: new Date('2024-01-14T14:20:00'),
    updatedAt: new Date('2024-01-14T15:00:00'),
    items: [
      {
        id: 'item-2',
        transactionId: '550e8400-e29b-41d4-a716-446655440002',
        productId: 'prod-2',
        quantity: 1,
        unitPrice: 150000,
        totalPrice: 150000,
        createdAt: new Date(),
      },
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    storeId: 'store-1',
    kasirId: 'kasir-1',
    transactionDate: new Date('2024-01-13T09:15:00'),
    totalAmount: 500000,
    paymentMethod: 'TEMPO',
    status: 'COMPLETED',
    isEdited: false,
    version: 1,
    createdAt: new Date('2024-01-13T09:15:00'),
    updatedAt: new Date('2024-01-13T09:15:00'),
    items: [
      {
        id: 'item-3',
        transactionId: '550e8400-e29b-41d4-a716-446655440003',
        productId: 'prod-3',
        quantity: 3,
        unitPrice: 166667,
        totalPrice: 500000,
        createdAt: new Date(),
      },
    ],
  },
];

describe('TransactionHistoryList', () => {
  const mockOnPageChange = jest.fn();
  const mockOnViewDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render transaction list with correct columns', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={1}
          limit={20}
          total={3}
          totalPages={1}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Check for column headers
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Amount')).toBeInTheDocument();
      expect(screen.getByText('Payment Method')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should display all transactions in the table', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={1}
          limit={20}
          total={3}
          totalPages={1}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Check for payment method badges
      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('Member')).toBeInTheDocument();
      expect(screen.getByText('Tempo')).toBeInTheDocument();

      // Check for status badges
      const completedBadges = screen.getAllByText('COMPLETED');
      expect(completedBadges.length).toBeGreaterThan(0);
    });

    it('should display transaction amounts in currency format', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={1}
          limit={20}
          total={3}
          totalPages={1}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Currency should be formatted as Rp
      expect(screen.getByText(/Rp/)).toBeInTheDocument();
    });

    it('should display edit indicator for modified transactions', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={1}
          limit={20}
          total={3}
          totalPages={1}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Check for edited indicator (✏️ Edited)
      expect(screen.getByText(/✏️ Edited/)).toBeInTheDocument();
    });

    it('should display results summary', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={1}
          limit={20}
          total={3}
          totalPages={1}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByText(/Showing 1 to 3 of 3 transactions/)).toBeInTheDocument();
    });

    it('should display empty message when no transactions', () => {
      render(
        <TransactionHistoryList
          transactions={[]}
          loading={false}
          page={1}
          limit={20}
          total={0}
          totalPages={0}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByText(/No transactions found/)).toBeInTheDocument();
    });

    it('should display correct results summary for paginated results', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={2}
          limit={2}
          total={5}
          totalPages={3}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      // Page 2 with limit 2 should show items 3-4 of 5
      expect(screen.getByText(/Showing 3 to 4 of 5 transactions/)).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should not show pagination controls when only one page', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={1}
          limit={20}
          total={3}
          totalPages={1}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.queryByText(/Previous/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Next/)).not.toBeInTheDocument();
    });

    it('should show pagination controls when multiple pages exist', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={1}
          limit={1}
          total={3}
          totalPages={3}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByText(/Previous/)).toBeInTheDocument();
      expect(screen.getByText(/Next/)).toBeInTheDocument();
    });

    it('should disable previous button on first page', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={1}
          limit={1}
          total={3}
          totalPages={3}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      const previousButton = screen.getByText(/Previous/).closest('button');
      expect(previousButton).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={3}
          limit={1}
          total={3}
          totalPages={3}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      const nextButton = screen.getByText(/Next/).closest('button');
      expect(nextButton).toBeDisabled();
    });

    it('should call onPageChange when next button clicked', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={1}
          limit={1}
          total={3}
          totalPages={3}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      const nextButton = screen.getByText(/Next/).closest('button');
      fireEvent.click(nextButton!);

      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange when previous button clicked', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={2}
          limit={1}
          total={3}
          totalPages={3}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      const previousButton = screen.getByText(/Previous/).closest('button');
      fireEvent.click(previousButton!);

      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('should display page indicator', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={2}
          limit={1}
          total={3}
          totalPages={3}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    });
  });

  describe('View Details Action', () => {
    it('should have view buttons for each transaction', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={1}
          limit={20}
          total={3}
          totalPages={1}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      const viewButtons = screen.getAllByText('View');
      expect(viewButtons.length).toBe(3);
    });

    it('should call onViewDetails with transaction id when view button clicked', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={false}
          page={1}
          limit={20}
          total={3}
          totalPages={1}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      const viewButtons = screen.getAllByText('View');
      fireEvent.click(viewButtons[0]);

      expect(mockOnViewDetails).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001');
    });
  });

  describe('Payment Method Filtering', () => {
    it('should display correct payment method badge for CASH', () => {
      const cashTransaction: Transaction[] = [mockTransactions[0]];
      render(
        <TransactionHistoryList
          transactions={cashTransaction}
          loading={false}
          page={1}
          limit={20}
          total={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByText('Cash')).toBeInTheDocument();
    });

    it('should display correct payment method badge for MEMBER_CREDIT', () => {
      const memberTransaction: Transaction[] = [mockTransactions[1]];
      render(
        <TransactionHistoryList
          transactions={memberTransaction}
          loading={false}
          page={1}
          limit={20}
          total={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByText('Member')).toBeInTheDocument();
    });

    it('should display correct payment method badge for TEMPO', () => {
      const tempoTransaction: Transaction[] = [mockTransactions[2]];
      render(
        <TransactionHistoryList
          transactions={tempoTransaction}
          loading={false}
          page={1}
          limit={20}
          total={1}
          totalPages={1}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      expect(screen.getByText('Tempo')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should disable pagination controls while loading', () => {
      render(
        <TransactionHistoryList
          transactions={mockTransactions}
          loading={true}
          page={1}
          limit={1}
          total={3}
          totalPages={3}
          onPageChange={mockOnPageChange}
          onViewDetails={mockOnViewDetails}
        />
      );

      const nextButton = screen.getByText(/Next/).closest('button');
      expect(nextButton).toBeDisabled();
    });
  });
});
