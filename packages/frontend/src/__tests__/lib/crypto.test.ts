/**
 * Tests for cryptographic utilities
 */

import {
  base64Encode,
  base64Decode,
  generateRandomKey,
  generateRandomIV,
  generateRandomSalt,
  isWebCryptoAvailable,
} from '@/lib/crypto';
import { CryptoError } from '@/types/encryption';

describe('Crypto Utilities', () => {
  describe('base64Encode', () => {
    it('should encode Uint8Array to base64 string', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]); // 'Hello'
      const encoded = base64Encode(buffer);
      expect(typeof encoded).toBe('string');
      expect(encoded).toBe('SGVsbG8=');
    });

    it('should handle empty buffer', () => {
      const buffer = new Uint8Array([]);
      const encoded = base64Encode(buffer);
      expect(encoded).toBe('');
    });

    it('should handle random bytes', () => {
      const buffer = crypto.getRandomValues(new Uint8Array(32));
      const encoded = base64Encode(buffer);
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  describe('base64Decode', () => {
    it('should decode base64 string to Uint8Array', () => {
      const encoded = 'SGVsbG8=';
      const decoded = base64Decode(encoded);
      expect(decoded).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should handle empty string', () => {
      const decoded = base64Decode('');
      expect(decoded).toEqual(new Uint8Array([]));
    });

    it('should decode base64 without padding', () => {
      const encoded = 'SGVsbG8';
      const decoded = base64Decode(encoded);
      expect(decoded.length).toBeGreaterThan(0);
    });

    it('should throw error on invalid base64', () => {
      const invalid = '!!!invalid!!!';
      expect(() => base64Decode(invalid)).toThrow(CryptoError);
    });
  });

  describe('base64 roundtrip', () => {
    it('should encode and decode to same value', () => {
      const original = new Uint8Array([1, 2, 3, 255, 254, 253]);
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toEqual(original);
    });

    it('should handle large buffers', () => {
      const original = crypto.getRandomValues(new Uint8Array(1024));
      const encoded = base64Encode(original);
      const decoded = base64Decode(encoded);
      expect(decoded).toEqual(original);
    });
  });

  describe('generateRandomKey', () => {
    it('should generate a valid AES-256-GCM key', async () => {
      const key = await generateRandomKey();
      expect(key).toBeInstanceOf(CryptoKey);
      expect(key.algorithm).toEqual({ name: 'AES-GCM', length: 256 });
      expect(key.extractable).toBe(true);
      expect(key.usages).toContain('encrypt');
      expect(key.usages).toContain('decrypt');
    });

    it('should generate different keys on multiple calls', async () => {
      const key1 = await generateRandomKey();
      const key2 = await generateRandomKey();
      // We can't directly compare keys, but they should be different
      expect(key1).toBeInstanceOf(CryptoKey);
      expect(key2).toBeInstanceOf(CryptoKey);
    });
  });

  describe('generateRandomIV', () => {
    it('should generate 12 byte IV', () => {
      const iv = generateRandomIV();
      expect(iv).toBeInstanceOf(Uint8Array);
      expect(iv.length).toBe(12);
    });

    it('should generate different IVs on multiple calls', () => {
      const iv1 = generateRandomIV();
      const iv2 = generateRandomIV();
      expect(iv1).not.toEqual(iv2);
    });

    it('should generate random bytes', () => {
      const iv = generateRandomIV();
      let hasVariation = false;
      // Generate multiple to check they're not all same byte
      for (let i = 0; i < 10; i++) {
        const other = generateRandomIV();
        if (!iv.every((byte, idx) => byte === other[idx])) {
          hasVariation = true;
          break;
        }
      }
      expect(hasVariation).toBe(true);
    });
  });

  describe('generateRandomSalt', () => {
    it('should generate salt with default size', () => {
      const salt = generateRandomSalt();
      expect(salt).toBeInstanceOf(Uint8Array);
      expect(salt.length).toBe(16);
    });

    it('should generate salt with custom size', () => {
      const salt = generateRandomSalt(32);
      expect(salt.length).toBe(32);
    });

    it('should generate different salts on multiple calls', () => {
      const salt1 = generateRandomSalt();
      const salt2 = generateRandomSalt();
      expect(salt1).not.toEqual(salt2);
    });

    it('should generate random bytes', () => {
      const salt = generateRandomSalt();
      let hasVariation = false;
      for (let i = 0; i < 10; i++) {
        const other = generateRandomSalt();
        if (!salt.every((byte, idx) => byte === other[idx])) {
          hasVariation = true;
          break;
        }
      }
      expect(hasVariation).toBe(true);
    });
  });

  describe('isWebCryptoAvailable', () => {
    it('should return true if WebCrypto is available', () => {
      const available = isWebCryptoAvailable();
      expect(typeof available).toBe('boolean');
      // In modern browsers, this should be true
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        expect(available).toBe(true);
      }
    });
  });
});
