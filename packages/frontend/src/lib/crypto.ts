/**
 * Core cryptographic utilities
 * Provides base64 encoding/decoding and key management functions
 */

import { CryptoError } from '@/types/encryption';

/**
 * Encode a Uint8Array to base64 string
 */
export function base64Encode(buffer: Uint8Array): string {
  try {
    return btoa(String.fromCharCode(...buffer));
  } catch (error) {
    throw new CryptoError(
      'Failed to encode buffer to base64',
      'ENCODE_FAILED'
    );
  }
}

/**
 * Decode a base64 string to Uint8Array
 */
export function base64Decode(str: string): Uint8Array {
  try {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    throw new CryptoError(
      'Failed to decode base64 string',
      'DECODE_FAILED'
    );
  }
}

/**
 * Generate a random key using AES-GCM
 */
export async function generateRandomKey(): Promise<CryptoKey> {
  try {
    return await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    throw new CryptoError(
      'Failed to generate random key',
      'KEY_GENERATION_FAILED'
    );
  }
}

/**
 * Export a CryptoKey to JSON Web Key (JWK) format
 */
export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  try {
    return await crypto.subtle.exportKey('jwk', key);
  } catch (error) {
    throw new CryptoError(
      'Failed to export key',
      'KEY_EXPORT_FAILED'
    );
  }
}

/**
 * Import a JSON Web Key (JWK) to CryptoKey
 */
export async function importKey(jwk: JsonWebKey): Promise<CryptoKey> {
  try {
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM' },
      true, // extractable
      ['encrypt', 'decrypt']
    );
  } catch (error) {
    throw new CryptoError(
      'Failed to import key',
      'KEY_IMPORT_FAILED'
    );
  }
}

/**
 * Generate a random IV (Initialization Vector) for AES-GCM
 * IV must be 12 bytes for GCM mode
 */
export function generateRandomIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * Generate a random salt for key derivation
 */
export function generateRandomSalt(size: number = 16): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(size));
}

/**
 * Check if WebCrypto API is available
 */
export function isWebCryptoAvailable(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.subtle !== 'undefined'
  );
}

/**
 * Safely get WebCrypto API with fallback error handling
 */
export function getWebCrypto(): SubtleCrypto {
  if (!isWebCryptoAvailable()) {
    throw new CryptoError(
      'WebCrypto API is not available in this browser',
      'WEBCRYPTO_UNAVAILABLE'
    );
  }
  return crypto.subtle;
}
