/**
 * Form component wrapper for managing form state and submission
 * Integrates with useForm hook for comprehensive form management
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { UseFormReturn } from '@/hooks/useForm';

export interface FormProps<T> extends React.FormHTMLAttributes<HTMLFormElement> {
  form: UseFormReturn<T>;
  containerClassName?: string;
  onSubmitError?: (error: Error) => void;
}

/**
 * Form component that wraps form elements and manages submission
 */
const Form = React.forwardRef<
  HTMLFormElement,
  FormProps<any>
>(
  ({ form, className, containerClassName, onSubmitError, children, ...props }, ref) => {
    return (
      <form
        ref={ref}
        onSubmit={form.handleSubmit}
        className={cn('space-y-4', className)}
        {...props}
      >
        {children}
      </form>
    );
  }
);

Form.displayName = 'Form';

/**
 * FormField component - wraps form inputs with validation feedback
 */
export interface FormFieldProps {
  label?: string;
  name: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  children: React.ReactNode;
  containerClassName?: string;
  helperText?: string;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  error,
  touched,
  required,
  children,
  containerClassName,
  helperText,
}) => {
  const showError = touched && error;

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={name}
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {showError && <p className="mt-1 text-sm text-red-500">{error}</p>}
      {helperText && !showError && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

FormField.displayName = 'FormField';

/**
 * FormSection component - groups related form fields
 */
export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  children: React.ReactNode;
  containerClassName?: string;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  containerClassName,
  className,
  ...props
}) => {
  return (
    <div className={cn('space-y-4', containerClassName)} {...props}>
      {(title || description) && (
        <div className="mb-4 border-b border-gray-200 pb-4 dark:border-gray-700">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>
      )}
      <div className={cn('space-y-4', className)}>
        {children}
      </div>
    </div>
  );
};

FormSection.displayName = 'FormSection';

/**
 * FormActions component - bottom action buttons
 */
export interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  submitText?: string;
  cancelText?: string;
  isSubmitting?: boolean;
  isValid?: boolean;
  onCancel?: () => void;
  showCancel?: boolean;
  containerClassName?: string;
}

const FormActions: React.FC<FormActionsProps> = ({
  submitText = 'Submit',
  cancelText = 'Cancel',
  isSubmitting = false,
  isValid = true,
  onCancel,
  showCancel = true,
  containerClassName,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700',
        containerClassName
      )}
      {...props}
    >
      {children ? (
        <>{children}</>
      ) : (
        <>
          <div></div>
          <div className={cn('flex gap-3', className)}>
            {showCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {cancelText}
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="mr-2 h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                submitText
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

FormActions.displayName = 'FormActions';

export { Form, FormField, FormSection, FormActions };
