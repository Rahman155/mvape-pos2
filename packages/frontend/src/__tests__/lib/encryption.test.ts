/**
 * Tests for encryption/decryption logic
 */

import {
  encrypt,
  decrypt,
  isValidEncryptedData,
} from '@/lib/encryption';
import { generateRandomKey } from '@/lib/crypto';
import { EncryptedData, CryptoError } from '@/types/encryption';

describe('Encryption & Decryption', () => {
  let key: CryptoKey;

  beforeAll(async () => {
    key = await generateRandomKey();
  });

  describe('encrypt', () => {
    it('should encrypt data and return EncryptedData structure', async () => {
      const data = { message: 'Hello, World!' };
      const encrypted = await encrypt(data, key);

      expect(encrypted).toHaveProperty('version', 1);
      expect(encrypted).toHaveProperty('algorithm', 'AES-256-GCM');
      expect(encrypted).toHaveProperty('encrypted', true);
      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('timestamp');
      expect(typeof encrypted.data).toBe('string');
      expect(typeof encrypted.timestamp).toBe('string');
    });

    it('should generate different ciphertext for same data (due to random IV)', async () => {
      const data = { message: 'Test' };
      const enc1 = await encrypt(data, key);
      const enc2 = await encrypt(data, key);

      expect(enc1.data).not.toBe(enc2.data);
    });

    it('should encrypt string data', async () => {
      const data = 'secret token';
      const encrypted = await encrypt(data, key);
      expect(isValidEncryptedData(encrypted)).toBe(true);
    });

    it('should encrypt number data', async () => {
      const data = 12345;
      const encrypted = await encrypt(data, key);
      expect(isValidEncryptedData(encrypted)).toBe(true);
    });

    it('should encrypt array data', async () => {
      const data = [1, 2, 3, 'item'];
      const encrypted = await encrypt(data, key);
      expect(isValidEncryptedData(encrypted)).toBe(true);
    });

    it('should encrypt with AAD (Additional Authenticated Data)', async () => {
      const data = { secret: 'message' };
      const encrypted = await encrypt(data, key, { aad: 'userId123' });
      expect(isValidEncryptedData(encrypted)).toBe(true);
    });

    it('should include timestamp', async () => {
      const data = { test: 'data' };
      const beforeEncrypt = new Date();
      const encrypted = await encrypt(data, key);
      const afterEncrypt = new Date();

      const timestamp = new Date(encrypted.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeEncrypt.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterEncrypt.getTime());
    });

    it('should throw error on null key', async () => {
      const data = { test: 'data' };
      await expect(
        encrypt(data, null as any as CryptoKey)
      ).rejects.toThrow();
    });
  });

  describe('decrypt', () => {
    it('should decrypt encrypted data', async () => {
      const original = { message: 'Hello, World!' };
      const encrypted = await encrypt(original, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toEqual(original);
    });

    it('should decrypt string data', async () => {
      const original = 'secret token';
      const encrypted = await encrypt(original, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toBe(original);
    });

    it('should decrypt number data', async () => {
      const original = 42;
      const encrypted = await encrypt(original, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toBe(original);
    });

    it('should decrypt array data', async () => {
      const original = [1, 2, 3, 'item'];
      const encrypted = await encrypt(original, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toEqual(original);
    });

    it('should decrypt with matching AAD', async () => {
      const original = { secret: 'message' };
      const userId = 'user123';
      const encrypted = await encrypt(original, key, { aad: userId });
      const decrypted = await decrypt(encrypted, key, { aad: userId });

      expect(decrypted).toEqual(original);
    });

    it('should fail decryption with wrong AAD', async () => {
      const original = { secret: 'message' };
      const encrypted = await encrypt(original, key, { aad: 'userId123' });

      await expect(
        decrypt(encrypted, key, { aad: 'wrongUserId' })
      ).rejects.toThrow();
    });

    it('should fail decryption with wrong key', async () => {
      const original = { secret: 'message' };
      const encrypted = await encrypt(original, key);
      const wrongKey = await generateRandomKey();

      await expect(
        decrypt(encrypted, wrongKey)
      ).rejects.toThrow();
    });

    it('should throw error on corrupted encrypted data', async () => {
      const corrupted: EncryptedData = {
        version: 1,
        algorithm: 'AES-256-GCM',
        encrypted: true,
        data: 'YQ==', // Too short
        timestamp: new Date().toISOString(),
      };

      await expect(
        decrypt(corrupted, key)
      ).rejects.toThrow(CryptoError);
    });

    it('should throw error on invalid encrypted data structure', async () => {
      const invalid = {
        version: 1,
        algorithm: 'AES-128', // wrong algorithm
        encrypted: true,
        data: 'test',
        timestamp: new Date().toISOString(),
      } as any;

      await expect(
        decrypt(invalid, key)
      ).rejects.toThrow(CryptoError);
    });
  });

  describe('encrypt/decrypt roundtrip', () => {
    it('should survive roundtrip with complex object', async () => {
      const original = {
        userId: 'user123',
        tokens: {
          access: 'access_token_here',
          refresh: 'refresh_token_here',
        },
        permissions: ['read', 'write', 'delete'],
        metadata: {
          loginTime: new Date().toISOString(),
          ipAddress: '192.168.1.1',
        },
      };

      const encrypted = await encrypt(original, key, { aad: 'user123' });
      const decrypted = await decrypt(encrypted, key, { aad: 'user123' });

      expect(decrypted).toEqual(original);
    });

    it('should handle large data', async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random() * 1000,
        })),
      };

      const encrypted = await encrypt(largeData, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toEqual(largeData);
    });

    it('should handle nested structures', async () => {
      const nested = {
        level1: {
          level2: {
            level3: {
              level4: {
                secret: 'deep secret',
                array: [1, 2, 3],
              },
            },
          },
        },
      };

      const encrypted = await encrypt(nested, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toEqual(nested);
    });

    it('should handle special characters and unicode', async () => {
      const special = {
        emoji: '🔐🔑🎯',
        chinese: '你好世界',
        arabic: 'مرحبا',
        special: '!@#$%^&*()[]{}',
      };

      const encrypted = await encrypt(special, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toEqual(special);
    });
  });

  describe('isValidEncryptedData', () => {
    it('should return true for valid EncryptedData', async () => {
      const data = { test: 'data' };
      const encrypted = await encrypt(data, key);

      expect(isValidEncryptedData(encrypted)).toBe(true);
    });

    it('should return false for invalid structures', () => {
      expect(isValidEncryptedData(null)).toBe(false);
      expect(isValidEncryptedData(undefined)).toBe(false);
      expect(isValidEncryptedData({})).toBe(false);
      expect(isValidEncryptedData('string')).toBe(false);
      expect(isValidEncryptedData(123)).toBe(false);
    });

    it('should return false for incomplete structures', () => {
      expect(
        isValidEncryptedData({
          version: 1,
          algorithm: 'AES-256-GCM',
          encrypted: true,
          // missing data and timestamp
        })
      ).toBe(false);
    });

    it('should return false for wrong version', () => {
      expect(
        isValidEncryptedData({
          version: 2,
          algorithm: 'AES-256-GCM',
          encrypted: true,
          data: 'test',
          timestamp: new Date().toISOString(),
        })
      ).toBe(false);
    });

    it('should return false for wrong algorithm', () => {
      expect(
        isValidEncryptedData({
          version: 1,
          algorithm: 'AES-128-GCM',
          encrypted: true,
          data: 'test',
          timestamp: new Date().toISOString(),
        })
      ).toBe(false);
    });
  });
});
