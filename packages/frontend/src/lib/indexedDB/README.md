# IndexedDB Local Storage Layer

This module implements a complete offline-first data persistence layer using IndexedDB for the Vapestore POS PWA application.

## Overview

The IndexedDB implementation provides:

- **Schema Management**: Defines all database stores, indices, and configurations
- **Database Initialization**: Handles database creation, versioning, and upgrade cycles
- **CRUD Operations**: Generic create, read, update, delete operations with batch support
- **Data Validation**: Comprehensive validation schemas using Zod for all entity types
- **Encryption Support**: Integration with field-level encryption for sensitive data
- **Type Safety**: Full TypeScript support with generated types from validation schemas

## Architecture

### Module Structure

```
indexedDB/
├── schema.ts       # Database schema definitions and configurations
├── database.ts     # Database initialization and lifecycle management
├── crud.ts         # CRUD operations and store-specific helpers
├── validation.ts   # Zod validation schemas and validators
├── index.ts        # Central export point
└── README.md       # This file
```

### Stores

The database contains 20 object stores organized by domain:

#### Core Entities
- **users**: System users with roles and permissions
- **stores**: Store locations and metadata
- **products**: Product catalog with pricing
- **inventory**: Stock levels per location

#### Transaction Management
- **transactions**: Sales transactions with metadata
- **transaction_items**: Transaction line items
- **members**: Member profiles and credit information
- **piutang**: Customer payables/tempo purchases

#### Operations
- **bop**: Biaya Operasional Penjualan (operating expenses)
- **suppliers**: Supplier information
- **purchase_orders**: Purchase orders to suppliers
- **po_items**: Purchase order line items
- **stock_transfers**: Inventory transfers between locations
- **stock_transfer_items**: Transfer item details
- **stock_opnames**: Physical inventory counts
- **opname_details**: Opname line items

#### System
- **attendance**: Staff clock-in/clock-out records
- **change_history**: Audit log of all changes
- **pending_changes**: Offline changes awaiting synchronization
- **sync_metadata**: Synchronization metadata

## Usage

### Initialization

```typescript
import { initDatabase, isDatabaseReady } from '@/lib/indexedDB';

// Initialize database on app startup
await initDatabase();

// Check if database is ready
if (isDatabaseReady()) {
  // Database is ready for operations
}
```

### CRUD Operations

```typescript
import { CRUDOperations, STORES } from '@/lib/indexedDB';

// Create a transaction
const transaction = {
  id: '123',
  storeId: 'store-1',
  kasirId: 'kasir-1',
  totalAmount: 100000,
  // ... other fields
};

await CRUDOperations.create(STORES.TRANSACTIONS, transaction);

// Read a transaction
const tx = await CRUDOperations.read(STORES.TRANSACTIONS, '123');

// Update a transaction
await CRUDOperations.update(STORES.TRANSACTIONS, updatedTransaction);

// Delete a transaction
await CRUDOperations.delete(STORES.TRANSACTIONS, '123');

// Query by index
const storeTransactions = await CRUDOperations.queryByIndex(
  STORES.TRANSACTIONS,
  'storeId',
  'store-1'
);

// Read all records
const allProducts = await CRUDOperations.readAll(STORES.PRODUCTS);

// Batch operations
await CRUDOperations.createBatch(STORES.PRODUCTS, productArray);
await CRUDOperations.updateBatch(STORES.TRANSACTIONS, transactionArray);
await CRUDOperations.deleteBatch(STORES.MEMBERS, memberIds);

// Count records
const totalTransactions = await CRUDOperations.count(STORES.TRANSACTIONS);
```

### Store-Specific Helpers

```typescript
import { TransactionStore, MemberStore, ProductStore } from '@/lib/indexedDB';

// TransactionStore
const txn = await TransactionStore.read(txnId);
const storeTxns = await TransactionStore.queryByStore(storeId);
const completedTxns = await TransactionStore.queryByStatus('COMPLETED');

// MemberStore
const member = await MemberStore.read(memberId);
const memberByNumber = await MemberStore.queryByMemberNumber('MBR-001');

// ProductStore
const product = await ProductStore.read(productId);
const productBySku = await ProductStore.queryBySku('PROD-SKU-001');
```

### Data Validation

```typescript
import {
  validate,
  safeValidate,
  validateArray,
  TransactionSchema,
  MemberSchema,
  ValidationError
} from '@/lib/indexedDB';

// Validate and throw on error
try {
  const transaction = validate(TransactionSchema, data);
  // Use validated transaction
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation failed on field: ${error.field}`);
  }
}

// Safe validation that returns result object
const result = safeValidate(TransactionSchema, data);
if (result.success) {
  console.log('Valid transaction:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}

// Validate arrays
const validTransactions = validateArray(TransactionSchema, data);
```

## Schema Validation

All entities are validated using Zod schemas. Schemas enforce:

- **Type safety**: Correct data types for all fields
- **Format validation**: Email, phone, URL validation
- **Range validation**: Positive numbers, non-negative quantities
- **Enum validation**: Valid values for enums (payment methods, statuses)
- **UUID validation**: Valid UUID format for IDs
- **Date validation**: Valid dates and datetime formats
- **Custom rules**: Complex validation like amount consistency

### Available Validators

```typescript
import { Validators } from '@/lib/indexedDB';

// Access any validator
const schema = Validators.Transaction;
const schema = Validators.Member;
const schema = Validators.StockOpname;
// ... all entity types
```

## Data Validation in Operations

CRUD operations automatically integrate with validation:

```typescript
// Create with validation
const validatedTransaction = validate(TransactionSchema, transactionData);
await CRUDOperations.create(STORES.TRANSACTIONS, validatedTransaction);

// Or use safe validation
const result = safeValidate(TransactionSchema, data);
if (result.success) {
  await CRUDOperations.create(STORES.TRANSACTIONS, result.data);
}
```

## Indices and Queries

### Common Indices

**Transactions**
- `storeId`: Query transactions by store
- `kasirId`: Query transactions by cashier
- `transactionDate`: Query transactions by date
- `status`: Query transactions by status

**Inventory**
- `storeId_productId`: Unique composite index
- `storeId`: Query inventory by store
- `productId`: Query inventory by product

**Members**
- `memberNumber`: Unique member number lookup
- `isActive`: Query active/inactive members

**Pending Changes**
- `entityType`: Query pending changes by entity type
- `timestamp`: Query by creation timestamp

### Query Examples

```typescript
import { CRUDOperations, STORES } from '@/lib/indexedDB';

// Single value query
const storeTransactions = await CRUDOperations.queryByIndex(
  STORES.TRANSACTIONS,
  'storeId',
  storeId
);

// Range query (dates)
const dateRange = IDBKeyRange.bound(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
const monthlyTransactions = await CRUDOperations.queryByRange(
  STORES.TRANSACTIONS,
  'transactionDate',
  dateRange
);

// Count by index
const storeTransactionCount = await CRUDOperations.countByIndex(
  STORES.TRANSACTIONS,
  'storeId',
  storeId
);
```

## Offline-First Features

### Pending Changes Tracking

For offline operation, track pending changes:

```typescript
import { PendingChangesStore } from '@/lib/indexedDB';

// Save a pending change when offline
const pendingChange = {
  id: uuid(),
  entityType: 'transaction',
  entityId: transactionId,
  changeType: 'CREATE',
  data: transactionData,
  timestamp: new Date(),
  retries: 0
};

await PendingChangesStore.create(pendingChange);

// Query pending changes for sync
const pending = await PendingChangesStore.readAll();

// Remove after successful sync
await PendingChangesStore.delete(changeId);
```

### Encryption Support

Sensitive fields are automatically encrypted:

```typescript
import { EncryptedIndexedDB } from '@/lib/encryptedIndexedDB';

// Fields automatically encrypted:
// - transactions: totalAmount
// - members: creditBalance
// - purchase_orders: totalAmount
// - piutang: amount, remainingBalance
```

## Database Lifecycle

### Initialization

```typescript
import { getDBManager, initDatabase } from '@/lib/indexedDB';

// Option 1: Using global manager
const db = await initDatabase();

// Option 2: Using manager instance
const manager = getDBManager();
await manager.init();
```

### Version Management

Database schema is versioned at `DB_CONFIG.version = 1`. When updating schema:

1. Increment `DB_CONFIG.version`
2. Update schema definitions
3. Database automatically migrates on version change
4. App users receive schema update on next load

### Cleanup

```typescript
import { getDBManager } from '@/lib/indexedDB';

const manager = getDBManager();

// Clear all data (logout)
await manager.clearAllStores();

// Close connection
manager.close();

// Get database statistics
const stats = await manager.getStats();
console.log(`Total records: ${stats.totalRecords}`);
```

## Error Handling

```typescript
import { DatabaseError, ValidationError } from '@/lib/indexedDB';

try {
  await CRUDOperations.create(STORES.TRANSACTIONS, data);
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error(`Database error (${error.code}): ${error.message}`);
  }
}

try {
  const validated = validate(TransactionSchema, data);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation failed on ${error.field}: ${error.message}`);
  }
}
```

## Performance Considerations

### Indices

All frequently queried fields have indices:
- Primary key lookups are O(log n)
- Index lookups are O(log n)
- Range queries are O(log n + result set size)
- Full table scans use `readAll()` sparingly

### Batch Operations

Use batch operations for better performance:

```typescript
// More efficient than individual operations
await CRUDOperations.createBatch(STORES.PRODUCTS, products);

// Less efficient - individual operations
for (const product of products) {
  await CRUDOperations.create(STORES.PRODUCTS, product);
}
```

### Transaction Size

IndexedDB operations are faster for smaller transactions:
- Batch size: 100-1000 records
- Individual operations for single items
- Use pagination for large result sets

## Security

### Sensitive Data Encryption

Sensitive fields are encrypted automatically:

```typescript
// These fields are encrypted at rest
- User passwords (bcrypted, not in IndexedDB)
- Transaction amounts
- Member credit balances
- Piutang amounts
```

### Data Isolation

Data is stored per-user:
- IndexedDB is origin-specific
- Cannot be accessed by other origins
- Cleared on browser cache clear
- Encrypted with user-derived keys

## Testing

Run unit tests:

```bash
npm test -- src/__tests__/lib/indexedDB.test.ts
```

Test coverage includes:
- Schema validation
- CRUD operations
- Batch operations
- Error handling
- Data persistence
- Offline-first features

## Migration & Upgrades

When updating database schema:

1. Increment `DB_CONFIG.version`
2. Add migration logic in `IndexedDBManager.createStores()`
3. Update `INDICES` for new/changed indices
4. Update `STORE_CONFIGS` for new stores
5. Database auto-migrates on user's next load

## Best Practices

1. **Always validate before creating**
   ```typescript
   const validated = validate(Schema, data);
   await CRUDOperations.create(STORE, validated);
   ```

2. **Use batch operations when possible**
   ```typescript
   // Good: batch operation
   await CRUDOperations.createBatch(STORE, items);
   
   // Less efficient: individual operations
   for (const item of items) {
     await CRUDOperations.create(STORE, item);
   }
   ```

3. **Handle errors appropriately**
   ```typescript
   try {
     await operation();
   } catch (error) {
     if (error instanceof DatabaseError) {
       // Handle database error
     } else if (error instanceof ValidationError) {
       // Handle validation error
     }
   }
   ```

4. **Clean up on logout**
   ```typescript
   import { getDBManager } from '@/lib/indexedDB';
   
   // On logout
   const manager = getDBManager();
   await manager.clearAllStores();
   ```

5. **Query efficiently**
   ```typescript
   // Good: use index
   const items = await CRUDOperations.queryByIndex(STORE, 'storeId', id);
   
   // Less efficient: get all and filter
   const allItems = await CRUDOperations.readAll(STORE);
   const filtered = allItems.filter(i => i.storeId === id);
   ```

## References

- [IndexedDB MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Zod Documentation](https://zod.dev/)
- [Vapestore POS Design](../../../design.md)
- [Requirements Document](../../../requirements.md)
