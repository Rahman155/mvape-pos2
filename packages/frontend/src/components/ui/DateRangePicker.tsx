import React from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear?: () => void;
  label?: string;
  containerClassName?: string;
  disabled?: boolean;
  error?: string;
}

/**
 * DateRangePicker component
 * Allows users to select a date range with start and end dates
 * Validates that end date is not before start date
 * 
 * **Validates: Requirements 8.2**
 */
const DateRangePicker = React.forwardRef<HTMLDivElement, DateRangePickerProps>(
  ({
    startDate = '',
    endDate = '',
    onStartDateChange,
    onEndDateChange,
    onClear,
    label = 'Date Range',
    containerClassName,
    disabled = false,
    error,
  }, ref) => {
    // Validate that end date is not before start date
    const hasError = startDate && endDate && new Date(endDate) < new Date(startDate);
    const displayError = hasError ? 'End date must be after or equal to start date' : error;

    const handleClear = () => {
      onStartDateChange('');
      onEndDateChange('');
      onClear?.();
    };

    const isActive = startDate || endDate;

    return (
      <div ref={ref} className={cn('w-full', containerClassName)}>
        {label && (
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Start Date Input */}
          <Input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            placeholder="Start Date"
            disabled={disabled}
            state={hasError ? 'error' : undefined}
            helperText="From"
            containerClassName="md:flex-1"
          />

          {/* End Date Input */}
          <Input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            placeholder="End Date"
            disabled={disabled}
            state={hasError ? 'error' : undefined}
            helperText="To"
            containerClassName="md:flex-1"
          />
        </div>

        {/* Error Message */}
        {displayError && (
          <p className="mt-2 text-sm text-red-500">{displayError}</p>
        )}

        {/* Clear Button - Only show when dates are selected */}
        {isActive && (
          <Button
            onClick={handleClear}
            variant="ghost"
            size="sm"
            className="mt-3"
            disabled={disabled}
            type="button"
          >
            Clear Dates
          </Button>
        )}
      </div>
    );
  }
);

DateRangePicker.displayName = 'DateRangePicker';

export { DateRangePicker };
