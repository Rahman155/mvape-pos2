/**
 * Reprint Button Component
 * Triggers the receipt reprint modal for a transaction
 * Shows edited indicator if transaction has been modified
 * 
 * Usage in transaction detail/history views:
 * <ReprintButton transaction={transaction} store={store} kasir={kasir} />
 */

'use client';

import React, { useState } from 'react';
import { Transaction, Store, User } from '@/types';
import ReceiptReprintModal from './ReceiptReprintModal';
import Button from '@/components/ui/Button';

export interface ReprintButtonProps {
  transaction: Transaction;
  store: Store;
  kasir: User;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  className?: string;
  showEditedBadge?: boolean;
}

export const ReprintButton: React.FC<ReprintButtonProps> = ({
  transaction,
  store,
  kasir,
  size = 'md',
  variant = 'secondary',
  className = '',
  showEditedBadge = true,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="relative inline-block">
        <Button
          variant={variant}
          size={size}
          onClick={() => setIsModalOpen(true)}
          className={className}
        >
          <span>🖨️ Reprint Receipt</span>
          {showEditedBadge && transaction.isEdited && (
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
              Edited
            </span>
          )}
        </Button>
      </div>

      <ReceiptReprintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transaction={transaction}
        store={store}
        kasir={kasir}
        showEditedIndicator={true}
      />
    </>
  );
};

export default ReprintButton;
