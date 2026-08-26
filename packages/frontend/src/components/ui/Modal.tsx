import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeButton?: boolean;
  className?: string;
  overlayClassName?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      children,
      footer,
      size = 'md',
      closeButton = true,
      className,
      overlayClassName,
    },
    ref
  ) => {
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }
      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
      <>
        {/* Overlay */}
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/50 transition-opacity',
            overlayClassName
          )}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal */}
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
          role="dialog"
          aria-modal="true"
          ref={ref}
        >
          <div
            className={cn(
              'relative w-full rounded-lg bg-white shadow-lg dark:bg-gray-900',
              sizeClasses[size],
              'max-h-[90vh] overflow-y-auto',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || closeButton) && (
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                {title && (
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {title}
                  </h2>
                )}
                {closeButton && (
                  <button
                    onClick={onClose}
                    className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                    aria-label="Close"
                  >
                    <svg
                      className="h-6 w-6"
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
            )}

            {/* Description */}
            {description && (
              <div className="px-6 py-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
              </div>
            )}

            {/* Content */}
            <div className="px-6 py-4">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
                {footer}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);

Modal.displayName = 'Modal';

// Modal.Actions component for consistent footer actions
const ModalActions = ({ onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isLoading = false }: {
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}) => (
  <div className="flex justify-end gap-3">
    <Button variant="secondary" onClick={onCancel}>
      {cancelText}
    </Button>
    <Button variant="primary" onClick={onConfirm} isLoading={isLoading}>
      {confirmText}
    </Button>
  </div>
);

ModalActions.displayName = 'ModalActions';

export { Modal, ModalActions };
