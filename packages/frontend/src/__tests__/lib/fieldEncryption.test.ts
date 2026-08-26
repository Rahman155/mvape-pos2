/**
 * Tests for field-level encryption utilities
 */

import {
  encryptFields,
  decryptFields,
  isEncryptedField,
  getEncryptedFields,
} from '@/lib/fieldEncryption';
import { generateRandomKey } from '@/lib/crypto';
import { EncryptedData } from '@/types/encryption';

describe('Field-Level Encryption', () => {
  let key: CryptoKey;
  const userId = 'user123';

  beforeAll(async () => {
    key = await generateRandomKey();
  });

  describe('encryptFields', () => {
    it('should encrypt specified fields in object', async () => {
      const user = {
        id: 'user1',
        name: 'John Doe',
        email: 'john@example.com',
        token: 'secret-token',
      };

      const encrypted = await encryptFields(
        user,
        ['email', 'token'],
        key,
        userId
      );

      // Encrypted fields should be EncryptedData objects
      expect(isEncryptedField(encrypted.email)).toBe(true);
      expect(isEncryptedField(encrypted.token)).toBe(true);

      // Non-encrypted fields should remain unchanged
      expect(encrypted.id).toBe('user1');
      expect(encrypted.name).toBe('John Doe');
    });

    it('should not encrypt fields with null values', async () => {
      const obj = {
        id: '123',
        email: 'test@example.com',
        phone: null,
      };

      const encrypted = await encryptFields(obj, ['email', 'phone'], key);

      expect(isEncryptedField(encrypted.email)).toBe(true);
      expect(encrypted.phone).toBeNull();
    });

    it('should not encrypt fields with undefined values', async () => {
      const obj = {
        id: '123',
        email: 'test@example.com',
        optional: undefined,
      };

      const encrypted = await encryptFields(obj, ['email', 'optional'], key);

      expect(isEncryptedField(encrypted.email)).toBe(true);
      expect(encrypted.optional).toBeUndefined();
    });

    it('should encrypt fields with AAD (Additional Authenticated Data)', async () => {
      const obj = { secret: 'data', id: '123' };
      const encrypted = await encryptFields(obj, ['secret'], key, userId);

      expect(isEncryptedField(encrypted.secret)).toBe(true);
    });

    it('should handle multiple fields', async () => {
      const transaction = {
        id: 'txn123',
        totalAmount: 50000,
        paymentMethod: 'CASH',
        notes: 'Sensitive notes',
        timestamp: new Date().toISOString(),
      };

      const encrypted = await encryptFields(
        transaction,
        ['totalAmount', 'notes'],
        key
      );

      expect(isEncryptedField(encrypted.totalAmount)).toBe(true);
      expect(isEncryptedField(encrypted.notes)).toBe(true);
      expect(encrypted.id).toBe('txn123');
      expect(encrypted.paymentMethod).toBe('CASH');
      expect(encrypted.timestamp).toBe(transaction.timestamp);
    });

    it('should handle complex nested data', async () => {
      const obj = {
        id: '123',
        metadata: {
          nested: 'value',
        },
        complexData: [1, 2, { key: 'value' }],
      };

      const encrypted = await encryptFields(obj, ['metadata', 'complexData'], key);

      expect(isEncryptedField(encrypted.metadata)).toBe(true);
      expect(isEncryptedField(encrypted.complexData)).toBe(true);
    });
  });

  describe('decryptFields', () => {
    it('should decrypt specified encrypted fields', async () => {
      const original = {
        id: 'user1',
        email: 'john@example.com',
        token: 'secret-token',
      };

      // Encrypt first
      const encrypted = await encryptFields(
        original,
        ['email', 'token'],
        key,
        userId
      );

      // Then decrypt
      const decrypted = await decryptFields(
        encrypted,
        ['email', 'token'],
        key,
        userId
      );

      expect(decrypted.email).toBe(original.email);
      expect(decrypted.token).toBe(original.token);
      expect(decrypted.id).toBe(original.id);
    });

    it('should not decrypt fields that are not encrypted', async () => {
      const obj = {
        id: 'user1',
        name: 'John',
        email: 'john@example.com', // not encrypted
      };

      const decrypted = await decryptFields(obj, ['name', 'email'], key);

      expect(decrypted.id).toBe('user1');
      expect(decrypted.name).toBe('John');
      expect(decrypted.email).toBe('john@example.com');
    });

    it('should fail decryption with wrong AAD', async () => {
      const original = { secret: 'data', id: '123' };

      const encrypted = await encryptFields(
        original,
        ['secret'],
        key,
        'userId1'
      );

      await expect(
        decryptFields(encrypted, ['secret'], key, 'wrongUserId')
      ).rejects.toThrow();
    });

    it('should fail decryption with wrong key', async () => {
      const original = { secret: 'data' };
      const wrongKey = await generateRandomKey();

      const encrypted = await encryptFields(original, ['secret'], key);

      await expect(
        decryptFields(encrypted, ['secret'], wrongKey)
      ).rejects.toThrow();
    });

    it('should handle partial decryption', async () => {
      const original = {
        id: '123',
        secret1: 'value1',
        secret2: 'value2',
        public: 'public-value',
      };

      // Encrypt two fields
      const encrypted = await encryptFields(
        original,
        ['secret1', 'secret2'],
        key
      );

      // Decrypt only one
      const partially = await decryptFields(
        encrypted,
        ['secret1'],
        key
      );

      expect(partially.secret1).toBe('value1');
      expect(isEncryptedField(partially.secret2)).toBe(true); // Still encrypted
      expect(partially.public).toBe('public-value');
    });
  });

  describe('isEncryptedField', () => {
    it('should return true for valid EncryptedData', async () => {
      const obj = { secret: 'data' };
      const encrypted = await encryptFields(obj, ['secret'], key);

      expect(isEncryptedField(encrypted.secret)).toBe(true);
    });

    it('should return false for non-encrypted values', () => {
      expect(isEncryptedField('string')).toBe(false);
      expect(isEncryptedField(123)).toBe(false);
      expect(isEncryptedField(true)).toBe(false);
      expect(isEncryptedField(null)).toBe(false);
      expect(isEncryptedField(undefined)).toBe(false);
      expect(isEncryptedField([])).toBe(false);
      expect(isEncryptedField({})).toBe(false);
    });

    it('should return false for incomplete EncryptedData', () => {
      const incomplete = {
        version: 1,
        algorithm: 'AES-256-GCM',
        // missing encrypted, data, timestamp
      };

      expect(isEncryptedField(incomplete)).toBe(false);
    });
  });

  describe('getEncryptedFields', () => {
    it('should return list of encrypted fields', async () => {
      const obj = {
        id: '123',
        secret1: 'value1',
        secret2: 'value2',
        public: 'public-value',
      };

      const encrypted = await encryptFields(obj, ['secret1', 'secret2'], key);
      const encryptedFieldsList = getEncryptedFields(encrypted);

      expect(encryptedFieldsList).toContain('secret1');
      expect(encryptedFieldsList).toContain('secret2');
      expect(encryptedFieldsList).not.toContain('id');
      expect(encryptedFieldsList).not.toContain('public');
    });

    it('should return empty array if no fields encrypted', () => {
      const obj = {
        id: '123',
        name: 'John',
        email: 'john@example.com',
      };

      const encryptedFieldsList = getEncryptedFields(obj);
      expect(encryptedFieldsList).toEqual([]);
    });

    it('should handle mixed encrypted and non-encrypted fields', async () => {
      const obj = {
        id: '123',
        token: 'secret',
        amount: 5000,
        email: 'user@example.com',
      };

      const encrypted = await encryptFields(
        obj,
        ['token', 'email'],
        key
      );

      const encryptedList = getEncryptedFields(encrypted);
      expect(encryptedList.length).toBe(2);
      expect(encryptedList).toContain('token');
      expect(encryptedList).toContain('email');
    });
  });

  describe('Round-trip field encryption', () => {
    it('should preserve data through encrypt/decrypt cycle', async () => {
      const original = {
        id: 'txn123',
        storeId: 'store1',
        totalAmount: 125000,
        paymentMethod: 'MEMBER_CREDIT',
        notes: 'Customer purchase',
        items: [
          { productId: 'prod1', quantity: 2, price: 50000 },
          { productId: 'prod2', quantity: 1, price: 25000 },
        ],
      };

      const encryptedFieldList: (keyof typeof original)[] = [
        'totalAmount',
        'items',
      ];

      // Encrypt
      const encrypted = await encryptFields(
        original,
        encryptedFieldList,
        key,
        'store1'
      );

      // Decrypt
      const decrypted = await decryptFields(
        encrypted,
        encryptedFieldList,
        key,
        'store1'
      );

      expect(decrypted).toEqual(original);
    });

    it('should handle transaction data encryption', async () => {
      const transaction = {
        id: 'txn-001',
        storeId: 'store-1',
        kasirId: 'kasir-1',
        totalAmount: 250000,
        paymentMethod: 'CASH' as const,
        customerInfo: {
          name: 'John Doe',
          phone: '08123456789',
        },
      };

      const encrypted = await encryptFields(
        transaction,
        ['totalAmount', 'customerInfo'],
        key,
        transaction.storeId
      );

      const decrypted = await decryptFields(
        encrypted,
        ['totalAmount', 'customerInfo'],
        key,
        transaction.storeId
      );

      expect(decrypted.totalAmount).toBe(transaction.totalAmount);
      expect(decrypted.customerInfo).toEqual(transaction.customerInfo);
    });
  });
});
