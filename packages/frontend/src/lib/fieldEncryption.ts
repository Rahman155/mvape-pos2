/**
 * Field-level encryption utilities for encrypting/decrypting specific fields in objects
 */

import {
  encrypt,
  decrypt,
  isValidEncryptedData,
} from './encryption';
import { EncryptedData, CryptoError } from '@/types/encryption';

/**
 * Encrypt specific fields in an object
 *
 * @param obj - Object containing fields to encrypt
 * @param fieldsToEncrypt - Array of field keys to encrypt
 * @param key - CryptoKey for encryption
 * @param aad - Additional Authenticated Data (typically userId)
 * @returns New object with specified fields encrypted
 *
 * @example
 * ```typescript
 * const user = {
 *   id: 'user123',
 *   email: 'user@example.com',
 *   token: 'secret...'
 * };
 *
 * const encrypted = await encryptFields(
 *   user,
 *   ['email', 'token'],
 *   key,
 *   userId
 * );
 *
 * // Now encrypted.email and encrypted.token are EncryptedData objects
 * // encrypted.id remains unchanged
 * ```
 */
export async function encryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToEncrypt: (keyof T)[],
  key: CryptoKey,
  aad?: string
): Promise<Partial<T> & Record<string, unknown>> {
  try {
    const encrypted = { ...obj };

    for (const field of fieldsToEncrypt) {
      const value = encrypted[field];

      // Only encrypt if field exists, is not null, and is not undefined
      if (value !== undefined && value !== null) {
        const encryptedValue = await encrypt(value, key, { aad });
        (encrypted as any)[field] = encryptedValue;
      }
    }

    return encrypted;
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError(
      `Failed to encrypt fields: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'FIELD_ENCRYPTION_FAILED'
    );
  }
}

/**
 * Decrypt specific fields in an object
 *
 * @param obj - Object containing encrypted fields
 * @param fieldsToDecrypt - Array of field keys to decrypt
 * @param key - CryptoKey for decryption
 * @param aad - Additional Authenticated Data (must match encryption AAD)
 * @returns New object with specified fields decrypted
 *
 * @example
 * ```typescript
 * const encryptedUser = {
 *   id: 'user123',
 *   email: { version: 1, algorithm: 'AES-256-GCM', ... },
 *   token: { version: 1, algorithm: 'AES-256-GCM', ... }
 * };
 *
 * const decrypted = await decryptFields(
 *   encryptedUser,
 *   ['email', 'token'],
 *   key,
 *   userId
 * );
 *
 * // Now decrypted.email = 'user@example.com'
 * // decrypted.token = 'secret...'
 * ```
 */
export async function decryptFields<T extends Record<string, any>>(
  obj: T,
  fieldsToDecrypt: (keyof T)[],
  key: CryptoKey,
  aad?: string
): Promise<T> {
  try {
    const decrypted = { ...obj };

    for (const field of fieldsToDecrypt) {
      const value = decrypted[field];

      // Check if field contains encrypted data
      if (value && isValidEncryptedData(value)) {
        const decryptedValue = await decrypt(value, key, { aad });
        (decrypted as any)[field] = decryptedValue;
      }
    }

    return decrypted;
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError(
      `Failed to decrypt fields: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'FIELD_DECRYPTION_FAILED'
    );
  }
}

/**
 * Check if a field contains encrypted data
 */
export function isEncryptedField(field: unknown): field is EncryptedData {
  return isValidEncryptedData(field);
}

/**
 * Get list of encrypted fields in an object
 */
export function getEncryptedFields(
  obj: Record<string, any>
): (string | number | symbol)[] {
  const encrypted: (string | number | symbol)[] = [];

  for (const key of Object.keys(obj)) {
    if (isEncryptedField(obj[key])) {
      encrypted.push(key);
    }
  }

  return encrypted;
}
