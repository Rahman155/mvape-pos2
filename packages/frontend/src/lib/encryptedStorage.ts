/**
 * Encrypted localStorage wrapper
 * Automatically encrypts values before storing and decrypts on retrieval
 */

import { encrypt, decrypt, isValidEncryptedData } from './encryption';
import { CryptoError } from '@/types/encryption';

/**
 * Wrapper for localStorage with automatic encryption/decryption
 *
 * @example
 * ```typescript
 * const encryptedStorage = new EncryptedLocalStorage(key, userId);
 *
 * // Store encrypted
 * await encryptedStorage.setItem('auth:token', token);
 *
 * // Retrieve and decrypt automatically
 * const token = await encryptedStorage.getItem('auth:token');
 *
 * // Remove
 * encryptedStorage.removeItem('auth:token');
 * ```
 */
export class EncryptedLocalStorage {
  private key: CryptoKey;
  private aad: string;

  constructor(key: CryptoKey, aad: string) {
    this.key = key;
    this.aad = aad;
  }

  /**
   * Set an item in localStorage with automatic encryption
   */
  async setItem(key: string, value: unknown): Promise<void> {
    try {
      const encrypted = await encrypt(value, this.key, { aad: this.aad });
      const serialized = JSON.stringify(encrypted);
      localStorage.setItem(key, serialized);
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `Failed to set encrypted item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_SET_FAILED'
      );
    }
  }

  /**
   * Get an item from localStorage with automatic decryption
   * Returns null if key doesn't exist
   */
  async getItem(key: string): Promise<unknown | null> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        return null;
      }

      const encrypted = JSON.parse(stored);
      if (!isValidEncryptedData(encrypted)) {
        throw new CryptoError(
          'Invalid encrypted data in storage',
          'INVALID_STORAGE_DATA'
        );
      }

      return decrypt(encrypted, this.key, { aad: this.aad });
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      if (
        error instanceof SyntaxError ||
        (error instanceof Error && error.message.includes('JSON'))
      ) {
        throw new CryptoError(
          'Failed to parse stored data',
          'STORAGE_PARSE_FAILED'
        );
      }
      throw new CryptoError(
        `Failed to get encrypted item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_GET_FAILED'
      );
    }
  }

  /**
   * Remove an item from localStorage
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Clear all localStorage (or just encrypted items)
   */
  clear(): void {
    localStorage.clear();
  }

  /**
   * Check if key exists in localStorage
   */
  hasItem(key: string): boolean {
    return localStorage.getItem(key) !== null;
  }

  /**
   * Get all keys in localStorage
   */
  keys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }
}

/**
 * Create an EncryptedLocalStorage instance
 * Utility function for convenience
 */
export function createEncryptedStorage(
  key: CryptoKey,
  aad: string
): EncryptedLocalStorage {
  return new EncryptedLocalStorage(key, aad);
}
