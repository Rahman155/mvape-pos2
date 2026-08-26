/**
 * Data Validation for IndexedDB
 * Provides validation schemas and validators for all store types
 */

import { z } from 'zod';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any,
    public errors?: z.ZodError
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Common validation schemas
 */
const UUIDSchema = z.string().uuid('Invalid UUID format');
const DateSchema = z
  .union([z.date(), z.string().datetime()])
  .transform((v) => (v instanceof Date ? v : new Date(v)));
const PositiveNumberSchema = z.number().positive('Must be positive');
const NonNegativeNumberSchema = z.number().nonnegative('Must be non-negative');
const EmailSchema = z.string().email('Invalid email format').optional();
const PhoneSchema = z.string().regex(/^[0-9\s+\-()]*$/, 'Invalid phone format').optional();

/**
 * User validation schema
 */
export const UserSchema = z.object({
  id: UUIDSchema,
  username: z.string().min(3).max(255),
  email: EmailSchema,
  role: z.enum(['KASIR', 'OWNER', 'ADMIN']),
  storeId: UUIDSchema.optional(),
  isActive: z.boolean().default(true),
  createdAt: DateSchema,
  updatedAt: DateSchema,
  lastLogin: DateSchema.optional()
});

export type User = z.infer<typeof UserSchema>;

/**
 * Store validation schema
 */
export const StoreSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(255),
  address: z.string().optional(),
  phone: PhoneSchema,
  logoUrl: z.string().url().optional(),
  operatingHours: z.record(z.string(), z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
    closed: z.boolean().optional()
  })).optional(),
  isActive: z.boolean().default(true),
  createdAt: DateSchema,
  updatedAt: DateSchema,
  metadata: z.record(z.unknown()).optional()
});

export type Store = z.infer<typeof StoreSchema>;

/**
 * Product validation schema
 */
export const ProductSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100),
  category: z.string().optional(),
  costPrice: PositiveNumberSchema,
  sellingPrice: PositiveNumberSchema,
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  createdAt: DateSchema,
  updatedAt: DateSchema
});

export type Product = z.infer<typeof ProductSchema>;

/**
 * Inventory validation schema
 */
export const InventorySchema = z.object({
  id: UUIDSchema,
  productId: UUIDSchema,
  storeId: UUIDSchema,
  quantity: z.number().int().nonnegative('Quantity cannot be negative'),
  reserved: z.number().int().nonnegative('Reserved cannot be negative').default(0),
  reorderLevel: z.number().int().nonnegative().default(10),
  lastRestockAt: DateSchema.optional(),
  createdAt: DateSchema,
  updatedAt: DateSchema
});

export type Inventory = z.infer<typeof InventorySchema>;

/**
 * Transaction item validation schema
 */
export const TransactionItemSchema = z.object({
  id: UUIDSchema,
  transactionId: UUIDSchema,
  productId: UUIDSchema,
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: PositiveNumberSchema,
  totalPrice: PositiveNumberSchema,
  createdAt: DateSchema
});

export type TransactionItem = z.infer<typeof TransactionItemSchema>;

/**
 * Transaction validation schema
 */
export const TransactionSchema = z.object({
  id: UUIDSchema,
  storeId: UUIDSchema,
  kasirId: UUIDSchema,
  transactionDate: DateSchema,
  totalAmount: NonNegativeNumberSchema.refine(
    (val) => !isNaN(val),
    'Total amount must be a valid number'
  ),
  paymentMethod: z.enum(['CASH', 'MEMBER_CREDIT', 'TEMPO']),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  notes: z.string().optional(),
  createdAt: DateSchema,
  updatedAt: DateSchema,
  editedAt: DateSchema.optional(),
  editedBy: UUIDSchema.optional(),
  isEdited: z.boolean().default(false),
  version: z.number().int().positive().default(1),
  items: z.array(TransactionItemSchema)
});

export type Transaction = z.infer<typeof TransactionSchema>;

/**
 * Member validation schema
 */
export const MemberSchema = z.object({
  id: UUIDSchema,
  memberNumber: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  phone: PhoneSchema,
  email: EmailSchema,
  creditBalance: NonNegativeNumberSchema.default(0),
  totalSpent: NonNegativeNumberSchema.default(0),
  isActive: z.boolean().default(true),
  createdAt: DateSchema,
  updatedAt: DateSchema
});

export type Member = z.infer<typeof MemberSchema>;

/**
 * BOP (Biaya Operasional Penjualan) validation schema
 */
export const BOPSchema = z.object({
  id: UUIDSchema,
  storeId: UUIDSchema,
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  amount: PositiveNumberSchema,
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
  createdAt: DateSchema,
  updatedAt: DateSchema
});

export type BOP = z.infer<typeof BOPSchema>;

/**
 * Supplier validation schema
 */
export const SupplierSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(255),
  phone: PhoneSchema,
  email: EmailSchema,
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: DateSchema,
  updatedAt: DateSchema
});

export type Supplier = z.infer<typeof SupplierSchema>;

/**
 * Purchase Order Item validation schema
 */
export const PurchaseOrderItemSchema = z.object({
  id: UUIDSchema,
  purchaseOrderId: UUIDSchema,
  productId: UUIDSchema,
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: PositiveNumberSchema,
  totalPrice: PositiveNumberSchema,
  receivedQuantity: z.number().int().nonnegative().default(0),
  createdAt: DateSchema
});

export type PurchaseOrderItem = z.infer<typeof PurchaseOrderItemSchema>;

/**
 * Purchase Order validation schema
 */
export const PurchaseOrderSchema = z.object({
  id: UUIDSchema,
  supplierId: UUIDSchema,
  orderDate: DateSchema,
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'TEMPO']),
  paymentStatus: z.enum(['PENDING', 'PAID', 'PARTIAL']).default('PENDING'),
  totalAmount: PositiveNumberSchema,
  dueDate: DateSchema.optional(),
  status: z.enum(['PENDING', 'RECEIVED', 'CANCELLED']).default('PENDING'),
  createdAt: DateSchema,
  updatedAt: DateSchema,
  items: z.array(PurchaseOrderItemSchema)
});

export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;

/**
 * Piutang (Customer Payable) validation schema
 */
export const PiutangSchema = z.object({
  id: UUIDSchema,
  transactionId: UUIDSchema.optional(),
  memberId: UUIDSchema.optional(),
  amount: PositiveNumberSchema,
  remainingBalance: NonNegativeNumberSchema,
  dueDate: DateSchema.optional(),
  status: z.enum(['OPEN', 'PARTIAL', 'CLOSED']).default('OPEN'),
  createdAt: DateSchema,
  updatedAt: DateSchema
});

export type Piutang = z.infer<typeof PiutangSchema>;

/**
 * Stock Transfer Item validation schema
 */
export const StockTransferItemSchema = z.object({
  id: UUIDSchema,
  stockTransferId: UUIDSchema,
  productId: UUIDSchema,
  quantity: z.number().int().positive('Quantity must be positive'),
  receivedQuantity: z.number().int().nonnegative().default(0),
  createdAt: DateSchema
});

export type StockTransferItem = z.infer<typeof StockTransferItemSchema>;

/**
 * Stock Transfer validation schema
 */
export const StockTransferSchema = z.object({
  id: UUIDSchema,
  fromLocationId: UUIDSchema,
  toStoreId: UUIDSchema,
  transferDate: DateSchema,
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).default('PENDING'),
  createdBy: UUIDSchema,
  createdAt: DateSchema,
  updatedAt: DateSchema,
  items: z.array(StockTransferItemSchema)
});

export type StockTransfer = z.infer<typeof StockTransferSchema>;

/**
 * Stock Opname Detail validation schema
 */
export const OpnameDetailSchema = z.object({
  id: UUIDSchema,
  opnameId: UUIDSchema,
  productId: UUIDSchema,
  systemQuantity: z.number().int().nonnegative(),
  physicalQuantity: z.number().int().nonnegative(),
  difference: z.number().int(),
  status: z.enum(['MATCH', 'SHORTAGE', 'EXCESS']).default('MATCH'),
  notes: z.string().optional(),
  createdAt: DateSchema
});

export type OpnameDetail = z.infer<typeof OpnameDetailSchema>;

/**
 * Stock Opname validation schema
 */
export const StockOpnameSchema = z.object({
  id: UUIDSchema,
  storeId: UUIDSchema,
  opnameDate: DateSchema,
  status: z.enum(['ONGOING', 'COMPLETED', 'VERIFIED']).default('ONGOING'),
  conductedBy: UUIDSchema,
  verifiedBy: UUIDSchema.optional(),
  notes: z.string().optional(),
  createdAt: DateSchema,
  updatedAt: DateSchema,
  details: z.array(OpnameDetailSchema)
});

export type StockOpname = z.infer<typeof StockOpnameSchema>;

/**
 * Attendance validation schema
 */
export const AttendanceSchema = z.object({
  id: UUIDSchema,
  userId: UUIDSchema,
  clockIn: DateSchema,
  clockOut: DateSchema.optional(),
  durationMinutes: z.number().int().nonnegative().optional(),
  date: z.coerce.date(),
  status: z.enum(['PRESENT', 'ABSENT', 'INCOMPLETE']).default('PRESENT'),
  createdAt: DateSchema
});

export type Attendance = z.infer<typeof AttendanceSchema>;

/**
 * Pending Change validation schema
 */
export const PendingChangeSchema = z.object({
  id: UUIDSchema,
  entityType: z.string().min(1),
  entityId: UUIDSchema,
  changeType: z.enum(['CREATE', 'UPDATE', 'DELETE']),
  data: z.unknown(),
  timestamp: DateSchema,
  retries: z.number().int().nonnegative().default(0),
  error: z.string().optional()
});

export type PendingChange = z.infer<typeof PendingChangeSchema>;

/**
 * Central validation dispatcher
 */
export const Validators = {
  User: UserSchema,
  Store: StoreSchema,
  Product: ProductSchema,
  Inventory: InventorySchema,
  Transaction: TransactionSchema,
  TransactionItem: TransactionItemSchema,
  Member: MemberSchema,
  BOP: BOPSchema,
  Supplier: SupplierSchema,
  PurchaseOrder: PurchaseOrderSchema,
  PurchaseOrderItem: PurchaseOrderItemSchema,
  Piutang: PiutangSchema,
  StockTransfer: StockTransferSchema,
  StockTransferItem: StockTransferItemSchema,
  StockOpname: StockOpnameSchema,
  OpnameDetail: OpnameDetailSchema,
  Attendance: AttendanceSchema,
  PendingChange: PendingChangeSchema
};

/**
 * Validate data against a schema
 * @throws {ValidationError} if validation fails
 */
export function validate<T>(
  schema: z.Schema,
  data: unknown,
  fieldName: string = 'data'
): T {
  try {
    return schema.parse(data) as T;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new ValidationError(
        `Validation failed: ${firstError.message}`,
        firstError.path.join('.') || fieldName,
        data,
        error
      );
    }
    throw error;
  }
}

/**
 * Safe validation that returns result with errors
 */
export function safeValidate<T>(
  schema: z.Schema,
  data: unknown
): { success: boolean; data?: T; errors?: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as T };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => e.message)
  };
}

/**
 * Validate array of data
 */
export function validateArray<T>(
  schema: z.Schema,
  data: unknown[]
): T[] {
  const arraySchema = z.array(schema);
  return validate<T[]>(arraySchema, data, 'array');
}

/**
 * Partial update validation (allows null for optional fields)
 */
export function validatePartial<T>(
  schema: z.Schema,
  data: Partial<T>
): Partial<T> {
  return schema.partial().parse(data);
}
