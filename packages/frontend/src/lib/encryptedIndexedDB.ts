/**
 * Encrypted IndexedDB wrapper
 * Automatically encrypts specific fields before storing and decrypts on retrieval
 */

import { encryptFields, decryptFields } from './fieldEncryption';
import { CryptoError } from '@/types/encryption';

/**
 * Wrapper for IndexedDB operations with automatic field-level encryption/decryption
 *
 * @example
 * ```typescript
 * const encryptedDB = new EncryptedIndexedDB(key, userId);
 *
 * // Save with automatic field encryption
 * await encryptedDB.save('transactions', transaction, ['totalAmount', 'items']);
 *
 * // Get with automatic decryption
 * const transaction = await encryptedDB.get(
 *   'transactions',
 *   transactionId,
 *   ['totalAmount', 'items']
 * );
 * ```
 */
export class EncryptedIndexedDB {
  private key: CryptoKey;
  private aad: string;
  private db: IDBDatabase | null = null;

  constructor(key: CryptoKey, aad: string) {
    this.key = key;
    this.aad = aad;
  }

  /**
   * Initialize IndexedDB database connection
   * Must be called before any operations
   */
  async init(dbName: string = 'vapestore-pos', version: number = 1): Promise<void> {
    if (this.db) {
      return; // Already initialized
    }

    try {
      const request = indexedDB.open(dbName, version);

      this.db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Failed to open IndexedDB'));
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          // Store creation is handled by the caller
          // This event can be used to initialize schema
        };
      });
    } catch (error) {
      throw new CryptoError(
        `Failed to initialize IndexedDB: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INDEXEDDB_INIT_FAILED'
      );
    }
  }

  /**
   * Save data with field-level encryption
   */
  async save<T extends Record<string, any>>(
    storeName: string,
    data: T,
    fieldsToEncrypt: (keyof T)[] = []
  ): Promise<void> {
    try {
      if (!this.db) {
        throw new CryptoError('IndexedDB not initialized', 'DB_NOT_INITIALIZED');
      }

      // Encrypt specified fields
      const encrypted = await encryptFields(
        data,
        fieldsToEncrypt,
        this.key,
        this.aad
      );

      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      await new Promise<void>((resolve, reject) => {
        const request = store.put(encrypted);
        request.onsuccess = () => resolve();
        request.onerror = () =>
          reject(new Error('Failed to save to IndexedDB'));
      });
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `Failed to save encrypted data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SAVE_FAILED'
      );
    }
  }

  /**
   * Get data with automatic field decryption
   */
  async get<T extends Record<string, any>>(
    storeName: string,
    key: string | number,
    fieldsToDecrypt: (keyof T)[] = []
  ): Promise<T | null> {
    try {
      if (!this.db) {
        throw new CryptoError('IndexedDB not initialized', 'DB_NOT_INITIALIZED');
      }

      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);

      const data = await new Promise<T | null>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () =>
          reject(new Error('Failed to get from IndexedDB'));
      });

      if (!data) {
        return null;
      }

      // Decrypt specified fields
      return decryptFields(data, fieldsToDecrypt, this.key, this.aad);
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `Failed to get decrypted data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_FAILED'
      );
    }
  }

  /**
   * Query all records from store
   */
  async getAll<T extends Record<string, any>>(
    storeName: string,
    fieldsToDecrypt: (keyof T)[] = []
  ): Promise<T[]> {
    try {
      if (!this.db) {
        throw new CryptoError('IndexedDB not initialized', 'DB_NOT_INITIALIZED');
      }

      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);

      const data = await new Promise<T[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () =>
          reject(new Error('Failed to get all from IndexedDB'));
      });

      // Decrypt fields in all records
      return Promise.all(
        data.map((record) =>
          decryptFields(record, fieldsToDecrypt, this.key, this.aad)
        )
      );
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `Failed to get all records: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GET_ALL_FAILED'
      );
    }
  }

  /**
   * Delete a record from store
   */
  async delete(storeName: string, key: string | number): Promise<void> {
    try {
      if (!this.db) {
        throw new CryptoError('IndexedDB not initialized', 'DB_NOT_INITIALIZED');
      }

      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () =>
          reject(new Error('Failed to delete from IndexedDB'));
      });
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_FAILED'
      );
    }
  }

  /**
   * Clear all records from store
   */
  async clear(storeName: string): Promise<void> {
    try {
      if (!this.db) {
        throw new CryptoError('IndexedDB not initialized', 'DB_NOT_INITIALIZED');
      }

      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);

      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () =>
          reject(new Error('Failed to clear store'));
      });
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `Failed to clear store: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLEAR_FAILED'
      );
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Create an EncryptedIndexedDB instance
 * Utility function for convenience
 */
export function createEncryptedIndexedDB(
  key: CryptoKey,
  aad: string
): EncryptedIndexedDB {
  return new EncryptedIndexedDB(key, aad);
}
