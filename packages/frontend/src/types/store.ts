/**
 * Store Type Definitions
 */

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  logoUrl: string | null;
  operatingHours: Record<string, { open: string; close: string }> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface StoreChangeHistory {
  id: string;
  entityType: string;
  entityId: string;
  changedBy: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  timestamp: string;
}

export interface StoreDeletionCheck {
  canDelete: boolean;
  blockers: string[];
  summary: {
    transactionCount: number;
    inventoryCount: number;
    userCount: number;
  };
}
