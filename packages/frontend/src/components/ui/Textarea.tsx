/**
 * Textarea component with validation support
 * Supports dark mode, validation states, and helper text
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const textareaVariants = cva(
  'flex w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-vertical min-h-20',
  {
    variants: {
      state: {
        default: 'border-gray-300 dark:border-gray-600',
        error: 'border-red-500 focus-visible:ring-red-500',
        success: 'border-green-500 focus-visible:ring-green-500',
        warning: 'border-yellow-500 focus-visible:ring-yellow-500',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  charCount?: boolean;
  maxCharacters?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      state,
      label,
      error,
      helperText,
      containerClassName,
      charCount,
      maxCharacters,
      value,
      ...props
    },
    ref
  ) => {
    const textareaState = error ? 'error' : state;
    const charLength = typeof value === 'string' ? value.length : 0;
    const showCharCount = charCount && maxCharacters;

    return (
      <div className={cn('w-full', containerClassName)}>
        <div className="flex items-center justify-between">
          {label && (
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
              {props.required && <span className="text-red-500">*</span>}
            </label>
          )}
          {showCharCount && (
            <span
              className={cn(
                'text-xs',
                charLength > (maxCharacters * 0.9) ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {charLength} / {maxCharacters}
            </span>
          )}
        </div>
        <textarea
          className={cn(textareaVariants({ state: textareaState, className }))}
          ref={ref}
          value={value}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea, textareaVariants };
export default Textarea;
