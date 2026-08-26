/**
 * Tests for key derivation using PBKDF2
 */

import {
  deriveKey,
  rederiveKey,
  getPBKDF2Params,
} from '@/lib/keyDerivation';
import { base64Encode, base64Decode } from '@/lib/crypto';
import { encrypt, decrypt } from '@/lib/encryption';
import { CryptoError } from '@/types/encryption';

describe('Key Derivation (PBKDF2)', () => {
  describe('deriveKey', () => {
    it('should derive key from password and generate salt', async () => {
      const password = 'my-secure-password';
      const result = await deriveKey(password);

      expect(result.key).toBeInstanceOf(CryptoKey);
      expect(result.salt).toBeInstanceOf(Uint8Array);
      expect(result.salt.length).toBe(16);
    });

    it('should derive consistent key with same password and salt', async () => {
      const password = 'test-password';
      const salt = new Uint8Array(16);
      salt.fill(1); // Fixed salt for testing

      const result1 = await deriveKey(password, salt);
      const result2 = await deriveKey(password, salt);

      // Both should produce keys that encrypt/decrypt the same data
      const testData = { secret: 'test' };
      const encrypted1 = await encrypt(testData, result1.key);
      const decrypted1 = await decrypt(encrypted1, result2.key);

      expect(decrypted1).toEqual(testData);
    });

    it('should derive different keys from different passwords', async () => {
      const password1 = 'password1';
      const password2 = 'password2';
      const salt = new Uint8Array(16);
      salt.fill(1);

      const result1 = await deriveKey(password1, salt);
      const result2 = await deriveKey(password2, salt);

      // Encrypt with first key, should fail to decrypt with second key
      const testData = { secret: 'test' };
      const encrypted = await encrypt(testData, result1.key);

      await expect(
        decrypt(encrypted, result2.key)
      ).rejects.toThrow();
    });

    it('should derive different keys from different salts', async () => {
      const password = 'same-password';
      const salt1 = new Uint8Array(16);
      salt1.fill(1);
      const salt2 = new Uint8Array(16);
      salt2.fill(2);

      const result1 = await deriveKey(password, salt1);
      const result2 = await deriveKey(password, salt2);

      // Encrypt with first key, should fail to decrypt with second key
      const testData = { secret: 'test' };
      const encrypted = await encrypt(testData, result1.key);

      await expect(
        decrypt(encrypted, result2.key)
      ).rejects.toThrow();
    });

    it('should generate random salt each call when not provided', async () => {
      const password = 'test-password';
      const result1 = await deriveKey(password);
      const result2 = await deriveKey(password);

      expect(result1.salt).not.toEqual(result2.salt);
    });

    it('should throw error on empty password', async () => {
      await expect(deriveKey('')).rejects.toThrow(CryptoError);
    });

    it('should handle long passwords', async () => {
      const longPassword = 'a'.repeat(256);
      const result = await deriveKey(longPassword);

      expect(result.key).toBeInstanceOf(CryptoKey);
      expect(result.salt).toBeInstanceOf(Uint8Array);
    });

    it('should handle special characters in password', async () => {
      const password = 'pässwörd!@#$%^&*()[]{}';
      const result = await deriveKey(password);

      expect(result.key).toBeInstanceOf(CryptoKey);
      expect(result.salt.length).toBe(16);
    });

    it('should handle unicode in password', async () => {
      const password = '密码🔐パスワード';
      const result = await deriveKey(password);

      expect(result.key).toBeInstanceOf(CryptoKey);
    });
  });

  describe('rederiveKey', () => {
    it('should rederive same key from password and salt', async () => {
      const password = 'my-password';

      // First derivation
      const { salt } = await deriveKey(password);
      const saltBase64 = base64Encode(salt);

      // Re-derivation
      const key = await rederiveKey(password, saltBase64);

      expect(key).toBeInstanceOf(CryptoKey);
    });

    it('should rederive key that matches original', async () => {
      const password = 'secure-password';

      // Initial derivation
      const { key: key1, salt } = await deriveKey(password);
      const saltBase64 = base64Encode(salt);

      // Re-derivation
      const key2 = await rederiveKey(password, saltBase64);

      // Both should decrypt data encrypted with original key
      const testData = { secret: 'test message' };
      const encrypted = await encrypt(testData, key1);
      const decrypted = await decrypt(encrypted, key2);

      expect(decrypted).toEqual(testData);
    });

    it('should throw error on invalid base64 salt', async () => {
      const password = 'password';
      const invalidBase64 = '!!!invalid!!!';

      await expect(
        rederiveKey(password, invalidBase64)
      ).rejects.toThrow(CryptoError);
    });

    it('should throw error with wrong password', async () => {
      const password = 'original-password';
      const wrongPassword = 'wrong-password';
      const salt = new Uint8Array(16);
      salt.fill(1);

      const saltBase64 = base64Encode(salt);
      const key1 = await rederiveKey(password, saltBase64);
      const key2 = await rederiveKey(wrongPassword, saltBase64);

      // Encrypt with one, fail to decrypt with other
      const testData = { secret: 'test' };
      const encrypted = await encrypt(testData, key1);

      await expect(
        decrypt(encrypted, key2)
      ).rejects.toThrow();
    });
  });

  describe('getPBKDF2Params', () => {
    it('should return PBKDF2 parameters', () => {
      const params = getPBKDF2Params();

      expect(params).toHaveProperty('algorithm', 'PBKDF2');
      expect(params).toHaveProperty('hash', 'SHA-256');
      expect(params).toHaveProperty('iterations', 100000);
      expect(params).toHaveProperty('saltSize', 16);
      expect(params).toHaveProperty('keySize', 256);
    });

    it('should have high iteration count for security', () => {
      const params = getPBKDF2Params();
      expect(params.iterations).toBeGreaterThanOrEqual(100000);
    });
  });

  describe('Key derivation workflow', () => {
    it('should handle full login/logout/login cycle', async () => {
      const password = 'user-password';

      // Initial login: derive key and store salt
      const { key: loginKey1, salt } = await deriveKey(password);
      const storedSalt = base64Encode(salt);

      // Simulate storing data
      const userData = { userId: '123', role: 'KASIR' };
      const encrypted1 = await encrypt(userData, loginKey1);

      // Logout and clear key from memory

      // Subsequent login: rederive key using stored salt
      const loginKey2 = await rederiveKey(password, storedSalt);

      // Should decrypt previously encrypted data
      const decrypted = await decrypt(encrypted1, loginKey2);
      expect(decrypted).toEqual(userData);
    });

    it('should fail when salt is corrupted', async () => {
      const password = 'password';

      // Initial derivation
      const { salt } = await deriveKey(password);
      let corruptedSalt = base64Encode(salt);

      // Corrupt the salt by modifying it
      corruptedSalt = corruptedSalt.substring(0, corruptedSalt.length - 2) + 'XX';

      await expect(
        rederiveKey(password, corruptedSalt)
      ).rejects.toThrow(CryptoError);
    });

    it('should work with multiple users', async () => {
      const user1Password = 'user1-password';
      const user2Password = 'user2-password';

      // User 1 login
      const { key: user1Key, salt: user1Salt } = await deriveKey(user1Password);
      const user1Data = { userId: 'user1', data: 'secret1' };
      const user1Encrypted = await encrypt(user1Data, user1Key);

      // User 2 login
      const { key: user2Key, salt: user2Salt } = await deriveKey(user2Password);
      const user2Data = { userId: 'user2', data: 'secret2' };
      const user2Encrypted = await encrypt(user2Data, user2Key);

      // User 1 cannot decrypt user 2's data
      await expect(
        decrypt(user2Encrypted, user1Key)
      ).rejects.toThrow();

      // User 2 cannot decrypt user 1's data
      await expect(
        decrypt(user1Encrypted, user2Key)
      ).rejects.toThrow();

      // Each user can decrypt their own data
      const user1Decrypted = await decrypt(user1Encrypted, user1Key);
      const user2Decrypted = await decrypt(user2Encrypted, user2Key);

      expect(user1Decrypted).toEqual(user1Data);
      expect(user2Decrypted).toEqual(user2Data);
    });
  });
});
