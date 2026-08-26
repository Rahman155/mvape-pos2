/**
 * Type definitions for encryption/decryption operations
 */

/**
 * Encrypted data structure stored in IndexedDB/localStorage
 */
export interface EncryptedData {
  version: number;
  algorithm: 'AES-256-GCM';
  encrypted: true;
  data: string; // base64 encoded (iv + ciphertext + tag)
  salt?: string; // base64 encoded salt (only stored once)
  timestamp: string; // ISO8601
}

/**
 * Key derivation result
 */
export interface DerivedKeyResult {
  key: CryptoKey;
  salt: Uint8Array;
}

/**
 * Encryption options
 */
export interface EncryptionOptions {
  aad?: string; // Additional Authenticated Data
  includeTimestamp?: boolean;
}

/**
 * Decryption options
 */
export interface DecryptionOptions {
  aad?: string; // Additional Authenticated Data
}

/**
 * Crypto error types
 */
export class CryptoError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'CryptoError';
  }
}

/**
 * Encryption result with metadata
 */
export interface EncryptionResult {
  encrypted: EncryptedData;
  encryptedAt: Date;
}

/**
 * Master key metadata
 */
export interface MasterKeyMetadata {
  salt: string; // base64 encoded
  derivedAt: string; // ISO8601
  algorithm: 'PBKDF2-SHA256';
  iterations: number;
}
