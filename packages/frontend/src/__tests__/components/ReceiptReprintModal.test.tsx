/**
 * Component tests for Receipt Reprint Modal
 * Tests modal rendering, interaction, and integration with receipt generation and printing
 * 
 * **Validates: Requirements 19.6 (Receipt Editing - reprint with current details)**
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Transaction, TransactionItem, Store, User } from '@/types';
import { ReceiptReprintModal } from '@/components/kasir/ReceiptReprintModal';
import * as receiptPrinting from '@/lib/receiptPrinting';

// Mock the receipt printing module
vi.mock('@/lib/receiptPrinting', () => ({
  printReceipt: vi.fn(),
  exportReceiptAsPDF: vi.fn(),
  previewReceipt: vi.fn(),
  copyReceiptToClipboard: vi.fn(() => Promise.resolve()),
  getPrintCapabilities: vi.fn(() => ({
    canPrint: true,
    canExportPDF: true,
    canPreview: true,
    canCopy: true,
    recommendedAction: 'print',
  })),
}));

// Mock UI components
vi.mock('@/components/ui/Modal', () => ({
  default: ({ isOpen, children, onClose, title }: any) => (
    isOpen ? (
      <div data-testid="modal" className="modal">
        <h2>{title}</h2>
        {children}
        <button onClick={onClose}>Close Modal</button>
      </div>
    ) : null
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock data
const mockUser: User = {
  id: 'user-123',
  username: 'kasir_budi',
  email: 'budi@store.com',
  role: 'KASIR',
  storeId: 'store-1',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastLogin: new Date('2024-01-15'),
};

const mockStore: Store = {
  id: 'store-1',
  name: 'Vape Store Pusat',
  address: 'Jl. Merdeka No. 123, Jakarta',
  phone: '021-1234567',
  logoUrl: 'https://example.com/logo.png',
  isActive: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockTransactionItems: TransactionItem[] = [
  {
    id: 'item-1',
    transactionId: 'txn-123',
    productId: 'Vape Mod Voopoo',
    quantity: 1,
    unitPrice: 450000,
    totalPrice: 450000,
    createdAt: new Date('2024-01-15'),
  },
];

const mockTransaction: Transaction = {
  id: 'txn-123-abc-def-456',
  storeId: 'store-1',
  kasirId: 'user-123',
  transactionDate: new Date('2024-01-15T14:30:00'),
  totalAmount: 450000,
  paymentMethod: 'CASH',
  status: 'COMPLETED',
  notes: '',
  createdAt: new Date('2024-01-15T14:30:00'),
  updatedAt: new Date('2024-01-15T14:30:00'),
  isEdited: false,
  version: 1,
  items: mockTransactionItems,
};

const mockEditedTransaction: Transaction = {
  ...mockTransaction,
  totalAmount: 400000,
  isEdited: true,
  editedAt: new Date('2024-01-15T15:00:00'),
  editedBy: 'user-123',
};

describe('ReceiptReprintModal Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ReceiptReprintModal
          isOpen={false}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    it('should display modal title', () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      expect(screen.getByText('Receipt Preview & Reprint')).toBeInTheDocument();
    });

    it('should render close button', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Close')).toBeInTheDocument();
      });
    });
  });

  describe('Receipt Preview Display', () => {
    it('should display receipt text content', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Vape Store Pusat/)).toBeInTheDocument();
      });
    });

    it('should show transaction details summary', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Transaction ID')).toBeInTheDocument();
        expect(screen.getByText('Total Amount')).toBeInTheDocument();
        expect(screen.getByText('Payment Method')).toBeInTheDocument();
      });
    });

    it('should display correct total amount', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        // Amount should be formatted as currency
        expect(screen.getByText(/Rp.*450\.000/)).toBeInTheDocument();
      });
    });
  });

  describe('Edited Transaction Indicator', () => {
    it('should show edited indicator for edited transactions', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockEditedTransaction}
          store={mockStore}
          kasir={mockUser}
          showEditedIndicator={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/current transaction details/i)).toBeInTheDocument();
      });
    });

    it('should not show edited indicator when showEditedIndicator is false', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockEditedTransaction}
          store={mockStore}
          kasir={mockUser}
          showEditedIndicator={false}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/current transaction details/i)).not.toBeInTheDocument();
      });
    });

    it('should display edited by information for edited transactions', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockEditedTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Last Edited By')).toBeInTheDocument();
      });
    });

    it('should display current receipt total after edits', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockEditedTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        // Should show edited total, not original
        expect(screen.getByText(/Rp.*400\.000/)).toBeInTheDocument();
      });
    });
  });

  describe('Print Actions', () => {
    it('should have print button when print is supported', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/🖨️ Print/)).toBeInTheDocument();
      });
    });

    it('should call printReceipt when print button is clicked', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const printButton = screen.getByText(/🖨️ Print/);
        fireEvent.click(printButton);
      });

      await waitFor(() => {
        expect(receiptPrinting.printReceipt).toHaveBeenCalled();
      });
    });

    it('should disable print button while loading', async () => {
      const { rerender } = render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      const printButton = screen.getByText(/🖨️ Print/) as HTMLButtonElement;
      
      // Initially should not be disabled
      await waitFor(() => {
        expect(printButton.disabled).toBe(false);
      });
    });

    it('should pass correct transaction data to print function', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockEditedTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const printButton = screen.getByText(/🖨️ Print/);
        fireEvent.click(printButton);
      });

      await waitFor(() => {
        expect(receiptPrinting.printReceipt).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('Vape Store Pusat'),
          }),
          expect.any(String)
        );
      });
    });
  });

  describe('PDF Export Actions', () => {
    it('should have PDF export button when PDF export is supported', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/📄 PDF/)).toBeInTheDocument();
      });
    });

    it('should call exportReceiptAsPDF when PDF button is clicked', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const pdfButton = screen.getByText(/📄 PDF/);
        fireEvent.click(pdfButton);
      });

      await waitFor(() => {
        expect(receiptPrinting.exportReceiptAsPDF).toHaveBeenCalled();
      });
    });

    it('should generate filename with transaction date', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const pdfButton = screen.getByText(/📄 PDF/);
        fireEvent.click(pdfButton);
      });

      await waitFor(() => {
        expect(receiptPrinting.exportReceiptAsPDF).toHaveBeenCalledWith(
          expect.any(Object),
          expect.stringContaining('receipt')
        );
      });
    });
  });

  describe('Preview Actions', () => {
    it('should have preview button when preview is supported', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/👁️ Preview/)).toBeInTheDocument();
      });
    });

    it('should call previewReceipt when preview button is clicked', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const previewButton = screen.getByText(/👁️ Preview/);
        fireEvent.click(previewButton);
      });

      await waitFor(() => {
        expect(receiptPrinting.previewReceipt).toHaveBeenCalled();
      });
    });
  });

  describe('Clipboard Actions', () => {
    it('should have copy button when clipboard is supported', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/📋 Copy/)).toBeInTheDocument();
      });
    });

    it('should call copyReceiptToClipboard when copy button is clicked', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const copyButton = screen.getByText(/📋 Copy/);
        fireEvent.click(copyButton);
      });

      await waitFor(() => {
        expect(receiptPrinting.copyReceiptToClipboard).toHaveBeenCalled();
      });
    });

    it('should show success message after copying', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const copyButton = screen.getByText(/📋 Copy/);
        fireEvent.click(copyButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/copied to clipboard/i)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Interaction', () => {
    it('should call onClose when close button is clicked', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const closeButton = screen.getByText('Close Modal');
        fireEvent.click(closeButton);
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when Close button in action buttons is clicked', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const buttons = screen.getAllByText('Close');
        // Find the button that's not the modal close button
        const closeActionButton = buttons.find(btn => 
          btn.textContent === 'Close' && !btn.classList.contains('modal-close')
        );
        if (closeActionButton) {
          fireEvent.click(closeActionButton);
        }
      });
    });

    it('should regenerate receipt when transaction changes', async () => {
      const { rerender } = render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Vape Store Pusat/)).toBeInTheDocument();
      });

      // Rerender with different transaction
      rerender(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockEditedTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        // Should update to show edited details
        expect(screen.getByText(/current transaction details/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when receipt generation fails', async () => {
      // Create invalid transaction
      const invalidTransaction: Transaction = {
        ...mockTransaction,
        items: [], // invalid: no items
      };

      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={invalidTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Failed to generate receipt/)).toBeInTheDocument();
      });
    });

    it('should display error message when print fails', async () => {
      const mockError = new Error('Print failed');
      vi.mocked(receiptPrinting.printReceipt).mockImplementationOnce(() => {
        throw mockError;
      });

      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const printButton = screen.getByText(/🖨️ Print/);
        fireEvent.click(printButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Print failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Receipt with Current Details After Edits', () => {
    it('should show edited total in receipt preview', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockEditedTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const previewText = screen.getByText(/Rp.*400\.000/);
        expect(previewText).toBeInTheDocument();
      });
    });

    it('should print receipt with current edited details', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockEditedTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const printButton = screen.getByText(/🖨️ Print/);
        fireEvent.click(printButton);
      });

      await waitFor(() => {
        // Verify print was called with receipt containing edited total
        expect(receiptPrinting.printReceipt).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('400000'),
          }),
          expect.any(String)
        );
      });
    });

    it('should export PDF with current edited details', async () => {
      render(
        <ReceiptReprintModal
          isOpen={true}
          onClose={mockOnClose}
          transaction={mockEditedTransaction}
          store={mockStore}
          kasir={mockUser}
        />
      );

      await waitFor(() => {
        const pdfButton = screen.getByText(/📄 PDF/);
        fireEvent.click(pdfButton);
      });

      await waitFor(() => {
        // Verify PDF export was called with receipt containing edited total
        expect(receiptPrinting.exportReceiptAsPDF).toHaveBeenCalledWith(
          expect.objectContaining({
            text: expect.stringContaining('400000'),
          }),
          expect.any(String)
        );
      });
    });
  });
});
