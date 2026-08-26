/**
 * Authentication encryption integration
 * Demonstrates how to integrate encryption with the auth system
 * 
 * This file provides utilities for:
 * - Deriving encryption key from user password
 * - Encrypting/decrypting sensitive auth data
 * - Managing encrypted storage for tokens and user information
 */

import { deriveKey, rederiveKey } from './keyDerivation';
import { EncryptedLocalStorage } from './encryptedStorage';
import { EncryptedIndexedDB } from './encryptedIndexedDB';
import { base64Encode, base64Decode } from './crypto';
import { CryptoError } from '@/types/encryption';
import { User } from '@/types';

/**
 * Encryption manager for auth data
 * Handles key derivation and storage operations
 */
export class AuthEncryptionManager {
  private key: CryptoKey | null = null;
  private encryptedStorage: EncryptedLocalStorage | null = null;
  private encryptedDB: EncryptedIndexedDB | null = null;
  private userId: string | null = null;

  /**
   * Initialize encryption manager with password (on login)
   */
  async initializeWithPassword(
    password: string,
    userId: string,
    salt?: Uint8Array
  ): Promise<void> {
    try {
      if (!password || password.length === 0) {
        throw new CryptoError(
          'Password is required for key derivation',
          'INVALID_PASSWORD'
        );
      }

      // Derive key from password
      const { key, salt: derivedSalt } = await deriveKey(password, salt);
      this.key = key;
      this.userId = userId;

      // Store salt for later use (non-sensitive)
      // Only store if new salt was generated
      if (!salt) {
        this.storeSalt(derivedSalt);
      }

      // Initialize storage wrappers
      this.encryptedStorage = new EncryptedLocalStorage(key, userId);
      this.encryptedDB = new EncryptedIndexedDB(key, userId);

      // Initialize IndexedDB
      await this.encryptedDB.init('vapestore-pos', 1);
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `Failed to initialize encryption: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INIT_FAILED'
      );
    }
  }

  /**
   * Re-initialize encryption manager from stored salt (on app restart)
   */
  async initializeWithStoredSalt(
    password: string,
    userId: string
  ): Promise<void> {
    try {
      const saltBase64 = this.getStoredSalt();
      if (!saltBase64) {
        throw new CryptoError(
          'No stored salt found. User must log in again.',
          'NO_STORED_SALT'
        );
      }

      const salt = base64Decode(saltBase64);
      await this.initializeWithPassword(password, userId, salt);
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `Failed to re-initialize encryption: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REINIT_FAILED'
      );
    }
  }

  /**
   * Store sensitive auth data encrypted
   */
  async storeAuthData(token: string, user: User): Promise<void> {
    try {
      if (!this.encryptedStorage) {
        throw new CryptoError(
          'Encryption manager not initialized',
          'NOT_INITIALIZED'
        );
      }

      // Store token encrypted
      await this.encryptedStorage.setItem('auth:token', token);

      // Store user info encrypted
      await this.encryptedStorage.setItem('auth:user', user);
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `Failed to store auth data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_FAILED'
      );
    }
  }

  /**
   * Retrieve encrypted auth data
   */
  async retrieveAuthData(): Promise<{
    token: string | null;
    user: User | null;
  }> {
    try {
      if (!this.encryptedStorage) {
        throw new CryptoError(
          'Encryption manager not initialized',
          'NOT_INITIALIZED'
        );
      }

      const token = (await this.encryptedStorage.getItem('auth:token')) as
        | string
        | null;
      const user = (await this.encryptedStorage.getItem('auth:user')) as
        | User
        | null;

      return { token, user };
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `Failed to retrieve auth data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'RETRIEVAL_FAILED'
      );
    }
  }

  /**
   * Store transaction data encrypted in IndexedDB
   */
  async storeTransaction(transaction: any): Promise<void> {
    try {
      if (!this.encryptedDB) {
        throw new CryptoError(
          'Encryption manager not initialized',
          'NOT_INITIALIZED'
        );
      }

      // Fields to encrypt
      const fieldsToEncrypt: (keyof typeof transaction)[] = [
        'totalAmount',
        'items',
      ];

      await this.encryptedDB.save(
        'transactions',
        transaction,
        fieldsToEncrypt
      );
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `Failed to store transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSACTION_STORAGE_FAILED'
      );
    }
  }

  /**
   * Retrieve encrypted transaction from IndexedDB
   */
  async retrieveTransaction(transactionId: string): Promise<any> {
    try {
      if (!this.encryptedDB) {
        throw new CryptoError(
          'Encryption manager not initialized',
          'NOT_INITIALIZED'
        );
      }

      const fieldsToDecrypt = ['totalAmount', 'items'];

      return await this.encryptedDB.get(
        'transactions',
        transactionId,
        fieldsToDecrypt as any[]
      );
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `Failed to retrieve transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSACTION_RETRIEVAL_FAILED'
      );
    }
  }

  /**
   * Clear all encrypted data (on logout)
   */
  clearAll(): void {
    try {
      if (this.encryptedStorage) {
        this.encryptedStorage.clear();
      }

      if (this.encryptedDB) {
        this.encryptedDB.close();
      }

      this.key = null;
      this.userId = null;
      this.encryptedStorage = null;
      this.encryptedDB = null;

      // Clear salt from storage
      localStorage.removeItem('crypto:salt');
    } catch (error) {
      console.error('Error clearing encrypted data:', error);
    }
  }

  /**
   * Get current key (be careful with this!)
   */
  getKey(): CryptoKey | null {
    return this.key;
  }

  /**
   * Get encrypted storage instance
   */
  getEncryptedStorage(): EncryptedLocalStorage | null {
    return this.encryptedStorage;
  }

  /**
   * Get encrypted IndexedDB instance
   */
  getEncryptedDB(): EncryptedIndexedDB | null {
    return this.encryptedDB;
  }

  /**
   * Check if encryption is initialized
   */
  isInitialized(): boolean {
    return this.key !== null && this.userId !== null;
  }

  /**
   * Store salt in localStorage (non-sensitive, needed for key re-derivation)
   */
  private storeSalt(salt: Uint8Array): void {
    try {
      const saltBase64 = base64Encode(salt);
      localStorage.setItem('crypto:salt', saltBase64);
    } catch (error) {
      console.error('Failed to store salt:', error);
    }
  }

  /**
   * Get stored salt from localStorage
   */
  private getStoredSalt(): string | null {
    return localStorage.getItem('crypto:salt');
  }
}

/**
 * Global instance of auth encryption manager
 */
let authEncryptionManagerInstance: AuthEncryptionManager | null = null;

/**
 * Get or create the encryption manager instance
 */
export function getAuthEncryptionManager(): AuthEncryptionManager {
  if (!authEncryptionManagerInstance) {
    authEncryptionManagerInstance = new AuthEncryptionManager();
  }
  return authEncryptionManagerInstance;
}

/**
 * Reset the encryption manager instance
 */
export function resetAuthEncryptionManager(): void {
  if (authEncryptionManagerInstance) {
    authEncryptionManagerInstance.clearAll();
    authEncryptionManagerInstance = null;
  }
}
