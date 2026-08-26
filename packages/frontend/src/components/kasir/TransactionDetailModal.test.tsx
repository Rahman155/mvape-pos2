import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TransactionDetailModal } from './TransactionDetailModal';
import { Transaction } from '@/types';

// Mock the ReceiptReprintModal
jest.mock('./ReceiptReprintModal', () => ({
  ReceiptReprintModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? (
      <div data-testid="receipt-reprint-modal">
        <button onClick={onClose}>Close Reprint Modal</button>
      </div>
    ) : null
  ),
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

describe('TransactionDetailModal', () => {
  describe('Modal Display', () => {
    it('should display modal when isOpen is true', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText('Transaction Details')).toBeInTheDocument();
    });

    it('should not display modal when isOpen is false', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={false}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.queryByText('Transaction Details')).not.toBeInTheDocument();
    });

    it('should not render anything when transaction is undefined', () => {
      const handleClose = jest.fn();

      const { container } = render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={undefined}
        />
      );

      expect(container.firstChild).toBeEmptyDOMElement();
    });
  });

  describe('Transaction Information Display', () => {
    it('should display transaction ID', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText(/550e8400/i)).toBeInTheDocument();
    });

    it('should display transaction total amount', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText('150,000')).toBeInTheDocument();
    });

    it('should display transaction status', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });

    it('should display payment method', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText('Cash')).toBeInTheDocument();
    });
  });

  describe('Transaction Items Display', () => {
    it('should display items section', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText('Items')).toBeInTheDocument();
    });

    it('should display all transaction items', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      const productCells = screen.getAllByText(/prod-00/);
      expect(productCells.length).toBeGreaterThanOrEqual(2);
    });

    it('should display item quantities', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should display item prices', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      // Should show unit prices
      const prices = screen.getAllByText(/50,000/);
      expect(prices.length).toBeGreaterThanOrEqual(1);
    });

    it('should display empty message when no items', () => {
      const handleClose = jest.fn();
      const emptyTransaction = { ...mockTransaction, items: [] };

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={emptyTransaction}
        />
      );

      expect(screen.getByText(/No items in this transaction/)).toBeInTheDocument();
    });
  });

  describe('Payment Information Display', () => {
    it('should display payment information section', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText('Payment Information')).toBeInTheDocument();
    });

    it('should display different payment methods correctly', () => {
      const handleClose = jest.fn();
      const tempoTransaction = { ...mockTransaction, paymentMethod: 'TEMPO' };

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={tempoTransaction}
        />
      );

      expect(screen.getByText('Tempo (Credit)')).toBeInTheDocument();
    });

    it('should display member credit payment method', () => {
      const handleClose = jest.fn();
      const memberTransaction = { ...mockTransaction, paymentMethod: 'MEMBER_CREDIT' };

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={memberTransaction}
        />
      );

      expect(screen.getByText('Member Credit')).toBeInTheDocument();
    });

    it('should display amount paid', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText('Amount Paid')).toBeInTheDocument();
    });

    it('should display created and updated timestamps', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
  });

  describe('Edit Status', () => {
    it('should display edited badge for modified transactions', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockEditedTransaction}
        />
      );

      expect(screen.getByText(/Edited/)).toBeInTheDocument();
    });

    it('should not display edited badge for unmodified transactions', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      const editedBadges = screen.queryAllByText(/✏️ Edited/);
      expect(editedBadges.length).toBe(0);
    });
  });

  describe('Notes Display', () => {
    it('should display notes when present', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText('Test transaction')).toBeInTheDocument();
    });

    it('should not display notes section when notes are empty', () => {
      const handleClose = jest.fn();
      const noNotesTransaction = { ...mockTransaction, notes: undefined };

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={noNotesTransaction}
        />
      );

      const notesLabels = screen.queryAllByText('Notes');
      expect(notesLabels.length).toBe(0);
    });
  });

  describe('Modal Actions', () => {
    it('should display print receipt button', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText(/Print Receipt/)).toBeInTheDocument();
    });

    it('should display close button', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(handleClose).toHaveBeenCalled();
    });

    it('should open receipt reprint modal when print button is clicked', async () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      const printButton = screen.getByText(/Print Receipt/);
      fireEvent.click(printButton);

      await waitFor(() => {
        expect(screen.getByTestId('receipt-reprint-modal')).toBeInTheDocument();
      });
    });

    it('should close receipt modal when close button in receipt modal is clicked', async () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      const printButton = screen.getByText(/Print Receipt/);
      fireEvent.click(printButton);

      await waitFor(() => {
        expect(screen.getByTestId('receipt-reprint-modal')).toBeInTheDocument();
      });

      const closeReprintButton = screen.getByText('Close Reprint Modal');
      fireEvent.click(closeReprintButton);

      await waitFor(() => {
        expect(screen.queryByTestId('receipt-reprint-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Status Colors', () => {
    it('should apply correct styling for COMPLETED status', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      const statusElement = screen.getByText('COMPLETED');
      expect(statusElement).toHaveClass('bg-green-100');
    });

    it('should apply correct styling for PENDING status', () => {
      const handleClose = jest.fn();
      const pendingTransaction = { ...mockTransaction, status: 'PENDING' };

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={pendingTransaction}
        />
      );

      const statusElement = screen.getByText('PENDING');
      expect(statusElement).toHaveClass('bg-yellow-100');
    });

    it('should apply correct styling for CANCELLED status', () => {
      const handleClose = jest.fn();
      const cancelledTransaction = { ...mockTransaction, status: 'CANCELLED' };

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={cancelledTransaction}
        />
      );

      const statusElement = screen.getByText('CANCELLED');
      expect(statusElement).toHaveClass('bg-red-100');
    });
  });

  describe('Payment Method Colors', () => {
    it('should apply correct styling for CASH payment method', () => {
      const handleClose = jest.fn();

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      const paymentBadges = screen.getAllByText('Cash');
      expect(paymentBadges.length).toBeGreaterThan(0);
      expect(paymentBadges[0]).toHaveClass('bg-blue-100');
    });

    it('should apply correct styling for MEMBER_CREDIT payment method', () => {
      const handleClose = jest.fn();
      const memberTransaction = { ...mockTransaction, paymentMethod: 'MEMBER_CREDIT' };

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={memberTransaction}
        />
      );

      const paymentBadges = screen.getAllByText('Member Credit');
      expect(paymentBadges.length).toBeGreaterThan(0);
      expect(paymentBadges[0]).toHaveClass('bg-green-100');
    });

    it('should apply correct styling for TEMPO payment method', () => {
      const handleClose = jest.fn();
      const tempoTransaction = { ...mockTransaction, paymentMethod: 'TEMPO' };

      render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={tempoTransaction}
        />
      );

      const paymentBadges = screen.getAllByText('Tempo (Credit)');
      expect(paymentBadges.length).toBeGreaterThan(0);
      expect(paymentBadges[0]).toHaveClass('bg-purple-100');
    });
  });

  describe('Responsive Design', () => {
    it('should render modal with proper styling', () => {
      const handleClose = jest.fn();

      const { container } = render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      const modal = container.querySelector('[role="dialog"]');
      expect(modal).toBeInTheDocument();
    });

    it('should have scrollable content for large modals', () => {
      const handleClose = jest.fn();

      const { container } = render(
        <TransactionDetailModal
          isOpen={true}
          onClose={handleClose}
          transaction={mockTransaction}
        />
      );

      const modal = container.querySelector('[role="dialog"]');
      expect(modal).toHaveClass('max-h-[90vh]');
      expect(modal).toHaveClass('overflow-y-auto');
    });
  });
});
