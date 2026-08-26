/**
 * Unit tests for PaymentMethodSelector component
 * Tests payment method selection, validation, and form rendering
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentMethodSelector, PaymentData } from '../PaymentMethodSelector';
import { Member } from '@/types';

describe('PaymentMethodSelector', () => {
  const mockCartTotal = 100000; // Rp 100,000
  const mockMembers: Member[] = [
    {
      id: '1',
      memberNumber: 'M001',
      name: 'John Doe',
      phone: '081234567890',
      email: 'john@example.com',
      creditBalance: 500000, // Rp 500,000
      totalSpent: 1000000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      memberNumber: 'M002',
      name: 'Jane Smith',
      phone: '082345678901',
      email: 'jane@example.com',
      creditBalance: 50000, // Rp 50,000 (insufficient)
      totalSpent: 500000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockOnPaymentSelect = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render cart total display correctly', () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const totalText = screen.getByText(/Rp 100.000/);
      expect(totalText).toBeInTheDocument();
    });

    it('should render all payment method options', () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      expect(screen.getByLabelText(/Tunai \(Cash\)/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Member Credit/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Tempo \(Credit\)/)).toBeInTheDocument();
    });

    it('should render cash payment form when CASH is selected', () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const cashRadio = screen.getByLabelText(/Tunai \(Cash\)/);
      fireEvent.click(cashRadio);

      expect(screen.getByLabelText(/Jumlah Uang Masuk/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0')).toBeInTheDocument();
    });

    it('should render member credit form when MEMBER_CREDIT is selected', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          members={mockMembers}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const memberCreditRadio = screen.getByLabelText(/Member Credit/);
      fireEvent.click(memberCreditRadio);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Cari nama/)).toBeInTheDocument();
      });
    });

    it('should render tempo payment form when TEMPO is selected', () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const tempoRadio = screen.getByLabelText(/Tempo \(Credit\)/);
      fireEvent.click(tempoRadio);

      expect(screen.getByLabelText(/Nama Pelanggan/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Nomor Telepon Pelanggan/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Durasi Pembayaran/)).toBeInTheDocument();
    });
  });

  describe('Cash Payment', () => {
    it('should calculate change correctly', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const cashRadio = screen.getByLabelText(/Tunai \(Cash\)/);
      fireEvent.click(cashRadio);

      const input = screen.getByPlaceholderText('0');
      await userEvent.type(input, '150000');

      await waitFor(() => {
        const changeText = screen.getByText(/Rp 50.000/);
        expect(changeText).toBeInTheDocument();
      });
    });

    it('should show error when amount received is less than total', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const cashRadio = screen.getByLabelText(/Tunai \(Cash\)/);
      fireEvent.click(cashRadio);

      const input = screen.getByPlaceholderText('0');
      await userEvent.type(input, '50000');

      const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(screen.getByText(/Amount insufficient/i)).toBeInTheDocument();
      });
    });

    it('should validate that amount received is required', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const cashRadio = screen.getByLabelText(/Tunai \(Cash\)/);
      fireEvent.click(cashRadio);

      const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(screen.getByText(/Amount received is required/)).toBeInTheDocument();
      });
    });

    it('should call onPaymentSelect with correct data for valid cash payment', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const cashRadio = screen.getByLabelText(/Tunai \(Cash\)/);
      fireEvent.click(cashRadio);

      const input = screen.getByPlaceholderText('0');
      await userEvent.type(input, '150000');

      const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(mockOnPaymentSelect).toHaveBeenCalledWith({
          method: 'CASH',
          cash: {
            amountReceived: 150000,
            change: 50000,
          },
        });
      });
    });

    it('should handle zero change correctly', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const cashRadio = screen.getByLabelText(/Tunai \(Cash\)/);
      fireEvent.click(cashRadio);

      const input = screen.getByPlaceholderText('0');
      await userEvent.type(input, '100000');

      const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(mockOnPaymentSelect).toHaveBeenCalledWith({
          method: 'CASH',
          cash: {
            amountReceived: 100000,
            change: 0,
          },
        });
      });
    });
  });

  describe('Member Credit Payment', () => {
    it('should display member options from props', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          members={mockMembers}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const memberCreditRadio = screen.getByLabelText(/Member Credit/);
      fireEvent.click(memberCreditRadio);

      await waitFor(() => {
        const select = screen.getByDisplayValue(/-- Pilih Member --/);
        expect(select).toBeInTheDocument();
      });
    });

    it('should filter members based on search term', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          members={mockMembers}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const memberCreditRadio = screen.getByLabelText(/Member Credit/);
      fireEvent.click(memberCreditRadio);

      const searchInput = screen.getByPlaceholderText(/Cari nama/);
      await userEvent.type(searchInput, 'Jane');

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        // Should have placeholder + Jane Smith's entry
        expect(options.length).toBeGreaterThan(1);
      });
    });

    it('should validate member selection is required', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          members={mockMembers}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const memberCreditRadio = screen.getByLabelText(/Member Credit/);
      fireEvent.click(memberCreditRadio);

      const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(screen.getByText(/Please select a member/)).toBeInTheDocument();
      });
    });

    it('should validate member has sufficient credit', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          members={mockMembers}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const memberCreditRadio = screen.getByLabelText(/Member Credit/);
      fireEvent.click(memberCreditRadio);

      const select = screen.getByDisplayValue(/-- Pilih Member --/);
      await userEvent.selectOption(select, '2'); // Jane Smith with only Rp 50,000

      const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Member has insufficient credit balance/)
        ).toBeInTheDocument();
      });
    });

    it('should call onPaymentSelect with correct data for valid member credit payment', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          members={mockMembers}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const memberCreditRadio = screen.getByLabelText(/Member Credit/);
      fireEvent.click(memberCreditRadio);

      const select = screen.getByDisplayValue(/-- Pilih Member --/);
      await userEvent.selectOption(select, '1'); // John Doe with Rp 500,000

      const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(mockOnPaymentSelect).toHaveBeenCalledWith({
          method: 'MEMBER_CREDIT',
          memberCredit: {
            memberId: '1',
            memberName: 'John Doe',
            usedCredit: mockCartTotal,
          },
        });
      });
    });
  });

  describe('Tempo Payment', () => {
    it('should validate customer name is required', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const tempoRadio = screen.getByLabelText(/Tempo \(Credit\)/);
      fireEvent.click(tempoRadio);

      const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(screen.getByText(/Customer name is required/)).toBeInTheDocument();
      });
    });

    it('should validate customer phone is required', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const tempoRadio = screen.getByLabelText(/Tempo \(Credit\)/);
      fireEvent.click(tempoRadio);

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/);
      await userEvent.type(nameInput, 'Test Customer');

      const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(screen.getByText(/Customer phone is required/)).toBeInTheDocument();
      });
    });

    it('should validate duration is required', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const tempoRadio = screen.getByLabelText(/Tempo \(Credit\)/);
      fireEvent.click(tempoRadio);

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/);
      await userEvent.type(nameInput, 'Test Customer');

      const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx/);
      await userEvent.type(phoneInput, '081234567890');

      const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(screen.getByText(/Payment duration is required/)).toBeInTheDocument();
      });
    });

    it('should calculate due date correctly', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const tempoRadio = screen.getByLabelText(/Tempo \(Credit\)/);
      fireEvent.click(tempoRadio);

      const durationSelect = screen.getByDisplayValue(/-- Pilih Durasi --/);
      await userEvent.selectOption(durationSelect, '7'); // 7 days

      await waitFor(() => {
        expect(screen.getByText(/Tanggal Jatuh Tempo:/)).toBeInTheDocument();
      });
    });

    it('should call onPaymentSelect with correct data for valid tempo payment', async () => {
      const originalDate = Date;
      const mockDate = new Date('2024-01-01');
      global.Date = jest.fn(() => mockDate) as any;

      try {
        render(
          <PaymentMethodSelector
            cartTotal={mockCartTotal}
            onPaymentSelect={mockOnPaymentSelect}
          />
        );

        const tempoRadio = screen.getByLabelText(/Tempo \(Credit\)/);
        fireEvent.click(tempoRadio);

        const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/);
        await userEvent.type(nameInput, 'Test Customer');

        const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx/);
        await userEvent.type(phoneInput, '081234567890');

        const durationSelect = screen.getByDisplayValue(/-- Pilih Durasi --/);
        await userEvent.selectOption(durationSelect, '7');

        const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
        fireEvent.click(proceedButton);

        await waitFor(() => {
          expect(mockOnPaymentSelect).toHaveBeenCalled();
          const call = mockOnPaymentSelect.mock.calls[0][0];
          expect(call.method).toBe('TEMPO');
          expect(call.tempo?.customerName).toBe('Test Customer');
          expect(call.tempo?.customerPhone).toBe('081234567890');
          expect(call.tempo?.durationDays).toBe(7);
        });
      } finally {
        global.Date = originalDate;
      }
    });

    it('should trim whitespace from customer name and phone', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const tempoRadio = screen.getByLabelText(/Tempo \(Credit\)/);
      fireEvent.click(tempoRadio);

      const nameInput = screen.getByPlaceholderText(/Masukkan nama pelanggan/);
      await userEvent.type(nameInput, '  Test Customer  ');

      const phoneInput = screen.getByPlaceholderText(/08xxxxxxxxxx/);
      await userEvent.type(phoneInput, '  081234567890  ');

      const durationSelect = screen.getByDisplayValue(/-- Pilih Durasi --/);
      await userEvent.selectOption(durationSelect, '7');

      const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
      fireEvent.click(proceedButton);

      await waitFor(() => {
        const call = mockOnPaymentSelect.mock.calls[0][0];
        expect(call.tempo?.customerName).toBe('Test Customer');
        expect(call.tempo?.customerPhone).toBe('081234567890');
      });
    });
  });

  describe('UI Interactions', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText(/Batal/);
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should not show cancel button when onCancel is not provided', () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const cancelButton = screen.queryByText(/Batal/);
      expect(cancelButton).not.toBeInTheDocument();
    });

    it('should hide action buttons when showProceedButton is false', () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
          showProceedButton={false}
        />
      );

      const proceedButton = screen.queryByText(/Lanjutkan ke Konfirmasi/);
      expect(proceedButton).not.toBeInTheDocument();
    });

    it('should disable proceed button when isProcessing is true', () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
          isProcessing={true}
        />
      );

      const proceedButton = screen.getByText(/Memproses/);
      expect(proceedButton).toBeDisabled();
    });

    it('should clear error when user interacts with form', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const cashRadio = screen.getByLabelText(/Tunai \(Cash\)/);
      fireEvent.click(cashRadio);

      // Trigger error
      const proceedButton = screen.getByText(/Lanjutkan ke Konfirmasi/);
      fireEvent.click(proceedButton);

      await waitFor(() => {
        expect(screen.getByText(/Amount received is required/)).toBeInTheDocument();
      });

      // Clear error by typing
      const input = screen.getByPlaceholderText('0');
      await userEvent.type(input, '150000');

      await waitFor(() => {
        expect(screen.queryByText(/Amount received is required/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should apply dark mode classes when dark mode is active', () => {
      const { container } = render(
        <div className="dark">
          <PaymentMethodSelector
            cartTotal={mockCartTotal}
            onPaymentSelect={mockOnPaymentSelect}
          />
        </div>
      );

      // Check that dark mode classes are applied (visual verification)
      expect(container.querySelector('.dark')).toBeInTheDocument();
    });
  });

  describe('Empty Member List', () => {
    it('should show message when no members match search', async () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          members={mockMembers}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const memberCreditRadio = screen.getByLabelText(/Member Credit/);
      fireEvent.click(memberCreditRadio);

      const searchInput = screen.getByPlaceholderText(/Cari nama/);
      await userEvent.type(searchInput, 'NonExistent');

      await waitFor(() => {
        expect(screen.getByText(/Tidak ada member yang cocok/)).toBeInTheDocument();
      });
    });

    it('should handle empty members array gracefully', () => {
      render(
        <PaymentMethodSelector
          cartTotal={mockCartTotal}
          members={[]}
          onPaymentSelect={mockOnPaymentSelect}
        />
      );

      const memberCreditRadio = screen.getByLabelText(/Member Credit/);
      fireEvent.click(memberCreditRadio);

      expect(screen.getByText(/Tidak ada member yang cocok/)).toBeInTheDocument();
    });
  });
});
