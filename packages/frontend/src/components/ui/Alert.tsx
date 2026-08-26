import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm',
  {
    variants: {
      variant: {
        default: 'border-gray-300 bg-gray-50 text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100',
        success: 'border-green-300 bg-green-50 text-green-800 dark:border-green-600 dark:bg-green-900 dark:text-green-100',
        error: 'border-red-300 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-900 dark:text-red-100',
        warning: 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900 dark:text-yellow-100',
        info: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-600 dark:bg-blue-900 dark:text-blue-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  icon?: React.ReactNode;
  onClose?: () => void;
  closeable?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className,
      variant,
      title,
      icon,
      onClose,
      closeable = false,
      children,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(alertVariants({ variant, className }))}
      role="alert"
      {...props}
    >
      <div className="flex items-start gap-3">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="flex-1">
          {title && <h4 className="mb-1 font-semibold">{title}</h4>}
          {children}
        </div>
        {closeable && (
          <button
            onClick={onClose}
            className="flex-shrink-0 text-current opacity-50 hover:opacity-75"
            aria-label="Close alert"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
);
Alert.displayName = 'Alert';

// Toast notification component
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
  duration?: number;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      className,
      variant = 'default',
      title,
      icon,
      action,
      onClose,
      duration,
      children,
      ...props
    },
    ref
  ) => {
    React.useEffect(() => {
      if (duration && onClose) {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
      }
    }, [duration, onClose]);

    const variantStyles: Record<string, string> = {
      default: 'bg-white border-gray-300 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100',
      success: 'bg-green-50 border-green-300 text-green-800 dark:bg-green-900 dark:border-green-600 dark:text-green-100',
      error: 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900 dark:border-red-600 dark:text-red-100',
      warning: 'bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-100',
      info: 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-100',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'pointer-events-auto flex items-start rounded-lg border shadow-lg transition-all duration-300',
          variantStyles[variant],
          className
        )}
        role="status"
        {...props}
      >
        {icon && <div className="flex-shrink-0 pt-0.5">{icon}</div>}
        <div className="flex-1 px-3 py-2">
          {title && <h4 className="font-semibold">{title}</h4>}
          {children && <p className="text-sm">{children}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
        {onClose && !action && (
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 text-current opacity-50 hover:opacity-75"
            aria-label="Close toast"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);
Toast.displayName = 'Toast';

export { Alert, Toast, alertVariants };
export default Alert;
