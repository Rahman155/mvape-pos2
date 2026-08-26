import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  onChange?: (value: string | number) => void;
  searchable?: boolean;
  containerClassName?: string;
  icon?: React.ReactNode;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      options,
      error,
      helperText,
      onChange,
      searchable = false,
      containerClassName,
      icon,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedValue, setSelectedValue] = useState(props.value || '');
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = searchable
      ? options.filter((option) =>
          option.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : options;

    const selectedLabel = options.find((opt) => opt.value === selectedValue)?.label || 'Select...';

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    const handleSelect = (value: string | number) => {
      setSelectedValue(value);
      setIsOpen(false);
      setSearchTerm('');
      onChange?.(value);
    };

    return (
      <div className={cn('w-full', containerClassName)} ref={containerRef}>
        {label && (
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {props.required && <span className="text-red-500">*</span>}
          </label>
        )}

        {/* Hidden native select for accessibility and form submission */}
        <select
          ref={ref}
          value={selectedValue}
          onChange={(e) => handleSelect(e.target.value)}
          className="hidden"
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Custom dropdown UI */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'relative w-full rounded-md border bg-background px-3 py-2 text-sm text-left',
              'min-h-11 flex items-center justify-between',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error ? 'border-red-500 focus-visible:ring-red-500' : 'border-gray-300 dark:border-gray-600',
              className
            )}
            disabled={props.disabled}
          >
            <span className="flex items-center">
              {icon && <span className="mr-2">{icon}</span>}
              {selectedLabel}
            </span>
            <svg
              className={cn('h-4 w-4 opacity-50 transition-transform', isOpen && 'rotate-180')}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {/* Dropdown menu */}
          {isOpen && (
            <div
              ref={dropdownRef}
              className={cn(
                'absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-gray-300 bg-background shadow-lg dark:border-gray-600',
                'max-h-64 overflow-y-auto'
              )}
            >
              {searchable && (
                <div className="sticky top-0 border-b border-gray-300 bg-background p-2 dark:border-gray-600">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                      'w-full rounded border px-2 py-1 text-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'border-gray-300 dark:border-gray-600 bg-background dark:bg-gray-900'
                    )}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    disabled={option.disabled}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm transition-colors',
                      selectedValue === option.value
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800',
                      option.disabled && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
