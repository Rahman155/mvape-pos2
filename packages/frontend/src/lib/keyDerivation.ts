/**
 * Master key derivation from user password
 * Uses PBKDF2 with SHA-256 for secure key derivation
 */

import {
  generateRandomSalt,
  base64Encode,
  base64Decode,
  getWebCrypto,
} from './crypto';
import { CryptoError, DerivedKeyResult } from '@/types/encryption';

// PBKDF2 parameters
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-256';
const SALT_SIZE = 16; // bytes

/**
 * Derive a key from a password using PBKDF2
 *
 * @param password - User password to derive key from
 * @param salt - Optional salt; if not provided, a random one is generated
 * @returns Object containing the derived CryptoKey and salt
 *
 * @example
 * ```typescript
 * const { key, salt } = await deriveKey(password);
 * // Store salt for later use
 * localStorage.setItem('crypto:salt', base64Encode(salt));
 * ```
 */
export async function deriveKey(
  password: string,
  salt?: Uint8Array
): Promise<DerivedKeyResult> {
  try {
    const subtle = getWebCrypto();

    // Generate random salt if not provided
    const derivedSalt = salt || generateRandomSalt(SALT_SIZE);

    if (!password || password.length === 0) {
      throw new CryptoError(
        'Password cannot be empty',
        'INVALID_PASSWORD'
      );
    }

    // Import password as key material
    const passwordKey = await subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false, // not extractable
      ['deriveBits']
    );

    // Derive key bits using PBKDF2
    const keyBits = await subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: derivedSalt,
        iterations: PBKDF2_ITERATIONS,
        hash: PBKDF2_HASH,
      },
      passwordKey,
      256 // 256 bits for AES-256
    );

    // Import derived bits as AES key
    const key = await subtle.importKey(
      'raw',
      keyBits,
      { name: 'AES-GCM' },
      false, // not extractable for security
      ['encrypt', 'decrypt']
    );

    return { key, salt: derivedSalt };
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError(
      `Failed to derive key from password: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'KEY_DERIVATION_FAILED'
    );
  }
}

/**
 * Re-derive a key from password and existing salt
 * Used when user logs in again with stored salt
 *
 * @param password - User password
 * @param saltBase64 - Base64 encoded salt from previous derivation
 * @returns Derived CryptoKey
 *
 * @example
 * ```typescript
 * const saltBase64 = localStorage.getItem('crypto:salt');
 * const salt = base64Decode(saltBase64);
 * const { key } = await deriveKey(password, salt);
 * ```
 */
export async function rederiveKey(
  password: string,
  saltBase64: string
): Promise<CryptoKey> {
  try {
    const salt = base64Decode(saltBase64);
    const { key } = await deriveKey(password, salt);
    return key;
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError(
      `Failed to re-derive key: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'KEY_REDERIVATION_FAILED'
    );
  }
}

/**
 * Get PBKDF2 parameters for documentation/verification
 */
export function getPBKDF2Params() {
  return {
    algorithm: 'PBKDF2',
    hash: PBKDF2_HASH,
    iterations: PBKDF2_ITERATIONS,
    saltSize: SALT_SIZE,
    keySize: 256, // bits
  };
}
