/**
 * Checkbox component with validation support
 * Supports dark mode, labels, and helper text
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  labelClassName?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({
    className,
    label,
    error,
    helperText,
    containerClassName,
    labelClassName,
    ...props
  }, ref) => {
    const id = props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={cn('w-full', containerClassName)}>
        <div className="flex items-start">
          <input
            type="checkbox"
            id={id}
            ref={ref}
            className={cn(
              'mt-1 h-4 w-4 rounded border-gray-300 text-blue-600',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500',
              className
            )}
            {...props}
          />
          {label && (
            <label
              htmlFor={id}
              className={cn(
                'ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none',
                labelClassName
              )}
            >
              {label}
              {props.required && <span className="text-red-500">*</span>}
            </label>
          )}
        </div>
        {error && <p className="mt-1 ml-6 text-sm text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 ml-6 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
export default Checkbox;
