import React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = 'md', text, className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col items-center justify-center gap-2', className)} {...props}>
      <div className={cn('animate-spin text-blue-600', sizeClasses[size])}>
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          className="w-full h-full"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
          <path
            d="M4 12a8 8 0 018-8v0m0 16a8 8 0 01-8-8m16 0a8 8 0 01-8 8v0m0-16a8 8 0 018 8h0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  )
);

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;
