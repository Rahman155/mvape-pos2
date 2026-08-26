import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateRangePicker } from '../DateRangePicker';

describe('DateRangePicker Component', () => {
  const mockOnStartDateChange = jest.fn();
  const mockOnEndDateChange = jest.fn();
  const mockOnClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with default label', () => {
      render(
        <DateRangePicker
          startDate=""
          endDate=""
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
        />
      );

      expect(screen.getByText('Date Range')).toBeInTheDocument();
    });

    it('should render with custom label', () => {
      render(
        <DateRangePicker
          startDate=""
          endDate=""
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
          label="Custom Date Range"
        />
      );

      expect(screen.getByText('Custom Date Range')).toBeInTheDocument();
    });

    it('should render start and end date input fields', () => {
      render(
        <DateRangePicker
          startDate=""
          endDate=""
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
        />
      );

      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Start Date Input', () => {
    it('should display the start date value', () => {
      render(
        <DateRangePicker
          startDate="2024-01-15"
          endDate=""
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
        />
      );

      const startInput = screen.getAllByRole('textbox')[0] as HTMLInputElement;
      expect(startInput.value).toBe('2024-01-15');
    });

    it('should call onStartDateChange when start date is updated', async () => {
      const user = userEvent.setup();
      render(
        <DateRangePicker
          startDate=""
          endDate=""
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
        />
      );

      const startInput = screen.getAllByRole('textbox')[0];
      await user.type(startInput, '2024-01-15');

      expect(mockOnStartDateChange).toHaveBeenCalledWith('2024-01-15');
    });
  });

  describe('End Date Input', () => {
    it('should display the end date value', () => {
      render(
        <DateRangePicker
          startDate=""
          endDate="2024-01-31"
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
        />
      );

      const endInput = screen.getAllByRole('textbox')[1] as HTMLInputElement;
      expect(endInput.value).toBe('2024-01-31');
    });

    it('should call onEndDateChange when end date is updated', async () => {
      const user = userEvent.setup();
      render(
        <DateRangePicker
          startDate=""
          endDate=""
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
        />
      );

      const endInput = screen.getAllByRole('textbox')[1];
      await user.type(endInput, '2024-01-31');

      expect(mockOnEndDateChange).toHaveBeenCalledWith('2024-01-31');
    });
  });

  describe('Date Validation', () => {
    it('should show error when end date is before start date', () => {
      render(
        <DateRangePicker
          startDate="2024-01-31"
          endDate="2024-01-15"
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
        />
      );

      expect(
        screen.getByText('End date must be after or equal to start date')
      ).toBeInTheDocument();
    });

    it('should not show error when end date is after start date', () => {
      render(
        <DateRangePicker
          startDate="2024-01-15"
          endDate="2024-01-31"
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
        />
      );

      expect(
        screen.queryByText('End date must be after or equal to start date')
      ).not.toBeInTheDocument();
    });

    it('should not show error when end date equals start date', () => {
      render(
        <DateRangePicker
          startDate="2024-01-15"
          endDate="2024-01-15"
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
        />
      );

      expect(
        screen.queryByText('End date must be after or equal to start date')
      ).not.toBeInTheDocument();
    });

    it('should display custom error message when provided', () => {
      render(
        <DateRangePicker
          startDate="2024-01-15"
          endDate="2024-01-31"
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
          error="Custom error message"
        />
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('Clear Button', () => {
    it('should not render clear button when no dates are selected', () => {
      render(
        <DateRangePicker
          startDate=""
          endDate=""
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
          onClear={mockOnClear}
        />
      );

      expect(screen.queryByText('Clear Dates')).not.toBeInTheDocument();
    });

    it('should render clear button when start date is selected', () => {
      render(
        <DateRangePicker
          startDate="2024-01-15"
          endDate=""
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Clear Dates')).toBeInTheDocument();
    });

    it('should render clear button when end date is selected', () => {
      render(
        <DateRangePicker
          startDate=""
          endDate="2024-01-31"
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Clear Dates')).toBeInTheDocument();
    });

    it('should render clear button when both dates are selected', () => {
      render(
        <DateRangePicker
          startDate="2024-01-15"
          endDate="2024-01-31"
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
          onClear={mockOnClear}
        />
      );

      expect(screen.getByText('Clear Dates')).toBeInTheDocument();
    });

    it('should call all clear handlers when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <DateRangePicker
          startDate="2024-01-15"
          endDate="2024-01-31"
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
          onClear={mockOnClear}
        />
      );

      const clearButton = screen.getByText('Clear Dates');
      await user.click(clearButton);

      expect(mockOnStartDateChange).toHaveBeenCalledWith('');
      expect(mockOnEndDateChange).toHaveBeenCalledWith('');
      expect(mockOnClear).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable input fields when disabled prop is true', () => {
      render(
        <DateRangePicker
          startDate=""
          endDate=""
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
          disabled={true}
        />
      );

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });

    it('should disable clear button when disabled prop is true', () => {
      render(
        <DateRangePicker
          startDate="2024-01-15"
          endDate="2024-01-31"
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
          onClear={mockOnClear}
          disabled={true}
        />
      );

      const clearButton = screen.getByText('Clear Dates') as HTMLButtonElement;
      expect(clearButton).toBeDisabled();
    });

    it('should not prevent interaction when disabled prop is false', () => {
      render(
        <DateRangePicker
          startDate=""
          endDate=""
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
          disabled={false}
        />
      );

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input) => {
        expect(input).not.toBeDisabled();
      });
    });
  });

  describe('Requirement 8.2: Transaction Date Range Filtering', () => {
    it('should provide valid date range for filtering transactions', () => {
      const { rerender } = render(
        <DateRangePicker
          startDate="2024-01-01"
          endDate="2024-01-31"
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
        />
      );

      // Verify dates are captured correctly
      expect(mockOnStartDateChange).not.toHaveBeenCalled();
      expect(mockOnEndDateChange).not.toHaveBeenCalled();

      // Now verify the component displays the dates
      const inputs = screen.getAllByRole('textbox');
      expect((inputs[0] as HTMLInputElement).value).toBe('2024-01-01');
      expect((inputs[1] as HTMLInputElement).value).toBe('2024-01-31');
    });

    it('should validate date range before filtering', () => {
      render(
        <DateRangePicker
          startDate="2024-01-31"
          endDate="2024-01-15"
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
        />
      );

      // Invalid range should show error
      expect(
        screen.getByText('End date must be after or equal to start date')
      ).toBeInTheDocument();
    });

    it('should allow clearing date filters', async () => {
      const user = userEvent.setup();
      render(
        <DateRangePicker
          startDate="2024-01-15"
          endDate="2024-01-31"
          onStartDateChange={mockOnStartDateChange}
          onEndDateChange={mockOnEndDateChange}
          onClear={mockOnClear}
        />
      );

      const clearButton = screen.getByText('Clear Dates');
      await user.click(clearButton);

      expect(mockOnStartDateChange).toHaveBeenCalledWith('');
      expect(mockOnEndDateChange).toHaveBeenCalledWith('');
    });
  });
});
