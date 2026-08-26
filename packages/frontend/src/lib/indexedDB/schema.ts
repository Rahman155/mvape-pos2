/**
 * IndexedDB Schema Definition
 * Defines the structure of all object stores and their indices
 */

/**
 * Database configuration
 */
export const DB_CONFIG = {
  name: 'vapestore-pos',
  version: 1,
  description: 'Vapestore POS offline-first database'
};

/**
 * Store names constant
 */
export const STORES = {
  // Core entities
  USERS: 'users',
  STORES: 'stores',
  PRODUCTS: 'products',
  INVENTORY: 'inventory',
  TRANSACTIONS: 'transactions',
  TRANSACTION_ITEMS: 'transactionItems',
  MEMBERS: 'members',
  BOP: 'bop',
  SUPPLIERS: 'suppliers',
  PURCHASE_ORDERS: 'purchaseOrders',
  PO_ITEMS: 'poItems',
  PIUTANG: 'piutang',
  STOCK_TRANSFERS: 'stockTransfers',
  STOCK_TRANSFER_ITEMS: 'stockTransferItems',
  STOCK_OPNAMES: 'stockOpnames',
  OPNAME_DETAILS: 'opnameDetails',
  ATTENDANCE: 'attendance',
  CHANGE_HISTORY: 'changeHistory',
  // Sync-related
  PENDING_CHANGES: 'pendingChanges',
  SYNC_METADATA: 'syncMetadata'
} as const;

/**
 * Index configuration for each store
 * Format: { storeName: [{ name, keyPath, unique?, multiEntry? }, ...] }
 */
export const INDICES: Record<string, Array<{
  name: string;
  keyPath: string | string[];
  unique?: boolean;
  multiEntry?: boolean;
}>> = {
  [STORES.USERS]: [
    { name: 'username', keyPath: 'username', unique: true },
    { name: 'email', keyPath: 'email', unique: false },
    { name: 'role', keyPath: 'role', unique: false },
    { name: 'storeId', keyPath: 'storeId', unique: false }
  ],
  [STORES.STORES]: [
    { name: 'name', keyPath: 'name', unique: false },
    { name: 'isActive', keyPath: 'isActive', unique: false }
  ],
  [STORES.PRODUCTS]: [
    { name: 'sku', keyPath: 'sku', unique: true },
    { name: 'category', keyPath: 'category', unique: false },
    { name: 'name', keyPath: 'name', unique: false },
    { name: 'isActive', keyPath: 'isActive', unique: false }
  ],
  [STORES.INVENTORY]: [
    { name: 'storeId_productId', keyPath: ['storeId', 'productId'], unique: true },
    { name: 'storeId', keyPath: 'storeId', unique: false },
    { name: 'productId', keyPath: 'productId', unique: false },
    { name: 'quantity', keyPath: 'quantity', unique: false }
  ],
  [STORES.TRANSACTIONS]: [
    { name: 'storeId', keyPath: 'storeId', unique: false },
    { name: 'kasirId', keyPath: 'kasirId', unique: false },
    { name: 'transactionDate', keyPath: 'transactionDate', unique: false },
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'isEdited', keyPath: 'isEdited', unique: false }
  ],
  [STORES.TRANSACTION_ITEMS]: [
    { name: 'transactionId', keyPath: 'transactionId', unique: false },
    { name: 'productId', keyPath: 'productId', unique: false }
  ],
  [STORES.MEMBERS]: [
    { name: 'memberNumber', keyPath: 'memberNumber', unique: true },
    { name: 'phone', keyPath: 'phone', unique: false },
    { name: 'name', keyPath: 'name', unique: false },
    { name: 'isActive', keyPath: 'isActive', unique: false }
  ],
  [STORES.BOP]: [
    { name: 'storeId', keyPath: 'storeId', unique: false },
    { name: 'effectiveFrom', keyPath: 'effectiveFrom', unique: false }
  ],
  [STORES.SUPPLIERS]: [
    { name: 'name', keyPath: 'name', unique: false },
    { name: 'isActive', keyPath: 'isActive', unique: false }
  ],
  [STORES.PURCHASE_ORDERS]: [
    { name: 'supplierId', keyPath: 'supplierId', unique: false },
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'paymentStatus', keyPath: 'paymentStatus', unique: false },
    { name: 'dueDate', keyPath: 'dueDate', unique: false }
  ],
  [STORES.PO_ITEMS]: [
    { name: 'purchaseOrderId', keyPath: 'purchaseOrderId', unique: false },
    { name: 'productId', keyPath: 'productId', unique: false }
  ],
  [STORES.PIUTANG]: [
    { name: 'transactionId', keyPath: 'transactionId', unique: false },
    { name: 'memberId', keyPath: 'memberId', unique: false },
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'dueDate', keyPath: 'dueDate', unique: false }
  ],
  [STORES.STOCK_TRANSFERS]: [
    { name: 'fromLocationId', keyPath: 'fromLocationId', unique: false },
    { name: 'toStoreId', keyPath: 'toStoreId', unique: false },
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'transferDate', keyPath: 'transferDate', unique: false }
  ],
  [STORES.STOCK_TRANSFER_ITEMS]: [
    { name: 'stockTransferId', keyPath: 'stockTransferId', unique: false },
    { name: 'productId', keyPath: 'productId', unique: false }
  ],
  [STORES.STOCK_OPNAMES]: [
    { name: 'storeId', keyPath: 'storeId', unique: false },
    { name: 'status', keyPath: 'status', unique: false },
    { name: 'opnameDate', keyPath: 'opnameDate', unique: false }
  ],
  [STORES.OPNAME_DETAILS]: [
    { name: 'opnameId', keyPath: 'opnameId', unique: false },
    { name: 'productId', keyPath: 'productId', unique: false }
  ],
  [STORES.ATTENDANCE]: [
    { name: 'userId', keyPath: 'userId', unique: false },
    { name: 'date', keyPath: 'date', unique: false },
    { name: 'userId_date', keyPath: ['userId', 'date'], unique: true }
  ],
  [STORES.CHANGE_HISTORY]: [
    { name: 'entityType', keyPath: 'entityType', unique: false },
    { name: 'entityId', keyPath: 'entityId', unique: false },
    { name: 'changedBy', keyPath: 'changedBy', unique: false },
    { name: 'timestamp', keyPath: 'timestamp', unique: false }
  ],
  [STORES.PENDING_CHANGES]: [
    { name: 'entityType', keyPath: 'entityType', unique: false },
    { name: 'timestamp', keyPath: 'timestamp', unique: false },
    { name: 'retries', keyPath: 'retries', unique: false }
  ],
  [STORES.SYNC_METADATA]: [
    { name: 'key', keyPath: 'key', unique: true }
  ]
};

/**
 * Store configurations with metadata
 */
export const STORE_CONFIGS: Record<string, {
  keyPath: string;
  autoIncrement?: boolean;
  description: string;
}> = {
  [STORES.USERS]: { keyPath: 'id', description: 'System users' },
  [STORES.STORES]: { keyPath: 'id', description: 'Store locations' },
  [STORES.PRODUCTS]: { keyPath: 'id', description: 'Product catalog' },
  [STORES.INVENTORY]: { keyPath: 'id', description: 'Stock levels per location' },
  [STORES.TRANSACTIONS]: { keyPath: 'id', description: 'Sales transactions' },
  [STORES.TRANSACTION_ITEMS]: { keyPath: 'id', description: 'Transaction line items' },
  [STORES.MEMBERS]: { keyPath: 'id', description: 'Member profiles' },
  [STORES.BOP]: { keyPath: 'id', description: 'Operating expenses' },
  [STORES.SUPPLIERS]: { keyPath: 'id', description: 'Supplier information' },
  [STORES.PURCHASE_ORDERS]: { keyPath: 'id', description: 'Purchase orders' },
  [STORES.PO_ITEMS]: { keyPath: 'id', description: 'Purchase order items' },
  [STORES.PIUTANG]: { keyPath: 'id', description: 'Customer payables' },
  [STORES.STOCK_TRANSFERS]: { keyPath: 'id', description: 'Inventory transfers' },
  [STORES.STOCK_TRANSFER_ITEMS]: { keyPath: 'id', description: 'Transfer items' },
  [STORES.STOCK_OPNAMES]: { keyPath: 'id', description: 'Stock opname sessions' },
  [STORES.OPNAME_DETAILS]: { keyPath: 'id', description: 'Opname line items' },
  [STORES.ATTENDANCE]: { keyPath: 'id', description: 'Staff attendance records' },
  [STORES.CHANGE_HISTORY]: { keyPath: 'id', description: 'Audit log of changes' },
  [STORES.PENDING_CHANGES]: { keyPath: 'id', description: 'Offline changes awaiting sync' },
  [STORES.SYNC_METADATA]: { keyPath: 'key', description: 'Synchronization metadata' }
};

/**
 * List of stores that contain sensitive data requiring encryption
 */
export const ENCRYPTED_STORES = [
  STORES.USERS,
  STORES.MEMBERS,
  STORES.TRANSACTIONS,
  STORES.PIUTANG
] as const;

/**
 * Sensitive fields per store that should be encrypted
 */
export const SENSITIVE_FIELDS: Record<string, string[]> = {
  [STORES.TRANSACTIONS]: ['totalAmount'],
  [STORES.MEMBERS]: ['creditBalance'],
  [STORES.PURCHASE_ORDERS]: ['totalAmount'],
  [STORES.PIUTANG]: ['amount', 'remainingBalance']
};
