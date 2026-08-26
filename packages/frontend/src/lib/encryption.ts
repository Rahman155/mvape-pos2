/**
 * Encryption and decryption logic using AES-256-GCM
 */

import {
  generateRandomIV,
  base64Encode,
  base64Decode,
  getWebCrypto,
} from './crypto';
import {
  EncryptedData,
  EncryptionOptions,
  DecryptionOptions,
  CryptoError,
} from '@/types/encryption';

/**
 * Encrypt data using AES-256-GCM
 *
 * @param data - Data to encrypt (will be JSON stringified)
 * @param key - CryptoKey for encryption
 * @param options - Encryption options including AAD and timestamp
 * @returns EncryptedData object ready for storage
 *
 * @example
 * ```typescript
 * const token = 'eyJhbGc...';
 * const encrypted = await encrypt(
 *   { token },
 *   key,
 *   { aad: userId }
 * );
 * // Store encrypted to IndexedDB or localStorage
 * ```
 */
export async function encrypt(
  data: unknown,
  key: CryptoKey,
  options?: EncryptionOptions
): Promise<EncryptedData> {
  try {
    const subtle = getWebCrypto();

    // Generate random IV for this encryption
    const iv = generateRandomIV();

    // Stringify data for encryption
    const dataString = JSON.stringify(data);
    const dataBuffer = new TextEncoder().encode(dataString);

    // Prepare Additional Authenticated Data (AAD)
    let aadBuffer: Uint8Array | undefined;
    if (options?.aad) {
      aadBuffer = new TextEncoder().encode(options.aad);
    }

    // Encrypt data
    const ciphertext = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: aadBuffer,
      },
      key,
      dataBuffer
    );

    // Combine IV + ciphertext (which includes the auth tag in GCM mode)
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Encode to base64 for storage
    const encodedData = base64Encode(combined);

    const encrypted: EncryptedData = {
      version: 1,
      algorithm: 'AES-256-GCM',
      encrypted: true,
      data: encodedData,
      timestamp: new Date().toISOString(),
    };

    return encrypted;
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError(
      `Failed to encrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'ENCRYPTION_FAILED'
    );
  }
}

/**
 * Decrypt data that was encrypted with AES-256-GCM
 *
 * @param encrypted - EncryptedData object to decrypt
 * @param key - CryptoKey for decryption (must match encryption key)
 * @param options - Decryption options including AAD
 * @returns Decrypted and parsed data
 *
 * @example
 * ```typescript
 * const encrypted = await getFromIndexedDB('auth:token');
 * const decrypted = await decrypt(
 *   encrypted,
 *   key,
 *   { aad: userId }
 * );
 * console.log(decrypted.token);
 * ```
 */
export async function decrypt(
  encrypted: EncryptedData,
  key: CryptoKey,
  options?: DecryptionOptions
): Promise<unknown> {
  try {
    const subtle = getWebCrypto();

    // Validate encrypted data structure
    if (!encrypted.encrypted || encrypted.algorithm !== 'AES-256-GCM') {
      throw new CryptoError(
        'Invalid encrypted data structure',
        'INVALID_ENCRYPTED_DATA'
      );
    }

    // Decode base64
    const combined = base64Decode(encrypted.data);

    // Extract IV (first 12 bytes) and ciphertext (remaining bytes)
    if (combined.length < 12) {
      throw new CryptoError(
        'Corrupted encrypted data: too short',
        'CORRUPTED_DATA'
      );
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // Prepare Additional Authenticated Data (AAD)
    let aadBuffer: Uint8Array | undefined;
    if (options?.aad) {
      aadBuffer = new TextEncoder().encode(options.aad);
    }

    // Decrypt data
    const plaintext = await subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: aadBuffer,
      },
      key,
      ciphertext
    );

    // Decode and parse JSON
    const dataString = new TextDecoder().decode(plaintext);
    const decrypted = JSON.parse(dataString);

    return decrypted;
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error;
    }

    // Distinguish between decryption failures (wrong key/AAD) and parsing errors
    if (
      error instanceof SyntaxError ||
      (error instanceof Error && error.message.includes('JSON'))
    ) {
      throw new CryptoError(
        'Failed to parse decrypted data: invalid JSON',
        'PARSE_ERROR'
      );
    }

    throw new CryptoError(
      `Failed to decrypt data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DECRYPTION_FAILED'
    );
  }
}

/**
 * Validate that EncryptedData has the correct structure
 */
export function isValidEncryptedData(data: unknown): data is EncryptedData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const ed = data as Record<string, unknown>;
  return (
    ed.version === 1 &&
    ed.algorithm === 'AES-256-GCM' &&
    ed.encrypted === true &&
    typeof ed.data === 'string' &&
    typeof ed.timestamp === 'string'
  );
}
