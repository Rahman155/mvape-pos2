# Data Encryption Guide

This document describes the encryption system for securing sensitive data at rest in the client-side storage (IndexedDB and localStorage).

## Overview

The encryption system uses:
- **AES-256-GCM** for symmetric encryption
- **PBKDF2-SHA256** for key derivation from user passwords
- **WebCrypto API** for browser-native cryptography

## Key Features

- ✅ Master key derivation from user password
- ✅ Random IV for each encryption (prevents replay attacks)
- ✅ Authenticated encryption (GCM mode prevents tampering)
- ✅ Additional Authenticated Data (AAD) support for user ID verification
- ✅ Field-level encryption for selective field protection
- ✅ Encrypted localStorage wrapper
- ✅ Encrypted IndexedDB wrapper
- ✅ Error handling with custom CryptoError class

## Architecture

### Core Components

#### 1. **crypto.ts** - Low-level crypto utilities
- Base64 encoding/decoding
- Random key/IV/salt generation
- WebCrypto API wrappers

#### 2. **keyDerivation.ts** - Key derivation
- Derives a CryptoKey from user password using PBKDF2
- Uses 100,000 iterations for security
- Generates random 16-byte salt

#### 3. **encryption.ts** - Encrypt/decrypt operations
- AES-256-GCM encryption/decryption
- Validates encrypted data structure
- Handles IV extraction and combined encoding

#### 4. **fieldEncryption.ts** - Field-level encryption
- Encrypts specific fields in an object
- Decrypts specific fields from encrypted object
- Utility functions for checking and listing encrypted fields

#### 5. **encryptedStorage.ts** - Encrypted localStorage wrapper
- Automatic encryption before storing
- Automatic decryption on retrieval
- Same API as localStorage but with encryption

#### 6. **encryptedIndexedDB.ts** - Encrypted IndexedDB wrapper
- Field-level encryption for IndexedDB stores
- Automatic decryption on retrieval
- Save/get/delete/clear operations

## Usage Examples

### Basic Key Derivation

```typescript
import { deriveKey } from '@/lib/keyDerivation';
import { base64Encode } from '@/lib/crypto';

// On user login
const password = 'user-password';
const { key, salt } = await deriveKey(password);

// Store salt for later use (safe, non-sensitive)
localStorage.setItem('crypto:salt', base64Encode(salt));

// Keep key in memory for the session
sessionStorage.setItem('crypto:key', JSON.stringify(await exportKey(key)));
```

### Encrypting Data

```typescript
import { encrypt } from '@/lib/encryption';

const data = {
  token: 'eyJhbGc...',
  user: { id: 'user123' }
};

const encrypted = await encrypt(data, key, {
  aad: userId // Additional security with user ID
});

// Store encrypted data
localStorage.setItem('auth:data', JSON.stringify(encrypted));
```

### Decrypting Data

```typescript
import { decrypt } from '@/lib/encryption';

const stored = JSON.parse(localStorage.getItem('auth:data'));
const decrypted = await decrypt(stored, key, {
  aad: userId // Must match encryption AAD
});

console.log(decrypted.token); // 'eyJhbGc...'
```

### Using Encrypted localStorage

```typescript
import { EncryptedLocalStorage } from '@/lib/encryptedStorage';

const encryptedStorage = new EncryptedLocalStorage(key, userId);

// Store (automatically encrypted)
await encryptedStorage.setItem('auth:token', token);

// Retrieve (automatically decrypted)
const token = await encryptedStorage.getItem('auth:token');

// Remove
encryptedStorage.removeItem('auth:token');
```

### Using Encrypted IndexedDB

```typescript
import { EncryptedIndexedDB } from '@/lib/encryptedIndexedDB';

const encryptedDB = new EncryptedIndexedDB(key, userId);

// Initialize
await encryptedDB.init('vapestore-pos', 1);

// Save with field encryption
const transaction = {
  id: 'txn123',
  storeId: 'store1',
  totalAmount: 125000,
  items: [...]
};

await encryptedDB.save(
  'transactions',
  transaction,
  ['totalAmount', 'items'] // Fields to encrypt
);

// Get with automatic decryption
const retrieved = await encryptedDB.get(
  'transactions',
  'txn123',
  ['totalAmount', 'items']
);
```

### Field-Level Encryption

```typescript
import {
  encryptFields,
  decryptFields,
  getEncryptedFields
} from '@/lib/fieldEncryption';

const user = {
  id: 'user1',
  name: 'John Doe',
  email: 'john@example.com',
  token: 'secret-token'
};

// Encrypt specific fields
const encrypted = await encryptFields(
  user,
  ['email', 'token'],
  key,
  userId
);

// Later, decrypt specific fields
const decrypted = await decryptFields(
  encrypted,
  ['email', 'token'],
  key,
  userId
);

// List encrypted fields
const fields = getEncryptedFields(encrypted); // ['email', 'token']
```

### Full Login/Logout Cycle

```typescript
import { deriveKey, rederiveKey } from '@/lib/keyDerivation';
import { EncryptedLocalStorage } from '@/lib/encryptedStorage';
import { base64Encode, base64Decode } from '@/lib/crypto';

// LOGIN
async function login(username: string, password: string) {
  // Authenticate with backend
  const response = await authAPI.login(username, password);
  const { token, user } = response.data;

  // Derive key from password
  const { key, salt } = await deriveKey(password);

  // Store salt (non-sensitive)
  localStorage.setItem('crypto:salt', base64Encode(salt));

  // Create encrypted storage
  const encryptedStorage = new EncryptedLocalStorage(key, user.id);

  // Store sensitive data encrypted
  await encryptedStorage.setItem('auth:token', token);
  await encryptedStorage.setItem('auth:user', user);

  return { key, user };
}

// LOGOUT
function logout() {
  // Clear encrypted data
  localStorage.removeItem('crypto:salt');
  localStorage.removeItem('auth:token');
  localStorage.removeItem('auth:user');

  // Clear key from memory
  sessionStorage.clear();
}

// RE-LOGIN (e.g., on app restart)
async function reLogin(username: string, password: string) {
  // Get stored salt
  const saltBase64 = localStorage.getItem('crypto:salt');
  if (!saltBase64) {
    throw new Error('No stored salt found');
  }

  // Re-derive key from password and stored salt
  const key = await rederiveKey(password, saltBase64);

  // Get encrypted storage instance
  const encryptedStorage = new EncryptedLocalStorage(key, userId);

  // Retrieve encrypted data
  const token = await encryptedStorage.getItem('auth:token');
  const user = await encryptedStorage.getItem('auth:user');

  return { key, token, user };
}
```

## Sensitive Fields to Encrypt

Based on requirements, these fields should be encrypted:

```typescript
// Auth-related
- JWT tokens (access_token, refresh_token)
- User password (if stored client-side)

// User data
- Email addresses
- Phone numbers
- Personal information

// Financial data
- Transaction amounts
- Payment details
- Member credit balances

// Session data
- Session tokens
- Sensitive session information

// Non-sensitive (don't encrypt)
- User ID
- Username
- User role
- Store ID
- Public metadata
- Timestamps
```

## Error Handling

```typescript
import { CryptoError } from '@/types/encryption';

try {
  const decrypted = await decrypt(encryptedData, key);
} catch (error) {
  if (error instanceof CryptoError) {
    console.error(`Crypto error: ${error.message} (code: ${error.code})`);

    // Handle specific errors
    switch (error.code) {
      case 'DECRYPTION_FAILED':
        // Wrong key or corrupted data
        break;
      case 'INVALID_ENCRYPTED_DATA':
        // Invalid data structure
        break;
      case 'CORRUPTED_DATA':
        // Data too short or otherwise corrupted
        break;
      case 'PARSE_ERROR':
        // Failed to parse JSON
        break;
    }
  }
}
```

## Security Considerations

### ✅ What's Secured

1. **At Rest Encryption**: All sensitive data is encrypted before storage
2. **Authenticated Encryption**: AES-GCM prevents tampering
3. **Random IV**: Each encryption uses a unique IV
4. **Key Derivation**: Strong PBKDF2 with 100,000 iterations
5. **AAD Support**: Additional data can be authenticated
6. **Selective Encryption**: Only sensitive fields are encrypted

### ⚠️ Important Notes

1. **Password Security**: The master key depends on the password strength
2. **Key Management**: The key should never be persisted to disk
3. **Session Storage**: Key should be stored in sessionStorage (cleared on tab close)
4. **HTTPS Only**: Always use HTTPS to prevent man-in-the-middle attacks
5. **Server Security**: Never rely on client-side encryption for server-side security
6. **Browser Support**: WebCrypto requires modern browser (Chrome 37+, Firefox 34+, Safari 11+, Edge 79+)

### ❌ What's NOT Secured by This System

1. **In-Transit Encryption**: Use HTTPS for transport security
2. **Authentication**: This is not an authentication system
3. **Authorization**: This is not an authorization system
4. **Server-Side Security**: Always validate and encrypt on the server too
5. **Zero-Knowledge**: Server can still see encrypted data

## Testing

Comprehensive test suites are provided for:

- `crypto.test.ts` - Base64 encoding, random generation, WebCrypto availability
- `encryption.test.ts` - Encryption/decryption, roundtrips, error cases
- `keyDerivation.test.ts` - PBKDF2 derivation, consistency, workflows
- `fieldEncryption.test.ts` - Field-level encryption, multiple fields, partial operations

Run tests with:
```bash
npm test -- --testPathPattern="(crypto|encryption|keyDerivation|fieldEncryption)"
```

## Performance Notes

- Key derivation: ~100-200ms (intentionally slow for security)
- Encryption: <1ms
- Decryption: <1ms
- Field encryption (100 fields): <10ms

Cache the derived key in sessionStorage during user session to avoid re-deriving on every operation.

## Browser Compatibility

| Browser | WebCrypto | AES-GCM | PBKDF2 |
|---------|-----------|---------|--------|
| Chrome 37+ | ✅ | ✅ | ✅ |
| Firefox 34+ | ✅ | ✅ | ✅ |
| Safari 11+ | ✅ | ✅ | ✅ |
| Edge 79+ | ✅ | ✅ | ✅ |
| IE 11 | ❌ | ❌ | ❌ |

## References

- [WebCrypto API Spec](https://w3c.github.io/webcrypto/)
- [NIST AES Documentation](https://csrc.nist.gov/publications/detail/fips/197/final)
- [PBKDF2 RFC 2898](https://tools.ietf.org/html/rfc2898)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
