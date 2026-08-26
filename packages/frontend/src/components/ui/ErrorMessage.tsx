import React from 'react';
import { Alert } from './Alert';

export interface ErrorMessageProps {
  message: string;
  title?: string;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  title = 'Error',
  onDismiss,
}) => {
  return (
    <Alert
      variant="error"
      title={title}
      closeable={!!onDismiss}
      onClose={onDismiss}
      className="mb-6"
      icon={
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
            d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      }
    >
      {message}
    </Alert>
  );
};

export default ErrorMessage;
