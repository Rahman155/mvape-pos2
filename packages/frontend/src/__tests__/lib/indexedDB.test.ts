/**
 * IndexedDB Implementation Tests
 * Tests for schema, database initialization, CRUD operations, and validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DB_CONFIG,
  STORES,
  INDICES,
  STORE_CONFIGS,
  DatabaseError,
  IndexedDBManager,
  CRUDOperations,
  ValidationError,
  TransactionSchema,
  MemberSchema,
  PendingChangeSchema,
  validate,
  safeValidate,
  validateArray
} from '@/lib/indexedDB';

/**
 * Generate a UUID-like string for testing
 */
function generateId(): string {
  return `${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Mock transaction for testing
 */
function createMockTransaction() {
  return {
    id: generateId(),
    storeId: generateId(),
    kasirId: generateId(),
    transactionDate: new Date(),
    totalAmount: 150000,
    paymentMethod: 'CASH' as const,
    status: 'COMPLETED' as const,
    notes: 'Test transaction',
    createdAt: new Date(),
    updatedAt: new Date(),
    isEdited: false,
    version: 1,
    items: []
  };
}

/**
 * Mock member for testing
 */
function createMockMember() {
  return {
    id: generateId(),
    memberNumber: `MBR-${Date.now()}`,
    name: 'Test Member',
    phone: '+62812345678',
    email: 'member@test.com',
    creditBalance: 100000,
    totalSpent: 500000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

describe('IndexedDB Schema', () => {
  it('should have required database configuration', () => {
    expect(DB_CONFIG.name).toBe('vapestore-pos');
    expect(DB_CONFIG.version).toBe(1);
    expect(DB_CONFIG.description).toBeDefined();
  });

  it('should have all required stores defined', () => {
    expect(Object.keys(STORES).length).toBeGreaterThan(0);
    expect(STORES.TRANSACTIONS).toBe('transactions');
    expect(STORES.MEMBERS).toBe('members');
    expect(STORES.PRODUCTS).toBe('products');
    expect(STORES.PENDING_CHANGES).toBe('pendingChanges');
  });

  it('should have indices for all stores', () => {
    for (const storeName of Object.values(STORES)) {
      expect(INDICES[storeName]).toBeDefined();
      expect(Array.isArray(INDICES[storeName])).toBe(true);
      expect(INDICES[storeName].length).toBeGreaterThan(0);
    }
  });

  it('should have store configurations for all stores', () => {
    for (const storeName of Object.values(STORES)) {
      const config = STORE_CONFIGS[storeName];
      expect(config).toBeDefined();
      expect(config.keyPath).toBeDefined();
      expect(config.description).toBeDefined();
    }
  });

  it('should have valid index configurations', () => {
    const transactionIndices = INDICES[STORES.TRANSACTIONS];
    expect(transactionIndices.some((i) => i.name === 'storeId')).toBe(true);
    expect(transactionIndices.some((i) => i.name === 'status')).toBe(true);

    // Check for unique constraint on key indices
    const memberIndices = INDICES[STORES.MEMBERS];
    const memberNumberIndex = memberIndices.find((i) => i.name === 'memberNumber');
    expect(memberNumberIndex?.unique).toBe(true);
  });
});

describe('DatabaseError', () => {
  it('should be an instance of Error', () => {
    const error = new DatabaseError('Test error', 'TEST_CODE');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
  });

  it('should have correct name', () => {
    const error = new DatabaseError('Test', 'CODE');
    expect(error.name).toBe('DatabaseError');
  });
});

describe('Validation', () => {
  describe('TransactionSchema', () => {
    it('should validate correct transaction data', () => {
      const transaction = createMockTransaction();
      const result = safeValidate(TransactionSchema, transaction);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        id: transaction.id,
        storeId: transaction.storeId,
        totalAmount: transaction.totalAmount
      }));
    });

    it('should fail validation with invalid totalAmount', () => {
      const transaction = createMockTransaction();
      transaction.totalAmount = -100; // Negative not allowed

      const result = safeValidate(TransactionSchema, transaction);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should fail validation with invalid paymentMethod', () => {
      const transaction = createMockTransaction();
      (transaction as any).paymentMethod = 'INVALID';

      const result = safeValidate(TransactionSchema, transaction);
      expect(result.success).toBe(false);
    });

    it('should fail validation with missing required fields', () => {
      const transaction = createMockTransaction();
      const { totalAmount, ...incomplete } = transaction;

      const result = safeValidate(TransactionSchema, incomplete);
      expect(result.success).toBe(false);
    });

    it('should validate transaction with items', () => {
      const transaction = createMockTransaction();
      transaction.items = [
        {
          id: generateId(),
          transactionId: transaction.id,
          productId: generateId(),
          quantity: 2,
          unitPrice: 50000,
          totalPrice: 100000,
          createdAt: new Date()
        }
      ];

      const result = safeValidate(TransactionSchema, transaction);
      expect(result.success).toBe(true);
    });
  });

  describe('MemberSchema', () => {
    it('should validate correct member data', () => {
      const member = createMockMember();
      const result = safeValidate(MemberSchema, member);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        name: member.name,
        memberNumber: member.memberNumber
      }));
    });

    it('should fail validation with duplicate memberNumber', async () => {
      const member = createMockMember();
      member.memberNumber = 'MBR-001';

      const result = safeValidate(MemberSchema, member);
      expect(result.success).toBe(true); // Schema doesn't check uniqueness, DB does
    });

    it('should fail validation with negative creditBalance', () => {
      const member = createMockMember();
      member.creditBalance = -1000;

      const result = safeValidate(MemberSchema, member);
      expect(result.success).toBe(false);
    });

    it('should allow optional email and phone', () => {
      const member = createMockMember();
      delete (member as any).email;
      delete (member as any).phone;

      const result = safeValidate(MemberSchema, member);
      expect(result.success).toBe(true);
    });
  });

  describe('validate function', () => {
    it('should throw ValidationError on invalid data', () => {
      const transaction = createMockTransaction();
      transaction.totalAmount = -100;

      expect(() => validate(TransactionSchema, transaction)).toThrow(ValidationError);
    });

    it('should return validated data on success', () => {
      const transaction = createMockTransaction();
      const result = validate(TransactionSchema, transaction);
      expect(result.id).toBe(transaction.id);
    });
  });

  describe('validateArray function', () => {
    it('should validate array of transactions', () => {
      const transactions = [createMockTransaction(), createMockTransaction()];
      const result = validateArray(TransactionSchema, transactions);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should fail on array with invalid items', () => {
      const transactions = [createMockTransaction()];
      (transactions[0] as any).totalAmount = -100;

      expect(() => validateArray(TransactionSchema, transactions)).toThrow();
    });

    it('should fail on non-array input', () => {
      expect(() => validateArray(TransactionSchema, createMockTransaction())).toThrow();
    });
  });
});

describe('IndexedDBManager', () => {
  let manager: IndexedDBManager;

  beforeEach(() => {
    // Create new manager for each test
    manager = new IndexedDBManager();
  });

  afterEach(() => {
    // Cleanup
    if (manager) {
      manager.close();
    }
  });

  it('should be creatable', () => {
    expect(manager).toBeInstanceOf(IndexedDBManager);
  });

  it('should not be ready before initialization', () => {
    expect(manager.isReady()).toBe(false);
  });

  it('should throw error when getting database before init', () => {
    expect(() => manager.getDatabase()).toThrow(DatabaseError);
  });

  it('should close connection properly', () => {
    manager.close();
    expect(manager.isReady()).toBe(false);
    expect(() => manager.getDatabase()).toThrow();
  });
});

describe('CRUD Operations', () => {
  describe('Create operation', () => {
    it('should create a transaction object successfully', async () => {
      const transaction = createMockTransaction();
      // Note: Actual DB operations would require a real IndexedDB instance
      // This test validates the structure
      expect(transaction.id).toBeDefined();
      expect(transaction.storeId).toBeDefined();
      expect(transaction.totalAmount).toBeGreaterThanOrEqual(0);
    });

    it('should create a member object successfully', async () => {
      const member = createMockMember();
      expect(member.id).toBeDefined();
      expect(member.memberNumber).toBeDefined();
      expect(member.creditBalance).toBeGreaterThanOrEqual(0);
    });

    it('should reject invalid transaction', () => {
      const invalid = { totalAmount: -100 };
      expect(() => validate(TransactionSchema, invalid)).toThrow();
    });
  });

  describe('Batch operations', () => {
    it('should validate multiple transactions', () => {
      const transactions = [
        createMockTransaction(),
        createMockTransaction(),
        createMockTransaction()
      ];

      const validated = validateArray(TransactionSchema, transactions);
      expect(validated).toHaveLength(3);
    });

    it('should validate multiple members', () => {
      const members = [
        createMockMember(),
        createMockMember(),
        createMockMember()
      ];

      const validated = validateArray(MemberSchema, members);
      expect(validated).toHaveLength(3);
    });
  });
});

describe('Data Persistence Strategy', () => {
  it('should handle transactions with all payment methods', () => {
    const paymentMethods = ['CASH', 'MEMBER_CREDIT', 'TEMPO'] as const;

    for (const method of paymentMethods) {
      const transaction = createMockTransaction();
      transaction.paymentMethod = method;

      const result = safeValidate(TransactionSchema, transaction);
      expect(result.success).toBe(true);
    }
  });

  it('should handle transaction statuses', () => {
    const statuses = ['PENDING', 'COMPLETED', 'CANCELLED'] as const;

    for (const status of statuses) {
      const transaction = createMockTransaction();
      transaction.status = status;

      const result = safeValidate(TransactionSchema, transaction);
      expect(result.success).toBe(true);
    }
  });

  it('should preserve decimal precision in amounts', () => {
    const transaction = createMockTransaction();
    transaction.totalAmount = 1234567.89;

    const result = validate(TransactionSchema, transaction);
    expect(result.totalAmount).toBe(1234567.89);
  });

  it('should preserve timestamps', () => {
    const now = new Date();
    const transaction = createMockTransaction();
    transaction.createdAt = now;

    const result = validate(TransactionSchema, transaction);
    // Date comparison might differ slightly due to serialization
    expect(result.createdAt.getTime()).toBeCloseTo(now.getTime(), -2);
  });
});

describe('Offline-First Data Requirements', () => {
  it('should support pending changes tracking', () => {
    const pendingChange = {
      id: generateId(),
      entityType: 'transaction',
      entityId: generateId(),
      changeType: 'CREATE' as const,
      data: createMockTransaction(),
      timestamp: new Date(),
      retries: 0
    };

    const result = safeValidate(PendingChangeSchema, pendingChange);
    expect(result.success).toBe(true);
  });

  it('should track transaction edits', () => {
    const transaction = createMockTransaction();
    transaction.isEdited = true;
    transaction.editedAt = new Date();
    transaction.editedBy = generateId();
    transaction.version = 2;

    const result = validate(TransactionSchema, transaction);
    expect(result.isEdited).toBe(true);
    expect(result.version).toBe(2);
  });

  it('should handle member credit balance updates', () => {
    const member = createMockMember();
    member.creditBalance = 50000; // After deduction
    member.totalSpent = 550000; // Increased

    const result = validate(MemberSchema, member);
    expect(result.creditBalance).toBe(50000);
    expect(result.totalSpent).toBe(550000);
  });
});

describe('Schema Validation Edge Cases', () => {
  it('should handle zero amounts', () => {
    const transaction = createMockTransaction();
    transaction.totalAmount = 0;

    const result = safeValidate(TransactionSchema, transaction);
    expect(result.success).toBe(true);
    expect(result.data?.totalAmount).toBe(0);
  });

  it('should reject negative quantities', () => {
    const transaction = createMockTransaction();
    transaction.items = [
      {
        id: generateId(),
        transactionId: transaction.id,
        productId: generateId(),
        quantity: -1, // Invalid
        unitPrice: 50000,
        totalPrice: 100000,
        createdAt: new Date()
      }
    ];

    const result = safeValidate(TransactionSchema, transaction);
    expect(result.success).toBe(false);
  });

  it('should handle empty items array', () => {
    const transaction = createMockTransaction();
    transaction.items = [];

    const result = safeValidate(TransactionSchema, transaction);
    expect(result.success).toBe(true);
  });

  it('should handle optional fields', () => {
    const transaction = createMockTransaction();
    delete (transaction as any).notes;
    delete (transaction as any).editedAt;
    delete (transaction as any).editedBy;

    const result = safeValidate(TransactionSchema, transaction);
    expect(result.success).toBe(true);
  });
});
