/**
 * Transaction Edit Tests
 * Tests for editing transaction details, validation, and history tracking
 * Requirements: 19 (Receipt Editing), 8.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams, useRouter } from 'next/navigation';
import TransactionEditPage from '../page';
import { apiService } from '@/lib/api';
import { Transaction, TransactionItem } from '@/types';

// Mock dependencies
jest.mock('next/navigation');
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123', role: 'KASIR', storeId: 'store-123' },
  }),
}));

jest.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => ({
    isOnline: true,
  }),
}));

jest.mock('@/lib/api');
jest.mock('@/lib/utils', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  formatDateTime: (date: Date) => date.toISOString(),
}));

describe('Transaction Edit Page', () => {
  const mockTransaction: Transaction = {
    id: 'txn-123',
    storeId: 'store-123',
    kasirId: 'user-123',
    transactionDate: new Date('2024-01-15'),
    totalAmount: 100000,
    paymentMethod: 'CASH',
    status: 'COMPLETED',
    notes: 'Original notes',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    editedAt: undefined,
    editedBy: undefined,
    isEdited: false,
    version: 1,
    items: [
      {
        id: 'item-1',
        transactionId: 'txn-123',
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 50000,
        totalPrice: 100000,
        createdAt: new Date('2024-01-15'),
      },
    ],
  };

  const mockProducts = [
    {
      id: 'prod-1',
      name: 'Product 1',
      sku: 'SKU-001',
      category: 'Vapor',
      costPrice: 30000,
      sellingPrice: 50000,
      description: 'Product 1 description',
      imageUrl: 'http://example.com/img1.jpg',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ id: 'txn-123' });
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });

    (apiService.transactions.get as jest.Mock).mockResolvedValue({
      data: mockTransaction,
    });

    (apiService.products.list as jest.Mock).mockResolvedValue({
      data: mockProducts,
    });
  });

  describe('Requirement 19.1-19.4: Form Display and Field Editing', () => {
    it('should display transaction edit form with original data', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Original notes')).toBeInTheDocument();
      });

      expect(screen.getByText(/Edit Transaction/i)).toBeInTheDocument();
      expect(screen.getByText(/Original Total:/)).toBeInTheDocument();
    });

    it('should allow editing item quantities and recalculate total', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });

      const quantityInput = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: '3' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('3')).toBeInTheDocument();
        expect(screen.getByText(/\$150000\.00/)).toBeInTheDocument(); // New total
      });
    });

    it('should allow editing item unit prices and recalculate total', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
      });

      const priceInput = screen.getByDisplayValue('50000') as HTMLInputElement;
      fireEvent.change(priceInput, { target: { value: '60000' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('60000')).toBeInTheDocument();
        expect(screen.getByText(/\$120000\.00/)).toBeInTheDocument(); // New total
      });
    });

    it('should allow changing payment method', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('CASH')).toBeInTheDocument();
      });

      const paymentSelect = screen.getByDisplayValue('CASH') as HTMLSelectElement;
      fireEvent.change(paymentSelect, { target: { value: 'MEMBER_CREDIT' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('MEMBER_CREDIT')).toBeInTheDocument();
      });
    });

    it('should allow editing notes', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Original notes')).toBeInTheDocument();
      });

      const notesInput = screen.getByDisplayValue('Original notes') as HTMLTextAreaElement;
      fireEvent.change(notesInput, { target: { value: 'Updated notes' } });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Updated notes')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 19.3: Total Recalculation', () => {
    it('should recalculate total when quantity changes', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });

      const quantityInput = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: '5' } });

      await waitFor(() => {
        // Original: 2 * 50000 = 100000
        // Updated: 5 * 50000 = 250000
        expect(screen.getByText(/\$250000\.00/)).toBeInTheDocument();
      });
    });

    it('should recalculate total when price changes', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
      });

      const priceInput = screen.getByDisplayValue('50000') as HTMLInputElement;
      fireEvent.change(priceInput, { target: { value: '75000' } });

      await waitFor(() => {
        // Original: 2 * 50000 = 100000
        // Updated: 2 * 75000 = 150000
        expect(screen.getByText(/\$150000\.00/)).toBeInTheDocument();
      });
    });

    it('should handle multiple item edits correctly', async () => {
      const multiItemTransaction: Transaction = {
        ...mockTransaction,
        items: [
          {
            id: 'item-1',
            transactionId: 'txn-123',
            productId: 'prod-1',
            quantity: 2,
            unitPrice: 50000,
            totalPrice: 100000,
            createdAt: new Date('2024-01-15'),
          },
          {
            id: 'item-2',
            transactionId: 'txn-123',
            productId: 'prod-2',
            quantity: 1,
            unitPrice: 100000,
            totalPrice: 100000,
            createdAt: new Date('2024-01-15'),
          },
        ],
        totalAmount: 200000,
      };

      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: multiItemTransaction,
      });

      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getAllByDisplayValue('2')).toBeDefined();
      });

      const quantityInputs = screen.getAllByDisplayValue('2') as HTMLInputElement[];
      fireEvent.change(quantityInputs[0], { target: { value: '3' } });

      await waitFor(() => {
        // Item 1: 3 * 50000 = 150000
        // Item 2: 1 * 100000 = 100000
        // Total: 250000
        expect(screen.getByText(/\$250000\.00/)).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 19.2: Field Validation', () => {
    it('should prevent saving with empty items', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByText('Remove')).toBeInTheDocument();
      });

      const removeButton = screen.getByText('Remove');
      fireEvent.click(removeButton);

      const saveButton = screen.getByText(/Save Changes/i) as HTMLButtonElement;
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/must have at least one item/i)).toBeInTheDocument();
      });
    });

    it('should prevent saving with invalid quantities', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });

      const quantityInput = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: '0' } });

      const saveButton = screen.getByText(/Save Changes/i) as HTMLButtonElement;
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/quantity > 0/i)).toBeInTheDocument();
      });
    });

    it('should prevent saving with invalid prices', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
      });

      const priceInput = screen.getByDisplayValue('50000') as HTMLInputElement;
      fireEvent.change(priceInput, { target: { value: '-100' } });

      const saveButton = screen.getByText(/Save Changes/i) as HTMLButtonElement;
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/valid prices/i)).toBeInTheDocument();
      });
    });

    it('should require payment method', async () => {
      const transactionWithoutPaymentMethod = { ...mockTransaction, paymentMethod: '' };

      (apiService.transactions.get as jest.Mock).mockResolvedValue({
        data: transactionWithoutPaymentMethod,
      });

      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.queryByDisplayValue('CASH')).not.toBeInTheDocument();
      });

      const saveButton = screen.getByText(/Save Changes/i) as HTMLButtonElement;
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Payment method is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 19.4: Change Tracking and History', () => {
    it('should track when items are modified', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });

      const quantityInput = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: '3' } });

      await waitFor(() => {
        expect(screen.getByText(/Transaction items have been modified/i)).toBeInTheDocument();
      });
    });

    it('should track when payment method is changed', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('CASH')).toBeInTheDocument();
      });

      const paymentSelect = screen.getByDisplayValue('CASH') as HTMLSelectElement;
      fireEvent.change(paymentSelect, { target: { value: 'TEMPO' } });

      await waitFor(() => {
        expect(screen.getByText(/Payment method has been changed/i)).toBeInTheDocument();
      });
    });

    it('should track when notes are changed', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Original notes')).toBeInTheDocument();
      });

      const notesInput = screen.getByDisplayValue('Original notes') as HTMLTextAreaElement;
      fireEvent.change(notesInput, { target: { value: 'Updated notes' } });

      await waitFor(() => {
        expect(screen.getByText(/Notes have been modified/i)).toBeInTheDocument();
      });
    });

    it('should display change summary with total difference', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
      });

      const priceInput = screen.getByDisplayValue('50000') as HTMLInputElement;
      fireEvent.change(priceInput, { target: { value: '75000' } });

      await waitFor(() => {
        expect(screen.getByText(/Total has changed from/)).toBeInTheDocument();
        expect(screen.getByText(/\$100000\.00.*\$150000\.00/)).toBeDefined();
      });
    });
  });

  describe('Requirement 19: Save and History Recording', () => {
    it('should save changes and record edit history on the backend', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });

      const quantityInput = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: '3' } });

      const saveButton = await waitFor(
        () => screen.getByText(/Save Changes/) as HTMLButtonElement
      );
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(apiService.transactions.update).toHaveBeenCalledWith('txn-123', {
          items: expect.arrayContaining([
            expect.objectContaining({
              quantity: 3,
              totalPrice: 150000,
            }),
          ]),
          paymentMethod: 'CASH',
          notes: 'Original notes',
        });
      });
    });

    it('should display success message after saving', async () => {
      const updatedTransaction = {
        ...mockTransaction,
        isEdited: true,
        editedAt: new Date(),
        editedBy: 'user-123',
      };

      (apiService.transactions.update as jest.Mock).mockResolvedValue({
        data: updatedTransaction,
      });

      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });

      const quantityInput = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: '3' } });

      const saveButton = await waitFor(
        () => screen.getByText(/Save Changes/) as HTMLButtonElement
      );
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Transaction updated successfully/i)).toBeInTheDocument();
      });
    });

    it('should redirect to detail view after successful save', async () => {
      const router = { push: jest.fn() };
      (useRouter as jest.Mock).mockReturnValue(router);

      (apiService.transactions.update as jest.Mock).mockResolvedValue({
        data: mockTransaction,
      });

      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });

      const quantityInput = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: '3' } });

      const saveButton = await waitFor(
        () => screen.getByText(/Save Changes/) as HTMLButtonElement
      );
      fireEvent.click(saveButton);

      await waitFor(
        () => {
          expect(router.push).toHaveBeenCalledWith('/kasir/history/txn-123');
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Requirement 8.5: Edit Transaction Integration', () => {
    it('should display unsaved changes indicator', async () => {
      render(<TransactionEditPage />);

      // No unsaved changes initially
      expect(screen.queryByText(/Unsaved Changes/i)).not.toBeInTheDocument();

      // Make a change
      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });

      const quantityInput = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: '3' } });

      // Now unsaved changes should be visible
      await waitFor(() => {
        expect(screen.getByText(/Unsaved Changes/i)).toBeInTheDocument();
      });
    });

    it('should disable save button when no changes', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByText(/No Changes/)).toBeInTheDocument();
      });

      const saveButton = screen.getByText(/No Changes/) as HTMLButtonElement;
      expect(saveButton.disabled).toBe(true);
    });

    it('should enable save button when changes are made', async () => {
      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });

      const quantityInput = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: '3' } });

      await waitFor(() => {
        const saveButton = screen.getByText(/Save Changes/) as HTMLButtonElement;
        expect(saveButton.disabled).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when fetching transaction fails', async () => {
      (apiService.transactions.get as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch transaction details/i)).toBeInTheDocument();
      });
    });

    it('should display error when saving fails', async () => {
      (apiService.transactions.update as jest.Mock).mockRejectedValue(
        new Error('Save failed')
      );

      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
      });

      const quantityInput = screen.getByDisplayValue('2') as HTMLInputElement;
      fireEvent.change(quantityInput, { target: { value: '3' } });

      const saveButton = await waitFor(
        () => screen.getByText(/Save Changes/) as HTMLButtonElement
      );
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to save transaction changes/i)).toBeInTheDocument();
      });
    });
  });

  describe('Offline Support', () => {
    it('should show offline warning when offline', async () => {
      const useOnlineStatusMock = require('@/hooks/useOnlineStatus');
      useOnlineStatusMock.useOnlineStatus = () => ({ isOnline: false });

      render(<TransactionEditPage />);

      await waitFor(() => {
        expect(screen.getByText(/You are offline/i)).toBeInTheDocument();
      });
    });
  });
});
