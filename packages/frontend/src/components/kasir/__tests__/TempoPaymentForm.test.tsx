/**
 * Tempo Payment Form Component Tests
 * Tests for tempo (credit) payment form with customer information validation,
 * due date calculation, and payable record submission
 * 
 * **Validates: Requirements 7.7, 18.2**
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TempoPaymentForm, TempoPaymentData } from '../TempoPaymentForm';

describe('TempoPaymentForm Component', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  const cartTotal = 150000;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the tempo payment form', () => {
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Total Pembelian Tempo/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nama Pelanggan/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nomor Telepon Pelanggan/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Durasi Pembayaran/i)).toBeInTheDocument();
    });

    it('should display cart total correctly', () => {
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText(`Rp ${cartTotal.toLocaleString('id-ID')}`)).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /Batal/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Proses Pembayaran Tempo/i })).toBeInTheDocument();
    });

    it('should display information box with tempo payment details', () => {
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText(/Informasi Pembayaran Tempo/i)).toBeInTheDocument();
      expect(screen.getByText(/Pelanggan harus membayar sesuai tanggal jatuh tempo/i)).toBeInTheDocument();
    });
  });

  describe('Customer Name Validation', () => {
    it('should accept valid customer name', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
      await user.type(nameInput, 'Budi Santoso');

      expect(nameInput).toHaveValue('Budi Santoso');
    });

    it('should require customer name', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Customer name is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate minimum customer name length (3 characters)', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
      await user.type(nameInput, 'ab');

      const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Customer name must be at least 3 characters/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should trim whitespace from customer name', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
      const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx atau \+62xxxxxxxxxx/i);
      const durationSelect = screen.getByDisplayValue('-- Pilih Durasi --');

      await user.type(nameInput, '  Budi Santoso  ');
      await user.type(phoneInput, '08123456789');
      await user.selectOptions(durationSelect, '7');

      const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
        const callArgs = mockOnSubmit.mock.calls[0][0];
        expect(callArgs.customerName).toBe('Budi Santoso'); // Trimmed
      });
    });
  });

  describe('Customer Phone Validation', () => {
    it('should accept valid customer phone numbers', async () => {
      const user = userEvent.setup();
      const validPhones = ['08123456789', '081234567890', '+6281234567890'];

      for (const phone of validPhones) {
        jest.clearAllMocks();
        render(
          <TempoPaymentForm
            cartTotal={cartTotal}
            onSubmit={mockOnSubmit}
          />
        );

        const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
        const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx atau \+62xxxxxxxxxx/i);
        const durationSelect = screen.getByDisplayValue('-- Pilih Durasi --');

        await user.type(nameInput, 'Budi Santoso');
        await user.type(phoneInput, phone);
        await user.selectOptions(durationSelect, '7');

        const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalled();
        });

        // Clean up for next iteration
        const form = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
        form.closest('form')?.parentElement?.remove();
      }
    });

    it('should require customer phone', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
      await user.type(nameInput, 'Budi Santoso');

      const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Customer phone is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate phone number format', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
      const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx atau \+62xxxxxxxxxx/i);

      await user.type(nameInput, 'Budi');
      await user.type(phoneInput, '1234'); // Invalid format

      const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Customer phone must be a valid phone number/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should trim whitespace from phone number', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
      const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx atau \+62xxxxxxxxxx/i);
      const durationSelect = screen.getByDisplayValue('-- Pilih Durasi --');

      await user.type(nameInput, 'Budi Santoso');
      await user.type(phoneInput, '  08123456789  ');
      await user.selectOptions(durationSelect, '7');

      const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
        const callArgs = mockOnSubmit.mock.calls[0][0];
        expect(callArgs.customerPhone).toBe('08123456789'); // Trimmed
      });
    });
  });

  describe('Duration Validation', () => {
    it('should require duration selection', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
      const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx atau \+62xxxxxxxxxx/i);

      await user.type(nameInput, 'Budi Santoso');
      await user.type(phoneInput, '08123456789');

      const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Payment duration is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should accept valid duration options', async () => {
      const user = userEvent.setup();
      const durations = ['3', '7', '14', '30', '60', '90'];

      for (const duration of durations) {
        jest.clearAllMocks();
        render(
          <TempoPaymentForm
            cartTotal={cartTotal}
            onSubmit={mockOnSubmit}
          />
        );

        const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
        const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx atau \+62xxxxxxxxxx/i);
        const durationSelect = screen.getByDisplayValue('-- Pilih Durasi --');

        await user.type(nameInput, 'Budi Santoso');
        await user.type(phoneInput, '08123456789');
        await user.selectOptions(durationSelect, duration);

        const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockOnSubmit).toHaveBeenCalledWith(
            expect.objectContaining({
              durationDays: parseInt(duration, 10),
            })
          );
        });

        // Clean up
        const form = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
        form.closest('form')?.parentElement?.remove();
      }
    });
  });

  describe('Due Date Calculation', () => {
    it('should calculate correct due date for 7-day duration', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const durationSelect = screen.getByDisplayValue('-- Pilih Durasi --');
      await user.selectOptions(durationSelect, '7');

      // Expected date is 7 days from today
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 7);
      const expectedDateStr = expectedDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await waitFor(() => {
        expect(screen.getByText(expectedDateStr)).toBeInTheDocument();
      });
    });

    it('should calculate correct due date for 30-day duration', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const durationSelect = screen.getByDisplayValue('-- Pilih Durasi --');
      await user.selectOptions(durationSelect, '30');

      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 30);
      const expectedDateStr = expectedDate.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      await waitFor(() => {
        expect(screen.getByText(expectedDateStr)).toBeInTheDocument();
      });
    });

    it('should display due date after duration selection', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.queryByText(/Tanggal Jatuh Tempo:/i)).not.toBeInTheDocument();

      const durationSelect = screen.getByDisplayValue('-- Pilih Durasi --');
      await user.selectOptions(durationSelect, '14');

      await waitFor(() => {
        expect(screen.getByText(/Tanggal Jatuh Tempo:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit valid tempo payment data', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
      const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx atau \+62xxxxxxxxxx/i);
      const durationSelect = screen.getByDisplayValue('-- Pilih Durasi --');

      await user.type(nameInput, 'Budi Santoso');
      await user.type(phoneInput, '08123456789');
      await user.selectOptions(durationSelect, '14');

      const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            customerName: 'Budi Santoso',
            customerPhone: '08123456789',
            durationDays: 14,
            totalAmount: cartTotal,
          })
        );
      });
    });

    it('should include total amount in submission', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
      const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx atau \+62xxxxxxxxxx/i);
      const durationSelect = screen.getByDisplayValue('-- Pilih Durasi --');

      await user.type(nameInput, 'Budi Santoso');
      await user.type(phoneInput, '08123456789');
      await user.selectOptions(durationSelect, '7');

      const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
      await user.click(submitButton);

      await waitFor(() => {
        const callArgs = mockOnSubmit.mock.calls[0][0];
        expect(callArgs.totalAmount).toBe(cartTotal);
      });
    });

    it('should include calculated due date in submission', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
      const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx atau \+62xxxxxxxxxx/i);
      const durationSelect = screen.getByDisplayValue('-- Pilih Durasi --');

      await user.type(nameInput, 'Budi Santoso');
      await user.type(phoneInput, '08123456789');
      await user.selectOptions(durationSelect, '14');

      const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
      await user.click(submitButton);

      await waitFor(() => {
        const callArgs = mockOnSubmit.mock.calls[0][0];
        expect(callArgs.dueDate).toBeTruthy();
        
        // Verify it's a valid date string
        const dueDate = new Date(callArgs.dueDate);
        expect(!isNaN(dueDate.getTime())).toBe(true);
      });
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Batal/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should disable submit button when processing', () => {
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
          isProcessing={true}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Memproses Pembayaran/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on submission failure', async () => {
      const user = userEvent.setup();
      const mockOnSubmitWithError = jest.fn().mockRejectedValue(
        new Error('Failed to process payment')
      );

      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmitWithError}
        />
      );

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
      const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx atau \+62xxxxxxxxxx/i);
      const durationSelect = screen.getByDisplayValue('-- Pilih Durasi --');

      await user.type(nameInput, 'Budi Santoso');
      await user.type(phoneInput, '08123456789');
      await user.selectOptions(durationSelect, '14');

      const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to process payment/i)).toBeInTheDocument();
      });
    });

    it('should clear errors when user modifies input', async () => {
      const user = userEvent.setup();
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Proses Pembayaran Tempo/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Customer name is required/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/i);
      await user.type(nameInput, 'B');

      // Error should be cleared
      expect(screen.queryByText(/Customer name is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/Nama Pelanggan/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nomor Telepon Pelanggan/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Durasi Pembayaran/i)).toBeInTheDocument();
    });

    it('should mark required fields with asterisk', () => {
      render(
        <TempoPaymentForm
          cartTotal={cartTotal}
          onSubmit={mockOnSubmit}
        />
      );

      const labels = screen.getAllByText('*');
      expect(labels.length).toBeGreaterThan(0);
    });
  });
});
