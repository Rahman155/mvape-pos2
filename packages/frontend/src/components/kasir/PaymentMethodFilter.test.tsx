import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentMethodFilter from './PaymentMethodFilter';

/**
 * Test suite for PaymentMethodFilter component
 * Validates Requirement 8.3: Transaction filtering by payment method
 */
describe('PaymentMethodFilter Component', () => {
  describe('Component Rendering', () => {
    it('should render payment method filter with expanded variant', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          variant="expanded"
        />
      );

      expect(screen.getByText('Payment Methods')).toBeInTheDocument();
      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('Member Credit')).toBeInTheDocument();
      expect(screen.getByText('Tempo')).toBeInTheDocument();
    });

    it('should render payment method filter with compact variant', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          variant="compact"
        />
      );

      expect(screen.getByText('Cash')).toBeInTheDocument();
      expect(screen.getByText('Member Credit')).toBeInTheDocument();
      expect(screen.getByText('Tempo')).toBeInTheDocument();
    });

    it('should display all payment method options with descriptions in expanded view', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          variant="expanded"
        />
      );

      expect(screen.getByText('Direct cash payment')).toBeInTheDocument();
      expect(
        screen.getByText('Payment using member balance')
      ).toBeInTheDocument();
      expect(screen.getByText('Deferred payment (credit terms)')).toBeInTheDocument();
    });
  });

  describe('Single Selection Mode', () => {
    it('should toggle single payment method when allowMultiple is false', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          allowMultiple={false}
          variant="expanded"
        />
      );

      const cashCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(cashCheckbox);

      expect(handleChange).toHaveBeenCalledWith(['CASH']);
    });

    it('should deselect method when clicking already selected in single mode', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      const { rerender } = render(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={handleChange}
          allowMultiple={false}
          variant="expanded"
        />
      );

      const cashCheckbox = screen.getAllByRole('checkbox')[0] as HTMLInputElement;
      expect(cashCheckbox.checked).toBe(true);

      await user.click(cashCheckbox);
      expect(handleChange).toHaveBeenCalledWith([]);
    });

    it('should replace selection when selecting different method in single mode', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={handleChange}
          allowMultiple={false}
          variant="expanded"
        />
      );

      const memberCheckbox = screen.getAllByRole('checkbox')[1];
      await user.click(memberCheckbox);

      expect(handleChange).toHaveBeenCalledWith(['MEMBER_CREDIT']);
    });
  });

  describe('Multiple Selection Mode', () => {
    it('should select multiple payment methods when allowMultiple is true', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          allowMultiple={true}
          variant="expanded"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // CASH
      expect(handleChange).toHaveBeenCalledWith(['CASH']);

      handleChange.mockClear();
      
      // For next test, need to rerender with new selected state
      const { rerender } = render(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={handleChange}
          allowMultiple={true}
          variant="expanded"
        />
      );

      const updatedCheckboxes = screen.getAllByRole('checkbox');
      await user.click(updatedCheckboxes[1]); // MEMBER_CREDIT
      expect(handleChange).toHaveBeenCalledWith(['CASH', 'MEMBER_CREDIT']);
    });

    it('should deselect individual methods when allowMultiple is true', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH', 'MEMBER_CREDIT', 'TEMPO']}
          onChange={handleChange}
          allowMultiple={true}
          variant="expanded"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Uncheck CASH

      expect(handleChange).toHaveBeenCalledWith(['MEMBER_CREDIT', 'TEMPO']);
    });

    it('should show selection count in expanded view', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH', 'MEMBER_CREDIT']}
          onChange={handleChange}
          allowMultiple={true}
          variant="expanded"
        />
      );

      expect(screen.getByText('Payment Methods (2)')).toBeInTheDocument();
    });

    it('should display "2 methods selected" text when multiple selected', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH', 'MEMBER_CREDIT']}
          onChange={handleChange}
          allowMultiple={true}
          variant="expanded"
        />
      );

      expect(screen.getByText('2 methods selected')).toBeInTheDocument();
    });

    it('should display "1 method selected" text when one selected', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={handleChange}
          allowMultiple={true}
          variant="expanded"
        />
      );

      expect(screen.getByText('1 method selected')).toBeInTheDocument();
    });
  });

  describe('Clear Functionality', () => {
    it('should show clear button when selections exist in expanded view', () => {
      const handleChange = jest.fn();
      const handleClear = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={handleChange}
          onClear={handleClear}
          variant="expanded"
        />
      );

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('should not show clear button when no selections in expanded view', () => {
      const handleChange = jest.fn();
      const handleClear = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          onClear={handleClear}
          variant="expanded"
        />
      );

      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
    });

    it('should call onClear when clear button is clicked in expanded view', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      const handleClear = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH', 'MEMBER_CREDIT']}
          onChange={handleChange}
          onClear={handleClear}
          variant="expanded"
        />
      );

      const clearButton = screen.getByText('Clear All');
      await user.click(clearButton);

      expect(handleClear).toHaveBeenCalled();
    });

    it('should show clear button in compact view when selections exist', () => {
      const handleChange = jest.fn();
      const handleClear = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={handleChange}
          onClear={handleClear}
          variant="compact"
        />
      );

      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should call onClear when clear button is clicked in compact view', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      const handleClear = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={handleChange}
          onClear={handleClear}
          variant="compact"
        />
      );

      const clearButton = screen.getByText('Clear');
      await user.click(clearButton);

      expect(handleClear).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable all checkboxes when disabled prop is true', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          disabled={true}
          variant="expanded"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeDisabled();
      });
    });

    it('should not trigger onChange when disabled and clicked', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          disabled={true}
          variant="expanded"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should disable clear button when disabled prop is true', async () => {
      const user = userEvent.setup();
      const handleClear = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={jest.fn()}
          onClear={handleClear}
          disabled={true}
          variant="expanded"
        />
      );

      const clearButton = screen.getByText('Clear All');
      expect(clearButton).toBeDisabled();
    });
  });

  describe('Selection State Persistence', () => {
    it('should show selected methods as checked', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH', 'TEMPO']}
          onChange={handleChange}
          variant="expanded"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      expect(checkboxes[0].checked).toBe(true); // CASH
      expect(checkboxes[1].checked).toBe(false); // MEMBER_CREDIT
      expect(checkboxes[2].checked).toBe(true); // TEMPO
    });

    it('should visually highlight selected items in expanded view', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={handleChange}
          variant="expanded"
        />
      );

      const labels = screen.getAllByRole('checkbox').map(
        (checkbox) => checkbox.closest('label')
      );

      // First label (CASH) should have border-blue-500
      expect(labels[0]).toHaveClass('border-blue-500');
      expect(labels[0]).toHaveClass('bg-blue-50');
    });

    it('should visually highlight selected items in compact view', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={handleChange}
          variant="compact"
        />
      );

      const buttons = screen.getAllByRole('button');
      const cashButton = buttons.find((btn) => btn.textContent === 'Cash');

      expect(cashButton).toHaveClass('bg-blue-600');
      expect(cashButton).toHaveClass('text-white');
    });
  });

  describe('Empty State Messages', () => {
    it('should show instruction text when no methods selected in expanded view', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          allowMultiple={true}
          variant="expanded"
        />
      );

      expect(
        screen.getByText('Select one or more payment methods to filter')
      ).toBeInTheDocument();
    });

    it('should not show instruction text when methods are selected', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={handleChange}
          allowMultiple={true}
          variant="expanded"
        />
      );

      expect(
        screen.queryByText('Select one or more payment methods to filter')
      ).not.toBeInTheDocument();
    });
  });

  /**
   * Requirement 8.3 Compliance Tests
   * WHEN kasir memilih filter berdasarkan metode pembayaran,
   * THE POS_System SHALL menampilkan hanya transaksi dengan metode tersebut
   */
  describe('Requirement 8.3: Payment Method Filtering', () => {
    it('should allow selection of CASH payment method', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          variant="expanded"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      expect(handleChange).toHaveBeenCalledWith(['CASH']);
    });

    it('should allow selection of MEMBER_CREDIT payment method', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          variant="expanded"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      expect(handleChange).toHaveBeenCalledWith(['MEMBER_CREDIT']);
    });

    it('should allow selection of TEMPO payment method', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          variant="expanded"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]);

      expect(handleChange).toHaveBeenCalledWith(['TEMPO']);
    });

    it('should support multiple payment method selection', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      const { rerender } = render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          allowMultiple={true}
          variant="expanded"
        />
      );

      let checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // CASH
      expect(handleChange).toHaveBeenCalledWith(['CASH']);

      handleChange.mockClear();

      // Rerender with CASH selected
      rerender(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={handleChange}
          allowMultiple={true}
          variant="expanded"
        />
      );

      checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // MEMBER_CREDIT
      expect(handleChange).toHaveBeenCalledWith(['CASH', 'MEMBER_CREDIT']);
    });

    it('should reflect selected payment methods in UI', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH', 'TEMPO']}
          onChange={handleChange}
          variant="expanded"
        />
      );

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      expect(checkboxes[0].checked).toBe(true); // CASH
      expect(checkboxes[2].checked).toBe(true); // TEMPO
    });
  });

  describe('Compact View Specific Tests', () => {
    it('should display methods as buttons in compact view', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          variant="compact"
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.some((btn) => btn.textContent === 'Cash')).toBe(true);
      expect(buttons.some((btn) => btn.textContent === 'Member Credit')).toBe(true);
      expect(buttons.some((btn) => btn.textContent === 'Tempo')).toBe(true);
    });

    it('should toggle method selection with buttons in compact view', async () => {
      const user = userEvent.setup();
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={[]}
          onChange={handleChange}
          variant="compact"
        />
      );

      const buttons = screen.getAllByRole('button');
      const cashButton = buttons.find((btn) => btn.textContent === 'Cash');

      await user.click(cashButton!);

      expect(handleChange).toHaveBeenCalledWith(['CASH']);
    });

    it('should highlight selected methods as buttons in compact view', () => {
      const handleChange = jest.fn();
      render(
        <PaymentMethodFilter
          selectedMethods={['CASH']}
          onChange={handleChange}
          variant="compact"
        />
      );

      const buttons = screen.getAllByRole('button');
      const cashButton = buttons.find((btn) => btn.textContent === 'Cash');

      expect(cashButton).toHaveClass('bg-blue-600');
    });
  });
});
