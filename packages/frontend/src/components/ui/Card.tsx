import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  'rounded-lg',
  {
    variants: {
      variant: {
        default: 'border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900',
        elevated: 'bg-white shadow-md dark:bg-gray-900 dark:shadow-lg',
        outlined: 'border-2 border-gray-300 bg-transparent dark:border-gray-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
);
Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, description, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('border-b border-gray-200 px-6 py-4 dark:border-gray-700', className)}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div>
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4', className)}
      {...props}
    />
  )
);
CardBody.displayName = 'CardBody';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

// Card.Meta component for displaying metadata
export interface CardMetaProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | React.ReactNode;
}

const CardMeta = React.forwardRef<HTMLDivElement, CardMetaProps>(
  ({ className, label, value, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex justify-between items-center py-2', className)}
      {...props}
    >
      <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  )
);
CardMeta.displayName = 'CardMeta';

export { Card, CardHeader, CardBody, CardFooter, CardMeta, cardVariants };
