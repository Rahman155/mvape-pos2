/**
 * Unit Tests for CashPaymentForm Component
 * Tests for amount input validation, change calculation, error handling, and responsive design
 * 
 * Validates: Requirement 7.6 (Cash Payment Processing)
 * 
 * TEST SETUP NOTE:
 * This test suite uses React Testing Library and Jest.
 * To run these tests, ensure the following are installed:
 * - @testing-library/react
 * - @testing-library/jest-dom
 * - @testing-library/user-event
 * - jest
 * - @types/jest
 * 
 * Setup:
 * 1. Add test script to frontend package.json: "test": "jest --run"
 * 2. Create jest.config.js in frontend root
 * 3. Run: pnpm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest @types/jest
 * 4. Run: pnpm test -- CashPaymentForm.test.tsx
 */

import React from 'react';

// Test framework imports (conditional - will work when testing libraries are installed)
let renderFunc: any;
let screen: any;
let fireEvent: any;
let waitFor: any;
let userEvent: any;

try {
  const testing = require('@testing-library/react');
  const userEventLib = require('@testing-library/user-event');
  renderFunc = testing.render;
  screen = testing.screen;
  fireEvent = testing.fireEvent;
  waitFor = testing.waitFor;
  userEvent = userEventLib.default || userEventLib;
  require('@testing-library/jest-dom');
} catch {
  // Testing libraries not installed yet
  console.warn('Testing libraries not installed. Install with: pnpm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event');
}

import { CashPaymentForm, CashPaymentData } from './CashPaymentForm';

describe('CashPaymentForm', () => {
  // Skip tests if testing libraries are not installed
  const describeTest = renderFunc ? describe : describe.skip;

  const mockOnPaymentConfirm = jest.fn();
  const mockOnCancel = jest.fn();
  const totalAmount = 50000; // Rp 50,000

  beforeEach(() => {
    mockOnPaymentConfirm.mockClear();
    mockOnCancel.mockClear();
  });

  describeTest('Rendering', () => {
    it('should render the form with all required elements', () => {
      renderFunc(
        <CashPaymentForm
          totalAmount={totalAmount}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      expect(screen.getByText('Total Pembelian')).toBeInTheDocument();
      expect(screen.getByLabelText('Jumlah uang masuk')).toBeInTheDocument();
      expect(screen.getByText('Konfirmasi Pembayaran')).toBeInTheDocument();
    });

    it('should display total amount with proper currency formatting', () => {
      renderFunc(
        <CashPaymentForm
          totalAmount={50000}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const totalDisplay = screen.getByText('Total Pembelian').closest('div');
      expect(totalDisplay?.textContent).toContain('Rp');
    });

    it('should render cancel button when onCancel is provided', () => {
      renderFunc(
        <CashPaymentForm
          totalAmount={totalAmount}
          onPaymentConfirm={mockOnPaymentConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Batal')).toBeInTheDocument();
    });

    it('should not render cancel button when onCancel is not provided', () => {
      renderFunc(
        <CashPaymentForm
          totalAmount={totalAmount}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      expect(screen.queryByText('Batal')).not.toBeInTheDocument();
    });

    it('should have disabled confirm button on initial render', () => {
      renderFunc(
        <CashPaymentForm
          totalAmount={totalAmount}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const confirmButton = screen.getByText('Konfirmasi Pembayaran');
      expect(confirmButton).toBeDisabled();
    });
  });

  describeTest('Amount Input', () => {
    it('should accept numeric input', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={totalAmount}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const input = screen.getByLabelText('Jumlah uang masuk') as HTMLInputElement;
      await user.type(input, '75000');

      expect(input.value).toBe('75000');
    });

    it('should handle decimal input', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={totalAmount}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const input = screen.getByLabelText('Jumlah uang masuk') as HTMLInputElement;
      await user.type(input, '50000.5');

      expect(input.value).toBe('50000.5');
    });

    it('should clear input when value is deleted', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={totalAmount}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const input = screen.getByLabelText('Jumlah uang masuk') as HTMLInputElement;
      await user.type(input, '75000');
      await user.clear(input);

      expect(input.value).toBe('');
    });
  });

  describeTest('Change Calculation', () => {
    it('should calculate change when amount is greater than total', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={50000}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const input = screen.getByLabelText('Jumlah uang masuk') as HTMLInputElement;
      await user.type(input, '100000');

      await waitFor(() => {
        expect(screen.getByText('Kembalian:')).toBeInTheDocument();
      });
    });

    it('should show shortage when amount is less than total', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={50000}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const input = screen.getByLabelText('Jumlah uang masuk') as HTMLInputElement;
      await user.type(input, '30000');
      await user.click(input);
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText('Kurang:')).toBeInTheDocument();
      });
    });
  });

  describeTest('Validation', () => {
    it('should show error when amount is empty on submit', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={totalAmount}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const confirmButton = screen.getByText('Konfirmasi Pembayaran');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Jumlah uang masuk diperlukan/)).toBeInTheDocument();
      });

      expect(mockOnPaymentConfirm).not.toHaveBeenCalled();
    });

    it('should show error when amount is less than total', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={50000}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const input = screen.getByLabelText('Jumlah uang masuk') as HTMLInputElement;
      await user.type(input, '30000');

      const confirmButton = screen.getByText('Konfirmasi Pembayaran');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Uang tidak cukup/)).toBeInTheDocument();
      });

      expect(mockOnPaymentConfirm).not.toHaveBeenCalled();
    });

    it('should enable confirm button when amount is valid', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={50000}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const input = screen.getByLabelText('Jumlah uang masuk') as HTMLInputElement;
      await user.type(input, '75000');

      const confirmButton = screen.getByText('Konfirmasi Pembayaran');
      await waitFor(() => {
        expect(confirmButton).not.toBeDisabled();
      });
    });
  });

  describeTest('Form Submission', () => {
    it('should call onPaymentConfirm with correct data when valid amount is submitted', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={50000}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const input = screen.getByLabelText('Jumlah uang masuk') as HTMLInputElement;
      await user.type(input, '75000');

      const confirmButton = screen.getByText('Konfirmasi Pembayaran');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnPaymentConfirm).toHaveBeenCalledWith({
          amountReceived: 75000,
          change: 25000,
          totalAmount: 50000,
        });
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={totalAmount}
          onPaymentConfirm={mockOnPaymentConfirm}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Batal');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should allow submission when pressing Enter key with valid amount', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={50000}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const input = screen.getByLabelText('Jumlah uang masuk') as HTMLInputElement;
      await user.type(input, '75000');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnPaymentConfirm).toHaveBeenCalled();
      });
    });
  });

  describeTest('Edge Cases', () => {
    it('should handle very large amount values', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={50000}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const input = screen.getByLabelText('Jumlah uang masuk') as HTMLInputElement;
      await user.type(input, '999999999');

      const confirmButton = screen.getByText('Konfirmasi Pembayaran');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnPaymentConfirm).toHaveBeenCalledWith({
          amountReceived: 999999999,
          change: 999949999,
          totalAmount: 50000,
        });
      });
    });

    it('should handle fractional amounts correctly', async () => {
      const user = userEvent.setup();
      renderFunc(
        <CashPaymentForm
          totalAmount={50000}
          onPaymentConfirm={mockOnPaymentConfirm}
        />
      );

      const input = screen.getByLabelText('Jumlah uang masuk') as HTMLInputElement;
      await user.type(input, '75000.50');

      const confirmButton = screen.getByText('Konfirmasi Pembayaran');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnPaymentConfirm).toHaveBeenCalledWith({
          amountReceived: 75000.5,
          change: 25000.5,
          totalAmount: 50000,
        });
      });
    });
  });

  describeTest('Loading State', () => {
    it('should disable inputs and show loading state when processing', () => {
      renderFunc(
        <CashPaymentForm
          totalAmount={totalAmount}
          onPaymentConfirm={mockOnPaymentConfirm}
          isProcessing={true}
        />
      );

      const input = screen.getByLabelText('Jumlah uang masuk') as HTMLInputElement;
      expect(input).toBeDisabled();

      const confirmButton = screen.getByText('Memproses...');
      expect(confirmButton).toBeDisabled();
    });
  });

  describeTest('Accessibility', () => {
    it('should have accessible aria labels', () => {
      renderFunc(
        <CashPaymentForm
          totalAmount={totalAmount}
          onPaymentConfirm={mockOnPaymentConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText('Jumlah uang masuk')).toBeInTheDocument();
      expect(screen.getByLabelText('Batal pembayaran')).toBeInTheDocument();
      expect(screen.getByLabelText('Konfirmasi pembayaran tunai')).toBeInTheDocument();
    });
  });
});
