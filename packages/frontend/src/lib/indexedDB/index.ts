/**
 * IndexedDB Module
 * Central export point for all IndexedDB functionality
 */

// Schema exports
export { DB_CONFIG, STORES, INDICES, STORE_CONFIGS, ENCRYPTED_STORES, SENSITIVE_FIELDS } from './schema';

// Database exports
export { DatabaseError, IndexedDBManager, getDBManager, initDatabase, isDatabaseReady } from './database';

// CRUD operations exports
export { CRUDOperations, TransactionStore, ProductStore, InventoryStore, MemberStore, PendingChangesStore } from './crud';

// Validation exports
export {
  ValidationError,
  UserSchema,
  StoreSchema,
  ProductSchema,
  InventorySchema,
  TransactionItemSchema,
  TransactionSchema,
  MemberSchema,
  BOPSchema,
  SupplierSchema,
  PurchaseOrderItemSchema,
  PurchaseOrderSchema,
  PiutangSchema,
  StockTransferItemSchema,
  StockTransferSchema,
  OpnameDetailSchema,
  StockOpnameSchema,
  AttendanceSchema,
  PendingChangeSchema,
  Validators,
  validate,
  safeValidate,
  validateArray,
  validatePartial
} from './validation';

// Re-export types
export type { User } from './validation';
export type { Store } from './validation';
export type { Product } from './validation';
export type { Inventory } from './validation';
export type { TransactionItem } from './validation';
export type { Transaction } from './validation';
export type { Member } from './validation';
export type { BOP } from './validation';
export type { Supplier } from './validation';
export type { PurchaseOrderItem } from './validation';
export type { PurchaseOrder } from './validation';
export type { Piutang } from './validation';
export type { StockTransferItem } from './validation';
export type { StockTransfer } from './validation';
export type { OpnameDetail } from './validation';
export type { StockOpname } from './validation';
export type { Attendance } from './validation';
export type { PendingChange } from './validation';
