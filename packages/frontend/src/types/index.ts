/**
 * Core types for the Vapestore POS PWA application
 */

// User and Authentication
export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'KASIR' | 'OWNER' | 'ADMIN';
  storeId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  role: 'KASIR' | 'OWNER' | null;
  isAuthenticated: boolean;
}

// Store
export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  operatingHours?: OperatingHours;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface OperatingHours {
  [key: string]: {
    open: string;
    close: string;
    closed?: boolean;
  };
}

// Product
export interface Product {
  id: string;
  name: string;
  sku: string;
  category?: string;
  costPrice: number;
  sellingPrice: number;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Product with stock information (used for POS)
export interface ProductWithStock extends Product {
  quantity: number;
  reserved: number;
  isAvailable: boolean;
}

// Inventory
export interface Inventory {
  id: string;
  productId: string;
  storeId: string;
  quantity: number;
  reserved: number;
  reorderLevel: number;
  lastRestockAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction
export interface Transaction {
  id: string;
  storeId: string;
  kasirId: string;
  transactionDate: Date;
  totalAmount: number;
  paymentMethod: 'CASH' | 'MEMBER_CREDIT' | 'TEMPO';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  editedBy?: string;
  isEdited: boolean;
  version: number;
  items: TransactionItem[];
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
}

// Member
export interface Member {
  id: string;
  memberNumber: string;
  name: string;
  phone?: string;
  email?: string;
  creditBalance: number;
  totalSpent: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// BOP (Biaya Operasional Penjualan)
export interface BOP {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  amount: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Supplier
export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Purchase Order
export interface PurchaseOrder {
  id: string;
  supplierId: string;
  orderDate: Date;
  paymentMethod: 'CASH' | 'TRANSFER' | 'TEMPO';
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL';
  totalAmount: number;
  dueDate?: Date;
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
  createdAt: Date;
}

// Piutang (Customer Payable)
export interface Piutang {
  id: string;
  transactionId?: string;
  memberId?: string;
  amount: number;
  remainingBalance: number;
  dueDate?: Date;
  status: 'OPEN' | 'PARTIAL' | 'CLOSED';
  createdAt: Date;
  updatedAt: Date;
}

// Stock Transfer
export interface StockTransfer {
  id: string;
  fromLocationId: string;
  toStoreId: string;
  transferDate: Date;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  items: StockTransferItem[];
}

export interface StockTransferItem {
  id: string;
  stockTransferId: string;
  productId: string;
  quantity: number;
  receivedQuantity: number;
  createdAt: Date;
}

// Stock Opname
export interface StockOpname {
  id: string;
  storeId: string;
  opnameDate: Date;
  status: 'ONGOING' | 'COMPLETED' | 'VERIFIED';
  conductedBy: string;
  verifiedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  details: OpnameDetail[];
}

export interface OpnameDetail {
  id: string;
  opnameId: string;
  productId: string;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  status: 'MATCH' | 'SHORTAGE' | 'EXCESS';
  notes?: string;
  createdAt: Date;
}

// Attendance
export interface Attendance {
  id: string;
  userId: string;
  clockIn: Date;
  clockOut?: Date;
  durationMinutes?: number;
  date: Date;
  status: 'PRESENT' | 'ABSENT' | 'INCOMPLETE';
  createdAt: Date;
}

// Change History
export interface ChangeHistory {
  id: string;
  entityType: string;
  entityId: string;
  changedBy: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  timestamp: Date;
}

// Sync-related types
export interface PendingChange {
  id: string;
  entityType: string;
  entityId: string;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE';
  data: unknown;
  timestamp: Date;
  retries: number;
  error?: string;
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'error' | 'success';
  pendingChanges: number;
  lastSyncTime: Date | null;
  error?: string;
}

// Online/Offline Status types
export enum OnlineStatus {
  Online = 'online',
  Offline = 'offline',
  Syncing = 'syncing',
  SyncError = 'syncError',
}

export interface OfflineIndicatorProps {
  /**
   * Position of the indicator on screen
   * @default 'top'
   */
  position?: 'top' | 'bottom';

  /**
   * Whether to show the indicator only when offline
   * @default true
   */
  onlyShowOffline?: boolean;

  /**
   * Custom class name for the indicator container
   */
  className?: string;

  /**
   * Whether to show detailed sync status
   * @default false
   */
  showSyncStatus?: boolean;

  /**
   * Custom text for offline state
   * @default 'You are offline'
   */
  offlineText?: string;

  /**
   * Custom text for syncing state
   * @default 'Syncing changes...'
   */
  syncingText?: string;

  /**
   * Custom text for sync error state
   * @default 'Sync failed'
   */
  syncErrorText?: string;

  /**
   * Auto-dismiss timeout in milliseconds (0 to disable)
   * @default 0
   */
  autoDismissTimeout?: number;

  /**
   * Whether to show pending changes count
   * @default false
   */
  showPendingCount?: boolean;
}

export interface UseOnlineStatusReturn {
  /**
   * Current online status
   */
  status: OnlineStatus;

  /**
   * Is currently online
   */
  isOnline: boolean;

  /**
   * Is currently offline
   */
  isOffline: boolean;

  /**
   * Is currently syncing
   */
  isSyncing: boolean;

  /**
   * Last sync time
   */
  lastSyncTime: Date | null;

  /**
   * Pending changes count
   */
  pendingChanges: number;

  /**
   * Last sync error message
   */
  lastError: string | null;

  /**
   * Manually trigger sync
   */
  triggerSync: () => Promise<void>;

  /**
   * Clear the last error
   */
  clearError: () => void;
}
