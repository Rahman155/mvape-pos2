/**
 * Radio button component with grouping support
 * Supports dark mode, labels, and error states
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface RadioOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, ...props }, ref) => {
    const id = props.id || `radio-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="flex items-center">
        <input
          type="radio"
          id={id}
          ref={ref}
          className={cn(
            'h-4 w-4 border-gray-300 text-blue-600',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
        {label && (
          <label
            htmlFor={id}
            className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

/**
 * RadioGroup component for managing multiple radio buttons
 */
export interface RadioGroupProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  name: string;
  options: RadioOption[];
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  groupClassName?: string;
  onChange?: (value: string | number) => void;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      name,
      options,
      label,
      error,
      helperText,
      containerClassName,
      groupClassName,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('w-full', containerClassName)}>
        {label && (
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
            {props.required && <span className="text-red-500">*</span>}
          </label>
        )}
        <div className={cn('space-y-2', groupClassName)}>
          {options.map((option) => (
            <div key={option.value} className="flex items-center">
              <input
                type="radio"
                id={`${name}-${option.value}`}
                name={name}
                value={option.value}
                checked={value === option.value}
                disabled={option.disabled}
                onChange={(e) => {
                  if (onChange) {
                    onChange(e.target.value);
                  }
                }}
                className={cn(
                  'h-4 w-4 border-gray-300 text-blue-600',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
              <label
                htmlFor={`${name}-${option.value}`}
                className={cn(
                  'ml-2 text-sm font-medium cursor-pointer select-none',
                  option.disabled
                    ? 'text-gray-400 dark:text-gray-600'
                    : 'text-gray-700 dark:text-gray-300'
                )}
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';

export { Radio, RadioGroup };
